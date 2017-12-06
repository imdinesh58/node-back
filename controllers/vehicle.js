/**
 * New node file
 */

var pool  = require('../config/db');
var logger = require("../lib/logger");

exports.getVehicle = function(req, res,next){
	  pool.getConnection(function(err, connection){
		  console.log(req.query.userid);		 
		  connection.query('Select user_id from Authentication where user_login = ?',req.userId, function(err, rows) {
				if (err) {
					logger.error(err);
			  		return next(err);
				} else {
					 var user = req.query.user_id ?  req.query.user_id  : rows[0].user_id;
					  connection.query( 'select * from Vehicle where user_id = ?',user,  function(err, rows){
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

exports.updateVehicle = function(req, res,next){
	  pool.getConnection(function(err, connection){
		  
		  var vehicleReq = req.body.vehicles;				
				logger.info(vehicleReq);
				var put = {						
						car_model : vehicleReq.car_model,
						car_mileage : vehicleReq.car_mileage,
						car_year : vehicleReq.car_year,
						car_seats : vehicleReq.car_seats,
						car_make : vehicleReq.car_make
				}
		  connection.query( 'update Vehicle set ? where id = ?',[put,req.params.id],  function(err, rows){
		  	if(err)	{
		  		return next(err);
		  	}else{
		  		logger.info("Vehicle table updated");
		  		res.send(200, {"message":"Vehicle updated"});
		  		connection.release();
		  	}
		  });
	  });
};

exports.addVehicle = function(req, res,next){
	  pool.getConnection(function(err, connection){
		  connection.query('Select user_id from Authentication where user_login = ?',req.userId, function(err, rows) {
				if (err) {
					logger.error(err);
			  		return next(err);
				} else {
						  var vehicleReq = req.body.vehicles;
								
								logger.info(vehicleReq);
								var vehicleObj = {
										user_id : rows[0].user_id,
										car_model : vehicleReq.car_model,
										car_mileage : vehicleReq.car_mileage,
										car_year : vehicleReq.car_year,
										car_seats : vehicleReq.car_seats,
										car_make : vehicleReq.car_make
								};
						  connection.query( 'INSERT INTO Vehicle SET ?',vehicleObj,  function(err, rows){
						  	if(err)	{
						  		return next(err);
						  	}else{
						  		logger.info("Vehicle data added");
						  		res.send(200, {"message":"Vehicle added"});
						  		connection.release();
						  	}
						});
				}
	  });
});
};

exports.deleteVehicle = function(req, res,next){
	  pool.getConnection(function(err, connection){
		  connection.query('Select user_id from Authentication where user_login = ?',req.userId, function(err, rows) {
				if (err) {
					logger.error(err);
			  		return next(err);
				} else {
					  connection.query( 'Delete from Vehicle where id = ?',req.params.id,  function(err, rows){
					  	if(err)	{
					  		return next(err);
					  	}else{
					  		logger.info( rows );
					  		res.send(200, {"message":"Vehicle deleted"});
					  		connection.release();
					  	}
					  });
				}
		  });
	  });
};