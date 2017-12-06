var convict = require('convict');

var config = convict({
	  	 env: {
		    doc: "The applicaton environment.",
		    format: ["production", "development", "test"],
		    default: "development"
		  },
		  ip: {
		    doc: "The IP address to bind.",
		    format: "ipaddress",
		    default: "127.0.0.1"
		   },
		  port: {
		     doc: "The port to bind.",
		     format: "port",
		     default: 0
		  },
		  secret: {
		      doc: "jwt secret",
		      format: String,
		      default: 'YOUR_SECRET_STRING'
		  },
		  
		  dbhost: {
		      doc: "Database host name/IP",
		      format: String,
		      default: 'localhost'
		  },
		  dbname: {
		      doc: "Database name",
		      format: String,
		      default: 'dbname'
		  },
		  dbuser: {
		      doc: "Database user",
		      format: String,
		      default: 'dbuser'
		  },
		  dbpass: {
		      doc: "Database pass",
		      format: String,
		      default: ''
		  },
		  googleAPIkey: {
			  doc: "APIkey for Google cloud Messaging",
		      format: String,
		      default: ''
		  },
		  resetPassword:{
			  doc: "New password for User",
		      format: String,
		      default: 'password'
		  }, 
		  dbport: {
			  doc: "port for mysql db",
		      format: String,
		      default: '3306'
		  }, 
		  stripeKey: {
			  doc: " key for stripe payment",
		      format: String,
		      default: ''
		  }
		
		});


// load environment dependent configuration

config.loadFile('./config/' + process.env.NODE_ENV + '.json');

// validate
config.validate();

module.exports = config;