var pool  = require('../config/db');
var logger = require("../lib/logger");
var jwt = require('jwt-simple');
var moment = require('moment');
var config  = require('../config/config');
var hash = require('../controllers/hash');
sendmail = require('sendmail')();
var nodemailer = require('nodemailer');
var arrowDB = require("../controllers/arrowDBPush");
var error_message = require("../lib/errorMessage");
var async = require('async');
var google = require('googleapis');
var plus = google.plus('v1');
var OAuth2 = google.auth.OAuth2;
var GoogleAuth = require('google-auth-library');
var auth = new GoogleAuth;
var Facebook = require('facebook-node-sdk');
var fb_app_id = 514936425347785;
var fb_app_secret = "40d9e636cddbf26d690806bf894506e5";
var facebook = new Facebook({ appId: fb_app_id , secret: fb_app_secret });
var request = require('request');
var CLIENT_ID = "533122259018-2af78f7d00okfssi8i550k4ngnm28qhk.apps.googleusercontent.com";
var CLIENT_SECRET = "iNv2LVqGe0rFGZcFYjoU0kUN";
exports.login = function(req, res, next){
	pool.getConnection(function(err, connection){
		if(err)
			{			
			res.send(500,JSON.stringify(err));
			return;
			}
		connection.query( 'select * from Authentication where user_login = ?', [(req.body.userId).trim()], function(err, rows){
			
			logger.info("JSON data " + JSON.stringify(req.body) );
			
			///matching
			//logger.info("HEADERS matching LOGIN" + JSON.stringify(req.headers));
			//logger.info("Client IP ADDRESS LOGIN" + JSON.stringify(req.ip));
	  	
		//if error return to caller
		if(err)	{
	  		logger.error(err);
	  		return next(err);
	  	}
		connection.release();  	
	  	//check if user exist in the database
		console.log("length : " + rows.length);
		if(!rows.length){
			console.log("inside : " + rows.length);
			//res.send(200, "Please enter valid username");
			res.setHeader('content-type', 'application/json');
			res.send(401, {"message":"Please enter valid username"});
			return;
		}
		//check if password matches
		if (rows[0].user_password != (req.body.password).trim()) {
			//res.send(200, "Authentication failed! Please enter correct password");
			res.setHeader('content-type', 'application/json');
			res.send(401, {"message":"Authentication failed! Please enter correct password"});
			return;
		}
			
	  	//create token
		//var m1 = moment();
		var expires = moment().add(7, 'days').valueOf();
		//var expires = moment().add(5, 's');
		//var ex1 = moment().format().toString();
		//logger.info("ex1 ^^^^^^^^   " + ex1);
		//logger.info("%%%%%%%%%% moment   " + m1);
		//logger.info("%%%%%%%%%% login   " + expires);
		var secret = config.get('secret'); 
		logger.info('after the secret encoding : ' + secret);	
		var token = jwt.encode({
		  iss: req.body.userId,
		  exp: expires
	}, secret);
		logger.info("Token login >>>>>>>    " + token);
		
		logger.info('after the jwt encoding');

        // return the information including token as JSON
		logger.info(token);
	//	arrowDB.notifyMany();
		var authToken = {};
		authToken.token = token;
        res.send(200, authToken);
 		
	 });
	}); 
};

exports.getAuthentication = function(req, res,next){
	  pool.getConnection(function(err, connection){
		  connection.query( 'select * from Authentication where user_login = ?',[req.userId],  function(err, rows){
		  	if(err)	{
		  		return next(err);
		  	}else{
		  		res.send(200, rows);
		  		connection.release();
		  	}
		  });
	  });
};

exports.updateAuthentication = function(req, res,next){
	  pool.getConnection(function(err, connection){
		  var auth = req.body.authentication;
		  connection.query( 'select * from Authentication where user_login = ?',[req.userId],  function(err, rows){
		  	if(err)	{
		  		return next(err);
		  	}
		  	if(rows.length)
			{
		  		console.log(rows);
		  		if(rows[0].user_password == auth.old_password)
		  			{
		  			var put = {				  			
				  			user_password : auth.new_password
				  		};				  	
				 connection.query( 'update Authentication set ? where id = ?',[put,rows[0].id],  function(err, rows){ 
				  	if(err)	{
					  		return next(err);
					  	}else{
					  		logger.info("Auth table updated");
					  		res.send(200, {"message":"Password has been changed"});
					  		connection.release();
					  	}
					  });
		  			}
		  		else
		  			{
		  			res.send(200, {"message":"Specify the correct old password"});
		  			}		  			
		  		
			}		  	
		  	
		  	
		  });
	  });
};

exports.validate = function(req,res,next){
	
	//extract token
	var token =  req.headers['access-token'];
	if (token) {
		try{
			//decode the token
			try{
				var decoded = jwt.decode(token, config.get('secret'));
				logger.info(decoded);
				req.userId = decoded.iss ;
			} catch(err){
				res.send(401, {"message" :"Invalid Token" , "status" : "401"});
			}
			
			
			//check if the token expired
			//logger.info("Token validate >>>>>>>    " + token);
			//logger.info("****** decoder ***** "+ "decoded  "+ JSON.stringify(decoded) +"    "+  decoded.exp  + "     " + Date.now()); 
			console.log('decoded time :' + JSON.stringify(decoded.exp));
			console.log('Date now : ' + moment().format());
			if (decoded.exp <= moment().format() ){
			//if(moment(decoded.exp).format('YYYY-MM-DD HH:mm:ss') <= moment().format('YYYY-MM-DD HH:mm:ss')){
				//if(moment().format('YYYY-MM-DD HH:mm:ss').diff(moment(decoded.exp).format('YYYY-MM-DD HH:mm:ss')) >0){
				logger.info("Token Expired..");
				res.send(401, {"message" :"Token Expired.." , "status" : "401"});
			        	return;
			}
			
			//need to have discussion to check if we need to validate the user 
			
			console.log("Decoded user id " + req.userId);
			
			//move on to the next middleware
			next();
		} catch (err) {
			res.send(500,{"message" :"Internal Server error" , "status" : "500"});
		}
	} else {
		res.send(401, {"message" :"Auth Token missing" , "status" : "401"});
	    return;
	}
};


exports.resetPassword = function(req, res,next){
	  pool.getConnection(function(err, connection){
		  var resetData = req.body.resetPassword;
		  connection.query( 'select * from Authentication where user_login = ?',resetData.user_login,  function(err, rows){
		  	if(err)	{
		  		return next(err);
		  	}
		  	if(rows.length){	
		  		connection.beginTransaction(function(err) {
		  			 if (err) { throw err; }
		  			  console.log(rows);
		  			 console.log(rows[0].id);
		  			connection.query('UPDATE Authentication SET ? WHERE id = ?',[ { user_password : config.get('resetPassword') } , rows[0].id ], function(err, authrows) {
		  			    if (err) {
		  			      return connection.rollback(function() {
		  			        throw err;
		  			      });
		  			    }
		  			  console.log(authrows);
		  			  connection.query('select first_name,last_name,email from Users where id = ?',rows[0].user_id, function(err, result) {
			  			    if (err) {
			  			      return connection.rollback(function() {
			  			        throw err;
			  			      });
			  			    }	
			  			  console.log(result);
			  			var transporter = nodemailer.createTransport({
			  			    host : 'smtp.chintainfo.com',
			  			    port : '2525',
			  			    tls: {rejectUnauthorized: false},
			  			    auth: {
			  			        user: 'webtest@chintainfo.com',
			  			        pass: 'c15w@bs3ndtest'
			  			    }
			  			});
			  			
			  			var mailOptions = {
			  			    from: 'dharaneeswaran.m@chembiantech.com',
			  			    to: result[0].email,			  			   
			  			    subject: 'uCorsa new password request',
			  			    text: 'Hi '+ resetData.user_login + ', \n\n ' + ' Your new password for uCorsa login is: \"' + config.get('resetPassword') +'\"' 			  			    
			  			};
			  			
			  			transporter.sendMail(mailOptions, function(error, info){
			  			    if(error){
			  			    	console.log("eeeeerrrrrrr : " + error);
			  			    	 return connection.rollback(function() {
					  			        throw err;
					  			      });
			  			        return console.log(error);
			  			    }
			  			    
			  			  connection.commit(function(err) {
				  		        if (err) {
				  		          return connection.rollback(function() {
				  		            throw err;
				  		          });
				  		        }
				  		        console.log('success!');
				  			    res.send(200, {"message":"New password has been sent to your registered E-mail." });
				  			    connection.release();
			  			  });		
			  			    console.log('Message sent: ' + info.response);

			  			});
		  			  });
		  			});
		  		});			  	
		  }	else{
				  	 res.send(200, {"message":"Invalid username"});
				 }
	  });
		  
	  });
};

exports.checkuserlogin = function(req,res,next)
{
	pool.getConnection(function(err, connection){
		connection.query( 'select * from Authentication where user_login = ?',req.body.user_login,  function(err, rows){
	  	if(err)	{
	  		logger.error(err);
	  		return next(err);
	  	}else{
	  		logger.info( rows );
	  		if(rows.length)
	  			{
	  			res.send(200, 'False');
	  			}
	  		else{
	  			res.send(200, 'True');
	  		}	  			
	  		connection.release();
	  	}
	  });
  });
};

exports.checkPhoneNumberonRegistration = function(req,res,next)
{
	pool.getConnection(function(err, connection){
		connection.query( 'select * from Users where phone = ? ' ,[ req.body.phone ] ,  function(err, rows){
	  	if(err)	{
	  		logger.error(err);
	  		return next(err);
	  	}else{
	  		logger.info( rows );
	  		if(rows.length)
	  			{
	  			res.send(200, 'False');
	  			}
	  		else{
	  			res.send(200, 'True');
	  			}	  			
	  		connection.release();
	  	}
	  });
  });
};


function getOAuthClient () {
    return new OAuth2(CLIENT_ID ,CLIENT_SECRET, '');
}

function getAuthUrl () {
    var oauth2Client = getOAuthClient();
    // generate a url that asks permissions for Google+ and Google Calendar scopes
    var scopes = [
      'https://www.googleapis.com/auth/plus.me'
    ];

    var url = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: scopes // If you only need one scope you can pass it as string
    });

    return url;
}

exports.externalLogin = function(req, res, next){	
	var accountAlreadyExists = false;
	console.log("headers " + req.headers['token']);
	console.log("BODY " + JSON.stringify(req.body));
	pool.getConnection(function(err, connection){
		if(err)
			{			
			res.send(500,JSON.stringify(err));
			return;
			}		
		async.waterfall(
			    [		       
			        function(callback) { //validate social login access token
			        	if(req.body.type == 'F'){ //if facebook
			        		facebook.api('\/debug_token?input_token='+req.headers['token']+'&access_token='+fb_app_id+'|'+fb_app_secret+'', function(err, data) {
			        			if(err){
		        		    		logger.error("Err " + err);
				        	  		res.send(500 ,{"message" : "Facebook login unsuccessfull"});
				        	  		connection.release();
				        	  		return;
		        		    	}
			        			if(data.data.app_id){
			        				console.log("DATA " + JSON.stringify(data));
			        				callback(null); 
			        			}else{
			        				console.log("Validation failed");
			        				res.send(500 ,{ "message" : "Facebook login unsuccessfull"});
				        	  		connection.release();
				        	  		return;
			        			}			        			 
			        		});			        		
			        	}else{ // if google plus
//			        		console.log("token "+ req.body.token);
//			        		var oauth2Client = getOAuthClient();
//			        	    oauth2Client.setCredentials({ access_token : req.body.token});
//			        	    plus.people.get({ userId: 'me', auth: oauth2Client }, function(error, response) {
//			        	    	if(error){
//			        				logger.error("Err " + error);
//				        	  		res.send(500 ,{"message" : "Google plus login unsuccessfull"});
//				        	  		connection.release();
//				        	  		return;
//				        	  		}
//			        	    	console.log(JSON.stringify(response));
//			                });
			        	    
//			        		var client = new auth.OAuth2(CLIENT_ID, 'iNv2LVqGe0rFGZcFYjoU0kUN', '');
//			        		client.verifyIdToken(
//		        		    req.headers['token'],
//		        		    CLIENT_ID,
//		        		    function(e, login) {
//		        		    	if(e){
//		        		    		logger.error("Err " + e);
//				        	  		return next(e);
//				        	  		connection.release();
//		        		    	}
//		        		      console.log("PAYLOAD " + login);
//		        		      callback(null); 
//		        		    });			        		
			        		request('https:\/\/www.googleapis.com\/oauth2\/v3\/userinfo?access_token='+req.headers["token"],
			        				function (error, response, body) {
			        			if(error){
			        				logger.error("Err " + error);
				        	  		res.send(500 ,{"message" : "Google plus login unsuccessfull"});
				        	  		connection.release();
				        	  		return;
			        			}			        			
			        		    if (!error && response.statusCode == 200) {			        		    	
			        		    	 if(req.body.email == JSON.parse(response.body).email)
			        		    		{
			        		    		callback(null);
			        		    		}	
			        		    	else{
			        		    		res.send(500 ,{"message" : "Invalid email address"});
					        	  		connection.release();
					        	  		return;
			        		    	}
			        		     }else{
			        		    	 res.send(500 ,{"message" : "Email Validation failed"});
					        	  	 connection.release();
					        	  	 return;
			        		     }
			        		});
			        	}			          
			        },			       
			        function(callback) {
			        	connection.query( 'select a.* from Authentication a, Users u where user_login = ? and a.user_id= u.id and u.type = ?', [req.body.email, req.body.type], function(err, rows){			
			        		logger.info("JSON data " + JSON.stringify(req.body) );
			        		if(err)	{
			        	  		logger.error(err);
			        	  		return next(err);
			        	  		connection.release();
			        	  	}
			        		if(rows.length){
			        			accountAlreadyExists = true;
			        			callback(null, accountAlreadyExists);
			        		}
			                callback(null, accountAlreadyExists);
			        	});
			        },
			        function(accountAlreadyExists, callback) {
			        	if(accountAlreadyExists){
			        		callback(null, accountAlreadyExists , 0);	
			        	}else{
			        		const sql = 'INSERT INTO Users SET ?';
				    		logger.info("Creating the User object");			    		
				        	connection.query(sql, req.body, function(err,rows){
				        		if(err){
				        			logger.error(err);
				        	  		return next(err);
				        	  		connection.release();
				        		} else {
				        			return callback(null, false, rows.insertId);
				        		}
				        	});
			        	}		                			         
			        },
			        function(accountAlreadyExists, user_id, callback) {
			        	if(accountAlreadyExists){
			        		callback(null, 'done');	
			        	}else{
			        		var auth = {};
			        		const sql = 'INSERT INTO Authentication SET ?';
							auth.user_id = user_id;
							auth.user_login = req.body.email;
							console.log("Auth data " + JSON.stringify(auth));
							connection.query(sql, auth, function(err,rows){
				        		if(err){
				        			logger.error(err);
				        	  		return next(err);
				        	  		connection.release();
				        		} else {
				        			callback(null, 'done');	
				        		}
				        	});
			        	}		                			         
			        }
			    ],
			    function(err, status) {
			    	if(err){
	        			logger.error(err);
	        	  		return next(err);
	        	  		connection.release();
	        		}else{
				        console.log("DONE "+ status);
				        var expires = moment().add(7, 'days').valueOf();		
						var secret = config.get('secret'); 
						logger.info('after the secret encoding : ' + secret);	
						var token = jwt.encode({
						  iss: req.body.email,
						  exp: expires
						}, secret);
						logger.info("Token login >>>>>>>    " + token);		
						logger.info('after the jwt encoding');
				        // return the information including token as JSON
						logger.info(token);	
						var authToken = {};
						authToken.token = token;
				        res.send(200, authToken);
				        connection.release();
	        		}
			    }
			);	// End of async waterfall	
	 	});	//End of pool connection	
};// end of middleware