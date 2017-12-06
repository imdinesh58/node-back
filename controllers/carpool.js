/**
 * New node file
 */

var pool = require('../config/db');
var logger = require("../lib/logger");
var androidgcm = require("../controllers/androidpush");
var async = require('async');
var later = require('later');
var moment = require('moment');
var moment_timezone = require('moment-timezone');

exports.uCarpoolHistory = function(req, res,next){
	//var rides = [];
	var carPools = [];
	var sortIndex = [];
	// var singleRides = [];
	pool.getConnection(function(err, connection) {
		 async.waterfall([
		   function(callback){
			   connection.query('SELECT rid.id, rid.rider_id as rider ,rid.Description,  rid.update_ts,\
						rid.from_location, rid.to_location, rid.end_date, rid.start_date, rid.frequency, rid.uRideType, rid.ride_time,  rs.ride_status as ride_status \
						  FROM ucorsa.Ride rid, ucorsa.Authentication auth,ucorsa.ride_status rs\
		  			      where auth.user_login = ?\
		  			      and rid.rider_id = auth.user_id \
					      and uRideType = \'C\'\
		  	              and rs.id = rid.ride_status\
		  			  	 and (rid.ride_ts < ? or rid.ride_status in(5,7)) \
		  			 order by rid.end_date desc,rid.ride_time desc ;',
		  			 [req.userId,moment().utc().format("YYYY-MM-DD HH:mm:ss")],  function(err, rows){  
			   			if (err) {
			   				callback(err);
			   			} else {  
			   				try{
				   				console.log('Data from table ----->' + JSON.stringify(rows));
				   				var tempRides = [];
						  		var page_count = parseInt(rows.length / 10);			  		
						  		if((rows.length % 10) > 0)
						  			page_count +=1; 			  		
						  		if(req.query.page < page_count){				  		
							  		 var nxt_page = parseInt(req.query.page) + 1;
							  		res.setHeader('nextPage', nxt_page);
							  		tempRides = rows.slice((req.query.page -1)*10, (req.query.page *10));
							  	} else if(req.query.page == page_count){
							  		res.setHeader('nextPage', 0 );
							  		tempRides = rows.slice((req.query.page -1)*10, (req.query.page *10));
							  	}
						  		for( var indx in tempRides){
						  			if(tempRides[indx].uRideType == 'C'){
						  				carPools.push(tempRides[indx].id);
						  			}
						  			//rides[tempRides[indx].id] = tempRides[indx];
						  			sortIndex[tempRides[indx].id] = indx;
						  		}
						  		console.log('sort index : ' + JSON.stringify(sortIndex));
					  		}catch(e){
					  			console.log('catch --> ' + e)
					  		}
					  		callback(null,tempRides);
						}
							
			   		});
		     
		   },
		   function(tempRides,callback) {
			   if(sortIndex.length){
			   	   connection.query("Select usr.first_name, usr.last_name, Ride_id, Driver_id, rs.ride_status" +
			   	   		" from Ride_Drivers cp, Users usr, ucorsa.ride_status rs where cp.Driver_id = usr.id " +
			   	   		" and cp.Ride_Status = rs.id " +
			   	   		" and Ride_id in (" + Object.keys(sortIndex).join(",") + ") order by Ride_id",
					function(err, rows) {
						if (err) {
							console.log("the error is:" + JSON.stringify(err)) ;
							return next(err);
						}else {  
							console.log('Data from table ------>' + JSON.stringify(rows));
							try{
								var drivers = [];
								var cpId = null ;
								for (var indx in rows){
									if(cpId == null){
										cpId = rows[indx].Ride_id;
										drivers.push(rows[indx]);
									} else {
										if (rows[indx].Ride_id == cpId){
											drivers.push(rows[indx]);
						
										} else {
											//rides[rows[indx - 1].Ride_id]["drivers"] = drivers;
											tempRides[sortIndex[cpId]]["drivers"] = drivers;
											drivers = [];
											drivers.push(rows[indx]);
											cpId = rows[indx].Ride_id;
										} 
									}
								}
								if( cpId != null){
									tempRides[sortIndex[cpId]]["drivers"] = drivers;
								}
							}catch(ex){
								console.log("111 "+ex);
							}
							
							callback(null,tempRides);
						}
										
			   	   	});
			   }else {
				   callback(null, tempRides);
			   }

		   },
			function(tempRides,callback) {
			   console.log('cpcpcp ------>' + carPools);
			  if(carPools.length){
				connection.query("Select cf.*, rs.ride_status from Carpool_Frequency cf, ucorsa.ride_status rs where carpool_id in (" + carPools.join(",") + ") and cf.ride_status = rs.id order by carpool_id, date; ",
 					function(err, rows) {
 					if (err) {
						console.log("the error is:" + JSON.stringify(err)) ;
						return next(err);
					}else { 
						console.log("rows is:" + JSON.stringify(rows)) ;
						if(rows.length){
							console.log('Data from table ------>' + JSON.stringify(rows));
							var frequency = [];
							var cpId = null ;
							for (var indx in rows){
								if(cpId == null){
									cpId = rows[indx].carpool_id;
									frequency.push(rows[indx]);
								} else {
									if (rows[indx].carpool_id == cpId){
										frequency.push(rows[indx]);
					
									} else {
										//rides[rows[indx - 1].carpool_id]["frequencies"] = frequency;
										tempRides[sortIndex[cpId]]["frequencies"] = frequency;
										frequency = [];
										frequency.push(rows[indx]);
										cpId = rows[indx].carpool_id;
									} 
								}
							}
							tempRides[sortIndex[cpId]]["frequencies"] = frequency;
							callback(null, tempRides);
						}	else{
							//rides[rows[indx].carpool_id]["frequencies"]=[];
							callback(null, tempRides);
						}
					}
 				});
 			 } else{
				callback(null, tempRides);
			 }
		   }
		   
		   ], function(err, tempRides) {
			 if (err) {
		    		res.send(500,'Something bad happened');  
			    } else {
			    	if( tempRides.length){
			    		res.send(200, tempRides);
			    	} else {
			    		res.send(200, {"message" : "No Ride History"});
			    	}
			    }
		    	connection.release();
		 	}); //end of waterfall
	}); //end of connection pool
};
/**********************************************************************************************
 * getCarpool
 * input : userId from the token
 * output : get all carpool rides that has atleast one ride in the future
 **********************************************************************************************/

exports.getCarpool = function(req, res, next) {
	var carPools = [];
	pool.getConnection(function(err, connection) {
		 async.waterfall([
		   function(callback){
			   console.log("UTC "+ moment().utc().format("YYYY-MM-DD HH:mm:ss"));
			   connection.query( 'SELECT rid.id, rid.rider_id as rider ,rid.Description,  rid.update_ts,\
						  rid.from_location, rid.to_location, rid.end_date, rs.ride_status, rid.start_date, rid.frequency, rid.uRideType,rid.ride_time,rid.deviceTimeZone \
			  			  FROM ucorsa.Ride rid, ucorsa.ride_status rs, ucorsa.Authentication auth where auth.user_login = ? \
			  			      and rid.rider_id = auth.user_id \
			  			      and rid.ride_status in (1,2,4,6)\
					   		  and rid.ride_status = rs.id\
			  			  	  and rid.uRideType = \'C\'\
			  			      and ride_ts > ?\
			  			  	  order by rid.end_date desc ,rid.ride_time desc;',
		  			 [req.userId,moment().utc().format("YYYY-MM-DD HH:mm:ss")],  function(err, rows){  
			   			if (err) {
			   				callback(err);
			   			}else {  
			   				console.log('Data from table ----->' + JSON.stringify(rows));
			   				for (var indx in rows){
			   					carPools[rows[indx].id] = rows[indx]
			   				}
			   				callback(null);
						}
							
			   		});
		     
		   },
		   function(callback) {
			   if(carPools.length){
				   connection.query("Select Ride_id as Carpool_id, usr.first_name, usr.last_name, Ride_id as Ride_id, Driver_id, rs.ride_status" +
			   	   		" from Ride_Drivers cp, Users usr, ucorsa.ride_status rs where cp.Driver_id = usr.id " +
			   	   		"and cp.Ride_Status = rs.id " +
			   	   		"and Ride_id in (" + Object.keys(carPools).join(",") + ") order by Ride_id",
					function(err, rows) {
						if (err) {
							console.log("the error is:" + JSON.stringify(err)) ;
							return next(err);
						}else {  
							console.log('Data from table ------>' + JSON.stringify(rows));
							var drivers = [];
							var cpId = null ;
							for (var indx in rows){
								if(cpId == null){
									cpId = rows[indx].Carpool_id;
									drivers.push(rows[indx]);
								} else {
									if (rows[indx].Carpool_id == cpId){
										drivers.push(rows[indx]);
					
									} else {
										carPools[rows[indx - 1].Carpool_id]["drivers"] = drivers;
										drivers = [];
										drivers.push(rows[indx]);
										cpId = rows[indx].Carpool_id;
									} 
								}
							}
							console.log('INDEX ------>' + JSON.stringify(rows[indx]) + " " +Object.keys(carPools).join(","));
							carPools[rows[indx].Carpool_id]["drivers"] = drivers;
							callback(null);
						}
										
				});
				
		   		}else {
					   callback(null);
					   }
			},
			function(callback) {
				 if(carPools.length){					 
					connection.query("Select cf.*, rs.ride_status from Carpool_Frequency cf, ucorsa.ride_status rs where carpool_id in (" + Object.keys(carPools).join(",") + ") and cf.ride_status = rs.id order by cf.carpool_id, cf.date;",
	 					function(err, rows) {
	 					if (err) {
							console.log("the error is:" + JSON.stringify(err)) ;
							return next(err);
						}else {  
							console.log('Data from table ------>' + JSON.stringify(rows));
							var frequency = [];
							var cpId = null ;
							if (rows.length){
								for (var indx in rows){
									if(cpId == null){
										cpId = rows[indx].carpool_id;
										frequency.push(rows[indx]);
									} else {
										if (rows[indx].carpool_id == cpId){
											frequency.push(rows[indx]);
						
										} else {
											carPools[rows[indx - 1].carpool_id]["frequencies"] = frequency;
											frequency = [];
											frequency.push(rows[indx]);
											cpId = rows[indx].carpool_id;
										} 
									}
								}
								carPools[rows[indx ].carpool_id]["frequencies"] = frequency;
							}
							callback(null);
						}				
	 				});
				 }else {
					callback(null);
				 }
 			 }
		   
		   ], function(err) {
		    	if (err) {
		    		res.send('Something bad happened');  
			    } else {
			    	var carPool = [];
			    	for (var key in carPools) {
			    		 carPool.push(carPools[key]);
			    	}
			    	//carpools["carPools"] = carPool;
			    	//console.log(JSON.stringify(carpools));
			    	res.send(200, JSON.stringify(carPool));
			    }
		    	connection.release();
		 	}); //end of waterfall
	}); //end of connection pool
}; //end of getCarpool


exports.cancelConfimedCarpoolByDriver = function(req, res, next) {
	pool.getConnection(function(err, connection) {		
		connection.query('SELECT * FROM ucorsa.carpool rd where rd.id = ? and  rd.ride_status = 5;',
				[req.body.reply.carpool_id], function(err, rows) {
					if (err) {
						return next(err);
					} else {
						logger.info( JSON.stringify(rows));
						if(rows.length)
							{
							res.send(200,"Carpool Already Cancelled by other driver");
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
						       			   logger.info("Updating the ride_drivers table");
						       		   connection.query('update ucorsa.Carpool_Drivers rd set rd.Ride_Status = 5 where rd.Carpool_id = ? and rd.Driver_id = ?;'
						       				   ,[req.body.reply.carpool_id,user[0].user_id],
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
						       		   connection.query('Select rd.rider_id from ucorsa.carpool rd where rd.id = ?;select usr.first_name FROM  ucorsa.Users usr where id = ?',[req.body.reply.carpool_id,user[0].user_id],
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
						       			   logger.info("Finding notification_id for sending notification");						       			   
						       		   connection.query('Select notification_id from Users where id = ?',[dataRows[0][0].rider_id],
						       				function(err, Notification) {
						       		   			if (err) {
						       		   				return connection.rollback(function() {
						       		   					throw next(err);		           							
						       		   				});
						       		   			}else {     
						       		   			msg = dataRows[1][0].first_name + " cancelled your Ride Request " + ";" + req.body.reply.carpool_id;								
												androidgcm.notifyMany('Carpool Cancel',
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
						       		    	res.send(200,{"message" :"Carpool Cancelled"});
						       		    }
						       			connection.release();
						       		});
						});
					}	
		});
	});
};

exports.TrackRides = function(req, res,next){

	var carPools = [];
	pool.getConnection(function(err, connection) {
		 async.waterfall([
		   function(callback){
			   connection.query( 'SELECT rid.id, rid.rider_id as rider ,rid.Description,  rid.update_ts,\
						  rid.from_location, rid.to_location, rid.end_date, rid.start_date, rid.frequency,ucorsa.ride_status rs, rid.uRideType, rid.ride_time,rid.ride_status,rid.deviceTimeZone \
			  			  FROM ucorsa.Ride rid, ucorsa.ride_status rs, ucorsa.Authentication auth where auth.user_login = ? \
			  			      and rid.rider_id = auth.user_id \
			  			      and rid.ride_status in (1,2,4,6)\
					   	      and rid.uRideType = \'R\'\
					   		  and rid.ride_status = rs.id\
			  			  	  and ride_ts > ?\
			  			  	  order by rid.end_date desc ,rid.ride_time desc;',
		  			 [req.userId,moment().utc().format("YYYY-MM-DD HH:mm:ss")],  function(err, rows){  
			   			if (err) {
			   				callback(err);
			   			}else {  
			   				console.log('Data from table ----->' + JSON.stringify(rows));
			   				for (var indx in rows){
			   					carPools[rows[indx].id] = rows[indx]
			   				}
			   				callback(null);
						}
							
			   		});
		     
		   },
		   function(callback) {
			   if(carPools.length){
			   	   connection.query("Select cp.Ride_id as Carpool_id, usr.first_name, usr.last_name, Ride_id, Driver_id, Ride_Status from Ride_Drivers cp, Users usr where cp.Driver_id = usr.id and Ride_id in (" + Object.keys(carPools).join(",") + ") order by Ride_id",
					function(err, rows) {
						if (err) {
							console.log("the error is:" + JSON.stringify(err)) ;
							return next(err);
						}else {  
							console.log('Data from table ------>' + JSON.stringify(rows));
							var drivers = [];
							var cpId = null ;
							for (var indx in rows){
								if(cpId == null){
									cpId = rows[indx].Carpool_id;
									drivers.push(rows[indx]);
								} else {
									if (rows[indx].Carpool_id == cpId){
										drivers.push(rows[indx]);
					
									} else {
										carPools[rows[indx - 1].Carpool_id]["drivers"] = drivers;
										drivers = [];
										drivers.push(rows[indx]);
										cpId = rows[indx].Carpool_id;
									} 
								}
								carPools[rows[indx].Carpool_id]["drivers"] = drivers;
							}							
							callback(null);
						}									
				});
			   }else{
				   callback(null);
			   }
			},
			function(callback) {
				if(carPools.length){
				console.log('carPools ------>' + JSON.stringify(carPools));
				connection.query("Select * from Carpool_Frequency where carpool_id in (" + Object.keys(carPools).join(",") + ") order by carpool_id",
 					function(err, rows) {
 					if (err) {
						console.log("the error is:" + JSON.stringify(err)) ;
						return next(err);
					}else { 
						if(rows.length){
						console.log('Data from table ------>' + JSON.stringify(rows));
						var frequency = [];
						var cpId = null ;
						for (var indx in rows){
							if(cpId == null){
								cpId = rows[indx].carpool_id;
								frequency.push(rows[indx]);
							} else {
								if (rows[indx].carpool_id == cpId){
									frequency.push(rows[indx]);
				
								} else {
									carPools[rows[indx - 1].carpool_id]["frequencies"] = frequency;
									frequency = [];
									frequency.push(rows[indx]);
									cpId = rows[indx].carpool_id;
								} 
							}
						}
						carPools[rows[indx].carpool_id]["frequencies"] = frequency;
						callback(null);
						}	
						else{
							carPools[rows[indx].carpool_id]["frequencies"]=null;
							callback(null);
						}
					}
 				});
				}
				else{
					   callback(null);
				   }
 			 	}
		   
		   ], function(err) {
		    	if (err) {
		    		res.send('Something bad happened');  
			    } else {
			    var carpools = {};
			     var carPool = [];
			    	for (var key in carPools) {
			    	    carPool.push(carPools[key]);
			    	}
			    	carpools["carPools"] = carPool;
			    	res.send(200, JSON.stringify(carpools));
			    }
		    	connection.release();
		 	}); //end of waterfall
	}); //end of connection pool

};

exports.riderFrequencyCancel = function(req, res, next) {
	pool.getConnection(function(err, connection) {		
		connection.query('select notification_id from ucorsa.Users usr,  ucorsa.Ride_Drivers drv\
					where drv.Ride_id = ?\
					and drv.Ride_status =( 4 or 1)\
					and drv.Driver_id = usr.id;Select rd.id, rd.rider_id,rd.uRideType from ucorsa.Ride rd where rd.id = ?',
				[req.body.reply.ride_id, req.body.reply.ride_id,req.body.reply.ride_id], function(err, rows) {
					if (err) {
						return connection.rollback(function() {
   		   					throw next(err);
						});
					} else {
						logger.info( JSON.stringify(rows[0]));
						logger.info( JSON.stringify(rows[1]));
//						if(rows[0].length)
//							{
//							console.log("cancelled aleady");
//							res.send(200,"Ride Already Cancelled ");
//							return;
//							}						
					connection.beginTransaction(function(err) {
							  if (err) { throw err; }
						 async.waterfall([						       		   
						       		function(callback){
//						       			   logger.info("Updating the ride_status in ride table");
//						       		   connection.query('update ucorsa.Ride rd set rd.ride_status = 5 where rd.id = ?;'
//						       				   ,[req.body.reply.ride_id],
//						       				function(err, userRows) {
//						       		   			if (err) {
//						       		   				return connection.rollback(function() {
//						       		   					throw next(err);		           							
//						       		   				});
//						       		   			}else {     
//						       		   				logger.info("Data from table ---> "+ JSON.stringify(userRows));
						       						callback(null, rows[0],rows[1]);
//						       					}
//						       						
//						       		   		});
						       		     
						       		   },
						       		function(Notification,ride, callback){
						       			   logger.info("Updating the ride_drivers table");
//						       		   connection.query('update ucorsa.Ride_Drivers rd set rd.Ride_Status = 5 where rd.Ride_id = ? and rd.Ride_Status = 4;'
//						       				   ,[req.body.reply.ride_id],
//						       				function(err, userRows) {
//						       		   			if (err) {
//						       		   				return connection.rollback(function() {
//						       		   					throw next(err);		           							
//						       		   				});
//						       		   			}else {     
//						       		   				logger.info("Data from table ---> "+ JSON.stringify(userRows));
						       						callback(null, Notification,ride);
//						       					}
//						       						
//						       		   		});
						       		   },
						       		function(Notification, ride, callback){
						       			connection.query('update Carpool_Frequency set ride_status = 5, carpool_fare = 0.00, carpool_make_payment = 0 where id = ?',[req.body.reply.carpoolFrequency_id],
							       				function(err, updateRows) {
							       		   			if (err) {
							       		   				return connection.rollback(function() {
							       		   					throw next(err);		           							
							       		   				});
							       		   			}else {     
							       		   				logger.info("Data from table ---> "+ JSON.stringify(updateRows));
							       		   			callback(null, Notification,ride);
							       					}
							       						
							       		   		});				       		   
						       		   },
						       	function(Notification, ride, callback){
						       			msg = req.userId + " Cancelled your carpool Request ";
						       			logger.info(msg);
						       			if(Notification.length)
										androidgcm.notifyMany('Carpool Cancel' ,
												Notification[0].notification_id, msg);										
										callback(null, 'success');						       		     
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
						       		    	res.send(200,{"message" : "Ride Cancelled"});
						       		    }
						       			connection.release();
						       		});
						});	
					}
			});
	});
};
exports.driverFrequencyCancel = function(req, res, next) {
	pool.getConnection(function(err, connection) {		
//		connection.query('SELECT * FROM ucorsa.Ride rd where rd.id = ? and  rd.ride_status = 5;',
//				[req.body.reply.ride_id], function(err, rows) {
//					if (err) {
//						return next(err);
//					} else {
//						logger.info( JSON.stringify(rows));
//						if(rows.length)
//							{
//							logger.info( "has rows");
//							res.send(200,"Carpool Already Cancelled by other driver");
//							return;
//							}
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
//						       			   logger.info("Updating the ride_drivers table");
//						       		   connection.query('update ucorsa.Ride_Drivers rd set rd.Ride_Status = 5 where rd.Ride_id = ? and rd.Driver_id = ?;'
//						       				   ,[req.body.reply.ride_id,user[0].user_id],
//						       				function(err, userRows) {
//						       		   			if (err) {
//						       		   				return connection.rollback(function() {
//						       		   					throw next(err);		           							
//						       		   				});
//						       		   			}else {     
//						       		   				logger.info("Data from table ---> "+ JSON.stringify(userRows));
//						       						callback(null, user);
//						       					}
//						       						
//						       		   		});
						       			callback(null, user);
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
						       			connection.query('update Carpool_Frequency set ride_status = 5, carpool_fare = 0.00, carpool_make_payment = 0 where id = ?',[req.body.reply.carpoolFrequency_id],
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
						       		   			msg = dataRows[1][0].first_name + " cancelled your Carpool Request " + ";" + req.body.reply.carpoolFrequency_id;								
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
						       		    	res.send(200,{"message" :"Carpool Cancelled"});
						       		    }
						       			connection.release();
						       		});
						});
					//}	
		//});
	});

};

exports.carpoolStart = function(req, res,next){
	 pool.getConnection(function(err, connection){
		 logger.info("Json body---> "+ JSON.stringify(req.body));
		 async.waterfall([	function(callback){
		    			connection.query('update Carpool_Frequency set ride_status = 6 where id = ?;update Ride_Drivers set Ride_Status = 6 where Ride_id = ? and Ride_Status = 4;'
								   ,[req.body.carpoolFrequency_id, req.body.rideId],
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
					        function(userRows, callback) {							        	
								const sql = 'select * from ucorsa.Ride where id = ? ;';									
								connection.query(sql, [req.body.rideId], function(err,rideRows){
					        		if(err){
					        			return callback(true);
					        		} else {		
					        			logger.info(rideRows);
						                return callback(null, rideRows);
					        		}
					        	});
					        },
					        function(rideRows, callback) {							        	
								const sql = 'Select notification_id from Users where id = ? ';									
								connection.query(sql, [rideRows[0].rider_id], function(err,Notification){
					        		if(err){
					        			return callback(true);
					        		} else {					        			
					        			var msg = 'Your carpool from ' + rideRows[0].from_location + '  to ' 
					        			 			+ rideRows[0].to_location + ' has been started;'+req.body.rideId + ";" + req.body.carpoolFrequency_id;
					        			androidgcm.notifyMany('Carpool Started',Notification[0].notification_id, msg);
					        			logger.info(msg);
						                return callback(null, Notification);
					        		}
					        	});
					         }],function (err, Message) {		
								if (err) {
							    	connection.release();  
							    	return next(err);
							    }
								res.send(200,{"message" :"Notification has been sent"});
							});
	 			});
};





exports.carpoolStop = function(req, res,next){
	 pool.getConnection(function(err, connection){
		 logger.info("Req body  ---> "+ JSON.stringify(req.body));
		 logger.info("user body  ---> "+ JSON.stringify(req.userId));
		 var message = null;
		 var notificationId = null;
		 async.waterfall([	
			 function(callback){
				 connection.query('select user_id from Authentication auth \
						 where user_login = ?; select rd.*, notification_id  from ucorsa.Ride rd , Users usr where rd.id = ? and rd.rider_id = usr.id',
				[req.userId,req.body.rideId],
					function(err, rows) {
			   			if (err) {
			   				callback(err,null);
			   			}else {     
			   				logger.info("Data from table ---> "+ JSON.stringify(rows));
			   				message = 'Your Ride from ' + rows[1][0].from_location + '  to ' 
				 			   + rows[1][0].to_location + ' has been Stoped;'+ req.body.rideId + ";"+ req.body.carpoolFrequency_id;
			   				//riderId = rows[1].rider_id;
			   				//driverId = rows[0].user_id;
			   				console.log('message is : ' + message);
			   				
			   				notificationId = rows[1][0].notification_id;
			   				callback(null,rows[1][0].rider_id,rows[0][0].user_id);
						}
							
			   		});
			     
			 },
			 function(riderId, driverId,callback ){ 
				 console.log('driver id : ' + driverId + ' rider id ' + riderId);
				 console.log(' getting accounts');
     			 connection.query( 'select id,customer_id,update_ts from Accounts where  usr_id = ? order by update_ts desc  ', 
     					[riderId],  function(err, Accounts){
     				if(err)	{
     	  		  		callback(err,null);
     				} else {
	      				if(Accounts.length){
	      					logger.info("Data from table ---> "+ JSON.stringify(Accounts));
	      					var transactions = {};
	      					transactions.account_id = Accounts[0].id;
		      				transactions.customer_id = Accounts[0].customer_id;
		      				transactions.ride_id = req.body.rideId;
		      				transactions.driver_id = driverId;
		      			   	callback(null, transactions, driverId); 
	      				}
	      				else{
	      					logger.info("No Credit Card ");
	      					callback(new Error("No Credit Card"), 'Credit Card not found');
	      				}
     				}
     			 });
		   } ,
		   function(transactions, driverId, callback){ //get managed_id for drivers payment
			   console.log('transaction s :' + JSON.stringify(transactions));
			   console.log('driver id : ' + driverId);
			   var service ={};
			   if(req.body.hasOwnProperty("managedId")){
				   service.URL = 'select id,managed_id,update_ts from ManagedAccounts where  id = ? order by update_ts desc ;';
				   service.data = [req.body.managedId];
			   }else{
				   service.URL ='select id,managed_id,update_ts from ManagedAccounts where  usr_id = ? order by update_ts desc;'
				   service.data = [driverId];
			   }
 				connection.query( service.URL, service.data,   
		      		function(err, ManagedAccounts){
	      				if(err)	{
	      					callback(err,null);
	      				} else { 
	      					logger.info(" ManagedACCOUNT " +  JSON.stringify(ManagedAccounts));
		      				if(ManagedAccounts.length){
		      					transactions.managed_id = ManagedAccounts[0].id;
			      				transactions.maanged_account = ManagedAccounts[0].managed_id;					      				
			      			   	callback(null,transactions); 
		      				}
		      				else{
		      					callback(new Error("No Managed Account"),"No Managed Account");
		      				}
		      			}
 				 });
 				
	      	},
	      	function(transactions,  callback){  // create a charge		
     			connection.query('select RideFareAmount FROM ucorsa.RideFare where RideType = \'R\';' ,
     			function(err, fare){
					if(err)	{
     	  		  		callback(err,null);
     				} 	      
     				logger.info('fare *******    ' + JSON.stringify(fare));
     				transactions.amount = fare[0].RideFareAmount;
	      			transactions.status = "pending";
     				callback(null,transactions );
	      		});
     		},
     		function(transactions,  callback){  // Inserting data in table 
     			console.log("Transaction " + JSON.stringify(transactions));
     			connection.beginTransaction(function(err) {
     				connection.query('update Carpool_Frequency set ride_status = 7 where id = ?;update Ride_Drivers set Ride_Status = 7 where Ride_id = ? and Ride_Status = 6;'
						   ,[req.body.carpoolFrequency_id, req.body.rideId],
					function(err, userRows) {
			   			if (err) {
			   				connection.rollback(function() {
	    		                callback(err);
	    		            });
			   			}else {     
			   				logger.info("Data from table ---> "+ JSON.stringify(userRows));
			   				const sql = 'INSERT into Transactions SET ?;'
							connection.query( sql,[transactions],  function(err, rows){
							  	if(err)	{
							  		connection.rollback(function() {
			    		                callback(err);
			    		            });
							  	}else{	
							  		connection.commit(function(err) {
				    		            if (err) { 
				    		              connection.rollback(function() {
				    		                callback(err);
				    		              });
				    		            }
				    		        });
							  		callback(null);												
							  	}
							}); //end of transactions
						}
					}); //end of carpool frequency
     			}); //end of transaction
     		},
     		function(callback) {							        	
				androidgcm.notifyMany('Carpool Stopped',notificationId, message);
				logger.info(message);
                return callback(null); 
     		}
		 ], function (err, msg) {
			 if (err) {
			    	connection.release();  
			    	console.log('message : ' + msg);
			    	if (msg != null){
			    		res.send(500, {"message" : msg});
			    	} else {
			    		res.send(500, {"message" : "Server error"});
			    	}
			    	
			    } else {
					res.send(200,{"message" :"Notification has been sent"});
					connection.release();
				} 
		});

		 
	 }); //end of pool
}; //end of functions

exports.uCarpoolFare = function(req, res, next) {
	pool.getConnection(function(err, connection) {
		connection.query( 'select * from ucorsa.RideFare where RideType = \'C\';', function(err, rows) {
			if(err)	{
				return next(err);
			} else {
				res.send(200, rows);
				connection.release();
			}
		});
	});
};


exports.payments = function(req, res, next) {
	pool.getConnection(function(err, connection) {
		logger.info(" req.body  " + JSON.stringify(req.params));
		 async.waterfall([	
			 function(callback){
     			logger.info("First " + JSON.stringify(req.params));
				connection.query('SELECT * FROM ucorsa.Carpool_Frequency where id  = ? and carpool_id = ? ',[req.params.id,req.params.carpool_id], function(err, rows) {
					if (err) {
						logger.error("getCarpoolPaymentDate Error %%%% "+ err);
						return next(err);
					} else {
						logger.info("getCarpoolPaymentDate SUCCESS %%%% " + JSON.stringify(rows));
						logger.info("Payout Option: " + rows[0].carpool_payout_options );
						if( rows[0].carpool_make_payment == 1 ) {
							if( rows[0].carpool_payout_options == "Pay Per Ride" ) {
								// return this row.
								callback(null, rows[0].id, rows[0].carpool_id, rows[0].date, rows[0].date);
							}
							if( rows[0].carpool_payout_options == "Pay Per Week" ) {
								// get the data for this week.
								var rowDate = moment(rows[0].date).format("YYYY-MM-DD");
								var dd1 = moment(rowDate).format('d');
								logger.info("RowDate: " + rowDate);
								logger.info("DayOfWeek: " + dd1);
								var beginDate;
								var endDate;
								if( dd1 == 0 ) {
									beginDate = moment( rowDate ).format("YYYY-MM-DD");
									endDate = moment( rowDate ).add(6,'d').format("YYYY-MM-DD");
								}
								if( dd1 == 1 ) {
									beginDate = moment( rowDate ).subtract(1,'d').format("YYYY-MM-DD");
									endDate = moment( rowDate ).add(5,'d').format("YYYY-MM-DD");
								}
								if( dd1 == 2 ) {
									beginDate = moment( rowDate ).subtract(2,'d').format("YYYY-MM-DD");
									endDate = moment( rowDate ).add(4,'d').format("YYYY-MM-DD");
								}
								if( dd1 == 3 ) {
									beginDate = moment( rowDate ).subtract(3,'d').format("YYYY-MM-DD");
									endDate = moment( rowDate ).add(3,'d').format("YYYY-MM-DD");
								}
								if( dd1 == 4 ) {
									beginDate = moment( rowDate ).subtract(4,'d').format("YYYY-MM-DD");
									endDate = moment( rowDate ).add(2,'d').format("YYYY-MM-DD");
								}
								if( dd1 == 5 ) {
									beginDate = moment( rowDate ).subtract(5,'d').format("YYYY-MM-DD");
									endDate = moment( rowDate ).add(1,'d').format("YYYY-MM-DD");
								}
								if( dd1 == 6 ) {
									beginDate = moment( rowDate ).subtract(6,'d').format("YYYY-MM-DD");
									endDate = moment( rowDate ).format("YYYY-MM-DD");
								}
								logger.info("BeginDate: " + beginDate);
								logger.info("EndDate: " + endDate);
								callback(null, rows[0].id, rows[0].carpool_id, beginDate, endDate);
							}
							if( rows[0].carpool_payout_options == "Pay Per Month" ) {
								// get the data for this week.
								var rowDate = moment(rows[0].date).format("YYYY-MM-DD");
								logger.info("RowDate: " + rowDate);
								var yy1 = moment(rowDate).format('YYYY');
								var mn1 = moment(rowDate).format('MM');
								logger.info("YY1 : " + yy1);
								logger.info("MN1 : " + mn1);
								var str1 = yy1 + "-" + mn1 + "-" + "01";
								beginDate = moment( str1 ).format("YYYY-MM-DD");
								logger.info("BeginDate: " + beginDate);
								var str2 = yy1 + "-" + mn1 + "-" + "31";
								endDate = moment( str2 ).format("YYYY-MM-DD");
								logger.info("EndDate: " + endDate);
								callback(null, rows[0].id, rows[0].carpool_id, beginDate, endDate);
							}
						} else {
							logger.info("Don't need to make payments");
							callback(null, rows[0].id, rows[0].carpool_id, rows[0].date, rows[0].date);
						}
					}
      			});
			 },
			 function(id, carpool_id, start_date, end_date, callback) {
     			logger.info("Id " + id);
     			logger.info("Carpool_id " + carpool_id);
     			logger.info("Start_date " + start_date);
     			logger.info("End_date " + end_date);
     			connection.query('SELECT * FROM ucorsa.Carpool_Frequency where carpool_id = ?  and date >= ? and date <= ? ',[carpool_id, start_date, end_date], function(err, rows) {
					if(err)	{
     	  		  		callback(err,null);
     				} 	      
     				logger.info('Rows : ' + JSON.stringify(rows));
					var carpool_total = 0.0;
					for( var i = 0; i < rows.length; i++ ) {
						logger.info("index: " + i);
						logger.info("total : " + carpool_total);
						carpool_total += parseFloat(rows[i].carpool_fare);
						rows[i].carpool_fare = carpool_total.toString();
					}
     				callback(null,rows[rows.length-1] );
	      		});
			 }
		 ], function (err, msg) {
			 if (err) {
			    	connection.release();  
					logger.info("Query Failed.")
			    	console.log('message : ' + msg);
			    	if (msg != null){
			    		res.send(500, {"message" : msg});
			    	} else {
			    		res.send(500, {"message" : "Server error"});
			    	}
			    	
			    } else {
					logger.info("Query Successfull.")
					res.send(200,msg);
					connection.release();
					notifyTokens.forEach(function(token) {
						var msg = 'You Opted to get Paid on a ' + msg.carpool_payout_options + ' basis';  		
						androidgcm.notifyMany('Carpool Request',token, msg);
					});
				} 
		}); // end of waterfall
	});  // end of pool
}; // end of function


