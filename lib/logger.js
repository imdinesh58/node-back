var winston = require('winston');
//var customLevels = {
//		  levels: {
//		    debug: 0,
//		    info: 1,
//		    warn: 2,
//		    error: 3
//		  },
//		  colors: {
//		    debug: 'blue',
//		    info: 'green',
//		    warn: 'yellow',
//		    error: 'red'
//		  }
//		};

var logger = new winston.Logger({
    transports: [
        new winston.transports.File({
           // filename: '/home/ec2-user/all.log',
           filename: './logs/all.log',
            handleExceptions: true,
            json: true,
            maxsize: 5242880, //5MB
            maxFiles: 50,
            colorize: false
        }),
        new winston.transports.Console({
            handleExceptions: true,
            json: false,
            colorize: true
        })
    ],
    exitOnError: false
});

module.exports = logger;
module.exports.stream = {
	    write: function(message, encoding){
	        logger.info(message);
	    }
	};
