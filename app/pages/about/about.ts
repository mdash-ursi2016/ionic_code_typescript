import { Component } from '@angular/core';
import { NavController, Alert } from 'ionic-angular';

@Component({
  templateUrl: 'build/pages/about/about.html'
})

export class AboutPage {

    slides: Array<{title: string, description: string, image: string}>; /* Slide array for *ngFor */

    constructor(private nav: NavController) {
	
	this.slides = [
            {
		title: "Welcome!",
		description: "Thanks for using the 2016 URSI Mobile Health Kit application.",
		image: "img/ica-slidebox-img-1.png",
            },
            {
		title: "How to Start?",
		description: "The first step to take is authorizing yourself on our server. Head to the <b>Data Page</b> and obtain \
an Authorization Token.",
		image: "img/ica-slidebox-img-2.png",
            },
            {
		title: "Linking Up",
		description: "It's time to connect to your device. Navigate to the <b>Settings Page</b> and start up a scan.",
		image: "img/ica-slidebox-img-3.png",
            },
            {
		title: "Data Incoming",
		description: "Finally you can start viewing data! The <b>Home Page</b> will automatically display incoming heart rat\
e and step information as well as an ECG graph.",
		image: "img/slidebox_6.png",
            },
            {
		title: "Graphing",
		description: "You can also view long term data from the server on the <b>Data Page</b>. The last 24 hours are automa\
tically displayed. Clicking <b>+/-</b> will zoom in and out out and the <b><-/-></b> will slide to different dates.",
		image: "img/slidebox_5.png",
            }
	];
	
    }

    /* Alert for the app information */
    aboutAlert() {
        let alert = Alert.create({
            title: 'App Info',
            message: 'Version 2.4<br>Last Updated: August 4, 2016<br><br>Created by Alex, Macall, Nate, and JSON',
            buttons: ['Ok']
	});
	this.nav.present(alert);
    }
}
