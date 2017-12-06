/**
 * New node file
 */


var pool  = require('../config/db');
var logger = require("../lib/logger");


exports.addWindow = function(req, res,next){
	
	 pool.getConnection(function(err, connection){
		  var auth = req.body.authentication;
		  connection.query( 'Select user_id from Authentication where user_login = ?',req.userId, function(err, rows){
		  	if(err)	{
		  		return next(err);
		  	}  	
		  		
			var data = {
					user_id : rows[0].user_id,					
					window_id : req.body.window_id	
			};	  	
		 	
		  	connection.query( 'INSERT INTO window SET ?',[data],  function(err, rows){ 
		  	if(err)	{
			  		return next(err);
			  	}else{
			  		logger.info("Window added");
			  		res.send(200, {"message":"Window added"});
			  		connection.release();
			  	}
			  });
		  	
		  });
	  });   
	
};

exports.deleteWindow = function(req, res,next){
	
	 pool.getConnection(function(err, connection){
		  var auth = req.body.authentication;
		  connection.query( 'Select user_id from Authentication where user_login = ?',req.userId, function(err, rows){
		  	if(err)	{
		  		return next(err);
		  	}  					
		 	
		  	connection.query( 'delete from window where user_id = ? and window_id = ? ',[rows[0].user_id, req.params.id],  function(err, rows){ 
		  	if(err)	{
			  		return next(err);
			  	}else{
			  		logger.info("Window Deleted");
			  		res.send(200, {"message":"Window Deleted"});
			  		connection.release();
			  	}
			  });
		  	
		  });
	  });   
	
};

