var pool  = require('../config/db');
var logger = require("../lib/logger");
var hash = require('../controllers/hash');
var async = require('async');
var _ = require("underscore");
var dateformat = require("../lib/dateformat");
var config  = require('../config/config');


//var stripe = require("stripe")(
//		  "sk_live_IeD9uw3mIBkMxmEZxCYq0lxe"
//		);
var stripe = require("stripe")(
		config.get('stripeKey')
		);

//console.log("LOG KEY " + config.get('stripeKey'));


exports.getUser = function(req, res,next){
	  pool.getConnection(function(err, connection){
		  connection.query('select id, first_name, phone, email from Users  where id =(Select user_id from Authentication where user_login = ?)',req.userId, function(err, userRows) {
				if (err) {
					logger.error(err);
			  		return next(err);
						} else {
							logger.info("Data ---> "+ JSON.stringify(userRows));
				  connection.query( 'select usr.id, address.address1, address.address2, address.city, address.state, address.zip\
						  from ucorsa.Users usr, ucorsa.Address address\
						  where usr.id = address.user_id\
						  and usr.id = ?',userRows[0].id,  function(err, rows){
				  	if(err)	{
				  		return next(err);
				  	}else{
				  		logger.info("Data ---> "+ JSON.stringify(rows));
				  		userRows[0].address = rows;
				  		logger.info( userRows );
				  		res.send(200, userRows);
				  		connection.release();
				  	}
				  });
				}
		  });
	  });
};




//source code for post user Data to Server


exports.updateUsers = function(req, res,next){
	
	 pool.getConnection(function(err, connection){
		  var auth = req.body.authentication;
		  connection.query( 'Select user_id from Authentication where user_login = ?',req.userId, function(err, rows){
		  	if(err)	{
		  		return next(err);
		  	}		  	  	
		  	var usr = req.body.user;			
			var put = {
					first_name : usr.first_name,
					//last_name : usr.last_name,
					//gender : usr.gender,
					//user_role : usr.user_role,
					//dob : usr.dob,
					email : usr.email,
					affiliation : usr.affiliation
					//phone : usr.phone	,
					//driver_cnt : usr.driver_cnt,
					//smoker : usr.smoker,
					//update_user : usr.update_user,
					//update_ts : dateformat.currentTimestamp()
			};
		  	
		 	//connection.query( 'update Authentication set user_login =? , user_password  = ?  where user_id = ?',[auth.user_name,auth.user_password,req.params.userId],  function(err, rows){
		  	connection.query( 'update Users set ? where id = ?',[usr, rows[0].user_id],  function(err, rows){ 
		  	if(err)	{
			  		return next(err);
			  	}else{
			  		logger.info("Auth table updated");
			  		res.send(200, {"message":"User table updated"});
			  		connection.release();
			  	}
			  });
		  	
		  });
	  });   
	
};




exports.Register = function(req, res, next)
{
	logger.info("In Post User function 1");
//	var emailValidation = /^([a-zA-Z0-9_\.\-])+\@(([a-zA-Z0-9\-])+\.)+([a-zA-Z0-9]{2,6})+$/;
//	var monthValidation = /^(0[1-9]|1[0-2])$/;
//	var yearValidation =  /^\d{4}$/;
//	var phoneValidation =  /^\d{10}$/;	
//	if (!emailValidation.test(req.body.user.email))
//		{
//		res.send("Enter valid email");
//		return;
//		}	
	logger.info("Register data  " +  JSON.stringify(req.body));
	pool.getConnection(function(err, connection) {
		logger.info("JSON data " + JSON.stringify(req.body) );
		logger.info("Request Header " + JSON.stringify(req.header) );
		var req_body = JSON.parse(JSON.stringify(req.body));
		connection.query( 'select * from Authentication where user_login = ?;select * from Users where phone = ? ',
				[req.body.authentication.user_login,req.body.user.phone],  
				function(err, rows){
			if(err)	{
		  		logger.error(err);
		  		return next(err);
		  	}
			if( rows[0].length && rows[1].length)
  			{
	  			res.send(401, {"message": "Username and Phone Number already exists"});
				return;
  			}
	  		else if(rows[0].length)
  			{
	  			res.send(401, {"message":"Username already exists"});
				return;
  			}
	  		else if(rows[1].length)
			{
				res.send(401, {"message":"Phone Number already exists"});
				return;
			}		
			
			connection.beginTransaction(function(err) {
				async.waterfall([
				    //insert into user table             
			        function(callback) {
						var user = JSON.parse(JSON.stringify(req.body.user));
						if(req_body.hasOwnProperty("accounts"))
			        	 {
						user.user_role = req.body.accounts.role;
			        	 }
						logger.info("Data for User table ---> "+ JSON.stringify(user));
						const sql = 'INSERT INTO Users SET ?';
			    		logger.info("Creating the User object");			    		
			        	connection.query(sql, user, function(err,rows){
			        		if(err){
			        			logger.info("Error : %s", err);
			        			return callback(true);
			        		} else {
								logger.info("User created ... ID = " + rows.insertId );
			        			return callback(null, rows.insertId);
			        		}
			        	});
			        },
			    //   // Update Campaign Table/// 
			    //     function(id, callback) {
				// 		const sql = 'UPDATE campaign SET userid = ?';
				// 		connection.query(sql, id, function(err,rows){
			    //     		if(err){
				// 				logger.info("Error updating Campaign Table : Error = " + JSON.stringify(err));
			    //     			return callback(true);
			    //     		} else {
			    //     			logger.info("UPDATED Camapign  ID  : " + id);
				//                 return callback(null, id);
			    //     		}
			    //     	});
			    //     },
					//insert into Authentication table
			        function(id, callback) {
						var auth = JSON.parse(JSON.stringify(req.body.authentication));
						const sql = 'INSERT INTO Authentication SET ?';
						auth.user_id = id;
						connection.query(sql, auth, function(err,rows){
			        		if(err){
								logger.info("Error updating Authentication Table : Error = " + JSON.stringify(err));
			        			return callback(true);
			        		} else {
			        			logger.info("The value of the id is : " + id);
				                return callback(null, id);
			        		}
			        	});
			        },
			        //insert into payments table
			        function(id, callback) {
			        if(req_body.hasOwnProperty("accounts") && req.body.accounts.card != null )
					{
						var accounts_data ={};
						accounts_data.usr_id = id;
						if(req.body.accounts.role =='Rider')
						{
							rider_addAccount(req, res, accounts_data, function() {
								return callback(null, id);
								});
						}									
						else if(req.body.accounts.role =='Driver')
						{
							driver_addAccount(req, res, accounts_data, function() {
								return callback(null, id);
								});
						}										
						else if(req.body.accounts.role =='Both')
						{
							both_addAccount(req, res, accounts_data, function() {
								return callback(null, id);
								});
						}									
					}
			        else
					{
						return callback(null, id);
					}
		               
			        }], function(err) {
				    	if (err) {
				    	    connection.rollback(function() {
				              //throw err;
				    	    	return next(err);
				    	    });
				    	    res.send('Error inserting in all tables !!!!!!!!! - Error = ' + JSON.stringify(err));
				    } else {
				    	connection.commit(function(err) {
				            if (err) { 
				              connection.rollback(function() {
				                throw err;
				              });
				            }
				          });
				    	res.send(200, {"message":"Successfully registered. Please Login to start ride."});
				    	connection.release();
				    }					
				});
			});
		});
	});
};

var rider_addAccount = function(req, res, accounts_data, callback) {	
	pool.getConnection(function(err, connection){	
			if(req.body.accounts.hasOwnProperty("card")){						
				async.waterfall([
				      		   function(callback){  ///Creating token object  									
										var data ={
												usr_id: accounts_data.usr_id,											
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
					      			const sql = 'INSERT into Accounts SET ?';
										connection.query( sql,[data],  function(err, rows){
										  	if(err)	{
										  		logger.error(err);
												res.send(err);
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
				   		    	logger.info("Rider info updated ") ;
				   		    	connection.release();
				   		    	callback();
							});	
				}
	});
};
var driver_addAccount = function(req, res, accounts_data, callback) {	
	pool.getConnection(function(err, connection){	
			if(req.body.accounts.hasOwnProperty("card")){						
				async.waterfall([
				      		   function(callback){  ///Creating token object  									
										var data ={
												usr_id: accounts_data.usr_id,											
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
				      				  country: 'US'
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
					      			const sql = 'INSERT into ManagedAccounts SET ?'
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
				   		    	logger.info("Driver info updated ") ;
				   		    	connection.release();
				   		    	callback();
							});	
			}else
				{
				async.waterfall([
					      		   function(callback){  ///Creating token object  
					      			var data ={
					      				usr_id: accounts_data.usr_id,							
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
				      				  country: 'US'
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
						      			const sql = 'INSERT into ManagedAccounts SET ?'
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
					   		    	logger.info("Driver info updated ") ;
					   		    	connection.release();
					   		    	callback();
								});	
					}
	});
};


var both_addAccount = function(req, res, accounts_data, callback) {	
	pool.getConnection(function(err, connection){	
	if(req.body.accounts.hasOwnProperty("card")){						
		async.waterfall([
		      		   function(callback){  ///Creating token object  									
								var riderData ={
										usr_id: accounts_data.usr_id,											
										account_type:req.body.accounts.card.account_type,														
										last4digits: req.body.accounts.card.number,	
										expiry_date :req.body.accounts.card.expiry,
										customer_token: req.body.accounts.card.token1											
								};	
								var driverData ={};
								if(req.body.accounts.hasOwnProperty("debitcard")){	
								 driverData ={
										usr_id: accounts_data.usr_id,													
										account_type:req.body.accounts.debitcard.account_type,														
										last4digits: req.body.accounts.debitcard.number,	
										expiry_date :req.body.accounts.debitcard.expiry,
										managed_token :req.body.accounts.debitcard.token1
								};
								}
								else{
									driverData ={
											usr_id: accounts_data.usr_id,													
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
			      			const sql = 'INSERT into Accounts SET ?;INSERT into ManagedAccounts SET ?';
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
		   		    	logger.info(" Role Both -- card accounts data updated ");
		   		    	connection.release();
		   		    	callback();
					});	
		}	
	});
};
