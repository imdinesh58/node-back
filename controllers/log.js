/**
 * New node file
 */
var pool  = require('../config/db');
var logger = require("../lib/logger");



exports.saveLog = function(req, res, next) {
	pool.getConnection(function(err, connection){	
		connection.query( 'select user_id from Authentication where user_login = ? ', 
				[ req.userId],  function(err, user){
			if(err)	{
  		  		logger.error(err);
  		  		return next(err);
					}
			const sql = 'INSERT into Log SET ?'
				var data = {
				usr_id : 	user[0].user_id ? user[0].user_id : null ,
				log  : req.body.log
			};			
				connection.query( sql,[data],  function(err, rows){
				  	if(err)	{
				  		logger.error(err);
				  		return next(err);
				  	}else{
				res.send({"message" : "Log saved successfully."});
				connection.release();
				  	}
				});			
		});
	});	
};