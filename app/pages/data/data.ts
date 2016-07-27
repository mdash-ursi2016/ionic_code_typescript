import { Component, ViewChild, ElementRef } from '@angular/core';
import { Page, NavController, Toast, Alert } from 'ionic-angular';
import { DatePicker } from 'ionic-native';

import { StorageService } from '../../services/storageservice/storageservice';
import { HttpService } from '../../services/httpservice/httpservice';
import * as chart from 'chart.js';

@Component({
  templateUrl: 'build/pages/data/data.html'
})

export class DataPage {

    canvasWidth: number; /* Width and height of the chart.js graph */
    canvasHeight: number;
    startDate: any; /* Start and end date as Date objects (interpreted as numbers as well) */
    endDate: any;
    startDateString: string; /* String representing start and end dates (for DateTime picker */
    endDateString: string;
    timeDiff: number; /* Difference in ms between start and end dates */
    bpmLabels: Array <any>; /* Labels (timestamps) of data points -- x-axis */
    bpmPoints: Array  <number>; /* values (bpms) of data points -- y-axis */
    stepLabels: Array <any>;
    stepPoints: Array <any>;

    
    segment: string = "bpmgraph";

    @ViewChild('bpmChart') bpmcanvas: ElementRef;
    @ViewChild('stepChart') stepcanvas: ElementRef;

    constructor(private nav: NavController, private storage: StorageService, private httpservice: HttpService) {
	/* Graph component */
	this.canvasWidth = window.screen.width;
	this.canvasHeight = window.screen.height / 3;

	/* Create the graph to display at first as the last 24 hours */
	this.startDate = new Date();
	this.endDate = new Date();

	/* Set the start date (date on the left) to be one day earlier */
	this.startDate.setDate(this.startDate.getDate() - 1);

	this.startDateString = this.formatLocalDate(this.startDate);
	this.endDateString = this.formatLocalDate(this.endDate);

	/* Record the time between the start and end dates in milliseconds.
	   Initially one day */
	this.timeDiff = Math.abs(this.startDate - this.endDate);

	this.bpmLabels = [];
	this.bpmPoints = [];
	this.stepLabels = [];
	this.stepPoints = [];
	
    }

    /* Draw an empty graph when the page enters */
    ionViewDidEnter()
    {		
	/* Initial Graphing */
	this.retrieve();
    }

    
    /* Turn the given date into local ISO time */
    formatLocalDate(dt) {
        let tzo: any = -dt.getTimezoneOffset(),
        dif = tzo >= 0 ? '+' : '-',
        pad = function(num) {
            let norm = Math.abs(Math.floor(num));
            return (norm < 10 ? '0' : '') + norm;
        };
	return dt.getFullYear() 
            + '-' + pad(dt.getMonth()+1)
            + '-' + pad(dt.getDate())
            + 'T' + pad(dt.getHours())
            + ':' + pad(dt.getMinutes()) 
            + ':' + pad(dt.getSeconds()) 
            + dif + pad(tzo / 60) 
            + ':' + pad(tzo % 60);
    }


    /* Retrieve authorization token from server */
    getToken() {
	this.httpservice.getToken().then((success:string) => {
	    this.storage.storeToken(success);
	    let toast = Toast.create({
		message: "Token obtained: " + success,
		duration: 2000,
		position: 'bottom',
		showCloseButton: true
	    });
	    this.nav.present(toast);
	}, (error) => {
	    alert(JSON.stringify(error));
	});
    }


    /* Store the current date and a random number 1-100.
       Testing purposes */
    store() {
	//this.storage.store(new Date(),Math.floor(Math.random() * 100) + 1);
	this.storage.retrieveBPM().then(
	    data => alert(data.res.rows.length),
	    fail => alert("Data retrieve fail")
	);
    }


    /* Retrieve a fixed amount of data from storage and show the graph */
    retrieve() {

	/* Get the dates from the Datetime Ionic component and create a Date() object */
	let s1 = this.strParse(this.startDateString);
	let s2 = this.strParse(this.endDateString);

	/* The parse function separates ISO 8601 times into individual components */
	let d1 = new Date(s1[0],s1[1],s1[2],s1[3],s1[4]).toISOString();
	let d2 = new Date(s2[0],s2[1],s2[2],s2[3],s2[4]).toISOString();
	
	/* Clear out the graph data */
	this.bpmLabels = [];
	this.bpmPoints = [];
	this.stepLabels = [];
	this.stepPoints = [];

	
	let self = this;

	/* Make a get request, with a callback function for graphing */
	this.httpservice.makeGetRequest(d1,d2, function(bpmdata,stepdata) {

	    /* Get the bodies of the returned JSONs */
	    bpmdata = JSON.parse(bpmdata._body);
	    stepdata = JSON.parse(stepdata._body);

	    /* Loop through both data sets and set up the points to graph for each */
	    for (let i = 0; i < bpmdata.length; i++) {
		self.bpmLabels.push(bpmdata[i].header.creation_date_time);
		self.bpmPoints.push(bpmdata[i].body.heart_rate.value);
	    }

	    for (let i = 0; i < stepdata.length; i++) {
		self.stepLabels.push(stepdata[i].header.creation_date_time);
		self.stepPoints.push(stepdata[i].body.step_count);
	    }
	    
	    self.makeChart();

	});
    }    
	
    /* Erase the current graph and redraw with no data.
       This function should eventually be hidden in settings */
    clear() {
	let prompt = Alert.create({
	    title: "Clear Storage",
	    message: "Are you sure you would like to clear out your storage and reset the graphs?",
	    buttons: [
		{
		    text: "Cancel",
		    handler: data => {},
		},
		{
		    text: "I'm sure",
		    handler: data => {
			
	
			/* Delete the table and make a new one */
			this.storage.clear();
			this.storage.makeTable();
			
			/* Notify the event with a Toast */
			let toast = Toast.create({
			    message: 'Table Cleared',
			    duration: 2000,
			    position: 'bottom',
			    showCloseButton: true
			});
			this.nav.present(toast);
			
			/* Reset the data and redraw the graph */
			this.bpmLabels = [];
			this.bpmPoints = [];
			this.stepLabels = [];
			this.stepPoints = [];
			this.makeChart();
		    }
		}]
	});
	
	this.nav.present(prompt);
    }


    /* Chart.js graph routine */
    makeChart() {

	/* Graph for the heart rate canvas */
	if (this.bpmcanvas) {
	    let bpmctx = this.bpmcanvas.nativeElement.getContext("2d");
	    let bpmChart = new chart(bpmctx, {
		type: 'line',
		data: {
		    labels: this.bpmLabels, /* data labels */
		    datasets: [{
			label: "Heart Rate",
			fill: false,
			lineTension: 0.1,
			backgroundColor: "rgba(75,192,192,0.4)",
			borderColor: "rgba(75,192,192,1)",
			borderCapStyle: 'butt',
			borderDash: [],
			borderDashOffset: 0.0,
			borderJoinStyle: 'miter',
			pointBorderColor: "rgba(75,192,192,1)",
			pointBackgroundColor: "#fff",
			pointBorderWidth: 1,
			pointHoverRadius: 5,
			pointHoverBackgroundColor: "rgba(75,192,192,1)",
			pointHoverBorderColor: "rgba(220,220,220,1)",
			pointHoverBorderWidth: 2,
			pointRadius: 1,
			pointHitRadius: 10,
			data: this.bpmPoints, /* data points */
			borderWidth: 1
		    }]
		},
		options: {
		    legend: {
			labels: {
			    boxWidth: 12 /* Width of legend box */
			}
		    },
		    scales: {
			xAxes: [{
			    type: 'time' /* Graph real dates */
			}]
		    }
		}
	    });
	}

	/* Graph for the step count canvas */
	if (this.stepcanvas) {
	    let stepctx =  this.stepcanvas.nativeElement.getContext("2d");
	    let stepChart = new chart(stepctx, {
		type: 'bar',
		data: {
		    labels: this.stepLabels, /* data labels */
		    datasets: [{
			label: "Step Count",
			backgroundColor: "rgba(75,192,192,0.4)",
			borderColor: "rgba(75,192,192,1)",
			data: this.stepPoints, /* data points */
			borderWidth: 1
		    }]
		},
		options: {
		    legend: {
			labels: {
			    boxWidth: 12 /* Width of legend box */
			}
		    },
		    scales: {
			xAxes: [{
			    type: 'time' /* Graph real dates */
			}]
		    }
		}
	    });
	}
    }

    /* Convert a millisecond time to days, hours, minutes, seconds.
       Used for displaying the current time interval */
    convertMS(ms) {
	let d, h, m, s;
	s = Math.floor(ms / 1000);
	m = Math.floor(s / 60);
	s = s % 60;
	h = Math.floor(m / 60);
	m = m % 60;
	d = Math.floor(h / 24);
	h = h % 24;
	return "D: " + d + ", H: " + h + ", M: " + m + ", S: " + s;
    }
    

    /* Parse an ISO string into its components */
    strParse(str) {
	return [
	    parseInt(str.slice(0,4)), /* Year */
	    parseInt(str.slice(5,7)) - 1, /* Month */
	    parseInt(str.slice(8,10)), /* Day */
	    parseInt(str.slice(11,13)), /* Hour */
	    parseInt(str.slice(14,16)) /* Minute */
	];
    }
    
    /* Allow the user to manually set the start date with a DatePicker */
    startDatePicker() {
	DatePicker.show({
	    date: this.startDate,
	    mode: 'datetime',
	    androidTheme: 2
	}).then(
	    date => {
		this.startDate = date;
		this.startDateString = this.formatLocalDate(date);
		this.timeDiff = Math.abs(this.startDate - this.endDate);
		this.retrieve();
	    },
	    err => console.log("Error occurred while getting date:", err)
	);

    }

    /* Allow the user to manually set the end date with a DatePicker */
    endDatePicker() {
        DatePicker.show({
            date: this.endDate,
            mode: 'datetime',
            androidTheme: 2
        }).then(
            date => {
                this.endDate = date;
                this.endDateString = this.formatLocalDate(date);
		this.timeDiff = Math.abs(this.startDate - this.endDate);
		this.retrieve();
            },
            err => console.log("Error occurred while getting date:", err)
        );

    }


    /* Whatever the current time interval is, divide it by 2 and add it the left bound.
       Then redisplay the graph */
    zoomIn() {
	this.timeDiff = Math.floor(this.timeDiff / 2);
	this.startDate = new Date(this.startDate.getTime() + this.timeDiff);
	this.startDateString = this.formatLocalDate(this.startDate);
	this.retrieve();
    }

    /* Whatever the current time interval is, subtract it from the left bound (startDate).
       Then double the time interval and redisplay the graph */
    zoomOut() {
	this.startDate = new Date(this.startDate.getTime() - this.timeDiff);
	this.timeDiff *= 2;
	this.startDateString = this.formatLocalDate(this.startDate);
	this.retrieve();
    }
    
    /* Shift both dates to the left by half of the total amount of time currently being displayed */
    shiftLeft() {
	this.timeDiff = Math.floor(this.timeDiff / 2);
	this.startDate = new Date(this.startDate.getTime() - this.timeDiff);
	this.endDate = new Date(this.endDate.getTime() - this.timeDiff);
	
	/* The time difference is still the same since we shifted both ends,
	   so we have to double it back*/
	this.timeDiff *= 2;

	this.startDateString = this.formatLocalDate(this.startDate);
	this.endDateString = this.formatLocalDate(this.endDate);
	this.retrieve();
    }
    
    /* Shift both dates to the right by half of the total amount of time currently being displayed */
    shiftRight() {
	this.timeDiff = Math.floor(this.timeDiff / 2);
	this.startDate = new Date(this.startDate.getTime() + this.timeDiff);
	this.endDate = new Date(this.endDate.getTime() + this.timeDiff);
	
	/* The time difference is still the same since we shifted both ends,
	   so we have to double it back*/
	this.timeDiff *= 2;

	this.startDateString = this.formatLocalDate(this.startDate);
	this.endDateString = this.formatLocalDate(this.endDate);
	this.retrieve();
    }



}
