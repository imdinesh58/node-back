/**
 * New node file
 */

var pool  = require('../config/db');
var logger = require("../lib/logger");
var async = require('async');
var schedule = require('node-schedule');
var moment = require('moment');
var config  = require('../config/config');

//var stripe = require("stripe")(
//		  "sk_live_IeD9uw3mIBkMxmEZxCYq0lxe"
//		);

var stripe = require("stripe")(
		config.get('stripeKey')
		);

var time = {
		hour : 7,
		minute : 15,
		second : 0,
		dayOfWeek : [0,1,2,3,4,5,6]
}
 
var j = schedule.scheduleJob(time, function(){
  console.log('Scheduled Task');
  paymentProcess99();
});





exports.riderSave = function(req, res, next) {
	pool.getConnection(function(err, connection){
		connection.query( 'Select user_id from Authentication where user_login = ? ', 
				[ req.userId],  function(err, user){
			if(err)	{
  		  		logger.error(err);
  		  		return next(err);
					}
			logger.info(" Req.body  " +  JSON.stringify(req.body));	
			logger.info("User : " + JSON.stringify(user));
			if(req.body.accounts.hasOwnProperty("card")){						
				async.waterfall([
				      		   function(callback){  ///Creating token object  									
										var data ={
												usr_id:user[0].user_id,												
												account_type:req.body.accounts.card.account_type,														
												last4digits: req.body.accounts.card.number,	
												expiry_date :req.body.accounts.card.expiry,
												customer_token: req.body.accounts.card.token1										
										};	
										logger.info("Data for table ---> "+ JSON.stringify(data));
										callback(null, data);
				      		  
						}, 
						function(data, callback){ // creating customer object 
				      			 stripe.customers.create({
									  description: 'Customer Object creation',
									  source: data.customer_token // obtained with Stripe.js
									}, function(err, customer) {
										if(err){
											logger.error(err);
											res.send(err);
										}
										logger.info("CUSTOMER " +  JSON.stringify(customer));
										data.customer_id = customer.id;
										callback(null, data);
										
									});
				      			},
					      		function(data, callback){ // Inserting data in table 
					      			const sql = 'INSERT into Accounts SET ?;';
										connection.query( sql,[data],  function(err, rows){
										  	if(err)	{
										  		logger.error(err);
										  		return next(err);
										  	}else{											  		
										  		callback(null, 'done');												
										  	}
										});
					      		}
				      		   ], function(err, id) {
				   		    	if (err) {
				   		    		connection.release();
						    		res.send(500,err);
				   		    	}  		    	
				   		    	res.send({"message" : "Rider Payment data added "});
				   		    	connection.release();
							});	
				}
			
		});	
	});
	
};

exports.driverSave = function(req, res, next) {
	pool.getConnection(function(err, connection){	
		connection.query( 'select id, first_name,last_name, phone, email from Users  where id =(Select user_id from Authentication where user_login = ?)', 
				[req.userId],  function(err, user){
			if(err)	{
  		  		logger.error(err);
  		  		return next(err);
					}
			logger.info(" Users  " +  JSON.stringify(user));			
			if(req.body.accounts.hasOwnProperty("card")){						
				async.waterfall([
				      		   function(callback){  ///Creating token object  									
										var data ={
												usr_id:user[0].id,												
												account_type:req.body.accounts.card.account_type,														
												last4digits: req.body.accounts.card.number,	
												expiry_date :req.body.accounts.card.expiry,
												managed_token :req.body.accounts.card.token1
										};	
										logger.info("Data for table ---> "+ JSON.stringify(data));
										callback(null, data);
				      		  
						},function(data, callback){ // creating Managed account object 
				      				stripe.accounts.create({
				      				  managed: true,
				      				  country: 'US',
				      				  legal_entity:{
				      					  first_name : user[0].first_name,
				      					  last_name : user[0].last_name,
				      					  type : "individual",
				      					  dob:{
				      						  day : req.body.dob.split("-")[0],
				      						  month : req.body.dob.split("-")[1],
				      						  year : req.body.dob.split("-")[2],
				      					  },
				      					  ssn_last_4 : req.body.accounts.card.ssn,
				      					  address:{
				      						  city : req.body.address.city,
				      						  line1 : req.body.address.line1,
				      						  postal_code : req.body.address.postal_code,
				      						  state : req.body.address.state
				      					  }
				      				  },
				      				  tos_acceptance : {
				      					  date : 1487914591,
				      					  ip : "54.148.176.249"
				      				  }
				      				 // legal_entity[ssn_last_4] : req.body.card.ssn
				      				}, function(err, account) {
				      					if(err){
				      						logger.error(err);
											res.send(err);
										}
				      					data.managed_id = account.id;						      					
				      					logger.info("MANAGED ACCOUNT " +  JSON.stringify(account));
				      					callback(null, data);
				      				});
					      		},
					      		function(data, callback){ // Linking managed account to bank account... 
					      			stripe.accounts.createExternalAccount(
					      					data.managed_id,
					      				  {external_account: data.managed_token},
					      				  function(err, card) {
					      					if(err){
					      						logger.error(err);
												res.send(err);
											}
					      					logger.info("EXTERNAL ACCOUNT " +  JSON.stringify(card));
					      					callback(null, data);
					      				  }
					      				);					      			
					      			
					      		},
					      		function(data, callback){ // Inserting data in table 
					      			const sql = 'INSERT into ManagedAccounts SET ?;'
										connection.query( sql,[data],  function(err, rows){
										  	if(err)	{
										  		logger.error(err);
										  		return next(err);
										  	}else{												
										callback(null, 'done');												
										  	}
										});
					      		}
				      		   ], function(err, id) {
				   		    	if (err) {
				   		    		connection.release();
						    		res.send(500,err);
				   		    	}					
				   		    	res.send({"message" : "Driver Payment data added "});
				   		    	connection.release();
							});	
			}else
				{
				async.waterfall([
					      		   function(callback){  ///Creating token object  
					      			var data ={
					      				usr_id:user[0].id,									
					      				account_type:req.body.accounts.bank.account_type,
					      				last4digits: req.body.accounts.bank.number,	 
					      				expiry_date :req.body.accounts.bank.expiry,
										managed_token :req.body.accounts.bank.token1
					      				};
											callback(null, data);							      		   
							},
					      	function(data, callback){ // creating Managed account object 
					      		stripe.accounts.create({
				      				  managed: true,
				      				  country: 'US',
				      				  legal_entity:{
				      					  first_name : user[0].first_name,
				      					  last_name : user[0].last_name,
				      					  type : "individual",
				      					dob:{
				      						  day : req.body.dob.split("-")[0],
				      						  month : req.body.dob.split("-")[1],
				      						  year : req.body.dob.split("-")[2],
				      					  },
				      					  ssn_last_4 : req.body.accounts.bank.ssn,
				      					  address:{
				      						  city : req.body.address.city,
				      						  line1 : req.body.address.line1,
				      						  postal_code : req.body.address.postal_code,
				      						  state : req.body.address.state
				      					  }
				      				  },
				      				  tos_acceptance : {
				      					  date : 1487914591,
				      					  ip : "54.148.176.249"
				      				  }
				      				 // legal_entity[ssn_last_4] : req.body.card.ssn
				      				}, function(err, account) {
				      					if(err){
				      						logger.error(err);
											res.send(err);
										}
				      					data.managed_id = account.id;						      					
				      					logger.info("MANAGED ACCOUNT " +  JSON.stringify(account));
				      					callback(null, data);
				      				});
					   		},
					  		function(data, callback){ // Linking managed account to bank account... 
					   			stripe.accounts.createExternalAccount(
					   					data.managed_id,
					   				  {external_account: data.managed_token},
					   				  function(err, bank_account) {
					   					if(err){
					   						logger.error(err);
											res.send(err);
										}
					   					logger.info("EXTERNAL ACCOUNT " +  JSON.stringify(bank_account));
					   					callback(null, data);
					   				  }
					   				);							      			
						      			
						      		},
						    function(data, callback){ // Inserting data in table 
						      			const sql = 'INSERT into ManagedAccounts SET ?;'
											connection.query( sql,[data],  function(err, rows){
											  	if(err)	{
											  		logger.error(err);
											  		return next(err);
											  	}else{												
											callback(null, 'done');												
											  	}
											});
						      		}
					      		   ], function(err, id) {
					   		    	if (err) {
					   		    		connection.release();
							    		res.send(500,err);
					   		    	}					
					   		    	res.send({"message" : "Driver Payment data added "});
					   		    	connection.release();
								});	
					}			
		
		});
	});
	
};

exports.driverSave99 = function(req, res, next) {	
	console.log(" BODY " + JSON.stringify(req.body));
	pool.getConnection(function(err, connection){		
		connection.query( 'select id, first_name,last_name, phone, email from Users  where id =(Select user_id from Authentication where user_login = ?)', 
				[req.userId],  function(err, user){
			if(err)	{
  		  		logger.error(err);
  		  		return next(err);
					}
			var managedAccountExists = false;
			var SSN;
			logger.info(" Users  " +  JSON.stringify(user));								
				async.waterfall([
				      		   function(callback){  ///Creating token object  
				      			   		var managedData = {
				      			   			usr_id:user[0].id 
				      			   		} 
				      			   		var Externaldata;
					      			   	if(req.body.accounts.hasOwnProperty("card")){
					      			   	 Externaldata ={																								
												account_type:req.body.accounts.card.account_type,														
												last4digits: req.body.accounts.card.number,	
												expiry_date :req.body.accounts.card.expiry,
												token :req.body.accounts.card.token1
					      			   	 		};
					      			   	 SSN = req.body.accounts.card.ssn ;
					      			   	}else{
					      			   	Externaldata = { 							      												
							      				account_type:req.body.accounts.bank.account_type,
							      				last4digits: req.body.accounts.bank.number,	 
							      				expiry_date :req.body.accounts.bank.expiry,
												token :req.body.accounts.bank.token1
							      				};
					      			   	SSN = req.body.accounts.bank.ssn ;
					      			   	}										
										logger.info("Data for managedData ---> "+ JSON.stringify(managedData));
										logger.info("Data for Externaldata ---> "+ JSON.stringify(Externaldata));
										callback(null, managedData, Externaldata);
				      		  
				      		   },
				      		   function(managedData, Externaldata, callback){  ///Creating token object  
				      			 const ma_sql = 'Select * from ManagedAccounts where usr_id = ?;'
										connection.query( ma_sql,[managedData.usr_id],  function(err, rows){
										  	if(err)	{
										  		logger.error(err);
										  		return next(err);
										  	}else{
										  		logger.info("Data for managedAcconts table  ---> "+ JSON.stringify(rows));
										  		if(rows.length){										  			
										  			managedAccountExists = true;
										  			managedData.managed_id = rows[0].managed_id;
										  			Externaldata.managedID = rows[0].id;//setting managed id from managed accounts table for external accounts table
										  			callback(null, managedData, Externaldata);
										  		}else{
										  			callback(null, managedData, Externaldata);
										  		}										  															
										  	}
										});										      		  
				      		   }
				      		   ,function(managedData, Externaldata, callback){  // creating Managed account object 
				      			   if(managedAccountExists){
				      				 callback(null, managedData, Externaldata);
				      			   }else{       				   				      				   				      				   
				      				 stripe.accounts.create({
					      				  managed: true,
					      				  country: 'US',
					      				  legal_entity:{
					      					  first_name : user[0].first_name,
					      					  last_name : user[0].last_name ,
					      					  type : "individual",
					      					  dob:{
					      						  day : req.body.dob.split("-")[0],
					      						  month : req.body.dob.split("-")[1],
					      						  year : req.body.dob.split("-")[2]
					      					  },
					      					  ssn_last_4 : SSN,
					      					  address:{
					      						  city : req.body.address.city,
					      						  line1 : req.body.address.line1,
					      						  postal_code : req.body.address.postal_code,
					      						  state : req.body.address.state
					      					  }
					      				  },
					      				  tos_acceptance : {
					      					  date : Math.floor(Date.now() / 1000),
					      					  ip : req.header("x-forwarded-for") || req.connection.remoteAddress
					      				  }					      				
					      				}, function(err, account) {
					      					if(err){
					      						logger.error(err);
												res.send(err);
												return;
											}
					      					managedData.managed_id = account.id;						      					
					      					logger.info("MANAGED ACCOUNT " +  JSON.stringify(account));
					      					callback(null, managedData, Externaldata);
					      				});
				      			   }				      				
					      		},
					      		function(managedData, Externaldata, callback){  // Linking managed account to external account... 
					      			console.log("Managed id " + managedData.managed_id);
					      			console.log("TOKEN " + Externaldata.token );
					      			stripe.accounts.createExternalAccount(
					      					managedData.managed_id,
					      				  {external_account: Externaldata.token},
					      				  function(err, card) {
					      					if(err){
					      						logger.error(err);
												res.send(err);
												return;
											}
					      					logger.info("EXTERNAL ACCOUNT " +  JSON.stringify(card));
					      					callback(null, managedData, Externaldata);
					      				  }
					      				);					      			
					      			
					      		},
					      		function(managedData, Externaldata, callback){ // Inserting data in table 
					      			if(managedAccountExists){
					      				 callback(null, managedData, Externaldata);
					      			   }else{
					      			const sql1 = 'INSERT into ManagedAccounts SET ?;'
										connection.query( sql1,[managedData],  function(err, rows){
										  	if(err)	{
										  		logger.error(err);
										  		return next(err);
										  	}else{	
										  		Externaldata.managedID = rows.insertId;
										  		callback(null, managedData, Externaldata);											
										  	}
										});
					      			}
					      		},
					      		function(managedData, Externaldata, callback){ // Inserting data in table 					      			
					      			const sql2 = 'INSERT into ExternalAccounts SET ?;'
										connection.query( sql2, [Externaldata],  function(err, rows){
										  	if(err)	{
										  		logger.error(err);
										  		return next(err);
										  	}else{											  		
										  		callback(null, managedData, Externaldata);												
										  	}
										});					      			
					      		},
					      		function(managedData, Externaldata, callback){ // Updating data in table 					      			
					      			const sql3 = 'Update Users set ? where id = ?;';	      					 		      					 
					      			var formatted_date = req.body.dob.split("-")[2] + "-" + req.body.dob.split("-")[1] + "-" + req.body.dob.split("-")[0] ; //YYYY-MM-DD format.
					      			var addressnew =  req.body.address.city + " " + req.body.address.line1 + " " + req.body.address.postal_code + " " + req.body.address.state;
					      			console.log("FORMATTED DATE " + formatted_date);
					      			console.log("FORMATTED ADDRESS " + addressnew);
					      			var data = {
					      					dob : formatted_date,
					      					ssn : SSN,
					      					address : addressnew
					      			}
										connection.query( sql3,[data, managedData.usr_id],  function(err, rows){
										  	if(err)	{
										  		logger.error(err);
										  		return next(err);
										  	}else{											  		
										  		callback(null, "done");												
										  	}
										});					      			
					      		}
				      		   ], function(err, id) {
				   		    	if (err) {
				   		    		connection.release();
						    		res.send(500,err);
				   		    	}					
				   		    	res.send({"message" : "Driver Payment data added "});
				   		    	connection.release();
							});	//end of async				
		}); //end of connection 
	});// end of pool connection	
};



exports.bothSave = function(req, res, next) {	
		pool.getConnection(function(err, connection) {
			connection.query( 'Select user_id from Authentication where user_login = ?', 
					[req.userId],  function(err, user){
				if(err)	{
	  		  		logger.error(err);
	  		  		return next(err);
						}
		if(req.body.accounts.hasOwnProperty("card")){						
			async.waterfall([
			      		   function(callback){  ///Creating token object  									
									var riderData ={
											usr_id: user[0].user_id,												
											account_type:req.body.accounts.card.account_type,														
											last4digits: req.body.accounts.card.number,	
											expiry_date :req.body.accounts.card.expiry,
											customer_token: req.body.accounts.card.token1											
									};	
									var driverData ={};
									if(req.body.accounts.hasOwnProperty("debitcard")){	
									 driverData ={
											usr_id: user[0].user_id,													
											account_type:req.body.accounts.debitcard.account_type,														
											last4digits: req.body.accounts.debitcard.number,	
											expiry_date :req.body.accounts.debitcard.expiry,
											managed_token :req.body.accounts.debitcard.token1
									};
									}
									else{
										driverData ={
												usr_id: user[0].user_id,													
												account_type:req.body.accounts.bank.account_type,														
												last4digits: req.body.accounts.bank.number,	
												expiry_date :req.body.accounts.bank.expiry,
												managed_token :req.body.accounts.bank.token1
										};
									}
									logger.info("Rider Data for table ---> "+ JSON.stringify(riderData));
									logger.info("Driver Data for table ---> "+ JSON.stringify(driverData));
									callback(null, riderData, driverData);
			      		  
					}, 
					function(riderData, driverData, callback){ // creating customer object 
			      			 stripe.customers.create({
								  description: 'Customer Object creation',
								  source: riderData.customer_token // obtained with Stripe.js
								}, function(err, customer) {
									if(err){
										logger.error(err);
										res.send(err);
									}
									logger.info("CUSTOMER " +  JSON.stringify(customer));
									riderData.customer_id = customer.id;
									callback(null, riderData, driverData);
									
								});
			      			},
			      			function(riderData, driverData, callback){  // creating Managed account object 
			      				stripe.accounts.create({
			      				  managed: true,
			      				  country: 'US'
			      				 // legal_entity[ssn_last_4] : req.body.card.ssn
			      				}, function(err, account) {
			      					if(err){
			      						logger.error(err);
										res.send(err);
									}
			      					driverData.managed_id = account.id;						      					
			      					logger.info("MANAGED ACCOUNT " +  JSON.stringify(account));
			      					callback(null, riderData, driverData);
			      				});
				      		},
				      		function(riderData, driverData, callback){  // Linking managed account to bank account... 
				      			stripe.accounts.createExternalAccount(
				      					driverData.managed_id,
				      				  {external_account: driverData.managed_token},
				      				  function(err, card) {
				      					if(err){
				      						logger.error(err);
											res.send(err);
										}
				      					logger.info("EXTERNAL ACCOUNT " +  JSON.stringify(card));
				      					callback(null, riderData, driverData);
				      				  }
				      				);					      			
				      			
				      		},
				      		function(riderData, driverData, callback){  // Inserting data in table 
				      			const sql = 'INSERT into Accounts SET ?;INSERT into ManagedAccounts SET ?;'
									connection.query( sql,[riderData, driverData],  function(err, rows){
									  	if(err)	{
									  		logger.error(err);
									  		return next(err);
									  	}else{												
									callback(null, 'done');												
									  	}
									});
				      		}
			      		   ], function(err, id) {
			   		    	if (err) {
			   		    		connection.release();
					    		res.send(500,err);
			   		    	}					
			   		    	res.send({"message" : "Payment data added "});
			   		    	connection.release();
						});	
			}		
		});
	});
};


exports.checkRidersCreditCard = function(req, res, next) {
	pool.getConnection(function(err, connection){	
		connection.query( 'select * from Accounts where usr_id	= (select user_id from Authentication where user_login = ?) ', 
				[ req.userId],  function(err, accounts){
			if(err)	{
  		  		logger.error(err);
  		  		return next(err);
					}			
			res.send(200,accounts);
			connection.release();  
		});
	});	
};

exports.checkDriversBankorDebitCard = function(req, res, next) {
	pool.getConnection(function(err, connection){	
		connection.query( 'select ex.*  from ExternalAccounts ex, ManagedAccounts ma\
					where ma.usr_id	= (select user_id from Authentication where user_login = ?)\
					and ma.id = ex.managedID', 
				[ req.userId],  function(err, accounts){
			if(err)	{
  		  		logger.error(err);
  		  		return next(err);
					}
			console.log("DB or bank " + JSON.stringify(accounts));
			res.send(200,accounts);
			connection.release();  
		});
	});	
};
exports.riderCommit = function(req, res, next) {
	pool.getConnection(function(err, connection){	
		connection.query( 'Select user_id from Authentication where user_login = ? ', 
				[ req.userId],  function(err, user){
			if(err)	{
  		  		logger.error(err);
  		  		return next(err);
					}
			var transactions ={};
			logger.info(" User data " +  JSON.stringify(user));
			logger.info(" User body data " +  JSON.stringify(req.body));
			async.waterfall([
		      		   function(callback){ //reading rider's customer id for payment
		      			   var tip = req.body.tip < 0 ? 0 : req.body.tip;
		      			   var tiparr = tip.split(".");
		      			   var tipamt = tiparr.join("");
		      			 connection.query( 'update  Transactions set account_id = ? , status = \"processing\", tip = ? where ride_id = ? and status = \"pending\" ', 
		      					[req.body.account_id, tipamt, req.body.ride_id],  function(err, Accounts){
		      				if(err)	{
		      	  		  		logger.error(err);
		      	  		  		return next(err);
		      						} 
		      				logger.info(" ACCOUNT " +  JSON.stringify(Accounts));		      				
		      				callback(null, 'done');	
		      			 });
				}], function(err, id) {
		   		    	if (err) {
		   		    		connection.release();
				    		res.send(500,err);
		   		    	}					
		   		    	res.send({"message" : "Payment Successfully done"});
		   		    	connection.release();
					});	
		});
	});
};
exports.deletePaymentDetails = function(req, res, next) {
	 pool.getConnection(function(err, connection){
		 connection.query('select * from Authentication where user_login = ?',[req.userId],
					function(err, phonerows) {
			   			if (err) {
			   				return  next(err);	
			   			}else {  
							const sql='DELETE from Accounts where  id = ? ';
							 connection.query(sql,[req.params.id],
										function(err, rows) {
								   			if (err) {
								   				return  next(err);	
								   			}else {  
								   				logger.info( rows );								   				
								   				res.send(200,{"message" : "Account Deleted"});
								   				connection.release();
											}
								   		});
			   			}
		 	});
	 });
};


exports.deleteDriverPaymentDetails = function(req, res, next) {
	 pool.getConnection(function(err, connection){
		 connection.query('select * from Authentication where user_login = ?',[req.userId],
					function(err, phonerows) {
			   			if (err) {
			   				return  next(err);	
			   			}else {  
							const sql='DELETE from ExternalAccounts where  id = ? ';
							 connection.query(sql,[req.params.id],
										function(err, rows) {
								   			if (err) {
								   				return  next(err);	
								   			}else {  
								   				logger.info( rows );								   				
								   				res.send(200,{"message" : "Account Deleted"});
								   				connection.release();
											}
								   		});
			   			}
		 	});
	 });
};
exports.transactionToday = function(req, res, next) {
	pool.getConnection(function(err, connection){	
		connection.query( 'select tr.id,u.first_name,rid.from_location, rid.to_location, rid.start_date, \
				rid.end_date, rid.ride_time, tr.amount,tr.tip, tr.status, rid.uRideType, \'Rider\' AS role \
				from Users u, Ride rid , Transactions tr,Authentication auth\
				where rid.id = tr.ride_id\
				and u.id = rid.rider_id\
				and u.id = auth.user_id\
				and auth.user_login = ?\
				and DATE_FORMAT(tr.update_ts,\'%Y-%m-%d\') = DATE_FORMAT(now(), \'%Y-%m-%d\')\
				UNION \
				select tr.id,u.first_name,rid.from_location, rid.to_location, rid.start_date, \
				rid.end_date, rid.ride_time, tr.amount,tr.tip, tr.status, rid.uRideType, \'Driver\' AS role \
				from Users u, Ride rid , Transactions tr,Authentication auth\
				where rid.id = tr.ride_id\
				and u.id = tr.driver_id\
				and u.id = auth.user_id\
				and auth.user_login = ?\
				and DATE_FORMAT(tr.update_ts,\'%Y-%m-%d\') = DATE_FORMAT(now(), \'%Y-%m-%d\')', 
				[ req.userId, req.userId ],  function(err, list){
			if(err)	{
  		  		logger.error(err);
  		  		return next(err);
			}
			logger.info("Transaction Today Response : " + list);
			res.send(200,list);
			connection.release();  
		});
	});	
};

exports.transactionHistory = function(req, res, next) {
	pool.getConnection(function(err, connection){	
		connection.query( 'select tr.id,u.first_name,rid.from_location, rid.to_location, rid.start_Date,\
				rid.end_date, rid.ride_time, tr.amount,tr.tip, tr.status, rid.uRideType\
				from Users u, Ride rid , Transactions tr,Authentication auth\
				where rid.id = tr.ride_id\
				and u.id = rid.rider_id\
				and u.id = auth.user_id\
				and auth.user_login = ? ',
				//and rid.ride_date < DATE_FORMAT(now(), \'%Y-%m-%d\') ', 
				[ req.userId],  function(err, list){
			if(err)	{
  		  		logger.error(err);
  		  		return next(err);
					}
			res.send(200,list);
			connection.release();  
		});
	});	
};

exports.updateTip = function(req, res, next) {
	pool.getConnection(function(err, connection){
		console.log('incoming transaction : ' + JSON.stringify(req.body));
		console.log('transaction id : ' + req.body.transactionId);
		console.log('tip ' + req.body.tip);
		 connection.query('select * from Authentication where user_login = ?',[req.userId],
					function(err, rows) {
			   			if (err) {
			   				return  next(err);	
			   			}else {  
			   				var tip = req.body.tip.split(".");
			   				var tipamt = tip.join("");
							const sql='update Transactions set tip = ? where id = ?';
							 connection.query(sql,[tipamt,req.body.transactionId],
										function(err, rows) {
								   			if (err) {
								   				return  next(err);	
								   			}else {  
								   				logger.info( rows );								   				
								   				res.send(200,{"message" : "Tip Updated"});
								   				connection.release();
											}
								   		});
			   			}
		 	});
	 });
};


/*var paymentProcess = exports.paymentProcess = function() {
	pool.getConnection(function(err, connection){
	connection.query( 'SELECT * FROM Transactions where date(update_ts ) <= date(?) and status = \"pending\";', 
	[moment().format('YYYY-MM-DD')],  function(err, Transactions){
	if(err)	{
	    logger.error(err);
	    return next(err);
	}
	var transactions ={};		
	logger.info(" User data " +  JSON.stringify(Transactions));
	async.each(Transactions, function(Transaction, callback) {
		
		async.waterfall([
		                 function(callback){  // create a charge
		                	 	  var app_fee = (Transaction.app_fee / 100) * Transaction.amount;
		                	 	  
		                	 	  var totalAmount = (Transaction.amount - app_fee) + Transaction.tip;
		                	 	  
							      stripe.charges.create({
							        amount: totalAmount,
							        currency: "usd",
							        customer : Transaction.customer_id,
							        destination: Transaction.maanged_account,
							        description: "Transfer for ucorsa.com",
							        application_fee : app_fee
							      }, function(err, charge) {
							      if(err){
							    	  logger.error(err);
							      }							     
							      logger.info( " Charge abject " + JSON.stringify(charge ));							  
							      callback(null, charge.id);
							  });
					      },
					      function(charge_id,  callback){  // Inserting data in table 
								const sql = 'update Transactions set status = \"processing\" , charge_id = ? where id = ?;'
								connection.query( sql,[charge_id , Transaction.id],  function(err, rows){
									if(err)	{
										logger.error(err);								  
									}else{
										callback(null, 'done');
									}
								});
					      }
		     	  ], function(err, id) {
				      if (err) {
				    	  connection.release();
				    	  logger.error(err);
				      }
				      logger.info( "Payment Successfully done");		     		
			});
		    callback();
		  }, function(err){		   
		    if( err ) {
		    	logger.error(err);  		  		
		    } else {
		    	logger.info( "message -- Payment processed successfully");
		    	 connection.release();		
		    }
		});	
	});
});
};
*/

var paymentProcess99 = exports.paymentProcess = function() {
	pool.getConnection(function(err, connection){
	connection.query( 'SELECT * FROM Transactions where date(update_ts ) <= date(?) and status = \"pending\";', 
	[moment().format('YYYY-MM-DD')],  function(err, Transactions){
	if(err)	{
	    logger.error(err);
	    return next(err);
	}
	var transactions ={};		
	logger.info(" User data " +  JSON.stringify(Transactions));
	async.each(Transactions, function(Transaction, callback) {
		
		async.waterfall([
		                 function(callback){  // create a charge
		                	 	  //var app_fee = (Transaction.app_fee / 100) * Transaction.amount;
		                	 	  
		                	 	  var totalAmount = Transaction.amount + Transaction.tip;
		                	 	  var destinationAmount = totalAmount - (totalAmount * 25) / 100;
		                	 	  
							      stripe.charges.create({
							        amount: totalAmount,
							        currency: "usd",
							        customer : Transaction.customer_id,
							        destination: {
							        	amount : destinationAmount,
							        	account : Transaction.maanged_account
							        },
							        description: "Transfer for ucorsa.com",
							      }, function(err, charge) {
							      if(err){
							    	  logger.error(err);
							      }							     
							      logger.info( " Charge abject " + JSON.stringify(charge ));							  
							      callback(null, charge.id);
							  });
					      },
					      function(charge_id,  callback){  // Inserting data in table 
								const sql = 'update Transactions set status = \"processing\" , charge_id = ? where id = ?;'
								connection.query( sql,[charge_id , Transaction.id],  function(err, rows){
									if(err)	{
										logger.error(err);								  
									}else{
										callback(null, 'done');
									}
								});
					      }
		     	  ], function(err, id) {
				      if (err) {
				    	  connection.release();
				    	  logger.error(err);
				      }
				      logger.info( "Payment Successfully done");		     		
			});
		    callback();
		  }, function(err){		   
		    if( err ) {
		    	logger.error(err);  		  		
		    } else {
		    	logger.info( "message -- Payment processed successfully");
		    	 connection.release();		
		    }
		});	
	});
});
};
