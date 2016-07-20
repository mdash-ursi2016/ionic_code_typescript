import { Component } from '@angular/core';
import {Page, Alert, NavController, Loading, Range, Toast} from 'ionic-angular';
import {BLService} from '../../services/blservice/blservice';
import {StorageService} from '../../services/storageservice/storageservice';

declare var cordova: any;

@Component({
  templateUrl: 'build/pages/bluetooth/bluetooth.html'
})

export class BluetoothPage {

    deviceList: any; /* List of found bluetooth devices on scan */
    statusDiv: string; /* The current status to display */
    scanTime: number; /* Time to scan for, set from Range */
    bgToggled: boolean; /* boolean if background mode is enabled */


    constructor(private bl:BLService, private nav: NavController, private storage: StorageService) {

	this.deviceList = [];
	this.statusDiv = "Undefined";
	this.scanTime = 3;
    }


    ionViewLoaded()
    {

	/* Ensuring that Bluetooth is on */
	this.statusDiv = "Initializing";
	var self = this;
	document.addEventListener('deviceready', function () {
	    /* If already enabled, do nothing */
	    self.bl.isEnabled().then(
		function() {},
		function() {
		    /* Otherwise, attempt to enable */
		    self.bl.enable().then(
			function() {},
			function() {alert ("Bluetooth could not be enabled");}
		    );
		}
	    );
	});

	/* Checking if a device is already connected */
	this.bl.checkExistingBluetooth().then(
	    () => {this.statusDiv = "Connected to " + this.bl.getName();},
	    () => {this.statusDiv = "Disconnected";}
	);

    }

    /* Scan for a device */
    scan() {
	/* The list of found devices should be empty on scan start */
	this.deviceList = [];
	this.statusDiv = "Scanning";

	/* BL scanning service returns a [timeout,subscription] pair */
	var scanSub = this.bl.startScan();
	
	/* Create a loader for during the scan */
	let loading = Loading.create({
	    spinner: 'dots',
	    content: 'Scanning...'
	});
	this.nav.present(loading);

	/* Subscribe to the scanner, and add each found device to the list */
	scanSub.subscribe(device => {
	    this.deviceList.push(device);
	});

	/* After the timeout, stop scanning and remove the loader */
	setTimeout(() => {
	    this.bl.stopScan();
	    this.statusDiv = "Finished Scanning";
	    loading.dismiss();
	}, 1000 * this.scanTime);
    }

    /* Executed when a user selects a device from the list;
       Connect to that device */
    connect(device) {
	this.bl.connect(device);

	/* Remove the device from the list of displayed devices */
	this.deviceList = [];
	this.statusDiv = "Connected to " + device.name;
    }
	
    /* Disconnect from any connected device */
    disconnect() {
	this.bl.disconnect();
	this.statusDiv = "Disconnected";
    }


    /* Toggle for enabling and disabling background mode */
    bgToggle() {
	/* If already enabled, disable, change button HTML, notify user */
        if (cordova.plugins.backgroundMode.isEnabled()) {
            cordova.plugins.backgroundMode.disable();
            let toast = Toast.create({
                message: "Background Mode Disabled",
                duration: 2000,
                position: 'bottom',
                showCloseButton: true
            });
            this.nav.present(toast);
        }
        /* Otherwise already disabled, so enable, change button HTML, notify user */
        else {
            cordova.plugins.backgroundMode.enable();
            let toast = Toast.create({
                message: "Background Mode Enabled",
                duration: 2000,
                position: 'bottom',
                showCloseButton: true
            });
            this.nav.present(toast);
        }
	
    }


}



