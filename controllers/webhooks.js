/**
 * New node file
 */
var pool  = require('../config/db');
var logger = require("../lib/logger");
var async = require('async');
var moment = require('moment');
var androidgcm = require("../controllers/androidpush");

var nodemailer = require('nodemailer');

var transporter = nodemailer.createTransport({
	    host : 'smtp.chintainfo.com',
	    port : '2525',
	    tls: {rejectUnauthorized: false},
	    auth: {
	        user: 'webtest@chintainfo.com',
	        pass: 'c15w@bs3ndtest'
	    }
	});

exports.chargeCreated = function(req, res, next) {
console.log("Webhook -->  " + JSON.stringify(req.body));
logger.info("Charge ID " + req.body.data.object.id)
var charge_id = req.body.data.object.id;
pool.getConnection(function(err, connection) {	
	connection.query('select * from Transactions where charge_id = ? ',charge_id, function(err, rows) {
		if (err) {
			logger.error(err);
	  		return next(err);
		} else {			
	if(rows.length)
		{
		async.waterfall([
			      		   function(callback){  ///Sending notification to driver
			      			 connection.query('select * from Users where id = ? ',rows[0].driver_id, function(err, userRows) {
			      				if (err) {
			      					logger.error(err);
			      			  		return next(err);
			      				} else {
			      					logger.info("Driver data " + userRows);
			      					if(userRows.length){
			      						if(userRows[0].notification_id != null || userRows[0].notification_id != '')
			      						{
			      						var msg = "Amount has been credited to your account for the ride";
			      						androidgcm.notifyMany('Amount credited',
												userRows[0].notification_id, msg);
										logger.info(msg);
				       						callback(null, 'success');
			      						}
			      						else
			      							callback(null, 'success');
			      					}
			      					else
		      							callback(null, 'success');
			      					
			      				}
			      			 });			      		  
					}, 
					function(data, callback){  ///Sending notification to rider
						connection.query('select * from Users where id = (select rider_id from Ride where id = ( select  ride_id from Transactions\
								where charge_id = ? )) ', charge_id, function(err, userRows) {
		      				if (err) {
		      					logger.error(err);
		      			  		return next(err);
		      				} else {
		      					logger.info("Rider data " + userRows);
		      					if(userRows.length){
		      						if(userRows[0].notification_id != null || userRows[0].notification_id != '')
		      						{
		      						var msg = "Amount has been debited from your account for the ride";
		      						androidgcm.notifyMany('Amount debited',
											userRows[0].notification_id, msg);
									logger.info(msg);
			       						callback(null, 'success');
		      						}
		      						else
		      							callback(null, 'success');
		      					}
		      					else
	      							callback(null, 'success');
		      					
		      				}
		      			 });				      			
					},
					function(data, callback){  ///Update transaction status..
						connection.query('update Transactions set status = \'processed\' where id =  ? ', rows[0].id, function(err, userRows) {
		      				if (err) {
		      					logger.error(err);
		      			  		return next(err);
		      				} else {		      					
		      					callback(null, 'success');
		      				}
		      			 });				      			
					}], function(err, id) {
			   		    	if (err) {
			   		    		connection.release();
					    		res.send(500,err);
			   		    	}  		    	
			   		    	res.send({"message" :"Charge Notifications sent"});
			   		    	connection.release();
						});					
		  }
	else
		{
		res.send(200, {"message" :" No Transaction details"});
		connection.release();
		}		
	  }
	});
});
};



exports.chargeFailed = function(req, res, next) {
	console.log("Webhook failure response -->  " + JSON.stringify(req.body));
	
	var mailOptions = {
			    from: 'dharaneeswaran.m@chembiantech.com',
			    to: 'dharaneeswaran.m@chembiantech.com',			  			   
			    subject: 'Error in Payment Transaction',
			    text: JSON.stringify(req.body)		    
			};
	
	transporter.sendMail(mailOptions, function(error, info){
		    if(error){
		    	logger.error(err);
		  		return next(err);
		    }	
		    logger.info("Charge ID " + req.body.data.object.id)
			var charge_id = req.body.data.object.id;
			pool.getConnection(function(err, connection) {	
				connection.query('select * from Transactions where charge_id = ? ',charge_id, function(err, rows) {
					if (err) {
						logger.error(err);
				  		return next(err);
					} else {			
				if(rows.length)
					{
					async.waterfall([
						      		   function(callback){  ///Sending notification to driver
						      			 connection.query('select * from Users where id = ? ',rows[0].driver_id, function(err, userRows) {
						      				if (err) {
						      					logger.error(err);
						      			  		return next(err);
						      				} else {
						      					logger.info("Driver data " + userRows);
						      					if(userRows.length){
						      						if(userRows[0].notification_id != null || userRows[0].notification_id != '')
						      						{
						      						var msg = "Issue in Payment ";
						      						androidgcm.notifyMany('Payment issue',
															userRows[0].notification_id, msg);
													logger.info(msg);
							       						callback(null, 'success');
						      						}
						      						else
						      							callback(null, 'success');
						      					}
						      					else
					      							callback(null, 'success');
						      					
						      				}
						      			 });			      		  
								}, 
								function(data, callback){  ///Sending notification to rider
									connection.query('select * from Users where id = (select rider_id from Ride where id = ( select  ride_id from Transactions\
											where charge_id = ? )) ', charge_id, function(err, userRows) {
					      				if (err) {
					      					logger.error(err);
					      			  		return next(err);
					      				} else {
					      					logger.info("Rider data " + userRows);
					      					if(userRows.length){
					      						if(userRows[0].notification_id != null || userRows[0].notification_id != '')
					      						{
					      						var msg = "Issue in Payment";
					      						androidgcm.notifyMany('Payment issue',
														userRows[0].notification_id, msg);
												logger.info(msg);
						       						callback(null, 'success');
					      						}
					      						else
					      							callback(null, 'success');
					      					}
					      					else
				      							callback(null, 'success');
					      					
					      				}
					      			 });				      			
								},
								function(data, callback){  ///Update transaction status..
									connection.query('update Transactions set status = \'failure\' where id =  ? ', rows[0].id, function(err, userRows) {
					      				if (err) {
					      					logger.error(err);
					      			  		return next(err);
					      				} else {		      					
					      					callback(null, 'success');
					      				}
					      			 });				      			
								}], function(err, id) {
						   		    	if (err) {
						   		    		connection.release();
								    		res.send(500,err);
						   		    	}  		    	
						   		    	res.send({"message" :"Charge Failure Notifications sent"});
						   		    	connection.release();
									});					
					  }
				else
					{
					res.send(200, {"message" :" No Transaction details"});
					connection.release();
					}		
				  }
				});
			});
	
	});	
};
	