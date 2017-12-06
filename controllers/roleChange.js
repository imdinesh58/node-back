/**
 * New node file
 */
var pool  = require('../config/db');
var logger = require("../lib/logger");
var async = require('async');
var config  = require('../config/config');

//var stripe = require("stripe")(
//		  "sk_live_IeD9uw3mIBkMxmEZxCYq0lxe"
//		);  

var stripe = require("stripe")(
		config.get('stripeKey')
		);

exports.getRole = function(req, res, next) {
	 pool.getConnection(function(err, connection){
		 connection.query('Select user_role from Users where id = (select user_id from Authentication where user_login = ?)',[req.userId],
					function(err, rows) {
			   			if (err) {
			   				return  next(err);	
			   			}else {  							
									logger.info( rows );								   				
									res.send(200,rows);
								   	connection.release();
			   			}
		 	});
	 });
};

exports.changeToDriver = function(req, res, next)
{
	pool.getConnection(function(err, connection){	
		connection.query( 'Select * from Users where id = (select user_id from Authentication where user_login = ?)', 
				[req.userId],  function(err, user){
			if(err)	{
  		  		logger.error(err);
  		  		return next(err);
					}
			logger.info(" Users  " +  JSON.stringify(user));
			if(user[0].user_role == "Both" || user[0].user_role == "Rider"){
				async.waterfall([
					     function(callback){  //fetching account table to delete rider account details
					    	 connection.query('SELECT * FROM ucorsa.Accounts where usr_id = ? ',[user[0].id],
					       				function(err, Rows ) {
					       		   			if (err) {
					       		   			logger.error(err);
					       			  		return next(err);		       		   				
					       		   			}else {    
					       		   				logger.info("Getting " + JSON.stringify(Rows));
					       						callback(null, Rows);
					       					}				       						
					       		   		});	      		  
							}, 
							function(rows, callback){  
								async.each(rows, function(row, callback) {									
									stripe.customers.del(
											  row.customer_id,
											  function(err, confirmation) {
												  logger.info("Customer deleted" + JSON.stringify(confirmation));
												  connection.query('Delete from ucorsa.Accounts where id = ?  ',[row.id],
										       				function(err, DeletedRows ) {
										       		   			if (err) {
										       		   			logger.error(err);
										       			  		return next(err);		       		   				
										       		   			}else {    
										       		   				logger.info("Row deleted  " + JSON.stringify(DeletedRows));	
										       		   			callback();
										       					}				       						
										       		   		});	 
											  }
											);
									 
									}, function(err){
										if( err ) {
											logger.error(err);
					       			  		return next(err);
										    } else {
										      console.log('Riders account data has been deleted');
										      callback(null, 'done');
										    }
									});
					      			 
					      	}
					        ], function(err, id) {
					   		    	if (err) {
					   		    		connection.release();
							    		res.send(500,err);
					   		    	}	   		    
					   		    	connection.release();
					   		    	next();
								});	
			}
			else
				{
				next();
				}
			
		});
	});
};

exports.driverDataEntry = function(req, res, next)
{
	pool.getConnection(function(err, connection){	
		connection.query( 'Select user_id from Authentication where user_login = ?', 
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
												usr_id:user[0].user_id,												
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
					      			const sql = 'INSERT into ManagedAccounts SET ?;update Users set user_role = ? where id = ?'
										connection.query( sql,[data, req.body.accounts.role, data.usr_id],  function(err, rows){
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
				   		    	res.send({"message" : "Role changed "});
				   		    	connection.release();
							});	
			}else
				{
				async.waterfall([
					      		   function(callback){  ///Creating token object  
					      			var data ={
					      				usr_id:user[0].user_id,									
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
						      			const sql = 'INSERT into ManagedAccounts SET ?;update Users set user_role = ? where id = ?'
											connection.query( sql,[data, req.body.accounts.role, data.usr_id],  function(err, rows){
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
					   		    	res.send({"message" : "Role changed "});
					   		    	connection.release();
								});	
					}			
		
		});
	});
};

exports.changeToRider = function(req, res, next)
{
	pool.getConnection(function(err, connection){	
		connection.query( 'Select * from Users where id = (select user_id from Authentication where user_login = ?)', 
				[req.userId],  function(err, user){
			if(err)	{
  		  		logger.error(err);
  		  		return next(err);
					}
			logger.info(" Users  " +  JSON.stringify(user));
			if(user[0].user_role == "Both" || user[0].user_role == "Driver"){
				async.waterfall([
					     function(callback){  //fetching ManagedAccount table to delete driver account details
					    	 connection.query('SELECT * FROM ucorsa.ManagedAccounts where usr_id = ? ',[user[0].id],
					       				function(err, Rows ) {
					       		   			if (err) {
					       		   			logger.error(err);
					       			  		return next(err);		       		   				
					       		   			}else {    
					       		   				logger.info("Getting " + JSON.stringify(Rows));
					       						callback(null, Rows);
					       					}				       						
					       		   		});	      		  
							}, 
							function(rows, callback){  
								async.each(rows, function(row, callback) {							
									stripe.accounts.del(row.managed_id);
												  connection.query('Delete from ucorsa.ManagedAccounts where id = ?  ',[row.id],
										       				function(err, DeletedRows ) {
										       		   			if (err) {
										       		   			logger.error(err);
										       			  		return next(err);		       		   				
										       		   			}else {    
										       		   				logger.info("Row deleted  " + JSON.stringify(DeletedRows));	
										       		   			callback();
										       					}				       						
										       		   		});	 								 
									 
									}, function(err){
										if( err ) {
											logger.error(err);
					       			  		return next(err);
										    } else {
										      console.log('Drivers account data has been deleted');
										      callback(null, 'done');
										    }
									});
					      			 
					      	}
					        ], function(err, id) {
					   		    	if (err) {
					   		    		connection.release();
							    		res.send(500,err);
					   		    	}	   		    
					   		    	connection.release();
					   		    	next();
								});	
			}
			else
				{
				next();
				}
			
		});
	});
};



exports.riderDataEntry = function(req, res, next)
{
	pool.getConnection(function(err, connection){	
		connection.query( 'Select user_id from Authentication where user_login = ? ', 
				[ req.userId],  function(err, user){
			if(err)	{
  		  		logger.error(err);
  		  		return next(err);
					}
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
					      			const sql = 'INSERT into Accounts SET ?; update Users set user_role = ? where id = ?';
										connection.query( sql,[data, req.body.accounts.role, data.usr_id],  function(err, rows){
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
				   		    	res.send({"message" : "Role changed "});
				   		    	connection.release();
							});	
				}
			
		});	
	});
	
};



