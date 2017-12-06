/**
 * New node file
 */

var logger = require("../lib/logger");


/// method to get current timestamp..The date is formated to store as mySql date format.. 
exports.currentTimestamp = function() {
	var currentTime = new Date();
	var hours = currentTime.getHours();
	var minutes = currentTime.getMinutes();
	var month = currentTime.getMonth() + 1;
	var day = currentTime.getDate();
	var year = currentTime.getFullYear();
	var seconds = currentTime.getSeconds();
	var monthNames = [ "01", "02", "03", "04", "05", "06", "07", "08", "09",
			"10", "11", "12" ];
	var d = new Date();
	var d2 = (monthNames[d.getMonth()]);
	logger.info(year + '-' + d2 + '-' + day + ' ' + hours + ':' + minutes + ':'
			+ seconds);
	var updatets = year + '-' + d2 + '-' + day + ' ' + hours + ':' + minutes
			+ ':' + seconds;
	
	return updatets;
};   

