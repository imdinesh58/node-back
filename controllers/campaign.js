var pool = require('../config/db');
var logger = require("../lib/logger");
var dateformat = require("../lib/dateformat");
var moment = require('moment');

exports.createCampaign = function(req, res, next) {
	pool.getConnection(function(err, connection) {
		logger.info("HEADERS Campaign" + JSON.stringify(req.headers));
		
		var camCode = req.query.acode;
		var hosts = req.headers['host'];
		var protocols = req.headers['x-forwarded-proto'];
		//logger.info("************ hosts **************   " + JSON.stringify(protocols) +"  &&&&&&&& " + JSON.stringify(hosts));
		var agent = req.headers['user-agent'].split("(");
		var agent2 = agent[1].split(";");
		
		if(agent2[0].includes("iPhone")) {
			var iphone = agent2[1].split(" ");
			var removeVersion = iphone[4].split("_");
			var camDevice = agent2[0] + " "+ removeVersion[0]+"."+removeVersion[1];
		    res.redirect('https://itunes.apple.com/us/app/ucorsa/id1140779836?ls=1&mt=8');
		} else {	
			var android = agent2[2].split(" ");
			var camDevice = "Android "+ android[1];
			res.redirect('https://play.google.com/store/apps/details?id=com.www.ucorsa&hl=en');
		}

		var camXforward = req.headers['x-forwarded-for'];
		var camTs = req.headers['timestamp'];
		var momentTs = moment(camTs).format('YYYY-MM-DD HH:mm:ss');
		
		var Obj = {											
				acode : camCode,
				deviceip : camXforward,
				useragent : camDevice,
				timestamp : momentTs,
				campaignlink : protocols+"://"+hosts+"/campaign?acode="+camCode
			};
		
		const sql = 'INSERT INTO campaign SET ?';
		connection.query(sql, JSON.parse(JSON.stringify(Obj)),
				function(err, rows) {
					if (err) {
						logger.error("INSERT Campaign Error " + err);
						return next(err);
					} else {
						logger.info("Campaign Insert Success " + JSON.stringify(rows));
						connection.release();
					}
				});
	}); 
}; 

exports.matchCampaign = function(req, res, next) {
	pool.getConnection(function(err, connection) {
		logger.info("HEADERS Matching" + JSON.stringify(req.headers));
		
		var camCode = req.query.acode;

		var agent = req.headers['user-agent'].split("(");
		var agent2 = agent[1].split(";");
			
		if(agent2[1].includes("iOS")) {
			var test = agent2[0].split("/");
			var test2 = test[1].split(".");
			var version = test2[0]+"."+test2[1];
			var camDevice = test[0] + " "+ version;
		} else {
			var camDevice =  "Android "+ agent2[0];
		}

		var camXforward = req.headers['x-forwarded-for'];
		var camTs = req.headers['timestamp'];
		var momentTs = moment(camTs).format('YYYY-MM-DD HH:mm:ss');

		connection.query('SELECT acode FROM ucorsa.campaign \
				where deviceip = ? \
				and useragent = ? \
				and timediff(?,timestamp) < TIME(\'00:10:00\')',[camXforward,camDevice,momentTs], function(err, rows) {
			if (err) {
				logger.error("Matching Error %%%% "+ err);
		  		return next(err);
			} else {
				logger.info("Matching SUCCESS %%%% " + JSON.stringify(rows));
				res.send(200, rows);
				connection.release();
			}
      });		
	}); 
}; 

exports.getCampaignLink  = function(req, res, next) {
	pool.getConnection(function(err, connection) {
	
		var camCode = req.query.acode;
		var agent = req.headers['user-agent'].split("(");
		var agent2 = agent[1].split(";");
			
		if(agent2[1].includes("iOS")) {
			var test = agent2[0].split("/");
			var test2 = test[1].split(".");
			var version = test2[0]+"."+test2[1];
			var camDevice = test[0] + " "+ version;
		} else {
			var camDevice =  "Android "+ agent2[0];
		}

		var camXforward = req.headers['x-forwarded-for'];

		connection.query('SELECT campaignlink FROM ucorsa.campaign \
				where deviceip = ? \
				and useragent = ? \
				and userid != 0',[camXforward,camDevice], function(err, rows) {
			if (err) {
				logger.error("campaignlink Error %%%% "+ err);
		  		return next(err);
			} else {
				logger.info("campaignlink SUCCESS %%%% " + JSON.stringify(rows));
				res.send(200, rows);
				connection.release();
			}
      });		
	}); 
}; 