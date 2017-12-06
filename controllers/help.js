/**
 * New node file
 */
var logger = require("../lib/logger");
var androidgcm = require("../controllers/androidpush");
var fs = require('fs');	 

exports.help = function(req,res,next) {

	
	function tableData(APIInfo,route,method,jsondata,headers)
	{
		this.APIInfo = APIInfo;
		this.route= route;
		this.method = method;
		this.jsondata = jsondata;
		this.headers = headers;
	}

  var values = [];
  	fs.readFile('./payload/Register.json', handleFile);
  	fs.readFile('./payload/Login.json', handleFile);
  	fs.readFile('./payload/check userlogin on registration.json', handleFile);
  	fs.readFile('./payload/check phone on registration.json', handleFile);
  	fs.readFile('./payload/List Auth.json', handleFile);
  	fs.readFile('./payload/Update Auth.json', handleFile);
  	fs.readFile('./payload/resetpassword.json', handleFile);
	fs.readFile('./payload/List User.json', handleFile);
	fs.readFile('./payload/Update User.json', handleFile);	
	fs.readFile('./payload/List Address.json', handleFile);
	fs.readFile('./payload/Update Address.json', handleFile);
	fs.readFile('./payload/Add Address.json', handleFile);
	fs.readFile('./payload/List Vehicle.json', handleFile);
	fs.readFile('./payload/Update Vehicle.json', handleFile);
	fs.readFile('./payload/Add Vehicle.json', handleFile);
	fs.readFile('./payload/Add a ride request.json', handleFile);
	fs.readFile('./payload/uRides.json', handleFile);
	fs.readFile('./payload/Reply to ride request.json', handleFile);	
	fs.readFile('./payload/Confirm ride request.json', handleFile);
	fs.readFile('./payload/uRideHistory.json', handleFile);
	fs.readFile('./payload/TrackRides.json', handleFile);
	fs.readFile('./payload/cancelConfimedRideByRider.json', handleFile);
	fs.readFile('./payload/uDrives.json', handleFile);
	fs.readFile('./payload/uDriveHistory.json', handleFile);
	fs.readFile('./payload/cancelConfimedRideByDriver.json', handleFile);
	fs.readFile('./payload/listContactsToAddGroupMembers.json', handleFile);
	fs.readFile('./payload/DeleteContact.json', handleFile);
	fs.readFile('./payload/List contacts during ride request.json', handleFile);
	fs.readFile('./payload/List app using phone contacts.json', handleFile);
	fs.readFile('./payload/Change status to invited.json', handleFile);	
	fs.readFile('./payload/Schedule - get.json', handleFile);
	fs.readFile('./payload/Schedule - Add.json', handleFile);
	fs.readFile('./payload/Schedule - update.json', handleFile);
	fs.readFile('./payload/Schdeule - delete.json', handleFile);
	fs.readFile('./payload/save registration id for GCM.json', handleFile);
	fs.readFile('./payload/create group.json', handleFile);
	fs.readFile('./payload/update group.json', handleFile);	
	fs.readFile('./payload/delete group.json', handleFile);
	fs.readFile('./payload/List groups for a user.json', handleFile);
	
	
	
	
	fs.readFile('./payload/List All User.json', handleFile);				
	
	fs.readFile('./payload/add members to group.json', handleFile);
	
	
	fs.readFile('./payload/delete members in group.json', handleFile);
	fs.readFile('./payload/list app using contacts.json', handleFile);
	
	
	fs.readFile('./payload/List app using phone contacts.json', handleFile);		
	
	
	
	
	
	fs.readFile('./payload/Get tracking details.json', handleFile);
	fs.readFile('./payload/Update tracking details.json', handleFile);
	
	
	
	
	
	
	function handleFile(err, data) {
	    if (err) throw err
	    obj = JSON.parse(data);
	    console.log(obj);
	    if(obj.jsondata != "NA")   // if it is JSON data
	    values.push(new tableData(obj.APIInfo,obj.route,obj.method,JSON.stringify(obj.jsondata),obj.headers));
	    else 					   // If value is NA 
	    	values.push(new tableData(obj.APIInfo,obj.route,obj.method,obj.jsondata,obj.headers));
	    console.log(values.length); 
	    if(values.length == 32)
	    	 res.render("help",{data : values});	   
	}	
};