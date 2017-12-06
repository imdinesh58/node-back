/**
 * New node file
 */
var gcm = require('node-gcm');
var config  = require('../config/config');
var pool = require('../config/db');
var logger = require("../lib/logger");

var ArrowDB = require('arrowdb');

exports.testnotify = function (){ 

	
	////////1111111111111111111111/////////////
//	var regIds = ['APA91bHUkbo9C6kAR5cksKKt1B_fPLTjkrvrnr-QVEyDMDl0hEthbbd_7dfdM_XwivTmuQNFlVPUmEM3JuBeSvYffQ6y8tVH9V0u0YwHGgie4iNgDS3DZ4oMbXB7jXmN3YdxzueqXumf'];

//	 
//	// Set up the sender with you API key 
//	var sender = new gcm.Sender(config.get("googleAPIkey"));
	
//
//	
	
//	(function (messageId, callback) {
//		var _GCM = require('gcm').GCM,
//		GCM = new _GCM(config.get("googleAPIkey")); // API KEY at Google APIs Console
//
//		var message = {
//			registration_id: 'APA91bHUkbo9C6kAR5cksKKt1B_fPLTjkrvrnr-QVEyDMDl0hEthbbd_7dfdM_XwivTmuQNFlVPUmEM3JuBeSvYffQ6y8tVH9V0u0YwHGgie4iNgDS3DZ4oMbXB7jXmN3YdxzueqXumf',
//			'data.title': 'shephard: what lies in the shadow of the statue?',
//			'data.message': '4 8 15 16 23 42',
//			//'data.sound': 'blacksmoke.mp3',
//			collapse_key: messageId
//		};
//
//		GCM.send(message, function (err, messageId) {
//			if (err) {
//				console.error('error!');
//			}
//			callback(0);
//		});
//	})((new Date()).getTime() + '', process.exit);
	
	////////////222222222222222222222222222//////////////////
	
};


var notifyMany = exports.notifyMany = function(title, listToSendNotification, msg){		
	

	//9p4ZDnu10HOf5DBCrtIm5GBQtiJOk179 = dev // 6Q4mU1kuAdcsD7Ic3e5t0eFaC5rC9aqS = live 
	  var arrowDBApp = new ArrowDB('6Q4mU1kuAdcsD7Ic3e5t0eFaC5rC9aqS', { apiEntryPoint: 'https://api.cloud.appcelerator.com', autoSessionManagement: false, prettyJson: true, responseJsonDepth: 3 });
	    console.log(' In  notifymany method');
	    
	   var payloadData = {
		        "title": title,
		        "alert": msg,       
		        "vibrate": true,
		        "icon": "appicon"
		    };
			        arrowDBApp.pushNotificationsNotifyTokens({
					    channel: 'alert8',
					    to_tokens:listToSendNotification,
					    payload: JSON.stringify(payloadData)
					}, function(err, result) {
					    if (err) {
					        console.error(err.message);
					    } else {
					        console.log('Notification sent! :    %j' , result.body );
					    }
					});	  
			      
};

var notifyMany1 = exports.notifyMany1 = function(title, listToSendNotification, msg){		
	

	var gcm = require('node-gcm');
	 
	var message = new gcm.Message();
	 
	message.addData('title', title);
	message.addData('message', msg);

//	message.addNotification('icon', 'ic_launcher');
	 
	var regIds = [listToSendNotification];
	 
	// Set up the sender with you API key 
	var sender = new gcm.Sender(config.get("googleAPIkey"));
	 
	// Now the sender can be used to send messages 
	sender.send(message, { registrationIds: regIds }, function (err, result) {
	    if(err) console.error(err);
	    else    console.log(result);
	});
	 
	
};


