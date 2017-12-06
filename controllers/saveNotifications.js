/**
 * New node file
 */

var pool = require('../config/db');
var logger = require("../lib/logger");
var ride = require('../controllers/ride');


/// need to clean code not using for now....

exports.save = function(req, res, next) {
	logger.info(" In notification middleware");
	if(req.body.status == "requested" || req.body.status == "Requested")
		ride.ride_table_changestatustorequested(req.body.ride_id,req.body.msg);
	else if(req.body.status == "accepted" || req.body.status == "Accepted")
	ride.ride_table_changestatustoaccepted(req.body.ride_id,req.body.msg);
	else if(req.body.status == "rejected" || req.body.status == "Rejected")
		ride.ride_table_changestatustorejected(req.body.ride_id,req.body.msg);
	else if(req.body.status == "confirmed" || req.body.status == "Confirmed")
		ride.ride_table_changestatustoconfirmed(req.body.ride_id,req.body.msg);		
	res.send(200, {"message":"Notification saved"});
};


