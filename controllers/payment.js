/**
 * New node file
 */

var pool  = require('../config/db');
var logger = require("../lib/logger");
var paypal = require('paypal-rest-sdk');


exports.c_card = function(req, res, next) {
	
	
//	var config = {
//		    'mode': 'sandbox',
//		    'client_id': 'AQjTsJ2lljvZXHMeHvy_FjgDGv7PQqCJNy2_UqnLNKbonBxaZ29ZMDYTFsgFqtaNe_4U5Aa2SBi3SKpZ',
//		    'client_secret': 'EMwyQMnh76IeC6h5eySRs3uG6-uPuxQEb2wx1LBl1Eresc_MECCI5j35AFFp_zBaNJxRdAoD7nTZBgCl'
//		};
	
	var config = {
		    'mode': 'live',
		    'client_id': 'AWRvh1HE7-HH3jHIw9Srjq-7P2YdCGn0NQrZF8dO_KnqDFxpL0p_q7EmOZsa5PfijXhphY1WTEgaXE9g',
		    'client_secret': 'EJjxM1rLkWxxJhZiUFwQmqFY3f88ERE4apXDo_Y2_jINDJb4uxgCBZ6g0jaX_B_Bld7EkqtQAOB4C-Yc'
		};
	 

	var create_payment_json = {
		    "intent": "sale",
		    "payer": {
		        "payment_method": "credit_card",
		        "funding_instruments": [{
		            "credit_card": {
		                "type": req.body.card_type,
		                "number": req.body.card_number,
		                "expire_month": req.body.card_expiry_month,
		                "expire_year": req.body.card_expiry_year,
		               // "cvv2": "941",
		                "first_name": "Sethu",
		                "last_name": "Thangamuthu",
		                "billing_address": {
		                    "line1": "52 N Main ST",
		                    "city": "Johnstown",
		                    "state": "OH",
		                    "postal_code": "43210",
		                    "country_code": "US"
		                	}
		            	}
		            }]
		        },		    
		    "transactions": [{
		        "amount": {
		            "total": req.body.amount,
		            "currency": "USD"
		        },
		        "description": "This is the payment transaction description."
		    }]
		};	
		paypal.payment.create(create_payment_json, config, function (error, payment) {
		    if (error) {
		    	logger.info("In payment error"); 
		        return next(error);
		    } else {
		    	logger.info("In payment create"); 
		    	 console.log(payment);
		    	 res.send("Payment Successfull");
		        
		    }
		});
	
};


exports.new_c_card = function(req, res, next) {
	 pool.getConnection(function(err, connection){
		  connection.query('select * from ucorsa.payments where id = ? ',[req.body.paymentId], function(err, rows) {
				if (err) {
					logger.error(err);
			  		return next(err);
				} else {
					
					var config = {
						    'mode': 'live',
						    'client_id': 'AWRvh1HE7-HH3jHIw9Srjq-7P2YdCGn0NQrZF8dO_KnqDFxpL0p_q7EmOZsa5PfijXhphY1WTEgaXE9g',
						    'client_secret': 'EJjxM1rLkWxxJhZiUFwQmqFY3f88ERE4apXDo_Y2_jINDJb4uxgCBZ6g0jaX_B_Bld7EkqtQAOB4C-Yc'
						};
					var create_payment_json = {
						    "intent": "sale",
						    "payer": {
						        "payment_method": "credit_card",
						        "funding_instruments": [{
						            "credit_card": {
						                "type": rows[0].credit_card_type,
						                "number": rows[0].credit_card_number,
						                "expire_month": rows[0].credit_card_expiry_month,
						                "expire_year": rows[0].credit_card_expiry_year,
						                "cvv2":  req.body.cvv,
						                "first_name": "Sethu",
						                "last_name": "Thangamuthu",
						                "billing_address": {
						                    "line1": "52 N Main ST",
						                    "city": "Johnstown",
						                    "state": "OH",
						                    "postal_code": "43210",
						                    "country_code": "US"
						                	}
						            	}
						            }]
						        },		    
						    "transactions": [{
						        "amount": {
						            "total": req.body.amount,
						            "currency": "USD"
						        },
						        "description": "This is the payment transaction description."
						    }]
						};	
						paypal.payment.create(create_payment_json, config, function (error, payment) {
						    if (error) {
						    	logger.info("In payment error"); 
						        return next(error);
						    } else {
						    	logger.info("In payment create"); 
						    	 console.log(payment);
						    	 res.send("Payment Successfull");
						        
						    }
						});
					  }					  
		  		});
	  });
};


exports.getPayments = function(req, res, next) {
	 pool.getConnection(function(err, connection){
		  connection.query('select * from ucorsa.payments where user_id=(Select user_id from Authentication where user_login = ?)',[req.userId], function(err, rows) {
				if (err) {
					logger.error(err);
			  		return next(err);
				} else {
					  	logger.info( rows );
					  		res.send(200, rows);
					  		connection.release();
					  	}					  
		  		});
	  });
};

exports.addPayments = function(req, res, next) {
	 pool.getConnection(function(err, connection){
		  connection.query('Select user_id from Authentication where user_login = ?',[req.userId], function(err, rows) {
				if (err) {
					logger.error(err);
			  		return next(err);
				} else { 
					req.body.user_id = rows[0].user_id;
						connection.query('INSERT INTO payments SET ? ',[req.body], function(err, rows) {
							if (err) {
								logger.error(err);
						  		return next(err);
							} else {
								  	logger.info( rows );
								  		res.send(200, {"message":"Payments data added"});
								  		connection.release();
								  	}					  
					  		});					  		
					  	}					  
		  		});
	  });
};

exports.updatePayments = function(req, res, next) {
	 pool.getConnection(function(err, connection){
		  connection.query('Select user_id from Authentication where user_login = ?',[req.userId], function(err, rows) {
				if (err) {
					logger.error(err);
			  		return next(err);
				} else { 				
						connection.query('update payments set ? where id = ? ',[req.body, req.params.id ], function(err, rows) {
							if (err) {
								logger.error(err);
						  		return next(err);
							} else {
								  	logger.info( rows );
								  		res.send(200, {"message":"Payments data updated"});
								  		connection.release();
								  	}					  
					  		});					  		
					  	}					  
		  		});
	  });
};

exports.deletePayments = function(req, res, next) {
	pool.getConnection(function(err, connection){
		  connection.query('Select user_id from Authentication where user_login = ?',[req.userId], function(err, rows) {
				if (err) {
					logger.error(err);
			  		return next(err);
				} else { 				
						connection.query('delete from payments where id = ? ',[req.params.id ], function(err, rows) {
							if (err) {
								logger.error(err);
						  		return next(err);
							} else {
								  	logger.info( rows );
								  		res.send(200, {"message":"Payments data deleted"});
								  		connection.release();
								  	}					  
					  		});					  		
					  	}					  
		  		});
	  });
};