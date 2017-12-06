/**
 * mysql connection pooling.
 */
var mysql = require('mysql');
var logger = require("./../lib/logger");
if(process.env.NODE_ENV == 'development'){
	var config = require('./config');
} else {
	/*var opsworks = require('./../opsworks');
	logger.error('database host : ' + opsworks.db.host);
	logger.error(' databse user : ' + opsworks.db.username);
	logger.error('database password : ' + opsworks.db.password);
	logger.error('database : ' + opsworks.db.database);
*/
var config = require('./config');
	
}



	/**
	 * Connection pool.
	 */
	var pool = mysql.createPool({
		  /*host: ((process.env.NODE_ENV == 'development') ? config.get('dbhost') : opsworks.db.host),
		  user: ((process.env.NODE_ENV == 'development') ? config.get('dbuser') : opsworks.db.username),
		  password: ((process.env.NODE_ENV == 'development') ? config.get('dbpass') : opsworks.db.password),
		  database: ((process.env.NODE_ENV == 'development') ? config.get('dbname') : opsworks.db.database),*/
		  host:  config.get('dbhost'), 
		  user:  config.get('dbuser'),
		  password: config.get('dbpass'),
		  database: config.get('dbname'),
		  connectionLimit: 200,
		  supportBigNumbers: true,
		  multipleStatements: true
		});
	module.exports = pool;

