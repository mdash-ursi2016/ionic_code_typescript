import { Component } from '@angular/core';
import { Page, Alert, NavController, Loading, Range, Toast } from 'ionic-angular';

import { BLService } from '../../services/blservice/blservice';
import { StorageService } from '../../services/storageservice/storageservice';

declare var cordova: any; /* tell the transpiler not to complain about cordova.
                             necessary because ionic-native didn't (doesn't?)
                             have a wrapper for background-mode to import */

@Component({
  templateUrl: 'build/pages/bluetooth/bluetooth.html'
})

export class BluetoothPage {

    deviceList: any; /* List of found bluetooth devices on scan */
    statusDiv: string; /* The current status to display */
    scanTime: number; /* Time to scan for, set from Range */
    bgText: string; /* Text on the background mode button */
    

    constructor(private bl:BLService, private nav: NavController, private storage: StorageService) {

	this.deviceList = [];
	this.statusDiv = "Undefined";
	this.scanTime = 3;
	this.bgText = "Background Mode Toggle";
    }

    
    ionViewLoaded()
    {
	this.statusDiv = "Initializing";

	/* Attempt to enable Bluetooth if it is not already enabled */
	document.addEventListener('deviceready', () => {
	    /* If already enabled, do nothing */
	    this.bl.isEnabled().then(
		() => {},
		() => {
		    /* Otherwise, attempt to enable */
		    this.bl.enable().then(
			() => {},
			() => {alert ("Bluetooth could not be enabled");}
		    );
		}
	    );
	});

	/* Checking if a device is already connected */
	this.bl.checkExistingBluetooth().then(
	    () => {this.statusDiv = "Connected to " + this.bl.getName();},
	    () => {this.statusDiv = "Disconnected";}
	);

	/* Set text of the background mode toggle button */
	if (cordova.plugins.backgroundMode.isEnabled())
	    this.bgText = "Disable Background Mode";
	else
	    this.bgText = "Enable Background Mode";
    }

    /* Scan for a device */
    scan() {
	/* The list of found devices should be empty on scan start */
	this.deviceList = [];
	this.statusDiv = "Scanning";
	
	/* Create a loader for during the scan */
	let loading = Loading.create({
	    spinner: 'dots',
	    content: 'Scanning...'
	});
	this.nav.present(loading);

	/* Subscribe to the scanner, and add each found device to the list */
	this.bl.startScan().subscribe(device => {
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

	/* Clear out the device list */
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
	/* If already enabled, disable, notify user */
        if (cordova.plugins.backgroundMode.isEnabled()) {
            cordova.plugins.backgroundMode.disable();
	    this.bgText = "Enable Background Mode";
	    this.storage.storeBackgroundMode(null);
            let toast = Toast.create({
                message: "Background Mode Disabled",
                duration: 2000,
                position: 'bottom',
                showCloseButton: true
            });
            this.nav.present(toast);
        }
        /* Otherwise already disabled, so enable, notify user */
        else {
            cordova.plugins.backgroundMode.enable();
	    this.bgText = "Disable Background Mode";
	    /* Note that since storage works with strings, this could
	       be any string. More intuitive this way */
	    this.storage.storeBackgroundMode(true);
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



