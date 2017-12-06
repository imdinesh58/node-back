/**
 * New node file
 */
var pool  = require('../config/db');
var logger = require("../lib/logger");

// comment
exports.getAddress = function(req, res,next){
	  pool.getConnection(function(err, connection){
		  connection.query('Select user_id from Authentication where user_login = ?',req.userId, function(err, rows) {
				if (err) {
					logger.error(err);
			  		return next(err);
				} else {
					  connection.query( 'select * from Address where user_id = ?', rows[0].user_id,  function(err, rows){
					  	if(err)	{
					  		return next(err);
					  	}else{
					  		logger.info( rows );
					  		res.send(200, rows);
					  		connection.release();
					  	}
					  });
				}
	  });
	  });
};

exports.updateAddress = function(req, res,next){
	  pool.getConnection(function(err, connection){
		  var addressReq = req.body.address;
			logger.info(addressReq);
				logger.info("Inserting data into Address table ");
			var addressObj = {					
					address1 : addressReq.address1,
					address2 : addressReq.address2,
					city : addressReq.city,
					state : addressReq.state,
					zip : addressReq.zip,
					latitude : addressReq.latitude,
					longitude : addressReq.longitude,
			};
		  connection.query( 'update Address set ? where id = ?',[addressObj,req.params.id],  function(err, rows){
		  	if(err)	{
		  		return next(err);
		  	}else{
		  		logger.info("Address table updated");
		  		res.send(200, {"message":"Address updated"});
		  		connection.release();
		  	}
		  });
	  });
};


exports.addAddress = function(req, res,next){
	  pool.getConnection(function(err, connection){
		  connection.query('Select user_id from Authentication where user_login = ?',req.userId, function(err, rows) {
				if (err) {
					logger.error(err);
			  		return next(err);
				} else {		  
					  var addressReq = req.body.address;
						logger.info(addressReq);						
							logger.info("Inserting data into Address table 000");
						var addressObj = {
								user_id : rows[0].user_id,
								address1 : addressReq.address1,
								address2 : addressReq.address2,
								city : addressReq.city,
								state : addressReq.state,
								zip : addressReq.zip,
								latitude : addressReq.latitude,
								longitude : addressReq.longitude,
						}
					  connection.query( 'INSERT INTO Address SET ?', addressObj,  function(err, rows){
					  	if(err)	{
					  		return next(err);
					  	}else{
					  		logger.info("Address data added");
					  		res.send(200, {"message":"Address added"});
					  		connection.release();
					  	}
					  });
				}
		  });
	  });
};


exports.deleteAddress = function(req, res,next){
	  pool.getConnection(function(err, connection){
		  connection.query('Select user_id from Authentication where user_login = ?',req.userId, function(err, rows) {
				if (err) {
					logger.error(err);
			  		return next(err);
				} else {
					  connection.query( 'Delete from ucorsa.Address where id= ?', [req.params.id],  function(err, rows){
					  	if(err)	{
					  		return next(err);
					  	}else{
					  		logger.info( rows );
					  		res.send(200, {"message":"Address Deleted"});
					  		connection.release();
					  	}
					  });
				}
	  });
	  });
};