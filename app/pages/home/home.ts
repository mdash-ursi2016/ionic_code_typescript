import { Component, ViewChild } from '@angular/core';
import { NavController, Events, Platform, Alert } from 'ionic-angular';

import { BLService } from '../../services/blservice/blservice';

declare var steps: any;
declare var content: any; /* tell the transpiler not to complain about DOM elements. Eventually should use ViewChild */
declare var totalSteps: any;

@Component({
    templateUrl: 'build/pages/home/home.html'
})


export class HomePage {

    canvasWidth: number; /* Width and height of the EKG canvas */
    canvasHeight: number;
    c: any;
    ctx: any; /* The canvas context */
    i: number; /* Current x-axis value on the canvas */
    content: any; /* BPM readout */
    steps: any;
    totalSteps: any;

    constructor(private nav: NavController, private events: Events, private platform: Platform, private bl: BLService) {
	
	/* Set dimensions relative to window */
	this.canvasWidth = window.screen.width;
	this.canvasHeight = window.screen.height / 3;
    }


    ionViewDidEnter() {
	
        /* Retrieve information about the canvas and its context */
	this.c = document.getElementById("myCanvas");
        this.ctx = this.c.getContext("2d");
	
        /* The first point is actually offscreen so a big jump doesn't get drawn */
        this.ctx.moveTo(-2,0);
        this.ctx.beginPath();
        this.i = -2;
	
        /* Set the HTML element for usage if the page is left and re-entered */
	this.content = content;
	this.steps = steps;
	this.totalSteps = totalSteps;
	this.totalSteps.innerHTML = this.bl.getStepCount();
	
        /* If we have a device to connect to, start up the data relay */
        this.platform.ready().then(() => {
            this.connect();
        });
    }

    connect() {

	/* Subscribe to incoming data packets
	   First make sure the subscription exists */
	if (!this.bl.getSubscription()) return;

	/* Display the BPM provided by BLService*/
	this.events.subscribe('bpm', (data) => {
	    this.content.innerHTML = data;
	});

	/* Display the steps provided by BLService */
	this.events.subscribe('steps', (data) => {
	    this.steps.innerHTML = data;
	});

	/* Display the total step count provided by BLService */
	this.events.subscribe('totalsteps', (data) => {
	    this.totalSteps.innerHTML = data;
	});
	

	/* Graph EKG data provided by BLService */
	this.events.subscribe('ekg', (data) => {
	    /* The data is a single element array containing an array of numbers */
	    for (let j = 0; j < data[0].length; j++) {
		this.draw(data[0][j]);
	    }

	});
    }

    /* Graphing method for a single, unerasing line until the end of the canvas.
       Given a point, draw it on the canvas and erase if the canvas is full */
    draw(point) {
	/* Increment by 2 for more noticeable drawing changes */
	this.i += 1;
	//console.log(this.i);
	this.ctx.strokeStyle = "#00FF00";
	this.ctx.lineTo(this.i, (this.c.height - (2 * point)));
	this.ctx.stroke();
	
	/* If the index (x-axis) is out of bounds, reset canvas */
	if (this.i > this.c.width)
	    {
		this.ctx.clearRect(0,0, this.c.width, this.c.height);
		this.ctx.beginPath();

		this.ctx.moveTo(-2, this.c.height - point);
		this.i = -2;
	    }
    }

    /* Reset the total step count */
    resetSteps() {
	this.bl.resetSteps();
	this.totalSteps.innerHTML = this.bl.getStepCount();
    }

    /* Display the help message */
    help() {
	let alert = Alert.create({
	    title: 'Need Help?',
	    message: 'Head to the About page for startup instructions.<br><br>To display an EKG measurement or see incoming data, first connect to a device via Bluetooth Settings.<br><br> On this page, you can swipe "Total Steps" to reset them.',
	    buttons: ['Ok']
	});
	this.nav.present(alert);
    }

}
