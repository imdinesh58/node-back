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
var _ = require("underscore");



exports.listContactsToAddGroupMembers = function(req, res, next) {
	pool.getConnection(function(err, connection){
		connection.query(
				'SELECT cn.Id as ContactId, usr.id as userId, usr.first_name as name, usr.phone FROM ucorsa.Authentication auth, ucorsa.Contacts cn, ucorsa.Users usr\
				where auth.user_login = ?\
				and auth.user_id = cn.contact_for_id\
				and cn.status_id = 1\
				and cn.user_id = usr.id',[req.userId],  function(err, contactRows){
					if(err)	{
				  		return next(err);
				  	}
					var phoneObject = [];
					logger.info( contactRows );
				  	if(contactRows.length){
				  		var phonearray = [];
				  		var phoneNumber = null;
				  		contactRows.forEach(function(contactRow) {
				  			phoneNumber = phoneUtil.parse(contactRow.phone, 'US');
					  		//console.log(phoneUtil.format(phoneNumber, PNF.INTERNATIONAL));
					  		contactRow.formatedPhoneNumber = phoneUtil.format(phoneNumber, PNF.INTERNATIONAL);
					  		phonearray.push(contactRow);
				  		});
				  		phoneObject = phonearray;
				  		 var uniqueList = _.uniq(phoneObject, function(item, key, phone) { 
				    	        return item.phone;
				    	    });
					  		res.send(200,uniqueList);
				  		connection.release();
				  	} else {
				  		res.send(200,phoneObject);
				  		connection.release();
				  	}
					
				});
		});
};	



exports.deleteContact = function(req, res, next) {
	 pool.getConnection(function(err, connection){
		 connection.query('select * from Authentication where user_login = ?',[req.userId],
					function(err, phonerows) {
			   			if (err) {
			   				return  next(err);	
			   			}else {  
							const sql='DELETE from Contacts where contact_for_id = ? and id = ? ';
							 connection.query(sql,[ phonerows[0].user_id, req.params.contactId],
										function(err, rows) {
								   			if (err) {
								   				return  next(err);	
								   			}else {  
								   				logger.info( rows );
								   				logger.info( phonerows[0].user_id );
								   				logger.info(  req.body.ContactId );
								   				res.send(200,{"message" : "Contact Deleted"});
								   				connection.release();
											}
								   		});
			   			}
		 	});
	 });
};


exports.searchDriverSchedule = function(req, res, next) {
	 pool.getConnection(function(err, connection){
		 logger.info( moment("12:15 AM", ["h:mm A"]).format("HH:mm") );
		 logger.info(moment( req.query.time, ["h:mm A"]).format("HH:mm:ss"));
		 const sql = 'select ds.id,ds.driver_id,ds.drive_date,ds.start_time,ds.end_time, usr.first_name , usr.phone \
		 from ucorsa.Drive_Schedule ds,ucorsa.Users usr\
		 where ds.driver_id = usr.id\
		 and ds.drive_date = ?\
		 and ds.start_time <= ?\
		 and ds.end_time >= ?;'
		 connection.query(sql,[req.query.date, moment( req.query.time, ["h:mm A"]).format("HH:mm:ss"), moment( req.query.time, ["h:mm A"]).format("HH:mm:ss") ],
					function(err, rows) {
			   			if (err) {
			   				return  next(err);	
			   			}else {  
									res.send(200,rows);
									connection.release();
								}
			   		});
	 });
};

exports.getContacts = function(req, res, next) {
	var qry = req.query;		
		if(req.query.search == 'ride'){
			//for ride request			
			pool.getConnection(function(err, connection){
				var results = [];
				async.parallel([
				    //get from schedule table  		    
				    function(callback) {
			        	logger.info("get from schedule table");
			        	const sql = 'select ds.id, ds.driver_id as id, usr.first_name as firstName, usr.last_name as lastName, "S" as type\
				       		 from ucorsa.Drive_Schedule ds,ucorsa.Users usr, Contacts con\
				       		 where ds.driver_id = usr.id\
	                         and con.user_id = usr.id\
	                         and con.contact_for_id = (Select user_id from Authentication where user_login = ? )\
				       		 and ds.drive_date = ?\
				       		 and ds.start_time <= ?\
	                         and ds.end_time >= ?';
			        	 
		        		connection.query(sql,[req.userId, req.query.date, moment( req.query.time, ["h:mm A"]).format("HH:mm:ss"), moment( req.query.time, ["h:mm A"]).format("HH:mm:ss") ],
							function(err, rows) {
					   			if (err) {
					   				logger.info("Error : %s", err);
				        			return callback(true);	
					   			}else {  
					   				
					   				logger.info(rows);
					   				rows.forEach(function(contactRow) {
					   					results.push(contactRow);
					   				});
					   				
									return callback();
								}
					   		});

			        },
					//get from individual contact
			        function(callback) {
			        	connection.query(
			    				'SELECT usr.id as id, usr.first_name as firstName, usr.last_name as lastName, "I" as type \
			        			FROM ucorsa.Authentication auth, ucorsa.Contacts cn, ucorsa.Users usr\
			    				where auth.user_login = ?\
			    				and auth.user_id = cn.contact_for_id\
			    				and cn.status_id = 1\
			    				and cn.user_id = usr.id',[req.userId], 
				    		function(err, rows){
			    				if (err) {
					   				logger.info("Error : %s", err);
				        			return callback(true);	
				    			} else {
				    				logger.info(rows);
				    				rows.forEach(function(contactRow) {
					   					results.push(contactRow);
					   				});
									return callback();
				        		}
				        	});
			        },
			        //get from group table
			        function(callback) {
			        	connection.query(
			    				'Select  gp.id as id, gp.name as firstName, "" as last_name, "G" as type\
			    				From ucorsa.Groups gp, ucorsa.Authentication auth\
			    				where auth.user_login = ?\
			    				and gp.usr_id = auth.user_id',[req.userId], 
				    		function(err, rows){
			    				if (err) {
					   				logger.info("Error : %s", err);
				        			return callback(true);	
				    			} else {
				    				logger.info(rows);
				    				var i =0;
				    				if(rows.length){
				    				rows.forEach(function(contactRow) {
				    					logger.info("Group ROW ", contactRow);
						    					connection.query(
									    				'select * from Groups as gp,\
						    							Group_Members as gm where\
						    							gp.id = gm.group_id\
						    							and gp.id = ?',[contactRow.id], 
										    		function(err, group_row){
									    				if (err) {
											   				logger.info("Error : %s", err);
										        			return callback(true);	
										    			} else {	
										    				if(group_row.length){
										    					logger.info("Group Has contacts  ", contactRow);
										    					results.push(contactRow);										    						
										    				}
										    				if(rows.length-1 == i++)
										    				return callback();
										    			}
											   				});											
										        	 	});
				    				}else
				    					{
				    					return callback();
				    					}
				    				
				        		}
				        	});
			        }], function(err ) {
				    	if (err) {
				    		connection.release();  
				    		throw err;
				    	} else {
				    		connection.release();
				    	    logger.info("This is the final result : " + JSON.stringify(results));
				    	    //var responseObject = {};
				    	    //responseObject.contacts = results;
				    		res.send(200,results);
				    	}					
				});//end of parallel
			});//end of connection
		} else if(req.query.search == 'carpool'){			
			pool.getConnection(function(err, connection){
				var results = [];
				async.parallel([				   
					//get from individual contact
			        function(callback) {
			        	connection.query(
			    				'SELECT usr.id as id, usr.first_name as firstName, usr.last_name as lastName, "I" as type \
			        			FROM ucorsa.Authentication auth, ucorsa.Contacts cn, ucorsa.Users usr\
			    				where auth.user_login = ?\
			    				and auth.user_id = cn.contact_for_id\
			    				and cn.status_id = 1\
			    				and cn.user_id = usr.id',[req.userId], 
				    		function(err, rows){
			    				if (err) {
					   				logger.info("Error : %s", err);
				        			return callback(true);	
				    			} else {
				    				logger.info(rows);
				    				rows.forEach(function(contactRow) {
					   					results.push(contactRow);
					   				});
									return callback();
				        		}
				        	});
			        },
			        //get from group table
			        function(callback) {
			        	connection.query(
			    				'Select  gp.id as id, gp.name as firstName, "" as last_name, "G" as type\
			    				From ucorsa.Groups gp, ucorsa.Authentication auth\
			    				where auth.user_login = ?\
			    				and gp.usr_id = auth.user_id',[req.userId], 
				    		function(err, rows){
			    				if (err) {
					   				logger.info("Error : %s", err);
				        			return callback(true);	
				    			} else {
				    				logger.info(rows);	
				    				var i =0;
				    				if(rows.length){
				    				rows.forEach(function(contactRow) {
				    					logger.info("Group ROW ", contactRow);
						    					connection.query(
									    				'select * from Groups as gp,\
						    							Group_Members as gm where\
						    							gp.id = gm.group_id\
						    							and gp.id = ?',[contactRow.id], 
										    		function(err, group_row){
									    				if (err) {
											   				logger.info("Error : %s", err);
										        			return callback(true);	
										    			} else {	
										    				if(group_row.length){
										    					logger.info("Group Has contacts  ", contactRow);
										    					results.push(contactRow);										    						
										    				}		
										    				if(rows.length-1 == i++)
											    				return callback();
										    			}
											   				});											
										        		}); 
				    				}else
				    					{
				    					return callback();
				    					}			    				
				        		}
				        	});
			        }], function(err ) {
				    	if (err) {
				    		connection.release();  
				    		return next(err);
				    	} else {
				    		connection.release();
				    	    logger.info("This is the final result : " + JSON.stringify(results));
				    	    //var responseObject = {};
				    	    //responseObject.contacts = results;
				    		res.send(200,results);
				    	}					
				});//end of parallel
			});//end of connection
		}	
		else if (req.query.search = 'contacts')
			{
			pool.getConnection(function(err, connection){
				var results = [];				
				const sql = 'Select user_id from Authentication where user_login = ?';						    					    		
	        	connection.query(sql,[req.userId], function(err,authRows){
	        		if(err){
	        			logger.info("Error : %s", err);
	        			return callback(true);
	        		} else {	        			
				async.parallel([				   
					//get ucorsa contact
			        function(callback) {
			        	connection.query(
			    				'select Distinct(usr.phone), usr.email, cn.id, cn.contact_for_id, cn.user_id,usr.first_name, "U" as type\
			        			From ucorsa.Contacts cn, ucorsa.Users usr\
			        			where cn.contact_for_id = ?\
			        			and cn.user_id = usr.id\
			        			and cn.status_id = 1 ',[authRows[0].user_id], 
				    		function(err, rows){
			    				if (err) {
					   				logger.info("Error : %s", err);
				        			return callback(true);	
				    			} else {
				    				logger.info(rows);
				    				rows.forEach(function(contactRow) {
					   					results.push(contactRow);
					   				});
									return callback();
				        		}
				        	});
			        },
			        //get Invited contacts..
			        function(callback) {
			        	connection.query(
			    				'select Distinct(cn.phone), cn.id, cn.contact_for_id, cn.name, "IN" as type\
			        			From ucorsa.Contacts cn\
			        			where cn.contact_for_id = ?\
			        			and cn.status_id = 3',[authRows[0].user_id], 
				    		function(err, rows){
			    				if (err) {
					   				logger.info("Error : %s", err);
				        			return callback(true);	
				    			} else {
				    				logger.info(rows);
				    				rows.forEach(function(contactRow) {
					   					results.push(contactRow);
					   				});
					   				
									return callback();
				        		}
				        	});
			        }], function(err ) {
				    	if (err) {
				    		connection.release();  
				    		return next(err);
				    	} else {
				    		connection.release();
				    	    logger.info("This is the final result : " + JSON.stringify(results));
				    	    //var responseObject = {};
				    	    //responseObject.contacts = results;
				    	    var uniqueList = _.uniq(results, function(item, key, phone) { 
				    	        return item.phone;
				    	    });
				    		res.send(200, uniqueList);
				    	}					
				});//end of parallel
	        }//end of else
	   });//End of first query
	});//end of connect
   }		
	else {
			//not implemented yet
			res.send(500,{"message": "Not Implemented"});
	}	
};

exports.getContacts99 = function(req, res, next) {
	var qry = req.query;		
		if(req.query.search == 'ride'){
			//for ride request			
			pool.getConnection(function(err, connection){
				var results = [];
				var drivers= [];
				var drivers_scheduled = [];
				async.parallel([
				    //get from  individual table  		    
				    function(callback) {
				    	connection.query(
			    				'SELECT usr.id as id, usr.first_name as firstName, usr.last_name as lastName, "I" as type \
			        			FROM ucorsa.Authentication auth, ucorsa.Contacts cn, ucorsa.Users usr\
			    				where auth.user_login = ?\
			    				and auth.user_id = cn.contact_for_id\
			    				and cn.status_id = 1\
			    				and cn.user_id = usr.id\
			        			order by cn.user_id',[req.userId], 
				    		function(err, rows){
			    				if (err) {
					   				logger.info("Error : %s", err);
				        			return callback(true);	
				    			} else {
				    				logger.info("ROW111 "+ JSON.stringify(rows));
				    				rows.forEach(function(contactRow) {
				    					drivers.push(contactRow.id);					   					
					   				});
				    				if(drivers.length){
				    					logger.info("get from individual table");
							        	const sql = 'select ds.*,\
							        		CASE when (ds.drive_date = ? and ds.start_time <= ? and ds.end_time >= ? ) THEN "A"\
							        		ELSE "NA" end as type from Drive_Schedule ds\
							        	 where ds.driver_id in(' +drivers.join(",")+ ')\
							        	 and ds.drive_date >= ?\
							        	 order by ds.driver_id, type;';
							        	 //moment( req.query.time, ["h:mm A"]).format("HH:mm:ss");
						        		connection.query(sql,[req.query.date, req.query.time,  req.query.time, req.query.date ],
											function(err, Drows) {
									   			if (err) {
									   				logger.info("Error : %s", err);
								        			return callback(true);	
									   			}else {  									   				
									   				logger.info("DROWS " +  JSON.stringify(Drows));
									   				rows.forEach(function(contactRow) {
									   					contactRow.scheduledDrivers=_.filter(Drows,{driver_id :contactRow.id}) ? _.filter(Drows,{driver_id :contactRow.id}) : [];
									   					results.push(contactRow);
										   				});								   									   				
													return callback();
												}
									   		});						        		
				    				}else{
				    					rows.forEach(function(contactRow) {
					    					contactRow.scheduledDrivers=[];
						   					results.push(contactRow);
						   				});
				    					return callback();
				    				}									
				        		}
				        	});
				    },
					//get from schedule contact
			        function(callback) {
				    	connection.query(
			    				'SELECT usr.id as id, usr.first_name as firstName, usr.last_name as lastName, "S" as type \
			        			FROM ucorsa.Authentication auth, ucorsa.Contacts cn, ucorsa.Users usr\
			    				where auth.user_login = ?\
			    				and auth.user_id = cn.contact_for_id\
			    				and cn.status_id = 1\
			    				and cn.user_id = usr.id\
			        			order by cn.user_id',[req.userId], 
				    		function(err, rows){
			    				if (err) {
					   				logger.info("Error : %s", err);
				        			return callback(true);	
				    			} else {				    				
				    				logger.info("ROW111 "+ JSON.stringify(rows));
				    				rows.forEach(function(contactRow) {
				    					drivers_scheduled.push(contactRow.id);					   					
					   				});
				    				if(drivers_scheduled.length){
				    					logger.info("get from schedule table");
							        	const sql = 'select ds.*,\
							        				 CASE when (ds.drive_date = ? and ds.start_time <= ? and ds.end_time >= ? ) THEN "A"\
							        		         ELSE "NA" end as type from Drive_Schedule ds\
							        				 where ds.driver_id in(' +drivers_scheduled.join(",")+ ')\
							        				 and ds.drive_date = ? and ds.start_time <= ? and ds.end_time >= ? \
							        				 order by ds.driver_id';
							        	 //moment( req.query.time, ["h:mm A"]).format("HH:mm:ss");
						        		connection.query(sql,[req.query.date, req.query.time,  req.query.time, req.query.date, req.query.time,  req.query.time],
											function(err, Drows) {
									   			if (err) {
									   				logger.info("Error : %s", err);
								        			return callback(true);	
									   			}else {  									   				
									   				logger.info("DROWS " +  JSON.stringify(Drows));
									   				rows.forEach(function(contactRow) {
									   					contactRow.scheduledDrivers=_.filter(Drows,{driver_id :contactRow.id}) ? _.filter(Drows,{driver_id :contactRow.id}) : [];
									   					if(contactRow.scheduledDrivers.length){
									   						results.push(contactRow);
									   					}									   					
										   				});								   									   				
													return callback();
												}
									   		});						        		
				    				}else{
				    					/*rows.forEach(function(contactRow) {
					    					contactRow.scheduledDrivers=[];
						   					results.push(contactRow);
						   				});*/
				    					return callback();
				    				}									
				        		}
				        	});
			        },
			        //get from group table
			        function(callback) {
			        	connection.query(
			    				'Select  gp.id as id, gp.name as firstName, "" as last_name, "G" as type\
			    				From ucorsa.Groups gp, ucorsa.Authentication auth\
			    				where auth.user_login = ?\
			    				and gp.usr_id = auth.user_id',[req.userId], 
				    		function(err, rows){
			    				if (err) {
					   				logger.info("Error : %s", err);
				        			return callback(true);	
				    			} else {
				    				logger.info(rows);
				    				var i =0;
				    				if(rows.length){
				    				rows.forEach(function(contactRow) {
				    					logger.info("Group ROW ", contactRow);
						    					connection.query(
									    				'select * from Groups as gp,\
						    							Group_Members as gm where\
						    							gp.id = gm.group_id\
						    							and gp.id = ?',[contactRow.id], 
										    		function(err, group_row){
									    				if (err) {
											   				logger.info("Error : %s", err);
										        			return callback(true);	
										    			} else {	
										    				if(group_row.length){
										    					logger.info("Group Has contacts  ", contactRow);
										    					results.push(contactRow);										    						
										    				}
										    				if(rows.length-1 == i++)
										    				return callback();
										    			}
											   				});											
										        	 	});
				    				}else
				    					{
				    					return callback();
				    					}
				    				
				        		}
				        	});
			        }], function(err ) {
				    	if (err) {
				    		connection.release();  
				    		throw err;
				    	} else {
				    		connection.release();
				    	    logger.info("This is the final result : " + JSON.stringify(results));
				    	    //var responseObject = {};
				    	    //responseObject.contacts = results;
				    		res.send(200,results);
				    	}					
				});//end of parallel
			});//end of connection
		} else if(req.query.search == 'carpool'){			
			pool.getConnection(function(err, connection){
				var results = [];
				async.parallel([				   
					//get from individual contact
			        function(callback) {
			        	connection.query(
			    				'SELECT usr.id as id, usr.first_name as firstName, usr.last_name as lastName, "I" as type \
			        			FROM ucorsa.Authentication auth, ucorsa.Contacts cn, ucorsa.Users usr\
			    				where auth.user_login = ?\
			    				and auth.user_id = cn.contact_for_id\
			    				and cn.status_id = 1\
			    				and cn.user_id = usr.id',[req.userId], 
				    		function(err, rows){
			    				if (err) {
					   				logger.info("Error : %s", err);
				        			return callback(true);	
				    			} else {
				    				logger.info(rows);
				    				rows.forEach(function(contactRow) {
					   					results.push(contactRow);
					   				});
									return callback();
				        		}
				        	});
			        },
			        //get from group table
			        function(callback) {
			        	connection.query(
			    				'Select  gp.id as id, gp.name as firstName, "" as last_name, "G" as type\
			    				From ucorsa.Groups gp, ucorsa.Authentication auth\
			    				where auth.user_login = ?\
			    				and gp.usr_id = auth.user_id',[req.userId], 
				    		function(err, rows){
			    				if (err) {
					   				logger.info("Error : %s", err);
				        			return callback(true);	
				    			} else {
				    				logger.info(rows);	
				    				var i =0;
				    				if(rows.length){
				    				rows.forEach(function(contactRow) {
				    					logger.info("Group ROW ", contactRow);
						    					connection.query(
									    				'select * from Groups as gp,\
						    							Group_Members as gm where\
						    							gp.id = gm.group_id\
						    							and gp.id = ?',[contactRow.id], 
										    		function(err, group_row){
									    				if (err) {
											   				logger.info("Error : %s", err);
										        			return callback(true);	
										    			} else {	
										    				if(group_row.length){
										    					logger.info("Group Has contacts  ", contactRow);
										    					results.push(contactRow);										    						
										    				}		
										    				if(rows.length-1 == i++)
											    				return callback();
										    			}
											   				});											
										        		}); 
				    				}else
				    					{
				    					return callback();
				    					}			    				
				        		}
				        	});
			        }], function(err ) {
				    	if (err) {
				    		connection.release();  
				    		return next(err);
				    	} else {
				    		connection.release();
				    	    logger.info("This is the final result : " + JSON.stringify(results));
				    	    //var responseObject = {};
				    	    //responseObject.contacts = results;
				    		res.send(200,results);
				    	}					
				});//end of parallel
			});//end of connection
		}	
		else if (req.query.search = 'contacts')
			{
			pool.getConnection(function(err, connection){
				var results = [];				
				const sql = 'Select user_id from Authentication where user_login = ?';						    					    		
	        	connection.query(sql,[req.userId], function(err,authRows){
	        		if(err){
	        			logger.info("Error : %s", err);
	        			return callback(true);
	        		} else {	        			
				async.parallel([				   
					//get ucorsa contact
			        function(callback) {
			        	connection.query(
			    				'select Distinct(usr.phone), usr.email, cn.id, cn.contact_for_id, cn.user_id,usr.first_name, "U" as type\
			        			From ucorsa.Contacts cn, ucorsa.Users usr\
			        			where cn.contact_for_id = ?\
			        			and cn.user_id = usr.id\
			        			and cn.status_id = 1 ',[authRows[0].user_id], 
				    		function(err, rows){
			    				if (err) {
					   				logger.info("Error : %s", err);
				        			return callback(true);	
				    			} else {
				    				logger.info(rows);
				    				rows.forEach(function(contactRow) {
					   					results.push(contactRow);
					   				});
									return callback();
				        		}
				        	});
			        },
			        //get Invited contacts..
			        function(callback) {
			        	connection.query(
			    				'select Distinct(cn.phone), cn.id, cn.contact_for_id, cn.name, "IN" as type\
			        			From ucorsa.Contacts cn\
			        			where cn.contact_for_id = ?\
			        			and cn.status_id = 3',[authRows[0].user_id], 
				    		function(err, rows){
			    				if (err) {
					   				logger.info("Error : %s", err);
				        			return callback(true);	
				    			} else {
				    				logger.info(rows);
				    				rows.forEach(function(contactRow) {
					   					results.push(contactRow);
					   				});
					   				
									return callback();
				        		}
				        	});
			        }], function(err ) {
				    	if (err) {
				    		connection.release();  
				    		return next(err);
				    	} else {
				    		connection.release();
				    	    logger.info("This is the final result : " + JSON.stringify(results));
				    	    //var responseObject = {};
				    	    //responseObject.contacts = results;
				    	    var uniqueList = _.uniq(results, function(item, key, phone) { 
				    	        return item.phone;
				    	    });
				    		res.send(200, uniqueList);
				    	}					
				});//end of parallel
	        }//end of else
	   });//End of first query
	});//end of connect
   }		
	else {
			//not implemented yet
			res.send(500,{"message": "Not Implemented"});
	}	
};


exports.syncContacts = function(req, res, next){		
	pool.getConnection(function(err, connection) {
		var Contact_Data_Result = {};	
		var contactData =[];
		logger.info("Sync Contact: Req Body : " + JSON.stringify(req.body.contacts) );
		async.waterfall([
			function(callback) {		
				//Get all phone numbers for comparing  
				const sql = 'select phone from Users';									
				connection.query(sql, function(err,phoneRows){
					if(err){
						return callback(true);
					} else {						        			
						return callback(null, phoneRows);
					}
				});
			},
			function( phoneRows, callback) {
				logger.info("Finding contacts using ucorsa ... : " + JSON.stringify(phoneRows));
				//Find app using phone contacts 
				async.each(phoneRows, function(row, callback) {
					logger.info("Row from DB: " + JSON.stringify(row));
					var appContacts = _.findWhere(req.body.contacts, row);
					if(appContacts != undefined) {
						logger.info("Row -----  " + JSON.stringify(appContacts));
						contactData.push(appContacts);
					}
					callback();
				}, function(err){						        		    
					if( err ) {
						console.log('Error in code');
						return next(err);
					} else {						        		    	
						return callback(null, contactData);
					}
				});
			},
			function( contactData, callback) {
				logger.info("Finding contacts not using ucorsa ... : " + JSON.stringify(contactData));
				// Find app not using contacts // Filtered from app using contacts
				var appNotUsingContacts = _.filter(req.body.contacts, function(obj) {															
					return !_.findWhere(contactData, obj);
				});
				return callback(null, contactData, appNotUsingContacts);								
			}],
			function (err,contactData, appNotUsingContacts) {		
				if (err) {
					connection.release();  
					return next(err);
				}
				Contact_Data_Result.contacts = _.uniq(contactData, false);
				Contact_Data_Result.non_contacts = appNotUsingContacts;
				logger.info("CCCCCCCCCCCCCCCCC " + JSON.stringify(_.uniq(contactData, false)));
				logger.info("NNNNNNNNNNNNNNNNN " + JSON.stringify(appNotUsingContacts));
				//res.send(200,Contact_Data_Result);
				addContacts(req, res, Contact_Data_Result.contacts, Contact_Data_Result.non_contacts );
				connection.release(); 
			}
		);
	});
};

var addContacts =  exports.addUcorsaContacts = function(req, res, contacts, non_contacts ){		
	pool.getConnection(function(err, connection) {
		var contactData =[];
		logger.info("In Add Contacts ...");
		logger.info("Contacts: " + JSON.stringify(contacts));
		logger.info("Non Contacts: " + JSON.stringify(non_contacts));
		async.waterfall([
			function(callback) {		
				//Get all phone numbers for comparing  
				const sql = 'Select user_id from Authentication where user_login = ?';									
				connection.query(sql, [req.userId], function(err,phoneRows){
					if(err){
						return callback(true);
					} else {						        			
						return callback(null, phoneRows);
					}
				});
			},
			function( phoneRows, callback) {
				//Find app using phone contacts 
				logger.info("Contacts : " + JSON.stringify(contacts));
				async.each(contacts, function(row, callback) {
					logger.info("Row : " + JSON.stringify(row));
					connection.query('select id from Users where phone = ? ', [row.phone],  function(err, contactrow) {
						if (err) {
							logger.error(err);
							return next(err);
						}
						logger.info("Checking User exists : " + "\n PhoneRow : " + JSON.stringify(phoneRows) + "\n ContactRow: " + JSON.stringify(contactrow));
						checkUserExists(phoneRows[0].user_id, contactrow[0].id,function(userExists){
							if(contactrow.length && !userExists){
								logger.info("Row contacts-----" + JSON.stringify(contactrow));
								var contact_table_row_data = [];
								contact_table_row_data.push(phoneRows[0].user_id);
								contact_table_row_data.push(contactrow[0].id);
								contact_table_row_data.push(1);
								contactData.push(contact_table_row_data);										
								}
							callback();
						});											
					});												
				}, function(err){						        		    
						if( err ) {
							console.log('Error in code');
							return next(err);
						} else {						        		    	
							return callback(null, contactData);
						}
					});
			},
			function( contactData, callback) {
				logger.info("c data -----  " + JSON.stringify(contactData));
				if(contactData.length){
					connection.query( "INSERT INTO ucorsa.Contacts (contact_for_id,user_id, status_id) VALUES ?", [contactData], function(err, result) {
						if(err){
							logger.log(err);		        			
							return next(err);
						}
						return callback(null, 'Contacts Added');
					});
				}
				return callback(null, 'Contacts Added');
			}],function (err, Message) {		
				if (err) {
					connection.release();  
					return next(err);
				}
				logger.info("Returning list of contact not using ucorsa : " + JSON.stringify(non_contacts));
				res.send(200,non_contacts);
				connection.release();  
			});
	});
};


var checkUserExists = function(contact_for_Id, user_Id,callback)
{
	pool.getConnection(function(err, connection) {		
		connection.query('select * from  ucorsa.Contacts  where contact_for_id = ? and user_id = ?;',[contact_for_Id, user_Id], function(err, contactrow) {
					if (err) {
						logger.error(err);
						return next(err);
						} 	
					if(contactrow.length)
						{
						logger.info("T " + user_Id);
						callback(true);  //if user exists
						}
					else{
						logger.info("F " + user_Id);
						callback(false);  //if not exists											
					}
		});
						
	});
};

exports.changeStatustoInvited = function(req, res, next)
{	
	logger.info("headers " + req.headers);
	logger.info("BODY " + JSON.stringify(req.body));
	pool.getConnection(function(err, connection) {		
				connection.query('Select user_id from Authentication where user_login = ?;',[req.userId], function(err, contactrow) {
							if (err) {
								logger.error(err);
								return next(err);
							} 
						logger.info("Rows = " + JSON.stringify(contactrow));
						logger.info("# of Rows = " + contactrow.length);
						if(contactrow.length)	{
							logger.info("Contacts to Insert : " + JSON.stringify(req.body.contacts));
							async.each(req.body.contacts, function(contact, callback) {
								logger.info("Inserting CONTACT : " + JSON.stringify(contact));
								connection.query('insert into ucorsa.Contacts (contact_for_id,status_id,name,phone) values (?,?,?,?);',[contactrow[0].user_id, 3, contact.name, contact.phone], function(err, contactrow) {
									if (err) {
										logger.error(err);
								  		return next(err);
									} 
									logger.info("Insert into CONTACTS table successful. Row = " + JSON.stringify(contactrow));
									callback();
								});				  
							}, function(err) {
							    if( err ) {							     
							    	connection.release();  
							    	return next(err);
							    } else {
							    	res.send(200,{"message" : "Invitation sent"});
									connection.release(); 
							    }
							});				
						  }
				});
	});
};


