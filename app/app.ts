import { Component, ViewChild } from '@angular/core';
import { ionicBootstrap, Platform, Nav, Toast } from 'ionic-angular';
import { StatusBar } from 'ionic-native';

import { AboutPage} from './pages/about/about';
import { HomePage } from './pages/home/home';
import { DataPage } from './pages/data/data';
import { BluetoothPage } from './pages/bluetooth/bluetooth';

import { BLService } from './services/blservice/blservice';
import { HttpService } from './services/httpservice/httpservice';
import { StorageService } from './services/storageservice/storageservice';

declare var cordova: any; /* tell the transpiler not to complain about cordova.
			     necessary because ionic-native didn't (doesn't?)
			     have a wrapper for background-mode to import */

@Component({
    templateUrl: 'build/app.html',
    providers: [BLService, HttpService, StorageService]
})

class MyApp {
    @ViewChild(Nav) nav: Nav;
    
    rootPage: any = HomePage;
    
    pages: Array<{title: string, component: any, icon: string}>; /* All pages of the app */
    jsons: Array<any>; /* list of postable data points in server format */


    constructor(private platform: Platform, 
		private storage: StorageService, 
		private blservice: BLService, 
		private httpservice: HttpService) {

	this.initializeApp();
	
	this.pages = [
	    { title: 'Home', component: HomePage, icon: 'pulse' },
	    { title: 'Data Visualization', component: DataPage, icon: 'podium' },
	    { title: 'Settings', component: BluetoothPage, icon: 'settings' },
	    { title: 'About', component: AboutPage, icon: 'leaf' }
	];
	
    }
    
    initializeApp() {
	this.platform.ready().then(() => {

	    /* Set heads up notification text for background mode */
	    cordova.plugins.backgroundMode.setDefaults({
                title: "URSI App",
                ticker: "",
                text: "Collecting Data"
	    });

	    /* Enable background mode and set the heads up notification text */
	    this.storage.retrieveBackgroundMode().then(bg => {
		if (bg)
		    cordova.plugins.backgroundMode.enable();
	    });


            /* Initial auto-connect */
            this.resumeOperations();

            /* Add listeners for app pause/resume and bind "this" to them */
            document.addEventListener("pause",this.pauseOperations.bind(this));    
            document.addEventListener("resume",this.resumeOperations.bind(this));    
	    
            /* Function that regulates periodic server posting */
            this.pushTimer();          
	    

	    StatusBar.styleDefault();
    });
  }

    /* Operations for when the app is paused: Save the total step count, and if background mode
       is enabled periodically check back in */
    pauseOperations() {

	/* We need to save the permanent step count */
	this.blservice.saveStepCount();

	/* Ensure that background mode is actually on. 
	   Especially important after initial call */
	if (!cordova.plugins.backgroundMode.isActive())
	    return;
	console.log("paused...");

	/* On app leave, disconnect immediately */

	this.blservice.checkExistingBluetooth().then(() => {
	    this.blservice.disconnect();
	},() => console.log("Paused, but not connected to device"));

	/* Every 5 minutes, reconnect with this method */
	setTimeout(() => {

	    /* Ensure we aren't connected already */
	    this.blservice.checkExistingBluetooth().then(() => {
		console.log("App was resumed, timeout finishing");
	    }, () => {
		
		/* Retrieve the last used device id from storage */
		this.storage.retrievePeripheral().then(storedID => {
		    
		    /* Scan for peripherals and see if a match is found */
		    this.blservice.startScan().subscribe(device => {
			if (device.id == storedID) {
			    /* If so, connect, and disconnect 30 seconds later */
			    this.blservice.connect(device);
			    /* Propagate paused functionality (next function call will only execute
			       if background mode is currently active, not just enabled) */
			    setTimeout(() => {
				this.pauseOperations();
			    },30000);
			}
			/* A device was found that we weren't connected to last */
			else {}
		    });
		    
		    /* Stop scan after reasonable time */
		    setTimeout(() => {
			this.blservice.stopScan();
			console.log("Scan finished");
		    }, 6000);
		});
	    });
	},300000); /* 5 Minute intervals */
    }
    
    /* On app resume, we must scan available devices to see if one
       has been connected to last */
    resumeOperations() {

	/* Retrieve the last used decive id from storage */
	this.storage.retrievePeripheral().then(storedID => {
	
	    /* Scan for peripherals and see if a match is found */
	    this.blservice.startScan().subscribe(device => {
		if (device.id == storedID) {
		    /* If so, notify and connect as usual */
		    this.blservice.connect(device);
		    let toast = Toast.create({
			message: "Connected to " + device.name,
			duration: 2000,
			position: 'bottom',
			showCloseButton: true
                    });
                    this.nav.present(toast);
		}
		/* A device was found that we weren't connected to last */
		else {}
	    });
	    
	    /* Stop scan after reasonable time */
	    setTimeout(() => {
		this.blservice.stopScan();
		console.log("Scan finished");
	    }, 6000);
	});
    }
    
    /* Regulate periodic posting to the server */
    pushTimer() {
	setTimeout(() =>  {
	    this.jsons = [];

	    /* Function will return an array of objects containing respective data */
	    this.storage.retrieveAllData().then(data => {
		let bpmData = data[0];
		let stepData = data[1];
		let activeData = data[2];

		/* Format the bpm data in appropriate JSON and add to common list */
		for (let i = 0; i < bpmData.res.rows.length; i++) {
		    this.jsons.push(this.httpservice.createJSON(
			{"datatype":"heart-rate",
			 "date":new Date(bpmData.res.rows.item(i).bpmdate),
			 "value":bpmData.res.rows.item(i).bpm}
		    ));
		}
		
		/* Format the step data in appropriate JSON and add to common list */
		for (let i = 0; i < stepData.res.rows.length; i++) {
		    
		    this.jsons.push(this.httpservice.createJSON(
			{"datatype":"step-count",
			 "startdate":new Date(stepData.res.rows.item(i).stepstartdate),
			 "enddate":new Date(stepData.res.rows.item(i).stependdate),
			 "value":stepData.res.rows.item(i).step}
		    ));
		}
		
		/* Format the active data in appropriate JSON and add to common list */
		for (let i = 0; i < activeData.res.rows.length; i++) {
		    this.jsons.push(this.httpservice.createJSON(
			{"datatype":"minutes-moderate-activity",
			 "startdate":new Date(activeData.res.rows.item(i).activestartdate),
			 "enddate":new Date(activeData.res.rows.item(i).activeenddate),
			 "value":activeData.res.rows.item(i).active}
		    ));
		}
		
		/* If there's any data, we want to post it */
		if (this.jsons.length > 0) {
		    let self = this;
		    this.httpservice.makePostRequest(this.jsons, function() {
			/* Success callback if the data was posted. Clear out the storage */
			self.storage.clear();
			self.storage.makeTable();
			let toast = Toast.create({
			    message: "Data posted to server (" + self.jsons.length + " data points)",
			    duration: 2000,
			    position: 'bottom',
			    showCloseButton: true
			});
			self.nav.present(toast);
		    });
		}
	    }, err => alert("Data Retrieval Error"));
	    /* Repeat this function again in X minutes */
	    this.pushTimer();
	}, 60000);
    }


    /* Open specified page by the side menu */
    openPage(page) {
	this.nav.setRoot(page.component);
    }
}

ionicBootstrap(MyApp);
