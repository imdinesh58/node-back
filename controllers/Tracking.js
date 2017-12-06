/**
 * New node file
 */


var pool  = require('../config/db');
var logger = require("../lib/logger");


exports.addTracking = function(req, res, next){
		pool.getConnection(function(err, connection){
			if(req.body.tracking.ride_id){
			connection.query('SELECT latitude,longitude from ucorsa.Tracking \
					where update_ts = (SELECT max(update_ts) from ucorsa.Tracking where ride_id = ? ) and ride_id = ?;'
					,[req.body.tracking.ride_id,req.body.tracking.ride_id],  
					function(err, rows){
					  	if(err)	{
					  		return next(err);
					  	}else{
					  		logger.info("Rows Tracking  " + JSON.stringify(rows));
					         if(rows.length > 0 && rows[0].latitude == req.body.tracking.latitude && rows[0].longitude == req.body.tracking.longitude){
					        	 logger.info("***** Add Track IF **");
					        	 res.send(200);
					        	 connection.release();
					         }else{
					        	 logger.info("***** Add Track ELSE **  " + JSON.stringify(req.body.tracking));
					        	 const sql = 'INSERT INTO Tracking SET ?';
									connection.query( sql, JSON.parse(JSON.stringify(req.body.tracking)),  function(err, rows){
								  	if(err)	{
								  		logger.error(err);
								  		return next(err);
								  	}else{
								  		logger.info( rows );		  		
								  		res.status(200);
								  		var json = {};
								  		json.id = rows.insertId;
								  		res.send(200, json);
								  		//res.send(200,rows.insertId);
								  		logger.info( rows.insertId );		  		
								  		connection.release();
								  	}// end of else
								  }); //end of query
					         }	//end of if else	
					  	}	//end of if else	
					});//end of query
			}//end of if condition
			else{
				res.send(200, {"message":"Tracking Added"});
		  		connection.release();
			}
		   });//end of pool
	//});//en of connection
}; //end of function

exports.getTracking = function(req, res, next){
	logger.info("Request Ride ID : " + req.query.ride_Id);
	logger.info("Request Ride T_ID : " + req.query.t_Id);
	pool.getConnection(function(err, connection){
		var sql = 'select * from Tracking where ride_id = ?  ';
		if(req.query.t_Id)
		var sql = 'select * from Tracking where ride_id = ?  and id >= ? ';
		connection.query( sql,[req.query.ride_Id,req.query.t_Id],  function(err, rows){
	  	if(err)	{
	  		logger.error("Get Tracking Errors : " + err);
	  		return next(err);
	  	}else{
	  		logger.info("Get Tracking : " + rows );
	  		res.send(200, rows);
	  		connection.release();
	  	}
	  });
  });
};
exports.updateTracking = function(req, res,next){
	pool.getConnection(function(err, connection){
		const sql = 'update Tracking SET ? where id = ?';
		connection.query( sql, [JSON.parse(JSON.stringify(req.body.tracking)),req.body.tracking_id],  function(err, rows){
	  	if(err)	{
	  		logger.error(err);
	  		return next(err);
	  	}else{
	  		logger.info("***** update Track **");
	  		logger.info( rows );
	  		res.send(200, {"message":"Tracking updated"});
	  		connection.release();
	  	}
	  });
  });
};