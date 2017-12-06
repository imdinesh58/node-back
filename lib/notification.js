/**
 * New node file
 */
var pool  = require('../config/db');
var logger = require("../lib/logger");
var androidgcm = require("../controllers/androidpush");
var async = require('async');


 module.exports = function()
 { 
	
		 setInterval(function(){
			 
			 console.log("asdfasdas  " + Date.now());	
			 
			 async.waterfall([
			                  function(callback){
				                    // code a
				                	  pool.getConnection(function(err, connection){
				              			connection.query( 'select * from Ride where concat(\`date\`, ' ', \`time\`)  >= now() and \
				              					concat(\`date\`, ' ', \`time\`)  <= SUBDATE(now(), INTERVAL -1 hour) and  ride_status = 3 ',  function(err, rows){
				              		  	if(err)	{
				              		  		logger.error(err);
				              		  		return next(err);
				              		  	}else{
				              		  		callback(null, rows);
				              		  	logger.info( "112111");
				              		  		connection.release();
				              		  	}
				              		  });
				              	  });			                   
			                  },
			                  function(rows,callback){
			                	//logger.info( JSON.parse(JSON.stringify(rows)));
			                	  logger.info( rows);
			                    callback(null, 'c')
			                  },
			                  function(arg1, callback){      
			                    // arg1 is 'c'
			                    // code d
			                    callback(null, 'd');
			                  }], function (err, result) {
										 if (err) {									    	    
									    	    return next(err);									    	  
									    	    res.send('Error inserting in tables !!!!!!!!!');  
										 		} 
										 logger.info("Reminder notification send ");
			                  }
			               );			 
			 // For scheduled reminder to push notification... 
			}, 1000);	
 };