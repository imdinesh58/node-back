var pool = require('../config/db');
var logger = require("../lib/logger");
var async = require('async');
var androidgcm = require("../controllers/androidpush");
var PNF = require('google-libphonenumber').PhoneNumberFormat;
var phoneUtil = require('google-libphonenumber').PhoneNumberUtil.getInstance();
var dateformat = require("../lib/dateformat");
var moment = require('moment');
var moment_timezone = require('moment-timezone');
var later = require('later');


exports.addRide = function (req, res, next) {
	pool.getConnection(function (err, connection) {
		logger.log('request : ' + JSON.stringify(req.body));
		var rideReq = req.body;
		var rideContacts = req.body.ride_request_to;
		var rideDrivers = [];
		var id_notification = [];
		var contactIds = [];
		var riderId;
		var notifyTokens = [];
		logger.info('ride contacts ' + JSON.stringify(rideContacts));
		for (var contact in rideContacts) {
			if (rideContacts[contact].type == 'S' || rideContacts[contact].type == 'I') {
				id_notification.push(rideContacts[contact].id);
			} else {
				contactIds.push(rideContacts[contact].id);
			}
		}
		logger.info(" the ride drivers : " + JSON.stringify(rideDrivers));
		logger.info(" the notification list : " + JSON.stringify(id_notification));
		logger.info("DATA " + JSON.stringify(rideReq));
		async.waterfall([
			//get user id(rider id) from the authentication table
			function (callback) {
				logger.info("Reading data from Authentication table ");
				connection.query('select * from ucorsa.Authentication where user_login = ?', [req.userId],
					function (err, phonerows) {
						if (err) {
							return next(err);
						} else {
							logger.info("Data from table ---> " + JSON.stringify(phonerows));
							riderId = phonerows[0].user_id;
							callback(null);
						}
					});
			},  //end of user id function
			//get driver id's for groups only
			function (callback) {
				logger.info("Reading data from Group table " + JSON.stringify(contactIds));
				if (contactIds.length > 0) {
					connection.query("SELECT usr_id FROM ucorsa.Group_Members where group_id in (" + contactIds.join(",") + ")",
						function (err, grouprows) {
							if (err) {
								return next(err);
							} else {
								logger.info("Data from table ---> " + JSON.stringify(grouprows));
								for (var indx in grouprows) {
									id_notification.push(grouprows[indx].usr_id);
								};
								logger.info(" Ride Drivers  --" + JSON.stringify(id_notification));
								callback(null);
							}
						});

				} else {
					callback(null);
				}

			},  //end of get drvier id'
			//get notifictation id
			function (callback) {
				logger.info('The notification list :' + JSON.stringify(id_notification));
				connection.query("Select * from Users where id  in (" + id_notification.join(",") + ")",
					function (err, row) {
						if (err) {
							logger.info(" getting notification id" + JSON.stringify(err));
							return next(err);
						} else {
							logger.info(" notification ids --" + JSON.stringify(row));
							for (var indx in row) {
								notifyTokens.push(row[indx].notification_id);
							};
						}
					});
				callback(null);
			},

			function (callback) {
				connection.beginTransaction(function (err) {
					var tz0 = moment.tz(rideReq.end_date + ' ' + rideReq.time, rideReq.deviceTimeZone);
					var tz1 = moment.utc(tz0);
					var rideObj = {
						from_location: rideReq.from_location,
						to_location: rideReq.to_location,
						start_date: rideReq.start_date,
						end_date: rideReq.end_date,
						ride_time: rideReq.time,
						frequency: rideReq.frequency,
						deviceTimeZone: rideReq.deviceTimeZone,
						no_of_riders: rideReq.no_of_riders,
						ride_status: 1,
						update_user: riderId,
						ride_ts: tz1.format('YYYY-MM-DD HH:mm:ss'),
						Description: rideReq.Description,
						rider_id: riderId,
						uRideType: rideReq.uRideType
					};
					logger.info('The carpool ride table data : ' + JSON.stringify(rideObj));
					connection.query('INSERT INTO Ride SET ?', JSON.parse(JSON.stringify(rideObj)),
						function (err, rows) {
							if (err) {
								return connection.rollback(function () {
									throw next(err);
								});
							} else {

								var values = [];
								for (var indx in id_notification) {
									var rideDriversObj = [];
									rideDriversObj.push(rows.insertId);
									rideDriversObj.push(id_notification[indx]);
									rideDriversObj.push(1);
									values.push(rideDriversObj);
								}

								connection.query("INSERT INTO Ride_Drivers (Ride_id,Driver_id, Ride_status) VALUES ?", [values], function (err, result) {
									if (err) {
										console.log(err);
										callback(err);
									}
									connection.commit(function (err) {
										if (err) {
											connection.rollback(function () {
												callback(err);
											});
										}
									});

								});
								if (rideReq.uRideType == 'C') {
									logger.info(" Ride table added " + rows.insertId);
									var rideId = rows.insertId;
									logger.info(rows);
									var msg = req.userId
										+ " Requested a Carpool from "
										+ rideReq.from_location
										+ " to " + rideReq.to_location
										+ " start " + rideReq.start_date
										+ " end " + rideReq.end_date
										+ " at " + rideReq.time
										+ " fare " + rideReq.carpool_fare
										+ " paid " + rideReq.carpool_fare_freq
										+ ";" + rows.insertId;
									logger.info("Message --->" + JSON.stringify(msg));

									var start = moment(rideReq.start_date, 'YYYY-M-D');
									var end = moment(rideReq.end_date, 'YYYY-M-D');
									var diffDays = end.diff(start, 'days');
									var splitDays = rideReq.frequency.split(",");
									var arr = [];
									for (var indx in splitDays) {
										arr.push(["DUM", "SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"].indexOf(splitDays[indx].toString().trim()));
									}

									var sched = later.parse.recur().on(arr.sort()).dayOfWeek();
									console.log('**********diff days **********' + diffDays);
									var next = later.schedule(sched).next((diffDays + 1), new Date(start.format("YYYY-MM-DD")), new Date(end.format("YYYY-MM-DD")));
									values = [];
									logger.info("NExt data : " + JSON.stringify(next));
									var dateString = null;
									for (var indx = 0; indx < next.length; indx++) {
										dateString = new Date(next[indx].toString());
										tz0 = moment.tz(dateString.getFullYear() + '-' + ("0" + (dateString.getMonth() + 1)).slice(-2) + '-' + ("0" + dateString.getDate()).slice(-2) + ' ' + rideReq.time, rideReq.deviceTimeZone);
										tz1 = moment.utc(tz0);
										var carPoolDriveObj = [];
										carPoolDriveObj.push(rows.insertId);   // carpool_id
										carPoolDriveObj.push(dateString);      // date
										carPoolDriveObj.push(rideReq.time);    // time
										carPoolDriveObj.push(1);               // ride_status
										carPoolDriveObj.push(tz1.format('YYYY-MM-DD HH:mm:ss'));   // ride_ts_UTC
										carPoolDriveObj.push(rideReq.carpool_fare);                // carpool_fare
										carPoolDriveObj.push(rideReq.carpool_fare_freq);           // carpool_payout_freq
										if (rideReq.carpool_fare_freq == "Pay Per Ride") {
											logger.info("Pay is Per Ride");
											carPoolDriveObj.push(1);
										} else if (rideReq.carpool_fare_freq == "Pay Per Week") {
											logger.info("Pay is Per Week");
											var wk1 = moment(dateString).format('ww');
											var wk2;
											if (indx < (next.length - 1)) {
												wk2 = moment(new Date(next[indx + 1].toString())).format('ww');
											} else {
												wk2 = moment(dateString).format('ww');
											}
											if ( (wk1 < wk2) || (indx == (next.length - 1)) ) {
												carPoolDriveObj.push(1);
											} else {
												carPoolDriveObj.push(0);
											}
										} else if (rideReq.carpool_fare_freq == "Pay Per Month") {
											logger.info("Pay is Per Month");
											var mn1 = moment(dateString).format('MM');
											var mn2;
											if (indx < (next.length - 1)) {
												mn2 = moment(new Date(next[indx + 1].toString())).format('MM');
											} else {
												mn2 = moment(dateString).format('MM');
											}
											if ( (mn1 < mn2) || (indx == (next.length - 1)) ) {
												carPoolDriveObj.push(1);
											} else {
												carPoolDriveObj.push(0);
											}
										} else {
											logger.info("Default value : Pay is Per Ride");
											carPoolDriveObj.push(0);
											carPoolDriveObj.push('Pay Per Ride');
											carPoolDriveObj.push(0);
										}
										values.push(carPoolDriveObj);
									}
									console.log("vvvv " + JSON.stringify(values));
									if (values.length) {
										connection.query("INSERT INTO Carpool_Frequency (Carpool_id,date, time, Ride_Status,ride_ts_UTC,carpool_fare,carpool_payout_options,carpool_make_payment) VALUES ?", [values], function (err, result) {
											if (err) {
												console.log("INSERT INTO Carpool_Frequency ERROR %%%%%%%   " + err);
												logger.info("INSERT INTO Carpool_Frequency ERROR %%%%%%%   " + rows);
												return next(err);
											}
											notifyTokens.forEach(function (token) {
												androidgcm.notifyMany('Carpool Request', token, msg);
											});
											callback(null);
										});
									} else {
										callback(null);
									}

								}//end of uridetype
								else {
									logger.info(" Ride table added " + rows.insertId);
									var rideId = rows.insertId;
									logger.info(rows);
									var msg = req.userId
										+ " Requested a ride from "
										+ rideReq.from_location
										+ " to " + rideReq.to_location
										+ " on " + rideReq.end_date
										+ " at " + rideReq.time + ";" + rows.insertId;
									logger.info("Message --->" + JSON.stringify(msg));
									notifyTokens.forEach(function (token) {
										androidgcm.notifyMany('Ride Request', token, msg);
									});
									callback(null);

								}//end of ride else
							} //end of carpool else
						}); //end of outer query
				});//end of begin transaction

			}

		], function (err) {
			if (err) {
				connection.rollback(function () {
					//throw err;
					return next(err);
				});
				res.send('Error inserting in all tables !!!!!!!!!');
			} else {
				connection.commit(function (err) {
					if (err) {
						connection.rollback(function () {
							throw err;
						});
					}
				});
				res.send(200, { "message": "Request Success" });
			}
			connection.release();
		}); //end of waterfall
	}); // end of pool get connections
}; // end of function




exports.test = function (req, res, next) {
	pool.getConnection(function (err, connection) {
		var user_id = req.userId
		var ride_id = req.body.ride.ride_id;
		var myCon = connection;
		async.waterfall([
			updateRideStatus(connection, ride_id, user_id, 2).bind(null, myCon),
		], function (err, id) {
			if (err) {
				connection.rollback(function () {
					return next(err);
				});
				res.send('Error inserting in all tables !!!!!!!!!');
			} else {
				connection.commit(function (err) {
					if (err) {
						connection.rollback(function () {
							throw err;
						});
					}
				});
				logger.info(id);
				res.send(200, { "message": "Ride replied" });
			}
			connection.release();
		}); // async waterfall
	}); //connection
};

function updateRideStatus(connection, ride_id, user_id, rideStatus) {
	console.log('I am in updateRideStatus ..........');
	console.log(' req ride id : ' + ride_id);
	console.log(' req user id : ' + user_id);
	console.log(' ride status : ' + rideStatus);
	connection.query('update ucorsa.Ride_Drivers rd set rd.Ride_Status = ?\
	           where rd.Ride_id = ? and rd.Driver_id = (\
	              select user_id from ucorsa.Authentication\
	              where user_login = ?)'
		, [rideStatus, ride_id, user_id],
		function (err, userRows) {
			if (err) {
				console.log('the error in update .......' + err);
				return connection.rollback(function () {
					throw next(err);
				});
			} else {
				logger.info("Data from table ---> " + JSON.stringify(userRows));
				connection.commit(function (err) {
					if (err) {
						connection.rollback(function () {
							throw err;
						});
					}
				});
				callback(null);
			}
		});
}


exports.acceptRide = function (req, res, next) {
	pool.getConnection(function (err, connection) {
		var user_id;

		async.waterfall([
			function (callback) {
				connection.beginTransaction(function (err) {
					connection.query('update ucorsa.Ride_Drivers rd set rd.Ride_Status = 2\
		       					           where rd.Ride_id = ? and rd.Driver_id = (\
		       					              select user_id from ucorsa.Authentication\
		       					              where user_login = ?)'
						, [req.body.ride.ride_id, req.userId],
						function (err, userRows) {
							if (err) {
								return connection.rollback(function () {
									callback(err);
								});
							} else {
								logger.info("Data from table ---> " + JSON.stringify(userRows));
								connection.commit(function (err) {
									if (err) {
										connection.rollback(function () {
											throw err;
										});
									}
								});
								callback(null);
							}

						});
				});

			},
			//sender, ride id
			function (callback) {
				logger.info("Finding Rider_id and driverName for sending notification");
				const findRiderId = 'Select rd.rider_id from ucorsa.Ride rd where rd.id = ?';
				const findDriverName = 'select usr.first_name FROM  ucorsa.Users usr, ucorsa.Authentication auth where user_login = ? and auth.user_id = usr.id';
				connection.query('Select rd.rider_id, rd.uRideType from ucorsa.Ride rd where rd.id = ?;select usr.id,usr.first_name FROM  ucorsa.Users usr, ucorsa.Authentication auth where user_login = ? and auth.user_id = usr.id',
					[req.body.ride.ride_id, req.userId],
					function (err, dataRows) {
						if (err) {
							callback(err);
						} else {
							logger.info("Data from table ---> " + JSON.stringify(dataRows));
							logger.info("Driver Id ---> " + JSON.stringify(dataRows[1][0].id));
							user_id = dataRows[1][0].id;
							callback(null, dataRows);
						}

					});

			},
			function (dataRows, callback) {
				logger.info("Finding notification_id for sending notification");
				connection.query('Select notification_id from Users where id = ?', [dataRows[0][0].rider_id],
					function (err, Notification) {
						if (err) {
							callback(err);
						} else {
							var msg, title;
							if (dataRows[0][0].uRideType == 'R') {
								msg = dataRows[1][0].first_name + " Accepted your Ride Request " + ";" + req.body.ride.ride_id + ";" + user_id;
								title = 'Reply';
								logger.info(msg);
							} else {
								msg = dataRows[1][0].first_name + " Accepted your Carpool Request " + ";" + req.body.ride.ride_id + ";" + user_id;
								title = 'Carpool Reply';
								logger.info(msg);
							}
							androidgcm.notifyMany(title,
								Notification[0].notification_id, msg);
							callback(null, 'success');
						}

					});

			}
		], function (err, id) {
			if (err) {
				return next(err);
				res.send('Error inserting in all tables !!!!!!!!!');
			} else {

				logger.info(id);
				res.send(200, { "message": "Ride replied" });
			}
			connection.release();
		}); // async waterfall

	}); //connection
};


exports.confirmRide = function (req, res, next) {
	pool.getConnection(function (err, connection) {
		connection.query('SELECT * FROM ucorsa.Ride rd where rd.id = ? and  rd.ride_status = 4;SELECT * FROM ucorsa.Ride rd where rd.id = ?;SELECT * FROM ucorsa.Ride rd where rd.id = ?;',
			[req.body.reply.ride_id, req.body.reply.ride_id, req.body.reply.ride_id], function (err, rows) {
				if (err) {
					return next(err);
				} else {
					logger.info(JSON.stringify(rows));
					if (rows[0].length) {
						res.send(200, { "message": "Ride Already confirmed" });
						return;
					}
					connection.beginTransaction(function (err) {
						if (err) { throw err; }
						async.waterfall([
							function (callback) {
								logger.info("Reading data from Authentication table ");
								connection.query('select * from Authentication where user_login = ?', [req.userId],
									function (err, userRows) {
										if (err) {
											return connection.rollback(function () {
												throw next(err);
											});
										} else {
											logger.info("Data from table ---> " + JSON.stringify(userRows));
											callback(null, userRows);
										}

									});

							},
							function (user, callback) {
								logger.info("Updating the ride_status in ride and ride_drivers table");
								connection.query('update ucorsa.Ride rd set rd.ride_status = 4 where rd.id = ?;update ucorsa.Ride_Drivers rd set rd.Ride_Status = 4 where rd.Ride_id = ? and rd.Driver_id = ?'
									, [req.body.reply.ride_id, req.body.reply.ride_id, req.body.reply.driver_id],
									function (err, userRows) {
										if (err) {
											return connection.rollback(function () {
												throw next(err);
											});
										} else {
											logger.info("Data from table ---> " + JSON.stringify(userRows));
											callback(null, user);
										}

									});

							},
							function (user, callback) {
								if (rows[2][0].uRideType == 'C') {
									connection.query('update Carpool_Frequency set ride_status = 4 where carpool_id = ?', [req.body.reply.ride_id],
										function (err, updateRows) {
											if (err) {
												return connection.rollback(function () {
													throw next(err);
												});
											} else {
												logger.info("Data from table ---> " + JSON.stringify(updateRows));
												callback(null, user);
											}

										});
								} else {
									callback(null, user);
								}
							},
							function (user, callback) {
								logger.info("Finding Driver_id and driverName for sending notification");
								connection.query('select * FROM  ucorsa.Users usr where id = ?', [req.body.reply.driver_id],
									function (err, dataRows) {
										if (err) {
											return connection.rollback(function () {
												throw next(err);
											});
										} else {
											logger.info("Data from table ---> " + JSON.stringify(dataRows));
											callback(null, user, dataRows);
										}

									});

							},
							function (user, dataRows, callback) {
								logger.info("Finding notification_id for sending notification");
								connection.query('Select notification_id from Users where id = ?', [dataRows[0].id],
									function (err, Notification) {
										if (err) {
											return connection.rollback(function () {
												throw next(err);
											});
										} else {
											var title, msg;
											if (rows[2][0].uRideType == 'C') {
												msg = req.userId + " Confirmed your Carpool Request ";
												title = "Carpool Confirmation";
											} else {
												msg = req.userId + " Confirmed your Ride Request ";
												title = 'Ride Confirmation';
											}
											androidgcm.notifyMany(title,
												Notification[0].notification_id, msg);
											logger.info(msg);
											callback(null, user, dataRows);
										}

									});

							},
							function (user, dataRows, callback) {
								logger.info("Inserting into drive_schedule table");
								logger.info("DRIVE SCHEDULE " + JSON.stringify(rows[1][0]));
								var data = {
									driver_id: req.body.reply.driver_id,
									drive_date: rows[1][0].end_date,
									start_time: rows[1][0].ride_time,
									end_time: rows[1][0].ride_time,
									description: "Ride scheduled",
									status: "NA"
								}
								connection.query('Insert into Drive_Schedule set ? ', [data],
									function (err, drive) {
										if (err) {
											return connection.rollback(function () {
												throw next(err);
											});
										} else {
											logger.info(drive);
											callback(null, 'success');
										}

									});

							}
						], function (err, id) {
							if (err) {
								connection.rollback(function () {
									return next(err);
								});
								res.send('Error inserting in all tables !!!!!!!!!');
							} else {
								connection.commit(function (err) {
									if (err) {
										connection.rollback(function () {
											throw err;
										});
									}
								});
								logger.info(id);
								res.send(200, { "message": "Ride Confirmed" });
							}
							connection.release();
						});
					});
				}
			});
	});

};


exports.cancelConfimedRideByRider = function (req, res, next) {
	pool.getConnection(function (err, connection) {
		connection.query('SELECT * FROM ucorsa.Ride rd where rd.id = ? and  rd.ride_status = 5;',
			[req.body.reply.ride_id], function (err, rows) {
				if (err) {
					return connection.rollback(function () {
						throw next(err);
					});
				} else {
					logger.info("request body " + JSON.stringify(req.body));
					logger.info(JSON.stringify(rows));
					if (rows.length) {
						res.send(200, "Ride Already Cancelled ");
						return;
					}
					connection.beginTransaction(function (err) {
						if (err) { throw err; }
						async.waterfall([
							function (callback) {
								logger.info("Finding notification_id for sending notification");
								connection.query('select notification_id from ucorsa.Users usr,  ucorsa.Ride_Drivers drv\
							       					where drv.Ride_id = ?\
							       					and drv.Ride_status = 4\
							       					and drv.Driver_id = usr.id;', [req.body.reply.ride_id],
									function (err, Notification) {
										if (err) {
											return connection.rollback(function () {
												throw next(err);
											});
										} else {
											logger.info("Notification " + JSON.stringify(Notification));
											callback(null, Notification);
										}

									});

							},
							function (Notification, callback) {
								logger.info("Updating the ride_status in ride table");
								connection.query('update ucorsa.Ride rd set rd.ride_status = 5 where rd.id = ?;'
									, [req.body.reply.ride_id],
									function (err, userRows) {
										if (err) {
											return connection.rollback(function () {
												throw next(err);
											});
										} else {
											logger.info("Data from table ---> " + JSON.stringify(userRows));
											callback(null, Notification);
										}

									});

							},
							function (Notification, callback) {
								logger.info("Updating the ride_drivers table");
								connection.query('update ucorsa.Ride_Drivers rd set rd.Ride_Status = 5 where rd.Ride_id = ? and rd.Ride_Status = 4;'
									, [req.body.reply.ride_id],
									function (err, userRows) {
										if (err) {
											return connection.rollback(function () {
												throw next(err);
											});
										} else {
											logger.info("Data from table ---> " + JSON.stringify(userRows));
											callback(null, Notification);
										}

									});
								callback(null, Notification);

							},
							function (Notification, callback) {
								var msg = req.userId + " Cancelled your Ride Request ";
								logger.info(msg);
								androidgcm.notifyMany('Ride Cancel',
									Notification[0].notification_id, msg);
								callback(null, 'success');
							}
						], function (err, id) {
							if (err) {
								connection.rollback(function () {
									return next(err);
								});
								res.send('Error inserting in all tables !!!!!!!!!');
							} else {
								connection.commit(function (err) {
									if (err) {
										connection.rollback(function () {
											throw err;
										});
									}
								});
								logger.info(id);
								res.send(200, { "message": "Ride Cancelled" });
							}
							connection.release();
						});
					});
				}
			});
	});
};


exports.uRides = function (req, res, next) {
	pool.getConnection(function (err, connection) {
		logger.info("The utc time is : " + moment().utc().format("YYYY-MM-DD HH:mm:ss"));
		connection.query('SELECT rid.id, rid.rider_id as rider ,rid.Description,  rid.update_ts,\
						  rid.from_location, rid.to_location, rid.end_date, rid.start_date, rid.frequency, rid.uRideType, rid.ride_time,rid.ride_status,rs.ride_status, rid.deviceTimeZone \
		  			  FROM ucorsa.Ride rid,ucorsa.ride_status rs, ucorsa.Authentication auth where auth.user_login = ? \
		  			      and rid.rider_id = auth.user_id \
		  			      and rid.ride_status in (1,2,4,6)\
		  			  	  and rid.uRideType = \'R\'\
		  			  	  and rid.ride_status = rs.id\
		  			      and ride_ts > ?\
		  			  	  order by rid.end_date desc ,rid.ride_time desc;',
			[req.userId, moment().utc().format("YYYY-MM-DD HH:mm:ss")], function (err, rows) {   //, moment().utc().format("YYYY-MM-DD H:mm:ss")
				if (err) {
					logger.info("Error******   " + JSON.stringify(err));
					return next(err);
				} else {
					logger.info(" Rows   " + JSON.stringify(rows) + "ts " + moment().utc().format("YYYY-MM-DD HH:mm:ss"));
					if (rows.length) {
						/*for(i=0;i< rows.length; i++){
							logger.info("@@@@@@@@@@@@@@@@ i " + i);
							logger.info("******moment    " + moment().format('YYYY-MM-DD H:mm:ss'));
							logger.info("****** timezone " + JSON.stringify(rows[i].deviceTimeZone));
							var newRows = moment_timezone.tz(moment().format('YYYY-MM-DD H:mm:ss'),JSON.stringify(rows[i].deviceTimeZone)).format('YYYY-MM-DD H:mm:ss');
							logger.info( "&&&&&&& newRows 4%%%%%  " + newRows);
						} */

						logger.info(rows);
						var objectArray = [];
						const sql = ' select rd.Driver_id, usr.first_name  as driverName,  rs.ride_status\
		  					From ucorsa.Users usr,\
		  					ucorsa.Ride_Drivers rd,ride_status rs\
		  					where rd.Ride_id = ?\
				  			and rd.Driver_id = usr.id\
		  					and rd.Ride_Status = rs.id\
				  			and rs.id <> 5 ';
						var rides = [];
						var i = 0;
						async.each(rows, function (row, callback) {
							connection.query(sql, [row.id], function (err, ride_Driverrows) {
								if (err) {
									return next(err);
								} else {
									row.drivers = ride_Driverrows;
									rides.push(row);
									callback();
								}
							});
						}, function (err) {
							if (err) {
								console.log('Failed');
								connection.release();
								res.send(500, " Error in code");
							} else {
								//rideObject.rides = rides;
								console.log('Urides returned');
								res.send(200, rides);
								connection.release();
							}
						});
					}
					else {
						res.send(200, rows);
						connection.release();
					}

				}
			});
	});
};

exports.uRides99 = function (req, res, next) {
	var rides = [];
	var carPools = [];
	pool.getConnection(function (err, connection) {
		async.waterfall([
			function (callback) {
				connection.query('SELECT rid.id, rid.rider_id as rider ,rid.Description,  rid.update_ts,\
						  rid.from_location, rid.to_location, rid.end_date, rid.start_date, rid.frequency, rid.uRideType, rid.ride_time,rid.ride_status,rs.ride_status, rid.deviceTimeZone \
			  			  FROM ucorsa.Ride rid,ucorsa.ride_status rs, ucorsa.Authentication auth where auth.user_login = ? \
			  			      and rid.rider_id = auth.user_id \
			  			      and rid.ride_status in (1,2,4,6)\
			  			  	  and rid.ride_status = rs.id\
			  			      and ride_ts > ?\
			  			  	  order by rid.end_date desc ,rid.ride_time desc;',
					[req.userId, moment().utc().format("YYYY-MM-DD HH:mm:ss")], function (err, rows) {
						if (err) {
							callback(err);
						} else {
							console.log('Data from table ----->' + JSON.stringify(rows));
							for (var indx in rows) {
								rides[rows[indx].id] = rows[indx]
								if (rows[indx].uRideType == 'C') {
									carPools.push(rows[indx].id);
								}
							}
							callback(null);
						}

					});

			},
			function (callback) {
				if (rides.length) {
					connection.query("Select usr.first_name, usr.last_name, Ride_id, Driver_id, rs.ride_status" +
						" from Ride_Drivers cp, Users usr, ucorsa.ride_status rs where cp.Driver_id = usr.id " +
						" and cp.Ride_Status = rs.id " +
						" and Ride_id in (" + Object.keys(rides).join(",") + ") order by Ride_id",
						function (err, rows) {
							if (err) {
								console.log("the error is:" + JSON.stringify(err));
								return next(err);
							} else {
								console.log('Data from table ------>' + JSON.stringify(rows));
								try {
									var drivers = [];
									var cpId = null;
									for (var indx in rows) {
										if (cpId == null) {
											cpId = rows[indx].Ride_id;
											drivers.push(rows[indx]);
										} else {
											if (rows[indx].Ride_id == cpId) {
												drivers.push(rows[indx]);

											} else {
												rides[rows[indx - 1].Ride_id]["drivers"] = drivers;
												drivers = [];
												drivers.push(rows[indx]);
												cpId = rows[indx].Ride_id;
											}
										}
									}
									console.log('After the loop ------>' + indx);
									console.log(' rides ' + JSON.stringify(rides));
									rides[rows[indx - 1].Ride_id]["drivers"] = drivers;
								} catch (ex) {
									console.log("111 " + ex);
								}

								callback(null);
							}

						});
				} else {
					callback(null);
				}

			},
			function (callback) {
				console.log('cpcpcp ------>' + carPools);
				if (carPools.length) {
					connection.query("Select cf.*, rs.ride_status from Carpool_Frequency cf, ucorsa.ride_status rs where carpool_id in (" + carPools.join(",") + ") and cf.ride_status = rs.id",
						function (err, rows) {
							if (err) {
								console.log("the error is:" + JSON.stringify(err));
								return next(err);
							} else {
								console.log("rows is:" + JSON.stringify(rows));
								if (rows.length) {
									console.log('Data from table ------>' + JSON.stringify(rows));
									var frequency = [];
									var cpId = null;
									for (var indx in rows) {
										if (cpId == null) {
											cpId = rows[indx].carpool_id;
											frequency.push(rows[indx]);
										} else {
											if (rows[indx].carpool_id == cpId) {
												frequency.push(rows[indx]);

											} else {
												rides[rows[indx - 1].carpool_id]["frequencies"] = frequency;
												frequency = [];
												frequency.push(rows[indx]);
												cpId = rows[indx].carpool_id;
											}
										}
									}
									rides[rows[indx].carpool_id]["frequencies"] = frequency;
									callback(null);
								}
								else {
									//rides[rows[indx].carpool_id]["frequencies"]=[];
									callback(null);
								}
							}
						});
				}
				else {
					callback(null);
				}
			}

		], function (err) {
			if (err) {
				res.send('Something bad happened');
			} else {
				//var carpools = {};
				var carPool = [];
				for (var key in rides) {
					carPool.push(rides[key]);
				}
				res.send(200, JSON.stringify(carPool));
			}
			connection.release();
		}); //end of waterfall
	}); //end of connection pool
};


exports.rideDetails = function (req, res, next) {
	pool.getConnection(function (err, connection) {
		connection.query('select rid.id, rd.Driver_id, usr.first_name  as driverName,rid.Description, rn.notification, rs.ride_status\
		  			  From ucorsa.Ride rid, ucorsa.Authentication auth, ucorsa.Users usr, ucorsa.Ride_Notifications rn,\
		  			ucorsa.Ride_Drivers rd,ride_status rs\
		  			where rid.id = ?\
		  			and auth.user_login = ?\
		  			and rd.driver_id = usr.id\
		  			and rid.rider_id = auth.user_id \
		  			and rid.id = rd.Ride_id\
		  			and rid.id = rn.ride_id\
		  			and rd.Ride_Status = rs.id', [req.params.id, req.userId], function (err, rows) {
				if (err) {
					return next(err);
				} else {
					logger.info(rows);
					res.send(200, rows);
					connection.release();
				}
			});
	});
};





exports.TrackRides = function (req, res, next) {
	var rides = [];
	var carPools = [];
	pool.getConnection(function (err, connection) {
		async.waterfall([
			function (callback) {
				connection.query('SELECT rid.id, rid.rider_id as rider ,rid.Description,  \
						  rid.from_location, rid.to_location,rid.end_date, rid.start_date, rid.frequency, rid.uRideType,rid.ride_time,  rs.ride_status as ride_status \
						  FROM ucorsa.Ride rid, ucorsa.Authentication auth,ucorsa.ride_status rs\
		  			      where auth.user_login = ?\
		  			      and rid.rider_id = auth.user_id \
	                      and rs.id = rid.ride_status\
		  			  	  and rs.id in ( 4,6,7)  \
			    		  order by rid.update_ts desc;',
					[req.userId, moment().utc().format("YYYY-MM-DD HH:mm:ss")], function (err, rows) {
						if (err) {
							callback(err);
						} else {
							console.log('Data from table ----->' + JSON.stringify(rows));
							for (var indx in rows) {
								rides[rows[indx].id] = rows[indx]
								if (rows[indx].uRideType == 'C') {
									carPools.push(rows[indx].id);
								}
							}
							callback(null);
						}

					});

			},
			function (callback) {
				if (rides.length) {
					connection.query("Select usr.first_name, usr.last_name, Ride_id, Driver_id, Ride_Status from Ride_Drivers cp, Users usr where cp.Driver_id = usr.id and Ride_id in (" + Object.keys(rides).join(",") + ") order by Ride_id",
						function (err, rows) {
							if (err) {
								console.log("the error is:" + JSON.stringify(err));
								return next(err);
							} else {
								console.log('Data from table ------>' + JSON.stringify(rows));
								try {
									var drivers = [];
									var cpId = null;
									for (var indx in rows) {
										if (cpId == null) {
											cpId = rows[indx].Ride_id;
											drivers.push(rows[indx]);
										} else {
											if (rows[indx].Ride_id == cpId) {
												drivers.push(rows[indx]);

											} else {
												rides[rows[indx - 1].Ride_id]["drivers"] = drivers;
												drivers = [];
												drivers.push(rows[indx]);
												cpId = rows[indx].Ride_id;
											}
										}
									}
									console.log('After the loop ------>' + indx);
									console.log(' rides ' + JSON.stringify(rides));
									rides[rows[indx - 1].Ride_id]["drivers"] = drivers;
								} catch (ex) {
									console.log(ex);
								}

								callback(null);
							}

						});
				} else {
					callback(null);
				}

			},
			function (callback) {
				if (carPools.length) {
					connection.query("Select * from Carpool_Frequency where carpool_id in (" + carPools.join(",") + ") order by carpool_id, date;",
						function (err, rows) {
							if (err) {
								console.log("the error is:" + JSON.stringify(err));
								return next(err);
							} else {
								if (rows.length) {
									console.log('Data from table ------>' + JSON.stringify(rows));
									var frequency = [];
									var cpId = null;
									for (var indx in rows) {
										if (cpId == null) {
											cpId = rows[indx].carpool_id;
											frequency.push(rows[indx]);
										} else {
											if (rows[indx].carpool_id == cpId) {
												frequency.push(rows[indx]);

											} else {
												rides[rows[indx - 1].carpool_id]["frequencies"] = frequency;
												frequency = [];
												frequency.push(rows[indx]);
												cpId = rows[indx].carpool_id;
											}
										}
									}
									rides[rows[indx].carpool_id]["frequencies"] = frequency;
									callback(null);
								}
								else {
									rides[rows[indx].carpool_id]["frequencies"] = [];
									callback(null);
								}
							}
						});
				}
				else {
					callback(null);
				}
			}

		], function (err) {
			if (err) {
				res.send('Something bad happened');
			} else {
				var carPool = [];
				for (var key in rides) {
					carPool.push(rides[key]);
				}
				res.send(200, JSON.stringify(carPool));
			}
			connection.release();
		}); //end of waterfall
	}); //end of connection pool
};

var rideNotification_StatusOfRide = exports.rideNotification_StatusOfRide = function (rideid, ride_status, msg) {
	if (rideid) {
		pool.getConnection(function (err, connection) {
			var rideObj = {
				ride_id: rideid,
				ride_status_id: ride_status,
				notification: msg
			}
			connection.query('INSERT INTO Ride_Notifications SET ?', JSON.parse(JSON.stringify(rideObj)), function (err, rows) {
				if (err) {
					logger.error(err);
					return next(err);
				} else {
					logger.info("Status changed ");
					connection.release();
				}
			});
		});
	}
};



/*exports.uRideHistory99 = function(req, res,next){
	var rides = [];
	var carPools = [];
	 var singleRides = [];

	pool.getConnection(function(err, connection) {
		 async.waterfall([
		   function(callback){
			   connection.query('SELECT rid.id, rid.rider_id as rider ,rid.Description,  rid.update_ts,\
						rid.from_location, rid.to_location, rid.end_date, rid.start_date, rid.frequency, rid.uRideType, rid.ride_time,  rs.ride_status as ride_status \
						  FROM ucorsa.Ride rid, ucorsa.Authentication auth,ucorsa.ride_status rs\
		  			      where auth.user_login = ?\
		  			      and rid.rider_id = auth.user_id \
		  	              and rs.id = rid.ride_status\
					   		and uRideType = \'R\'\
		  			  	 and (rid.ride_ts < ? or rid.ride_status = 7) \
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
						  			rides[tempRides[indx].id] = tempRides[indx];
						  		}
					  		}catch(e){
					  			console.log('catch --> ' + e)
					  		}
					  		callback(null);
						}

			   		});

		   },
		   function(callback) {
			   if(rides.length){
			   	   connection.query("Select usr.first_name, usr.last_name, Ride_id, Driver_id, rs.ride_status" +
			   	   		" from Ride_Drivers cp, Users usr, ucorsa.ride_status rs where cp.Driver_id = usr.id " +
			   	   		" and cp.Ride_Status = rs.id " +
			   	   		" and Ride_id in (" + Object.keys(rides).join(",") + ") order by Ride_id",
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
											rides[rows[indx - 1].Ride_id]["drivers"] = drivers;
											drivers = [];
											drivers.push(rows[indx]);
											cpId = rows[indx].Ride_id;
										}
									}
								}

								rides[rows[indx].Ride_id]["drivers"] = drivers;
								console.log(' rides ' + JSON.stringify(rides));
							}catch(ex){
								console.log("111 "+ex);
							}

							callback(null);
						}

			   	   	});
			   }else {
				   callback(null);
			   }

		   },
			function(callback) {
			   console.log('cpcpcp ------>' + carPools);
			  if(carPools.length){
				  console.log('i am in the loop');
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
										rides[rows[indx - 1].carpool_id]["frequencies"] = frequency;
										frequency = [];
										frequency.push(rows[indx]);
										cpId = rows[indx].carpool_id;
									}
								}
							}
							rides[rows[indx].carpool_id]["frequencies"] = frequency;
							callback(null);
						}	else{
							//rides[rows[indx].carpool_id]["frequencies"]=[];
							callback(null);
						}
					}
 				});
 			 } else{
 				 console.log('not in the if');
				callback(null);
			 }
		   }

		   ], function(err) {
			    console.log('i am in the fina l functions');
		    	if (err) {
		    		res.send('Something bad happened');
			    } else {
			    	//res.send(200, rides);
			    	var rideHistory = [];
			    	for (var key in rides) {
			    		rideHistory.push(rides[key]);
			    	}
			    	console.log('ride history length '  + rideHistory.length);
			    	if(rideHistory.length){
			    		res.send(200, rideHistory);
			    	} else {
			    		console.log('ia m sending no history');
			    		res.send(200, {"message" :"No uRideHistory Found"});
			    	}

			    }
		    	connection.release();
		 	}); //end of waterfall
	}); //end of connection pool
};
*/

exports.cancelConfimedRideByRiderTest = function (req, res, next) {
	pool.getConnection(function (err, connection) {
		connection.query('SELECT * FROM ucorsa.Ride rd where rd.id = ? and  rd.ride_status = 5;select notification_id from ucorsa.Users usr,  ucorsa.Ride_Drivers drv\
					where drv.Ride_id = ?\
					and drv.Ride_status =( 4 or 1)\
					and drv.Driver_id = usr.id;Select rd.id, rd.rider_id,rd.uRideType from ucorsa.Ride rd where rd.id = ?',
			[req.body.reply.ride_id, req.body.reply.ride_id, req.body.reply.ride_id], function (err, rows) {
				if (err) {
					return connection.rollback(function () {
						throw next(err);
					});
				} else {
					logger.info(JSON.stringify(rows[0]));
					logger.info(JSON.stringify(rows[1]));
					logger.info(JSON.stringify(rows[2]));
					if (rows[0].length) {
						res.send(200, "Ride Already Cancelled ");
						return;
					}
					connection.beginTransaction(function (err) {
						if (err) { throw err; }
						async.waterfall([
							function (callback) {
								logger.info("Updating the ride_status in ride table");
								connection.query('update ucorsa.Ride rd set rd.ride_status = 5 where rd.id = ?;'
									, [req.body.reply.ride_id],
									function (err, userRows) {
										if (err) {
											return connection.rollback(function () {
												throw next(err);
											});
										} else {
											logger.info("Data from table ---> " + JSON.stringify(userRows));
											callback(null, rows[1], rows[2]);
										}

									});

							},
							function (Notification, ride, callback) {
								logger.info("Updating the ride_drivers table");
								connection.query('update ucorsa.Ride_Drivers rd set rd.Ride_Status = 5 where rd.Ride_id = ? and rd.Ride_Status = 4;'
									, [req.body.reply.ride_id],
									function (err, userRows) {
										if (err) {
											return connection.rollback(function () {
												throw next(err);
											});
										} else {
											logger.info("Data from table ---> " + JSON.stringify(userRows));
											callback(null, Notification, ride);
										}

									});
							},
							function (Notification, ride, callback) {
								if (ride[0].uRideType == 'C') {
									connection.query('update Carpool_Frequency set ride_status = 5 where carpool_id = ?', [ride[0].id],
										function (err, updateRows) {
											if (err) {
												return connection.rollback(function () {
													throw next(err);
												});
											} else {
												logger.info("Data from table ---> " + JSON.stringify(updateRows));
												callback(null, Notification, ride);
											}

										});
								} else {
									callback(null, Notification, ride);
								}

							},
							function (Notification, ride, callback) {
								msg = req.userId + " Cancelled your Ride Request ";
								logger.info(msg);
								if (Notification.length)
									androidgcm.notifyMany('Ride Cancel',
										Notification[0].notification_id, msg);
								callback(null, 'success');
							}
						], function (err, id) {
							if (err) {
								connection.rollback(function () {
									return next(err);
								});
								res.send('Error inserting in all tables !!!!!!!!!');
							} else {
								connection.commit(function (err) {
									if (err) {
										connection.rollback(function () {
											throw err;
										});
									}
								});
								logger.info(id);
								res.send(200, { "message": "Ride Cancelled" });
							}
							connection.release();
						});
					});
				}
			});
	});

};

exports.notifyRider_Start = function (req, res, next) {
	pool.getConnection(function (err, connection) {
		async.waterfall([function (callback) {
			connection.query('update ucorsa.Ride rd set rd.ride_status = 6 where rd.id = ?;update Ride_Drivers set Ride_Status = 6 where Ride_id = ? and Ride_Status = 4;'
				, [req.body.rideId, req.body.rideId],
				function (err, userRows) {
					if (err) {
						return connection.rollback(function () {
							throw next(err);
						});
					} else {
						logger.info("Data from table ---> " + JSON.stringify(userRows));
						callback(null, userRows);
					}

				});

		},
		function (userRows, callback) {
			const sql = 'select * from ucorsa.Ride where id = ? ;';
			connection.query(sql, [req.body.rideId], function (err, rideRows) {
				if (err) {
					return callback(true);
				} else {
					logger.info(rideRows);
					return callback(null, rideRows);
				}
			});
		},
		function (rideRows, callback) {
			const sql = 'Select notification_id from Users where id = ? ';
			connection.query(sql, [rideRows[0].rider_id], function (err, Notification) {
				if (err) {
					return callback(true);
				} else {
					var msg = 'Your ride from ' + rideRows[0].from_location + '  to '
						+ rideRows[0].to_location + ' has been started;' + req.body.rideId;
					androidgcm.notifyMany('Ride Started', Notification[0].notification_id, msg);
					logger.info(msg);
					return callback(null, Notification);
				}
			});
		}], function (err, Message) {
			if (err) {
				connection.release();
				return next(err);
			}
			res.send(200, { "message": "Notification has been sent" });
		});
	});
};

exports.notifyRider_Stop = function (req, res, next) {
	pool.getConnection(function (err, connection) {
		logger.info("Req body  ---> " + JSON.stringify(req.body));
		logger.info("user body  ---> " + JSON.stringify(req.userId));
		var message = null;
		var notificationId = null;
		async.waterfall([
			function (callback) {
				connection.query('select user_id from Authentication auth \
						 where user_login = ?; select rd.*, notification_id  from ucorsa.Ride rd , Users usr where rd.id = ? and rd.rider_id = usr.id',
					[req.userId, req.body.ride_id],
					function (err, rows) {
						if (err) {
							callback(err, null);
						} else {
							logger.info("Data from table ---> " + JSON.stringify(rows));
							message = 'Your Ride from ' + rows[1][0].from_location + '  to '
								+ rows[1][0].to_location + ' has been Stopped;' + req.body.ride_id;
							//riderId = rows[1].rider_id;
							//driverId = rows[0].user_id;
							console.log('message is : ' + message);

							notificationId = rows[1][0].notification_id;
							callback(null, rows[1][0].rider_id, rows[0][0].user_id);
						}

					});

			},
			function (riderId, driverId, callback) {
				console.log('driver id : ' + driverId + ' rider id ' + riderId);
				console.log(' getting accounts');
				connection.query('select id,customer_id,update_ts from Accounts where  usr_id = ? order by update_ts desc  ',
					[riderId], function (err, Accounts) {
						if (err) {
							callback(err, null);
						} else {
							if (Accounts.length) {
								logger.info("Data from table ---> " + JSON.stringify(Accounts));
								var transactions = {};
								transactions.account_id = Accounts[0].id;
								transactions.customer_id = Accounts[0].customer_id;
								transactions.ride_id = req.body.ride_id;
								transactions.driver_id = driverId;
								callback(null, transactions, driverId);
							}
							else {
								logger.info("No Credit Card ");
								callback(new Error("No Credit Card"), 'Credit Card not found');
							}
						}
					});
			},
			function (transactions, driverId, callback) { //get managed_id for drivers payment
				console.log('transaction s :' + JSON.stringify(transactions));
				console.log('driver id : ' + driverId);
				var service = {};
				if (req.body.hasOwnProperty("managedId")) {
					service.URL = 'select id,managed_id,update_ts from ManagedAccounts where  id = ? order by update_ts desc ;';
					service.data = [req.body.managedId];
				} else {
					service.URL = 'select id,managed_id,update_ts from ManagedAccounts where  usr_id = ? order by update_ts desc;'
					service.data = [driverId];
				}
				connection.query(service.URL, service.data,
					function (err, ManagedAccounts) {
						if (err) {
							callback(err, null);
						} else {
							logger.info(" ManagedACCOUNT " + JSON.stringify(ManagedAccounts));
							if (ManagedAccounts.length) {
								transactions.managed_id = ManagedAccounts[0].id;
								transactions.maanged_account = ManagedAccounts[0].managed_id;
								callback(null, transactions);
							}
							else {
								callback(new Error("No Managed Account"), "No Managed Account");
							}
						}
					});

			},
			function (transactions, callback) {  // create a charge
				connection.query('select RideFareAmount FROM ucorsa.RideFare where RideType = \'R\';',
					function (err, fare) {
						if (err) {
							callback(err, null);
						}
						logger.info('fare *******    ' + JSON.stringify(fare));
						transactions.amount = fare[0].RideFareAmount;
						transactions.status = "pending";
						callback(null, transactions);
					});
			},
			function (transactions, callback) {  // Inserting data in table
				console.log("Transaction " + JSON.stringify(transactions));
				connection.beginTransaction(function (err) {
					connection.query('update Ride set ride_status = 7 where id = ?;update Ride_Drivers set Ride_Status = 7 where Ride_id = ? and Ride_Status = 6;'
						, [req.body.ride_id, req.body.ride_id],
						function (err, userRows) {
							if (err) {
								connection.rollback(function () {
									callback(err);
								});
							} else {
								logger.info("Data from table ---> " + JSON.stringify(userRows));
								const sql = 'INSERT into Transactions SET ?;'
								connection.query(sql, [transactions], function (err, rows) {
									if (err) {
										connection.rollback(function () {
											callback(err);
										});
									} else {
										connection.commit(function (err) {
											if (err) {
												connection.rollback(function () {
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
			function (callback) {
				androidgcm.notifyMany('Ride Stopped', notificationId, message);
				logger.info(message);
				return callback(null);
			}
		], function (err, msg) {
			if (err) {
				connection.release();
				console.log('message : ' + msg);
				if (msg != null) {
					res.send(500, { "message": msg });
				} else {
					res.send(500, { "message": "Server error" });
				}

			} else {
				res.send(200, { "message": "Notification has been sent" });
				connection.release();
			}
		});


	}); //end of pool
}; //end of functions

exports.uRideHistory = function (req, res, next) {
	//var rides = [];
	var carPools = [];
	var sortIndex = [];
	pool.getConnection(function (err, connection) {
		async.waterfall([
			function (callback) {
				connection.query('SELECT rid.id, rid.rider_id as rider ,rid.Description,  rid.update_ts,\
						rid.from_location, rid.to_location, rid.end_date, rid.start_date, rid.frequency, rid.uRideType, rid.ride_time,  rs.ride_status as ride_status \
						  FROM ucorsa.Ride rid, ucorsa.Authentication auth,ucorsa.ride_status rs\
		  			      where auth.user_login = ?\
		  			      and rid.rider_id = auth.user_id \
		  	              and rs.id = rid.ride_status\
					   		and uRideType = \'R\'\
		  			  	 and (rid.ride_ts < ? or rid.ride_status in (5,7)) \
		  			 order by rid.end_date desc,rid.ride_time desc ;',
					[req.userId, moment().utc().format("YYYY-MM-DD HH:mm:ss")], function (err, rows) {
						if (err) {
							callback(err);
						} else {
							try {
								console.log('Data from table ----->' + JSON.stringify(rows));
								var tempRides = [];
								var page_count = parseInt(rows.length / 10);
								console.log('page count : ' + page_count);
								console.log('remainder : ' + rows.length % 10);
								console.log('query page : ' + req.query.page);
								if ((rows.length % 10) > 0)
									page_count += 1;
								if (req.query.page < page_count) {
									var nxt_page = parseInt(req.query.page) + 1;
									res.setHeader('nextPage', nxt_page);
									tempRides = rows.slice((req.query.page - 1) * 10, (req.query.page * 10));
								} else if (req.query.page == page_count) {
									res.setHeader('nextPage', 0);
									tempRides = rows.slice((req.query.page - 1) * 10, (req.query.page * 10));
								}
								console.log('tempRides :' + JSON.stringify(tempRides));
								for (var indx in tempRides) {
									if (tempRides[indx].uRideType == 'C') {
										carPools.push(tempRides[indx].id);
									}
									sortIndex[tempRides[indx].id] = indx;
								}
							} catch (e) {
								console.log('catch --> ' + e)
							}
							callback(null, tempRides);
						}

					});

			},
			function (tempRides, callback) {
				console.log('drivers .......' + sortIndex.length);
				if (sortIndex.length) {
					connection.query("Select usr.first_name, usr.last_name, Ride_id, Driver_id, rs.ride_status" +
						" from Ride_Drivers cp, Users usr, ucorsa.ride_status rs where cp.Driver_id = usr.id " +
						" and cp.Ride_Status = rs.id " +
						" and Ride_id in (" + Object.keys(sortIndex).join(",") + ") order by Ride_id",
						function (err, rows) {
							if (err) {
								console.log("the error is:" + JSON.stringify(err));
								return next(err);
							} else {
								console.log('Data from table ------>' + JSON.stringify(rows));
								try {
									var drivers = [];
									var cpId = null;
									for (var indx in rows) {
										if (cpId == null) {
											cpId = rows[indx].Ride_id;
											drivers.push(rows[indx]);
										} else {
											if (rows[indx].Ride_id == cpId) {
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
									if (cpId != null) {
										tempRides[sortIndex[cpId]]["drivers"] = drivers;
									}
								} catch (ex) {
									console.log("111 " + ex);
								}

								callback(null, tempRides);
							}

						});
				} else {
					callback(null, tempRides);
				}

			},
			function (tempRides, callback) {
				console.log('cpcpcp ------>' + carPools);
				if (carPools.length) {
					connection.query("Select cf.*, rs.ride_status from Carpool_Frequency cf, ucorsa.ride_status rs where carpool_id in (" + carPools.join(",") + ") and cf.ride_status = rs.id order by carpool_id, date; ",
						function (err, rows) {
							if (err) {
								console.log("the error is:" + JSON.stringify(err));
								return next(err);
							} else {
								console.log("rows is:" + JSON.stringify(rows));
								if (rows.length) {
									console.log('Data from table ------>' + JSON.stringify(rows));
									var frequency = [];
									var cpId = null;
									for (var indx in rows) {
										if (cpId == null) {
											cpId = rows[indx].carpool_id;
											frequency.push(rows[indx]);
										} else {
											if (rows[indx].carpool_id == cpId) {
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
									//rides[rows[indx].carpool_id]["frequencies"] = frequency;
									tempRides[sortIndex[cpId]]["frequencies"] = frequency;
									callback(null);
								} else {
									//rides[rows[indx].carpool_id]["frequencies"]=[];
									callback(null, tempRides);
								}
							}
						});
				} else {
					callback(null, tempRides);
				}
			}

		], function (err, tempRides) {
			if (err) {
				res.send(500, 'Something bad happened');
			} else {
				if (tempRides.length) {
					res.send(200, tempRides);
				} else {
					res.send(200, { "message": "No Ride History" });
				}


			}
			connection.release();
		}); //end of waterfall
	}); //end of connection pool
};

/* ride charges */
exports.uRideFare = function (req, res, next) {
	console.log("Getting uRide Fare $$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$");
	pool.getConnection(function (err, connection) {
		if (err) {
			console.log("Error getting connection from pool (GetURideFare)");
			return next(err);
		}
		connection.query('select * from ucorsa.RideFare where RideType = \'R\';', function (err, rows) {
			if (err) {
				return next(err);
			} else {
				console.log(" ==================> Ride Fare Row: " + JSON.stringify(rows));
				res.send(200, rows);
				connection.release();
			}
		});
	});
};
