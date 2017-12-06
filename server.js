var cluster = require('cluster');
var logger = require("./lib/logger");




if (cluster.isMaster) {

	var numCPUs = require('os').cpus().length;
	  for (var i = 0; i < numCPUs; i++) {	
		 // if(i == 1 )
			 // require("./lib/notification")();  //Automated script to send reminder notification to ride
	    cluster.fork();
	  }

	  Object.keys(cluster.workers).forEach(function(id) {
	    logger.info(cluster.workers[id].process.pid);
	  });
	  
	// Listen for dying workers
	  cluster.on('exit', function (worker) {

	      // Replace the dead worker,
	      // we're not sentimental
	      logger.info('Worker ' + worker.id + ' died :(');
	      
	      cluster.fork();

	  });

	} else {
		/**
		 * Module dependencies.
		 */

		var express = require('express')
		  , http = require('http')
		  , path = require('path')
		  , domain = require('domain')
		  , config = require('./config/config');
		var cors = require('cors')
		var app  = express();
		app.use(cors());
		/**
		 * mysql connection pooling.
		 */
		var dbpool  = require('./config/db');

		/**
		 * Express.js settings.
		 */
		//app.set('port', process.env.PORT || 3000);
		app.set('views', __dirname + '/views');
		app.set('view engine', 'jade');
		app.use(express.favicon());
		app.use(express.logger('dev'));
		app.use(express.bodyParser());
		app.use(express.methodOverride());
		app.use(require('express-domain-middleware'));
		app.use(app.router);
		app.use(express.static(path.join(__dirname, 'public')));
		app.use(require('morgan')({ "stream": logger.stream }));

		app.use(function errorHandler(err, req, res, next) {
			  logger.error('error on request %d %s %s: %j', process.domain.id, req.method, req.url, err);
			  res.send(500, "Something bad happened. :(");
			  if(err.domain) {
				  
			    //you should think about gracefully stopping & respawning your server
			    //since an unhandled error might put your application into an unknown state
			  }
			});



		/// catch 404 and forwarding to error handler
		app.use(function(req, res, next) {
		    var err = new Error('Not Found');
		    err.status = 404;
		    next(err);
		});

		/// error handlers
     
		// development error handler
		// will print stacktrace
		if (app.get('env') === 'development') {
		    app.use(function(err, req, res, next) {
		    	logger.error(err);
		    	logger.error('@@@@@@@@@@@@@@@@@@@-1')
		    	if(err.status!=404)	{
		    		res.status(err.status || 500).send({status:err.status || 500, message: err, type:'internal'});
		    	}
		    	if(err.status === 404) {
		    		//res.redirect("/help");
		    		res.status(err.status || 500).send({status:err.status || 500, message: err, type:'internal'});
	    		}
		    });  		   
		}
		
	

		// production error handler
		// no stacktraces leaked to user
		app.use(function(err, req, res, next) {
		    res.status(err.status || 500);
		    logger.error('@@@@@@@@@@@@@@@@@@@-2')
		    logger.error(err);
		    logger.error('@@@@@@@@@@@@@@@@@@@-3')
		    //res.status(500).send({status:500, message: 'internal error', type:'internal'}); 
		    res.status(err.status || 500).send({status:err.status || 500, message: err, type:'internal'});
		});




		/**
		 * Api endpoints..
		 */
		

		require('./routes/routes')(app);	
		
		
	  
	  /**
	   * Create Server.
	   */
	  http.createServer(app).listen(config.get('port'), function(){
	    logger.info('Express server listening on port ' + config.get('port'));
	    logger.info(process.env.NODE_ENV);
	    
	  });
	  module.exports = app;
	}


