/**
 * New node file
 */
var pool = require('../config/db');
var logger = require("../lib/logger");
var async = require('async');
var androidgcm = require("../controllers/androidpush");
var PNF = require('google-libphonenumber').PhoneNumberFormat;
var phoneUtil = require('google-libphonenumber').PhoneNumberUtil.getInstance();
var dateformat = require("../lib/dateformat");
var moment = require('moment');

exports.uDrives = function(req, res,next){
	  var singleDrives = [];
	  pool.getConnection(function(err, connection){
		      console.log('utc : ' +  moment().utc().format("YYYY-MM-DD HH:mm:ss"));
		  	  connection.query( 'SELECT rid.id, rd.Driver_id,rid.rider_id as rider , rid.Description, usr.first_name,\
						rid.from_location, rid.to_location, rid.end_date, rid.start_date, rid.frequency, rid.uRideType, \
		  			  rid.ride_time,rid.update_ts,rs.ride_status\
		  			FROM ucorsa.Ride rid,ucorsa.Authentication auth ,ucorsa.Ride_Drivers rd,ucorsa.ride_status rs,ucorsa.Users usr\
		  			  where auth.user_login = ? \
		  			  and rd.Driver_id = auth.user_id \
		  			  and rid.id = rd.Ride_id\
                      and rd.Ride_Status = rs.id\
	  			      and rd.Ride_Status in (1,2,4,6)\
		  			  and rid.rider_id = usr.id\
		  			  and rid.ride_ts > ?\
		  	        order by rid.end_date desc ,rid.ride_time desc;',	  			 
		  	   [req.userId, moment().utc().format("YYYY-MM-DD HH:mm:ss")],  function(err, rows){
				  	if(err)	{
				  		connection.release();
				  		return next(err);
				  	}else{
				  		logger.info( "DRIVE &&&&& " + JSON.stringify(rows) + "tt " + moment().utc().format("YYYY-MM-DD HH:mm:ss") );
		  		 		var drives = [];
				  		for( var indx in rows){
				  			if(rows[indx].uRideType == 'C'){
				  				drives[rows[indx].id] = rows[indx];
				  			} else {
				  				singleDrives.push(rows[indx]);
				  			}
				  		}
				  		console.log('After storing to carPools -> ' + JSON.stringify(drives));
				  		console.log('After storing to carPools -> 222 -->' + Object.keys(drives).join(","));
						if( drives.length > 0){
							  	connection.query( "select cf.id, cf.carpool_id, cf.date, cf.time, rs.ride_status from Carpool_Frequency cf, ucorsa.ride_status rs where ride_ts_UTC > ? and carpool_id in (" + Object.keys(drives).join(",") + ") and cf.ride_status = rs.id and cf.ride_status in (1,4,6) order by cf.carpool_id, cf.date",  	
							  	    [moment().utc().format("YYYY-MM-DD HH:mm:ss")],  function(err, carpolFrequencies){
									  	if(err)	{
									  		connection.release();
									  		return next(err);
									  	}else{
									  		if(carpolFrequencies.length){
									  		logger.info( "DRIVE &&&&& " + JSON.stringify(carpolFrequencies) );
									  		var cpId = null ;
									  		var frequency = [];
											for (var indx in carpolFrequencies){
												if(cpId == null){
													cpId = carpolFrequencies[indx].carpool_id;
													frequency.push(carpolFrequencies[indx]);
												} else {
													if (carpolFrequencies[indx].carpool_id == cpId){
														frequency.push(carpolFrequencies[indx]);
									
													} else {
														drives[carpolFrequencies[indx - 1].carpool_id]["frequencies"] = frequency;
														frequency = [];
														frequency.push(carpolFrequencies[indx]);
														cpId = carpolFrequencies[indx].carpool_id;
													} 
												}												
											}
											drives[carpolFrequencies[indx].carpool_id]["frequencies"] = frequency;
											console.log('drives -->' + JSON.stringify(drives));
											console.log('single -->' + JSON.stringify(singleDrives));
											for (var key in drives) {
												singleDrives.push(drives[key]);
									    	}
											console.log('SingleDrvies -->' + JSON.stringify(singleDrives));
									    	res.send(200, singleDrives);
									    	connection.release();
									  		}
									  		else{
									  			res.send(200, singleDrives);
										    	connection.release();
										    	return;
									  		}
									  	}
							  		}); //end of carpool frequencies
						  		} else {
						  			res.send(200,singleDrives );
						  			connection.release();
						  		}						  	
				  	} //end of uDrive query if
		  	  }); //uDrive query
	  }); //end of pool connection
}; //end of function uDrive


exports.cancelConfimedRideByDriver = function(req, res, next) {
	pool.getConnection(function(err, connection) {		
		connection.query('SELECT * FROM ucorsa.Ride rd where rd.id = ? and  rd.ride_status = 5;',
				[req.body.reply.ride_id], function(err, rows) {
					if (err) {
						return next(err);
					} else {
						logger.info( JSON.stringify(rows));
						if(rows.length)
							{
							logger.info( "has rows");
							res.send(200,"Ride Already Cancelled by other driver");
							return;
							}
						connection.beginTransaction(function(err) {
							if (err) { throw err; }
						 async.waterfall([
						       		   function(callback){
						       			   logger.info("Reading data from Authentication table ");
						       		   connection.query('select * from Authentication where user_login = ?',[req.userId],
						       				function(err, userRows) {
						       		   			if (err) {
						       		   				return connection.rollback(function() {
						       		   					throw next(err);		           							
						       		   				});
						       		   			}else {     
						       		   				logger.info("Data from table ---> "+ JSON.stringify(userRows));
						       						callback(null, userRows);
						       					}
						       						
						       		   		});
						       		     
						       		   },
						       		function(user,callback){
						       			   logger.info("Updating the ride_status in ride table");
						       		   connection.query('update ucorsa.Ride rd set rd.ride_status = 5 where rd.id = ?;'
						       				   ,[req.body.reply.ride_id],
						       				function(err, userRows) {
						       		   			if (err) {
						       		   				return connection.rollback(function() {
						       		   					throw next(err);		           							
						       		   				});
						       		   			}else {     
						       		   				logger.info("Data from table ---> "+ JSON.stringify(userRows));
						       						callback(null, user);
						       					}
						       						
						       		   		});
						       		     
						       		   },
						       		function(user,callback){
						       			   logger.info("Updating the ride_drivers table");
						       		   connection.query('update ucorsa.Ride_Drivers rd set rd.Ride_Status = 5 where rd.Ride_id = ? and rd.Driver_id = ?;'
						       				   ,[req.body.reply.ride_id,user[0].user_id],
						       				function(err, userRows) {
						       		   			if (err) {
						       		   				return connection.rollback(function() {
						       		   					throw next(err);		           							
						       		   				});
						       		   			}else {     
						       		   				logger.info("Data from table ---> "+ JSON.stringify(userRows));
						       						callback(null, user);
						       					}
						       						
						       		   		});
						       		     
						       		   },
						       		function(user,callback){
						       			   logger.info("Finding Rider_id and driverName for sending notification");
						       			   const findRiderId = 'Select rd.rider_id from ucorsa.Ride rd where rd.id = ?';
						       			   const findDriverName = 'select usr.first_name FROM  ucorsa.Users usr where id = ?'; 
						       			logger.info("Ride id  --->  "+ JSON.stringify(req.body));
						       			logger.info("Driver id  --->  "+ user[0].user_id);
						       		   connection.query('Select rd.id, rd.rider_id,rd.uRideType from ucorsa.Ride rd where rd.id = ?;select usr.first_name FROM  ucorsa.Users usr where id = ?',[req.body.reply.ride_id,user[0].user_id],
						       				function(err, dataRows) {
						       		   			if (err) {
						       		   				return connection.rollback(function() {
						       		   					throw next(err);		           							
						       		   				});
						       		   			}else {     
						       		   				logger.info("Data from table ---> "+ JSON.stringify(dataRows));
						       						callback(null, user,dataRows);
						       					}
						       						
						       		   		});
						       		     
						       		   },
						       		function(user, dataRows, callback){
						       			   if(dataRows[0][0].uRideType == 'C'){
						       			connection.query('update Carpool_Frequency set ride_status = 5 where carpool_id = ?',[dataRows[0][0].id],
							       				function(err, updateRows) {
							       		   			if (err) {
							       		   				return connection.rollback(function() {
							       		   					throw next(err);		           							
							       		   				});
							       		   			}else {     
							       		   				logger.info("Data from table ---> "+ JSON.stringify(updateRows));
							       						callback(null, user,dataRows);
							       					}
							       						
							       		   		});
						       			   }else{
						       				callback(null, user,dataRows);
						       			   }
						       		   },
						       		function(user, dataRows, callback){
						       			   logger.info("Finding notification_id for sending notification");						       			   
						       		   connection.query('Select notification_id from Users where id = ?',[dataRows[0][0].rider_id],
						       				function(err, Notification) {
						       		   			if (err) {
						       		   				return connection.rollback(function() {
						       		   					throw next(err);		           							
						       		   				});
						       		   			}else {     
						       		   			msg = dataRows[1][0].first_name + " cancelled your Ride Request " + ";" + req.body.reply.ride_id;								
												androidgcm.notifyMany('Ride Cancel',
														Notification[0].notification_id, msg);
												logger.info(msg);
						       						callback(null, 'success');
						       					}
						       						
						       		   		});
						       		     
						       		   }
						       		   ], function(err, id) {
						       		    	if (err) {
						       		    		connection.rollback(function() {						       		              
						       		    	    	return next(err);
						       		    	    });
						       		    	    res.send('Error inserting in all tables !!!!!!!!!');  
						       		    } else {
						       		    	connection.commit(function(err) {
						       		            if (err) { 
						       		              connection.rollback(function() {
						       		                throw err;
						       		              });
						       		            }
						       		          });
						       		    	logger.info(id);
						       		    	res.send(200,{"message" :"Ride Cancelled"});
						       		    }
						       			connection.release();
						       		});
						});
					}	
		});
	});
};

exports.cancelConfimedRideByDriver99 = function(req, res, next) {
	pool.getConnection(function(err, connection) {		
		connection.query('SELECT * FROM ucorsa.Ride rd where rd.id = ? and  rd.ride_status = 5; select * from Ride rd where rd.id = ?',
				[req.body.reply.ride_id, req.body.reply.ride_id], function(err, rows) {
					if (err) {
						return next(err);
					} else {
						logger.info( JSON.stringify(rows));
						if(rows[0].length)
							{
							logger.info( "has rows");
							res.send(200,"Ride Already Cancelled by other driver");
							return;
							}
						connection.beginTransaction(function(err) {
							if (err) { throw err; }
						 async.waterfall([
						       		   function(callback){
						       			   logger.info("Reading data from Authentication table ");
						       		   connection.query('select * from Authentication where user_login = ?',[req.userId],
						       				function(err, userRows) {
						       		   			if (err) {
						       		   				return connection.rollback(function() {
						       		   					throw next(err);		           							
						       		   				});
						       		   			}else {     
						       		   				logger.info("Data from table ---> "+ JSON.stringify(userRows));
						       						callback(null, userRows);
						       					}
						       						
						       		   		});
						       		     
						       		   },
						       		function(user,callback){
						       			   logger.info("Updating the ride_status in ride table");
						       		   connection.query('update ucorsa.Ride rd set rd.ride_status = 5 where rd.id = ?;'
						       				   ,[req.body.reply.ride_id],
						       				function(err, userRows) {
						       		   			if (err) {
						       		   				return connection.rollback(function() {
						       		   					throw next(err);		           							
						       		   				});
						       		   			}else {     
						       		   				logger.info("Data from table ---> "+ JSON.stringify(userRows));
						       						callback(null, user);
						       					}
						       						
						       		   		});
						       		     
						       		   },
						       		function(user,callback){
						       			   logger.info("Updating the ride_drivers table");
						       		   connection.query('update ucorsa.Ride_Drivers rd set rd.Ride_Status = 5 where rd.Ride_id = ? and rd.Driver_id = ?;'
						       				   ,[req.body.reply.ride_id,user[0].user_id],
						       				function(err, userRows) {
						       		   			if (err) {
						       		   				return connection.rollback(function() {
						       		   					throw next(err);		           							
						       		   				});
						       		   			}else {     
						       		   				logger.info("Data from table ---> "+ JSON.stringify(userRows));
						       						callback(null, user);
						       					}
						       						
						       		   		});
						       		     
						       		   },
						       		function(user,callback){
						       			   logger.info("Finding Rider_id and driverName for sending notification");
						       			   const findRiderId = 'Select rd.rider_id from ucorsa.Ride rd where rd.id = ?';
						       			   const findDriverName = 'select usr.first_name FROM  ucorsa.Users usr where id = ?'; 
						       			logger.info("Ride id  --->  "+ JSON.stringify(req.body));
						       			logger.info("Driver id  --->  "+ user[0].user_id);
						       		   connection.query('Select rd.id, rd.rider_id,rd.uRideType from ucorsa.Ride rd where rd.id = ?;select usr.first_name FROM  ucorsa.Users usr where id = ?',[req.body.reply.ride_id,user[0].user_id],
						       				function(err, dataRows) {
						       		   			if (err) {
						       		   				return connection.rollback(function() {
						       		   					throw next(err);		           							
						       		   				});
						       		   			}else {     
						       		   				logger.info("Data from table ---> "+ JSON.stringify(dataRows));
						       						callback(null, user,dataRows);
						       					}
						       						
						       		   		});
						       		     
						       		   },
						       		function(user, dataRows, callback){
						       			   if(dataRows[0][0].uRideType == 'C'){
						       			connection.query('update Carpool_Frequency set ride_status = 5 where carpool_id = ?',[dataRows[0][0].id],
							       				function(err, updateRows) {
							       		   			if (err) {
							       		   				return connection.rollback(function() {
							       		   					throw next(err);		           							
							       		   				});
							       		   			}else {     
							       		   				logger.info("Data from table ---> "+ JSON.stringify(updateRows));
							       						callback(null, user,dataRows);
							       					}
							       						
							       		   		});
						       			   }else{
						       				callback(null, user,dataRows);
						       			   }
						       		   },
						       		function(user, dataRows, callback){
						       			   logger.info("Finding notification_id for sending notification");						       			   
						       		   connection.query('Select notification_id from Users where id = ?',[dataRows[0][0].rider_id],
						       				function(err, Notification) {
						       		   			if (err) {
						       		   				return connection.rollback(function() {
						       		   					throw next(err);		           							
						       		   				});
						       		   			}else {     
						       		   			msg = dataRows[1][0].first_name + " cancelled your Ride Request " + ";" + req.body.reply.ride_id;								
												androidgcm.notifyMany('Ride Cancel',
														Notification[0].notification_id, msg);
												logger.info(msg);
												callback(null, user,dataRows);
						       					}
						       						
						       		   		});
						       		     
						       		   },
						       		function(user, dataRows, callback){
						       			   logger.info("Updating drive schedule status");						       			   
						       		   connection.query('Update Drive_Schedule set status = "A" where driver_id = ? \
						       				   and drive_date = ? and start_time <= ? and end_time >= ?;',
						       				   [user[0].user_id , rows[1][0].end_date, rows[1][0].ride_time, rows[1][0].ride_time],
						       				function(err, update) {
						       		   			if (err) {
						       		   				return connection.rollback(function() {
						       		   					throw next(err);		           							
						       		   				});
						       		   			}else {     
						       		   				logger.info("Drive schedule update" + JSON.stringify(update));
						       						callback(null, 'success');
						       					}						       						
						       		   		});						       		     
						       		   }
						       		   ], function(err, id) {
						       		    	if (err) {
						       		    		connection.rollback(function() {						       		              
						       		    	    	return next(err);
						       		    	    });
						       		    	    res.send('Error inserting in all tables !!!!!!!!!');  
						       		    } else {
						       		    	connection.commit(function(err) {
						       		            if (err) { 
						       		              connection.rollback(function() {
						       		                throw err;
						       		              });
						       		            }
						       		          });
						       		    	logger.info(id);
						       		    	res.send(200,{"message" :"Ride Cancelled"});
						       		    }
						       			connection.release();
						       		});
						});
					}	
		});
	});
};


exports.uDriveHistory99 = function(req, res,next){
	  var sortIndex = [];
	  var carpoolids = [];
	  pool.getConnection(function(err, connection){
		  console.log('utc : ' +  moment().utc().format("YYYY-MM-DD HH:mm:ss"));
	  	  connection.query( 'SELECT rid.id, rd.Driver_id,rid.rider_id as rider , rid.Description, usr.first_name,\
					rid.from_location, rid.to_location, rid.end_date, rid.start_date, rid.frequency, rid.uRideType, rid.ride_time,rs.ride_status\
	  			FROM ucorsa.Ride rid,ucorsa.Authentication auth ,ucorsa.Ride_Drivers rd,ucorsa.ride_status rs,ucorsa.Users usr\
	  			  where auth.user_login = ? \
	  			  and rd.Driver_id = auth.user_id \
	  			  and rid.id = rd.Ride_id\
                  and rid.Ride_Status = rs.id\
  			      and rid.rider_id = usr.id\
	  			  and (rid.ride_ts < ?  or rd.Ride_Status in(5,7))\
	  	          order by rid.end_date desc ,rid.ride_time desc;',	  			 
	  	   [req.userId, moment().utc().format("YYYY-MM-DD HH:mm:ss")],  function(err, rows){
	  		 if(err)	{
			  		connection.release();
			  		return next(err);
			  } else {
				  
				  try{
				  		var tempDrives = [];
				  		var page_count = parseInt(rows.length / 10);			  		
				  		if((rows.length % 10) > 0)
				  			page_count +=1; 			  		
				  		if(req.query.page < page_count){				  		
					  		 var nxt_page = parseInt(req.query.page) + 1;
					  		res.setHeader('nextPage', nxt_page);
					  		tempDrives = rows.slice((req.query.page -1)*10, (req.query.page *10));
					  	}  else if(req.query.page == page_count){
					  		res.setHeader('nextPage', 0 );
					  		tempDrives = rows.slice((req.query.page -1)*10, (req.query.page *10));
					  	}
				  		logger.info( "DRIVE &&&&& " + JSON.stringify(rows) + "tt " + moment().utc().format("YYYY-MM-DD HH:mm:ss") );
		  		 		
		  		 		for( var indx in tempDrives){
				  			if(tempDrives[indx].uRideType == 'C'){
				  				carpoolids.push(tempDrives[indx].id);
				  			}
				  			//drives[tempDrives[indx].id] = tempDrives[indx];
				  			sortIndex[tempDrives[indx].id] = indx;
				  		}
		  		 		
			  		}catch(e){
			  			console.log('catch --> ' + e)
			  		}
			  		console.log('before carpool id length')
			  		if( carpoolids.length > 0){
			  			connection.query( "select * from Carpool_Frequency where ride_ts_UTC > ? and carpool_id in (" + carpoolids.join(",") + ") order by carpool_id, date;",  	
						  	    [moment().utc().format("YYYY-MM-DD HH:mm:ss")],  function(err, carpolFrequencies){
								if(err)	{
							  		connection.release();
							  		return next(err);
							  	}else{
							  		if(carpolFrequencies.length){
							  			logger.info( "DRIVE &&&&& " + JSON.stringify(carpolFrequencies) );
								  		var cpId = null ;
								  		var frequency = [];
										for (var indx in carpolFrequencies){
											if(cpId == null){
												cpId = carpolFrequencies[indx].carpool_id;
												frequency.push(carpolFrequencies[indx]);
											} else {
												if (carpolFrequencies[indx].carpool_id == cpId){
													frequency.push(carpolFrequencies[indx]);
								
												} else {
													//drives[carpolFrequencies[indx - 1].carpool_id]["frequencies"] = frequency;
													tempDrives[sortIndex[cpId]]["frequencies"] = frequency;
													frequency = [];
													frequency.push(carpolFrequencies[indx]);
													cpId = carpolFrequencies[indx].carpool_id;
												} 
											}
										}
										if( cpId != null) {
											tempDrives[sortIndex[cpId]]["frequencies"] = frequency;
											//drives[carpolFrequencies[indx].carpool_id]["frequencies"] = frequency;
											//console.log('carpools -->' + JSON.stringify(tempDrives));
										}
										
							  		} //end of carpool frequency length
							  	} //end of frequey query if
			  			}); //end of frequency query
			  		} //end of carpoolid length
			  		console.log('before length check' + tempDrives.length);
			  		if( tempDrives.length){
			  			 res.send(200, tempDrives);
			  		 } else {
			  			 res.send(200, {"message" : "No Drive History Found"});
			  		 }
			  		connection.release();
			  } //end OF drive if
	  	}); //uDrive query
	 }); //end of pool connection
};


/*exports.uDriveHistory = function(req, res, next) {
	 pool.getConnection(function(err, connection){
	  	  connection.query( 'SELECT rid.id, rid.rider_id as rider , rid.Description, usr.first_name,\
					rid.from_location, rid.to_location, rid.end_date, rid.start_date, rid.frequency, rid.uRideType, rid.ride_time,rid.update_ts,rs.ride_status\
					  FROM ucorsa.Ride rid, ucorsa.Authentication auth,ucorsa.Ride_Drivers rd ,ucorsa.ride_status rs,ucorsa.Users usr\
	  			      where auth.user_login = ?\
                 and rd.Driver_id = auth.user_id\
	  			      and rid.id = rd.Ride_id\
                 and rd.Ride_Status = rs.id\
					  and rid.rider_id = usr.id\
	  			  and (rid.ride_ts < ?  or rd.Ride_Status = 5)\
	  			 order by rid.end_date desc ,rid.ride_time desc ;',
					  [req.userId, ,moment().utc().format("YYYY-MM-DD HH:mm:ss")],  function(err, rows){
			  	if(err)	{
			  		return next(err);
			  	}else{
			  		//logger.info( rows );
			  		var page_count = parseInt(rows.length / 10);			  		
			  		if((rows.length % 10) > 0)
			  			page_count +=1; 			  		
			  		if(req.query.page < page_count){				  		
				  		 var nxt_page = parseInt(req.query.page) + 1;
				  		res.setHeader('nextPage', nxt_page);
				  		 res.send(200, rows.slice((req.query.page -1)*10, (req.query.page *10)));				  		
				  		connection.release();
				  	   }
				  	   else if(req.query.page == page_count){
				  		 res.setHeader('nextPage', 0 );
				  		 res.send(200,rows.slice((req.query.page -1)*10, (req.query.page *10)));				  		
					  		connection.release();
				  		   }
				  	 else{
				  		 res.send(200,{"message" : "No Drive history"});
				  		connection.release();
				  	   }
				}
	  	  });
	});
};
*/
exports.addSchedule = function(req, res, next) {
	 pool.getConnection(function(err, connection){
		  connection.query('select * from Authentication where user_login = ?',[req.userId],
					function(err, phonerows) {
			   			if (err) {
			   				return  next(err);	
			   			}else {  
			   				logger.info( JSON.stringify(phonerows) );
			   				 const sql = 'INSERT INTO Drive_Schedule SET ?';			   				
			   					 var schedule = {
			   							driver_id : phonerows[0].user_id,
			   							drive_date : req.body.drive_date,
			   							start_time :moment( req.body.start_time , ["h:mm A"]).format("HH:mm:ss"),
			   							end_time   :moment( req.body.end_time , ["h:mm A"]).format("HH:mm:ss"),
			   							description:req.body.description,
			   							status : "A"
			   				 };
			   		  	  connection.query( sql ,
			   		  			JSON.parse(JSON.stringify(schedule)),  function(err, rows){
			   				  	if(err)	{
			   				  		return next(err);
			   				  	}else{
			   				  		logger.info( rows );
			   				  		res.send(200,{"message" :"Drive_schedule added"});
			   				  		connection.release();
			   				  	}
			   		  	  });
						}
							
			   		});
});
};


exports.getSchedule = function(req, res, next) {
	pool.getConnection(function(err, connection){
		connection.query('select * from Authentication where user_login = ?',[req.userId],
		function(err, phonerows) {
		  if (err) {
		  return  next(err);
		  }
		  else {  
					var sql;
					if(req.query.date && !req.query.start_time && !req.query.end_time)
					sql='select * from Drive_Schedule where driver_id =? and drive_date = ? and drive_date >= date(now()) order by drive_date  ';
					else if(req.query.date && req.query.start_time && !req.query.end_time)
					sql='select * from Drive_Schedule where driver_id =? and  drive_date = ? and start_time = ? and drive_date >= date(now()) order by drive_date ';
					else if(req.query.date && req.query.start_time && req.query.end_time)
					sql='select * from Drive_Schedule where driver_id = ? and  drive_date = ? and start_time = ? and end_time = ? and drive_date >= date(now()) order by drive_date ';
					else
					sql='select * from Drive_Schedule where driver_id = ? and drive_date >= date(now()) order by drive_date ';
					connection.query(sql,[ phonerows[0].user_id, req.query.date,req.query.start_time,req.query.end_time],
					function(err, rows) {
					  if (err) {
					  return  next(err);
					  }else {  
					  res.send(200,rows);
					  connection.release();
					}
					});
		  		}
		});
	});
};


exports.updateSchedule = function(req, res, next) {
	 pool.getConnection(function(err, connection){
		  connection.query('select * from Authentication where user_login = ?',[req.userId],
					function(err, phonerows) {
			   			if (err) {
			   				return  next(err);	
			   			}else {  
			   				logger.info( JSON.stringify(phonerows) );
			   				 const sql = 'UPDATE Drive_Schedule SET ? where id = ?';			   				
			   					 var schedule = {
			   							driver_id : phonerows[0].user_id,
			   							drive_date : req.body.drive_date,
			   							start_time :req.body.start_time,
			   							end_time   :req.body.end_time,
			   							description:req.body.description   						 
			   				 };
			   		  	  connection.query( sql ,
			   		  			[JSON.parse(JSON.stringify(schedule)),req.params.id],  function(err, rows){
			   				  	if(err)	{
			   				  		return next(err);
			   				  	}else{
			   				  		logger.info( rows );
			   				  		res.send(200,{"message" :"Drive_schedule Updated"});
			   				  		connection.release();
			   				  	}
			   		  	  });
						}
							
			   		});
});
};

exports.deleteSchedule = function(req, res, next) {
	 pool.getConnection(function(err, connection){
		 connection.query('select * from Authentication where user_login = ?',[req.userId],
					function(err, phonerows) {
			   			if (err) {
			   				return  next(err);	
			   			}else {  
							const sql='DELETE from Drive_Schedule where driver_id = ? and id = ? ';
							 connection.query(sql,[ phonerows[0].user_id, req.params.id],
										function(err, rows) {
								   			if (err) {
								   				return  next(err);	
								   			}else {  
								   				logger.info( rows );
								   				res.send(200,{"message": "Schedule Deleted"});
								   				connection.release();
											}
								   		});
			   			}
		 	});
	 });
};
