/**
 * New node file
 */

var pool = require('../config/db');
var logger = require("../lib/logger");
var async = require('async');
var ArrowDB = require('arrowdb'),
arrowDBApp = new ArrowDB('6Q4mU1kuAdcsD7Ic3e5t0eFaC5rC9aqS');

/*exports.save = function(req, res, next) {
	pool.getConnection(function(err, connection) {
		logger.info("Id of user ");
		connection.query('SELECT * FROM ucorsa.Users where id = (Select user_id from Authentication where user_login = ?)',req.userId, function(err, rows) {
			if (err) {
				logger.error(err);
		  		return next(err);
			} else {
				logger.info("Id of user "	+ JSON.stringify(rows));
				var auth = JSON.parse(JSON.stringify(req.body.data));
				logger.info("Auth data  "	+ JSON.stringify(auth));
				sql = 'Update Users SET notification_id = ? where id =?';		
				connection.query(sql, [auth.notification_id,rows[0].id], function(err, rows) {
					if (err) {
						logger.error(err);	
				  		return next(err);
					} else {
						logger.info(  rows );
				  		res.send(200, rows);
				  		connection.release();		
					}
				});	
			}	
		});
	});
};*/

exports.save = function(req, res, next) { 
	var auth1 = JSON.parse(JSON.stringify(req.body.data));
	if(auth1.notification_id = '' || auth1.notification_id.trim().length == 0){
		res.send(200, {"message" :"Device_info table updated"});
		return;
	}
pool.getConnection(function(err, connection) {
	logger.info("Id of user ");
	connection.query('SELECT * FROM ucorsa.Users where id = (Select user_id from Authentication where user_login = ?)',req.userId, function(err, rows) {
		if (err) {
			logger.error(err);
	  		return next(err);
		} else {
			logger.info("Id of user "	+ JSON.stringify(rows));
	var auth = JSON.parse(JSON.stringify(req.body.data));
	logger.info("Auth data  "	+ JSON.stringify(auth));
	if(rows[0].notification_id != auth.notification_id ) {
		async.waterfall([
		            function(callback){  ///Creating token object     
			      			   if(rows[0].notification_id != ''){
			      				 arrowDBApp.pushNotificationsUnsubscribeToken({
						      		    channel: 'alert8',
						      		    device_token: rows[0].notification_id
						      		}, function(err, result) {
						      		    if (err) {
						      		    	logger.error(err);
						      		    	callback(null, auth.notification_id);  
									  		//return next(err);
						      		    } else {
						      		        console.log('Unsubscribed from alert8 channel!');
						      		      callback(null, auth.notification_id);
						      		    }
						      		});	
			      			   }
			      			   else{
			      				 callback(null, auth.notification_id);  
			      			   }   		  
					}, 
					function(data, callback){ // creating customer object 
						logger.info("**************************** : " + JSON.stringify(auth));		
						sql = 'Update Users SET ? where id =?';		
								connection.query(sql, [auth,rows[0].id], function(err, rows) {
									if (err) {
										logger.error(err);
								  		return next(err);
									} else {
										logger.info("The value of the id for notification table : "
												+ JSON.stringify(rows));											
										callback(null, 'done');			
									}
								});				      			
					}], function(err, id) {
			   		    	if (err) {
			   		    		connection.release();
					    		res.send(500,err);
			   		    	}  		    	
			   		    	res.send({"message" :"Device_info table updated"});
			   		    	connection.release();
						});					
		  }
	else {
		res.send(200, {"message" :"Device_info table updated"});
		connection.release();
		}	
	  }
	});
});
};






