import { Storage, SqlStorage } from 'ionic-angular';
import { Injectable } from '@angular/core';

@Injectable()
export class StorageService {
    
    storage: any; /* Storage unit */

    constructor() {
	this.storage = new Storage(SqlStorage);
	this.makeTable(); /* Enforce that a data table must exist */
    }

    /* Create new tables, as long as they don't already exist, with datetime and integer columns */
    makeTable() {
	this.storage.query('CREATE TABLE IF NOT EXISTS bpmTable(bpmdate DATETIME, bpm INTEGER)').then(
	    function() {},
	    function() {alert("Failed to create bpm table");}
	);

	this.storage.query('CREATE TABLE IF NOT EXISTS stepTable(stepstartdate DATETIME, stependdate DATETIME, step INTEGER)').then(
	    function() {},
	    function() {alert("Failed to create step table");}
	);
    }
	

    /* Store a new bpm value into the database */
    storeBPM(date,newVal) {
	this.storage.query('INSERT INTO bpmTable(bpmdate,bpm) VALUES(?,?)',[date,newVal]).then(
	    function() {},
	    //function() {alert("Failed to store data");}
	    function(err) {console.log("Failed to store bpm data: " + JSON.stringify(err));}
	);
    }

    /* Store a new step value into the database */
    storeStep(startdate,enddate,newVal) {
	this.storage.query('INSERT INTO stepTable(stepstartdate,stependdate,step) VALUES(?,?,?)',[startdate,enddate,newVal]).then(
	    function() {},
	    function(err) {console.log("Failed to store step data: " + JSON.stringify(err));}
	);
    }
    
    
    /* Retrieve all bpm data points */
    retrieveBPM() {
	//return this.storage.query('SELECT * FROM dataTable WHERE date BETWEEN ? AND ?',[date1,date2]);
	return this.storage.query('SELECT * FROM bpmTable');
    }

    /* Retrieve all step data points */
    retrieveStep() {
	return this.storage.query('SELECT * FROM stepTable');
    }

    

    /* Delete the tables */
    clear() {
	this.storage.query('DROP TABLE IF EXISTS bpmTable').then(
	    function() {},
	    function() {alert("Failed to delete bpm table");}
	);
	this.storage.query('DROP TABLE IF EXISTS stepTable').then(
	    function() {},
	    function() {alert("Failed to delete step table");}
	);
    }

    /* Save the token */
    storeToken(token) {
	this.storage.set('token',token);
    }

    /* Retrieve the token */
    retrieveToken() {
	return this.storage.get('token');
    }

    /* Save the peripheral id */
    storePeripheral(id) {
	this.storage.set('peripheral',id);
    }

    /* Retrieve the peripheral id */
    retrievePeripheral() {
	return this.storage.get('peripheral');
    }

    /* Save the last total step count */
    storeLastStepCount(steps) {
	this.storage.set('laststepcount',steps);
    }

    /* Retrieve the last total step count */
    retrieveLastStepCount() {
	return this.storage.get('laststepcount');
    }


}
