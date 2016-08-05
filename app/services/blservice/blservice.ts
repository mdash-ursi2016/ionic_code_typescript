import { BLE, Vibration} from 'ionic-native';
import { Injectable } from '@angular/core';
import { Events } from 'ionic-angular';

import { StorageService } from '../storageservice/storageservice';
import { HttpService } from '../httpservice/httpservice';

@Injectable()
export class BLService {

    scanInfo: any; /* All bluetooth service/characteristic/timeout info */
    peripheral: any; /* The found peripheral after scan selection */
    HRSubscription: any; /* Subscriptions to various characteristics */
    EKGSubscription: any;
    HRBundleSubscription: any;
    dateCheckSubscription: any;
    stepSubscription: any;
    liveStepSubscription: any;
    lastDate: any; /* The most recent date received on the HRsubscription */
    totalSteps: number; /* The total number of steps taken so far */
    lastStepCount: number; /* The last number of steps reported */
    

    constructor(private storage: StorageService, private events: Events, private httpservice: HttpService) {
	this.scanInfo = { 
	    service: 'aa7b3c40-f6ed-4ffc-bc29-5750c59e74b3', /* Heart rate service */
	    heartrate: 'b0351694-25e6-4eb5-918c-ca9403ddac47', /* Heart rate - [4 byte date, 1 byte bpm] */ 
	    ekg: '1bf9168b-cae4-4143-a228-dc7850a37d98', /* EKG characteristic - [[14 x 1 byte EKG]] */
	    heartratebundle: '3cd43730-fc61-4ea7-aa18-6e7c3d798d74', /* BPM bundle characteristic [4x 4 byte date, 1 byte bpm] */
	    datecheck: '3750215f-b147-4bdf-9271-0b32c1c5c49d', /* Verifying timestamp characteristic [4 byte date] */
	    steps: '81d4ef8b-bb65-4fef-b701-2d7d9061e492', /* Step data - [4 byte date, 2 byte date difference, 2 byte steps] */
	    livesteps: 'f579caa3-9390-46ae-ac67-1445b6f5b9fd' /* Live step data - [1 byte step count] */
	};

	this.totalSteps = 0;
	this.lastStepCount = 0;

	this.retrieveStepCount();
    }

    /* Return a Promise for if Bluetooth is enabled or not */
    isEnabled() {
	return BLE.isEnabled();
    }

    /* Return a Promise for if Bluetooth was enabled or not */
    enable() {
	return BLE.enable();
    }

    /* Return the scan subscription */
    startScan() {
        return BLE.startScan([this.scanInfo.service]);
    }
    
    /* Stop scanning */
    stopScan() {
	BLE.stopScan().then(() => {});
    }

    /* Connect to the given device, and set the peripheral for later */
    connect(peripheral) {
	Vibration.vibrate(100);
	let connectSub = BLE.connect(peripheral.id).subscribe(result => {
	    this.storage.storePeripheral(peripheral.id);
	    this.peripheral = peripheral;
            this.connected(peripheral);
        }, error => {
	    console.log("Peripheral was disconnected.");
	    this.disconnect();
	});
    }

    /* Record incoming data in storage */
    connected(peripheral) {

	/* Inform the peripheral of the current date */
	this.sendDate(peripheral);
	/* Subscription for the heart rate (BPM) */
	this.HRSubscription = BLE.startNotification(peripheral.id, this.scanInfo.service, this.scanInfo.heartrate);
	/* Subscription for the EKG data */
	this.EKGSubscription = BLE.startNotification(peripheral.id, this.scanInfo.service, this.scanInfo.ekg);
	/* Subscription for the bundle data */
	this.HRBundleSubscription = BLE.startNotification(peripheral.id, this.scanInfo.service, this.scanInfo.heartratebundle);
	/* Subscription for date verification */
	this.dateCheckSubscription = BLE.startNotification(peripheral.id, this.scanInfo.service, this.scanInfo.datecheck);
	/* Subscription for step count packages */
	this.stepSubscription = BLE.startNotification(peripheral.id, this.scanInfo.service, this.scanInfo.steps);
	/* Subscription for live step count */
	this.liveStepSubscription = BLE.startNotification(peripheral.id, this.scanInfo.service, this.scanInfo.livesteps);

	
	/* Subscribe to the BPM */
	this.HRSubscription.subscribe(buffer => {
	    let data = new Uint8Array(buffer);
	    
	    /* The bytes are in reverse order, so we bit shift them to form the date */
	    let date = this.calcDate(data[3],data[2],data[1],data[0]);

	    /* Record the last timestamp for data checking with peripheral */
	    this.lastDate = date;

	    /* Store data (date * 1000 to account for milliseconds) */
	    this.storage.storeBPM(new Date(date * 1000),data[4]);
	    
	    /* Republish the data for the home page */
	    this.events.publish('bpm',data[4]);
	    
	    /* Post the data to the server */
	    //this.httpservice.makePostRequest(data[0],new Date(data[1] * 1000));
        });

	/* Subscribe to the EKG */
	this.EKGSubscription.subscribe(buffer => {
	    let data = new Uint8Array(buffer);
	    
	    /* Republish the data for the home page */
	    this.events.publish('ekg',data);
	});

	this.HRBundleSubscription.subscribe(buffer => {
	    let data = new Uint8Array(buffer);

	    /* BPMs are located every 5 indices */
	    let bpmArray = [data[4],data[9],data[14],data[19]];

	    /* Dates must be calculated in reverse order */
	    let dateArray = [
		this.calcDate(data[3],data[2],data[1],data[0]),
		this.calcDate(data[8],data[7],data[6],data[5]),
		this.calcDate(data[13],data[12],data[11],data[10]),
		this.calcDate(data[18],data[17],data[16],data[15])
	    ];

	    /* Push all data points to storage 
	       (dates * 1000 for ms format ) */
	    for (let i=0; i < bpmArray.length; i++) {
		this.storage.storeBPM(new Date(dateArray[i] * 1000),bpmArray[i]);
	    }
	});

	/* Periodically, the peripheral may request a comparison from the last date
	   received to the current date to check if all data has arrived */
	this.dateCheckSubscription.subscribe(buffer => {
	    let data = new Uint8Array(buffer);
	    
	    let curDate = this.calcDate(data[3],data[2],data[1],data[0]);
	    if (!this.lastDate)
		return;
	    
	    let uint8 = new Uint8Array(4);

	    let caughtUp = 0;
	    if (this.lastDate >= curDate)
		caughtUp = 1;

	    /* Send back an array of the boolean result */
	    for (let i = 0; i < 4; i++) {
		uint8[i] = caughtUp;
	    }

	    BLE.write(peripheral.id, this.scanInfo.service, this.scanInfo.datecheck, uint8.buffer).then(
		succ => {console.log("wrote back: " + uint8);},
		fail => {console.log("did not write back");}
	    );
	});

	/* Step subscription contains a date, a time offset, and a number of steps */
	this.stepSubscription.subscribe(buffer => {
	    let data = new Uint16Array(buffer);

	    this.lastStepCount = 0;

	    /* Rearrange for the startdate, enddate is startdate + offset */
	    let startdate: number = (data[1] << 16) + (data[0]);
	    let enddate: number = startdate + data[2];
	    
	    this.storage.storeStep(new Date(startdate * 1000),
				   new Date(enddate * 1000),
				   data[3]);

	    /* If there is a fifth item, it is the active data */
	    if (data.length === 5) {
		this.storage.storeActive(new Date(startdate * 1000),
					 new Date(enddate * 1000),
					 data[4]);
	    }
	});

	/* Live step subscription is just a current step, forward it */
	this.liveStepSubscription.subscribe(buffer => {
	    let data = new Uint16Array(buffer);
	    this.events.publish('steps',data[0]);

	    /* For total steps, calculate how many steps to add as the current
	       step count minues the previous */
	    this.totalSteps += (data[0] - this.lastStepCount);
	    this.lastStepCount = data[0];
	    this.events.publish('totalsteps',this.totalSteps);

	    
	});
	
    }

    /* Format a unix epoch from individual bytes */
    calcDate(n1,n2,n3,n4) {
	return (n1 << 24) + (n2 << 16) + (n3 << 8) + n4;
    }


    /* Inform the peripheral of the current date */
    sendDate(peripheral) {

	/* Data must be sent through the BLE plugin as an ArrayBuffer */
	let uint8 = new Uint8Array(4);

	/* Grab the current time without milliseconds */
	let time = Math.floor((new Date).getTime() / 1000);

	/* Store the time in 4 byte increments */
	uint8[0] = time & 0xFF;
	uint8[1] = (time & 0xFF00) >>> 8;
	uint8[2] = (time & 0xFF0000) >>> 16;
	uint8[3] = (time & 0xFF000000) >>> 24;

	/* Write the data to the peripheral */
	BLE.write(peripheral.id, this.scanInfo.service, this.scanInfo.datecheck, uint8.buffer).then(
	    succ => console.log("Time written"),
	    fail => console.log("Time not written successfully")
	);

    }


    /* Called when the user wants to sever the Bluetooth connection */
    disconnect() {

	/* Grab the peripheral from storage and operate on it */
	this.storage.retrievePeripheral().then(periphID => {
	    /* If we are connected to this device, connect from it */
	    BLE.isConnected(periphID).then(() => {

		/* Reset subscriptions so if anything requests them they are null */
		this.HRSubscription = this.EKGSubscription = this.HRBundleSubscription =
		    this.dateCheckSubscription = this.stepSubscription = null;
		
		BLE.stopNotification(periphID, this.scanInfo.service, this.scanInfo.heartrate).then();
		BLE.stopNotification(periphID, this.scanInfo.service, this.scanInfo.ekg).then();
		BLE.stopNotification(periphID, this.scanInfo.service, this.scanInfo.heartratebundle).then();

		BLE.disconnect(periphID).then(() => {
		}, () => {
		    /* Never seems to fire with current version of BLE... */
		    alert("Unsuccessful disconnect");
		});
	    }, () => {
		/* Otherwise we shouldn't be conencted to anything at all */
		alert("You are not connected to a device.");
	    });
	});
    }

    /* On page load, we want the status to reflect if the device is connected already */
    checkExistingBluetooth() {
	if (this.peripheral) {
            return BLE.isConnected(this.peripheral.id);
	}
	/* Should always be a rejected Promise */
	else return BLE.isConnected(null);
    }

    /* Return name of current device */
    getName() {
	if (this.peripheral) {
	    return this.peripheral.name;
	}
	else return "Unknown Device";
    }
    
    /* Returns the heart rate subscription.
       Currently used by home page to know if
       it should subscribe to data */
    getSubscription() {
	return this.HRSubscription;
    }

    /* Reset the total step count */
    resetSteps() {
	this.totalSteps = 0;
	this.saveStepCount();
    }

    /* Save current step count */
    saveStepCount() {
	this.storage.storeLastStepCount(this.totalSteps);
    }

    /* Retrieve the step count from storage and set it as needed */
    retrieveStepCount() {
	this.storage.retrieveLastStepCount().then(steps => {
	    this.totalSteps = steps ? parseInt(steps) : 0;
	}, err => console.log("Could not retrieve step count"));
    }

    /* Retrieve step count */
    getStepCount() {
	this.retrieveStepCount();
	return this.totalSteps;
    }

}
	
