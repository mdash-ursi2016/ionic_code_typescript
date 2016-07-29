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
	this.storage.query('CREATE TABLE IF NOT EXISTS '
			   + 'bpmTable(bpmdate DATETIME, bpm INTEGER);' +
			   'CREATE TABLE IF NOT EXISTS '
			   + 'stepTable(stepstartdate DATETIME, stependdate DATETIME, step INTEGER);' +
			   'CREATE TABLE IF NOT EXISTS '
			   + 'activeTable(activestartdate DATETIME, activeenddate DATETIME, active INTEGER)'
			  ).then(() => {},
				 () => alert("Failed to create tables"));
	
	this.retrieveBPM().then(dat => alert(JSON.stringify(dat)),err => alert(JSON.stringify(err)));
	this.retrieveStep().then(dat => alert(JSON.stringify(dat)),err => alert(JSON.stringify(err)));
	this.retrieveActive().then(dat => alert(JSON.stringify(dat)),err => alert(JSON.stringify(err)));
    }
	

    /* Store a new bpm value into the database */
    storeBPM(date,newVal) {
	this.storage.query('INSERT INTO bpmTable(bpmdate,bpm) VALUES(?,?)',[date,newVal]).then(
	    () => {},
	    //function() {alert("Failed to store data");}
	    (err) => console.log("Failed to store bpm data: " + JSON.stringify(err))
	);
    }

    /* Store a new step value into the database */
    storeStep(startdate,enddate,newVal) {
	this.storage.query('INSERT INTO stepTable(stepstartdate,stependdate,step) VALUES(?,?,?)',[startdate,enddate,newVal]).then(
	    () => {},
	    (err) => console.log("Failed to store step data: " + JSON.stringify(err))
	);
    }

    storeActive(startdate,enddate,newVal) {
	this.storage.query('INSERT INTO activeTable(activestartdate,activeenddate,active) VALUES(?,?,?)',[startdate,enddate,newVal]).then(
	    () => {},
	    (err) => console.log("Failed to store active date: " + JSON.stringify(err))
	);
    }
    
    /* Package data as iterable promise */
    retrieveAllData() {
	return Promise.all([
	    this.retrieveBPM(),
	    this.retrieveStep(),
	    this.retrieveActive()
	]);
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

    retrieveActive() {
	return this.storage.query('SELECT * FROM activeTable');
    }

    

    /* Delete the tables */
    clear() {
	this.storage.query('DROP TABLE IF EXISTS bpmTable').then(
	    () => {},
	    () => alert("Failed to delete bpm table")
	);
	this.storage.query('DROP TABLE IF EXISTS stepTable').then(
	    () => {},
	    () => alert("Failed to delete step table")
	);
	this.storage.query('DROP TABLE IF EXISTS activeTable').then(
	    () => {},
	    () => alert("Failed to delete active table")
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

    /* Permanent settings for background mode */
    storeBackgroundMode(bg) {
	this.storage.set('bg',bg);
    }
    retrieveBackgroundMode() {
	return this.storage.get('bg');
    }

}
