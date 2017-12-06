/**
 * New node file
 */

module.exports = function (code,msg)
{	
	var error_msg = {};
	error_msg.error ={};
	error_msg.error.code = code;
	error_msg.error.message = msg;
	console.log(JSON.stringify(error_msg));
	return error_msg;
};
