/**
 * New node file
 */
var pool = require('../config/db');
var logger = require("../lib/logger");
var async = require('async');
var androidgcm = require("../controllers/androidpush");
var moment = require('moment');

exports.uRideStart = function(req,res,next) {	
	pool.getConnection(function(err, connection) {
		async.waterfall([
				  function(callback){
		       			connection.query('SELECT * FROM ucorsa.Users where id = (select user_id from Authentication\
		       					where user_login=?);SELECT * FROM ucorsa.Users where id = ?' 
		       				   ,[req.userId,req.body.driver_id],
		       				function(err, Rows) {
		       		   			if (err) {
		       		   			return next(err);
		       		   			}else {     
		       		   				logger.info("Data from table ---> "+ JSON.stringify(Rows));
		       						callback(null, Rows, req.body.channel_id, req.body.message);
		       					}		       						
		       		   		});		       		     
		       		},		       		
			       	function(dataRows,channel, message, callback){
			       			logger.info("Finding notification_id for sending notification");     		   
			       		   			msg = dataRows[0][0].first_name + " started chat with you.. ";
			       		   		if(dataRows[1][0].notification_id)
			       		   		logger.info(" *** " + JSON.stringify(message+','+ channel));
									androidgcm.notifyMany(' Chat:'+message+','+ channel,dataRows[1][0].notification_id, msg);
									logger.info(msg);
			       						callback(null, 'success');    
			       	}
			       	/*function(message, callback){
		       			connection.query('INSERT into chat SET ?' 
		       				   ,[message],
		       				function(err, Rows) {
		       		   			if (err) {
		       		   			return next(err);
		       		   			}else {     
		       		   				logger.info("Data Insert in to  table ---> "+ JSON.stringify(Rows));
		       						callback(null, Rows);
		       					}		       						
		       		   		});		       		     
		       		}*/
			       	], function(err, id) {
			       		    	if (err) {
			       		    		return next(err);
			       		    	    res.send('Error inserting in all tables !!!!!!!!!');  
			       		    } else {      		    	
			       		    	res.send(200,{"message":"Notification sent"});
			       		    	connection.release();
			       		    }			       			
			       		}); // async waterfall				
		}); //connection
};


exports.uDriveStart = function(req,res,next) {	
	pool.getConnection(function(err, connection) {
		async.waterfall([
				  function(callback){
		       			connection.query('SELECT * FROM ucorsa.Users where id = (select user_id from Authentication\
		       					where user_login=?);SELECT * FROM ucorsa.Users where id = ?' 
		       				   ,[req.userId,req.body.rider_id],
		       				function(err, Rows) {
		       		   			if (err) {
		       		   			return next(err);
		       		   			}else {     
		       		   				logger.info("Data from table ---> "+ JSON.stringify(Rows));
		       						callback(null, Rows,req.body.channel_id, req.body.message);
		       					}		       						
		       		   		});		       		     
		       		},		       		
			       	function(dataRows,channel, message, callback){
			       			logger.info("Finding notification_id for sending notification");     		   
			       		   			msg = dataRows[0][0].first_name + " started chat with you.. ";
			       		   		if(dataRows[1][0].notification_id)
			       		   		logger.info(" *** " + JSON.stringify(message+','+ channel));
									androidgcm.notifyMany('chat:'+message+','+ channel,dataRows[1][0].notification_id, msg);
									logger.info(msg);
			       						callback(null, 'success');    
			       	}], function(err, id) {
			       		    	if (err) {
			       		    		return next(err);
			       		    	    res.send('Error inserting in all tables !!!!!!!!!');  
			       		    } else {      		    	
			       		    	res.send(200,{"message":"Notification sent"});
			       		    	connection.release();
			       		    }			       			
			       		}); // async waterfall				
		}); //connection
};


exports.addMessage = function(req,res,next) {	
	pool.getConnection(function(err, connection) {
		async.waterfall([
				  function(callback){
		       			connection.query('SELECT * FROM ucorsa.Users where id = (select user_id from Authentication\
		       					where user_login=?)' 
		       				   ,[req.userId],
		       				function(err, Rows) {
		       		   			if (err) {
		       		   			return next(err);
		       		   			}else {     
		       		   				logger.info("Data from table ---> "+ JSON.stringify(Rows));
		       						callback(null, Rows);
		       					}		       						
		       		   		});		       		     
		       		},		       		
			       	function(dataRows, callback){
		       			var chatData ={};
			       			if(req.body.SEND_BY.toUpperCase() == 'R')
			       				{
			       				chatData.RIDE_ID = req.body.RIDE_ID;
			       				chatData.RIDER_ID = dataRows[0].id;
			       				chatData.DRIVER_ID = req.body.DRIVER_ID;
			       				chatData.MESSAGE = req.body.MESSAGE;
			       				chatData.SEND_BY = req.body.SEND_BY;
			       				callback(null, chatData);    
			       				}else if(req.body.SEND_BY.toUpperCase() == 'D')
			       					{
			       					chatData.RIDE_ID = req.body.RIDE_ID;
				       				chatData.RIDER_ID = req.body.RIDER_ID;
				       				chatData.DRIVER_ID = dataRows[0].id;
				       				chatData.MESSAGE = req.body.MESSAGE;
				       				chatData.SEND_BY = req.body.SEND_BY;
				       				callback(null, chatData);    
			       					}
			       						
			       	},
			       	function(chatData, callback){
		       			connection.query('INSERT into chat SET ?' 
		       				   ,[chatData],
		       				function(err, Rows) {
		       		   			if (err) {
		       		   			return next(err);
		       		   			}else {     
		       		   				logger.info("Data from table ---> "+ JSON.stringify(Rows));
		       						callback(null, Rows);
		       					}		       						
		       		   		});		       		     
		       		}], function(err, id) {
			       		    	if (err) {
			       		    		return next(err);
			       		    	    res.send('Error inserting in all tables !!!!!!!!!');  
			       		    } else {      		    	
			       		    	res.send(200,{"message":"Notification sent"});
			       		    	connection.release();
			       		    }			       			
			       		}); // async waterfall				
		}); //connection
};
exports.getMessages = function(req,res,next) {	
	pool.getConnection(function(err, connection) {
				if(req.query.driver_id)
					{
					connection.query('select * from chat where RIDE_ID = ? and DRIVER_ID = ? order by UPDATE_TS  ;' 
	       				   ,[req.query.ride_id, req.query.driver_id],
	       				function(err, Rows) {
	       		   			if (err) {
	       		   			return next(err);
	       		   			}else {     
	       		   				logger.info("Data from table ---> "+ JSON.stringify(Rows));
	       		   			res.send(200,Rows);
	       		   			connection.release();
	       					}		       						
	       		   		});		
					}
				else
					{
					async.waterfall([
									  function(callback){
										  connection.query('SELECT * FROM ucorsa.Users where id = (select user_id from Authentication\
							       					where user_login=?)' 
							       				   ,[req.userId],
							       				function(err, Rows) {
							       		   			if (err) {
							       		   			return next(err);
							       		   			}else {     
							       		   				logger.info("Data from table ---> "+ JSON.stringify(Rows));
							       						callback(null, Rows);
							       					}		       						
							       		   		});		       		     
							       		},		       		
								       	function(dataRows, callback){
							       			connection.query('select * from chat where RIDE_ID = ? and DRIVER_ID = ? order by UPDATE_TS  ;' 
								       				   ,[req.query.ride_id, dataRows[0].id],
								       				function(err, Rows) {
								       		   			if (err) {
								       		   			return next(err);
								       		   			}else {     
								       		   				logger.info("Data from table ---> "+ JSON.stringify(Rows));
								       		   			callback(null, Rows);					       		   			
								       					}		       						
								       		   		});	  
								       	}], function(err, Rows) {
								       		    	if (err) {
								       		    		return next(err);
								       		    	    res.send('Error inserting in all tables !!!!!!!!!');  
								       		    } else {      		    	
								       		    	res.send(200, Rows);
								       		    	connection.release();
								       		    }			       			
								       		}); // async waterfall	
					}
		}); //connection
};

exports.summary = function(req, res, next){
	pool.getConnection(function(err, connection){
		var jsonObj = {};
		async.waterfall([
						  function(callback){
							  connection.query('SELECT * FROM ucorsa.Users where id = (select user_id from Authentication\
				       					where user_login=?)'						  
				       				   ,[req.userId],
				       				function(err, Rows) {
				       		   			if (err) {
				       		   			return next(err);
				       		   			}else {     
				       		   				logger.info("Data from table 1 ---> "+ JSON.stringify(Rows));
				       						callback(null, Rows);
				       					}		       						
				       		   		});		       		     
				       		},		       		
					       	function(dataRows, callback){
				       			connection.query('select driver_id, rider_id,ride_id, message, update_ts from ucorsa.chat cha1 \
				       					where ride_id in ( select drv.ride_id as rideID from ucorsa.Ride_Drivers drv, ucorsa.Ride rid where drv.Driver_id = ? and drv.ride_id = rid.id and rid.ride_status in (1,2,4,6)\
				       					union \
				       							select id as rideID \
				       				            from ucorsa.Ride \
				       							where rider_id = ? \
				       							and ride_status in (1,2,4,6) ) \
				       							and update_ts = (select max(update_ts)\
				       					from ucorsa.chat cha2 where cha2.ride_id = cha1.ride_id)' 
					       				   ,[dataRows[0].id, dataRows[0].id],
					       				function(err, Rows) {
					       		   			if (err) {
					       		   			return next(err);
					       		   			}else {     
					       		   				logger.info("Data from table 2---> "+ JSON.stringify(Rows));
					       		   			jsonObj.message = Rows.length ? Rows[0].message : '';
					       		   		    jsonObj.ts = Rows.length ? Rows[0].update_ts : '';
					       		   		    jsonObj.driverId = Rows.length ? Rows[0].driver_id : '';
					       		   		    jsonObj.riderId = Rows.length ? Rows[0].rider_id : '';
					       		   		    jsonObj.rideId = Rows.length ? Rows[0].ride_id : '';
					       		   			    callback(null, Rows , dataRows);					       		   			
					       					}		       						
					       		   		});	  
					       	},
					        function(rideRows,userRows, callback) {							        	
								const sql = 'select * from ucorsa.Users where id = ? or id = ? and id != ?';
								
								connection.query(sql, [rideRows[0].rider_id,rideRows[0].driver_id,userRows[0].id], 
									function(err,Rows){
					        		if(err){
					        			return next(err);
					        		} else {					        			
					        			logger.info("Data from table 3---> "+ JSON.stringify(Rows));
					        			jsonObj.name = Rows.length ? Rows[0].first_name : ''; 
				       		   			callback(null, rideRows , userRows);
					        		}
					        	});
					       
					       	} ], function(err, Rows) {
					       		    	if (err) {
					       		    		return next(err);
					       		    	    res.send('Error in getting summary !!!!!!!!!');  
					       		    } else {      		    	
					       		    	res.send(200, jsonObj);
					       		    	connection.release();
					       		    }			       			
					       		}); // async waterfall	
});
};


