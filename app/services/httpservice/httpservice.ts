import { InAppBrowser, Toast } from 'ionic-native';
import { Injectable } from '@angular/core';
import { Http, Headers } from '@angular/http';
import { StorageService } from '../../services/storageservice/storageservice';

@Injectable()
export class HttpService {
    
    appendIndex: number; /* Counting index for creating unique datapoint IDs */
    token: string; /* Authenticating Token */

    constructor(private http: Http, private storage: StorageService) {
	this.appendIndex = 0;
    }


    /* Opens a browser, allows user to login, return with access token */
    getToken() {
	let self = this;
	return new Promise(function(resolve, reject) {

	    /* Open the URL in app without header information (URL, back/forward buttons, etc.) */
	    let browserRef = InAppBrowser.open("https://mdash.cs.vassar.edu:443/oauth/authorize?response_type=token&client_id=vassarOMH&redirect_uri=https://mdash.cs.vassar.edu:443/&scope=write_data_points%20read_data_points", "_blank", "location=no");
	    
	    /* When the browser reloads, check the URL */
	    browserRef.addEventListener("loadstart", (event) => {
		
		/* If the URL starts this way, we can access the token */
		if ((event.url).indexOf("https://mdash.cs.vassar.edu/#") === 0) {
		    browserRef.removeEventListener("exit", (event) => {});
		    browserRef.close();

		    /* Token is located between "=" and "&" */
		    let token = (event.url).split("=")[1].split("&")[0];

		    if (token !== null) {
			/* Set the token for post requests */
			resolve (token);
		    }
		    else
			reject ("Yeah, that didn't work bud");
		}
	    });
	});
    }
    

    /* Make a get request from the server with a function to use on the data */
    makeGetRequest(d1,d2,requestFunction) {
	/* If the token isn't null, we can get immediately */
	if (this.token) {
	    this.get(d1,d2,requestFunction);
	    return;
	}
	
	/* Otherwise we retrieve the token first */
	this.storage.retrieveToken().then(
	    (token) => {
		this.token = token;
		this.get(d1,d2,requestFunction);
	    }, function() {
		alert("Token storage error");
	    }
	);
    }

    /* Get helper function */
    get(d1,d2,requestFunction) {
	
	/* Create headers (includes token) */
	let authHeaders = new Headers();
	authHeaders.append('Authorization', 'Bearer ' + this.token);
	authHeaders.append('Accept', 'application/json');

	/* This url is specific to heart rate, plus the date queries */
	let url = "https://mdash.cs.vassar.edu:8083/v1.0.M1/dataPoints?schema_namespace=omh&schema_name=heart-rate&schema_version=1.0&created_on_or_after=" + d1 + "&created_before=" + d2;


	/* We will grab the heart rate data, and as long as that's successful, grab the step data */
	this.http.get(url, { headers: authHeaders }).subscribe(
	    bpmdata => {
		url = "https://mdash.cs.vassar.edu:8083/v1.0.M1/dataPoints?schema_namespace=omh&schema_name=step-count&schema_version=1.0&created_on_or_after=" + d1 + "&created_before=" + d2;
		/* Success: onto get #2 */
		this.http.get(url, { headers: authHeaders }).subscribe(
		    stepdata => {
			/* Both were successful: return both data sets via success function */
			requestFunction(bpmdata,stepdata);
		    }, err => alert("Step data get request failed"));
	    }, err => alert("Get request failed. Ensure that your device and the server are online and that your access token is valid.")
	);
	
    }


    /* Make a post request to the server with function to call on success */
    makePostRequest(value,success) {
	
	/* If the token isn't null, we can post immediately */
	if (this.token) {
	    this.post(value,success);
	    return;
	}

	/* Otherwise, we have to retrieve the token first */
	this.storage.retrieveToken().then(
	    (token) => {
		this.token = token;
		this.post(value,success);
	    }, function() {
		alert("Token storage error");
	    }
	);
    }
    
    /* Post helper function */
    post(value,success) {
	/* Create headers (includes token) */
	let authHeaders = new Headers();
	authHeaders.append('Authorization', 'Bearer ' + this.token);
	authHeaders.append('Content-Type', 'application/json');
	
	/* Post the data */
	this.http.post("https://mdash.cs.vassar.edu:8083/v1.0.M1/dataPoints/multi",
		       JSON.stringify(value), /* Value here is an array of JSONs in server compatible format */
		      { headers:authHeaders }).subscribe(
			  data => success(),
			  error => {
			      Toast.show("Post request failed. Ensure that your device and the server are online and that your access token is valid.", '7000', 'center').subscribe(
				  toast => {
				      console.log("Toast:" + toast);
				  }
			      );
			  }
		      );
    }

    /* Create a JSON in the appropriate format for a post. info is an object with the fields:
         - datatype: string -> the type of json to be created
	 - value: number -> data received
	 - * startdate: date -> start date of data (for multiple date posts)
	 - * enddate: date -> start date of data (for multiple date posts)
	 - * date: date -> date of data (for single date posts)
    */
    createJSON(info) {
	/* The base object type for all postings */
	let json: any =
	    {
		"header":{
		    "id":"ID",
		    "creation_date_time":"TIMESTAMP",
		    "acquisition_provenance":{
			"source_name":"arduino",
			"modality":"sensed"
		    },
		    "schema_id": {
			"namespace":"omh",
			"version":"1.0",
			"name":"NAME"
		    }
		},
		"body":{
		    "effective_time_frame": {
		    }
		}
	    }

	/* Add in the id, creation date time (now), and name of data type */
	json.header.id = new Date().getTime().toString() + "-" + this.appendIndex.toString();
	json.header.creation_date_time = (new Date()).toISOString();
	json.header.schema_id.name = info.datatype;

	/* Used for unique ids, increment for next posting */
	this.appendIndex++;

	/* Create JSON specific to heart rate */
	if (info.datatype === "heart-rate") {
	    json.body.effective_time_frame.date_time = info.date.toISOString();
	    json.body.heart_rate = {"value": info.value,
				    "unit": "beats/min"};
	}

	/* Specific to step count */
	else if (info.datatype === "step-count") {
	    json.body.effective_time_frame.time_interval = {"start_date_time": info.startdate.toISOString(),
							    "end_date_time": info.enddate.toISOString()};
	    json.body.step_count = info.value;
	}

	/* Specific to activity */
	else if (info.datatype === "minutes-moderate-activity") {
	    json.body.effective_time_frame.time_interval = {"start_date_time": info.startdate.toISOString(),
							    "end_date_time": info.enddate.toISOString()};
	    json.body.minutes_moderate_activity = {"value": info.value,
						   "unit": "sec"};
	}

	else console.log("Data type not recognized in JSON creation");

	return json;
    }


}
