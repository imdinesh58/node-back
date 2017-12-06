/**
 * New node file
 */
var ArrowDB = require('arrowdb');

exports.notifyMany = function()
{
    var arrowDBApp = new ArrowDB('6Q4mU1kuAdcsD7Ic3e5t0eFaC5rC9aqS', { apiEntryPoint: 'https://api.cloud.appcelerator.com', autoSessionManagement: false, prettyJson: true, responseJsonDepth: 3 });
    console.log(' In  notifymany method');
    
   var payloadData = {
	        "title": "Example",
	        "alert": "Sample alert",       
	        "vibrate": true,
	        "icon": "appicon"
	    };
		        arrowDBApp.pushNotificationsNotifyTokens({
				    channel: 'alert8',
				    to_tokens:'b789e1700386bf50c17cbcdcb01e7094461c2b913181825a8503ac5476b19007',
				    payload: JSON.stringify(payloadData)
				}, function(err, result) {
				    if (err) {
				        console.error(err.message);
				    } else {
				        console.log('Notification sent! :    %j' , result.body );
				    }
				});	  
		      
	
};
    