var pool  = require('../config/db');
var logger = require("../lib/logger");
var config  = require('../config/config');
var async = require('async');
var _ = require("underscore");


exports.addGroup = function(req, res,next){
	
	pool.getConnection(function(err, connection){	
		connection.query( 'select * from Groups where usr_id = (Select user_id from Authentication where user_login = ? ) and name = ?;', 
				[ req.userId, req.body.name],  function(err, grouprows){
			if(err)	{
  		  		logger.error(err);
  		  		return next(err);
					}
				if(!grouprows.length)
					{
						const sql = 'INSERT INTO Groups (usr_id, \`name\`) VALUES (\
			    			(Select user_id from Authentication where user_login = ?), ? )'
					connection.query( sql,[req.userId, JSON.parse(JSON.stringify(req.body.name))],  function(err, rows){
				  	if(err)	{
				  		logger.error(err);
				  		return next(err);
				  	}else{
				  		logger.info( rows.insertId );
				  		var obj = {};
				  		obj.id = rows.insertId;
				  		obj.name = req.body.name;
				  		res.send(200,obj);
				  		connection.release();
				  	}
					});
				}else{
					res.send(200,{"message":"Group Name already exists"});
			  		connection.release();
				}
		});    
  });
};


exports.updateGroup = function(req, res,next){
	console.log(JSON.stringify(req.body));
	pool.getConnection(function(err, connection){
		connection.query( 'select * from Groups where usr_id = (Select user_id from Authentication where user_login = ? ) and name = ?;', 
				[ req.userId, req.body.name],  function(err, rows){
			if(err)	{
  		  		logger.error(err);
  		  		return next(err);
					}
				if(!rows.length)
					{
							connection.query( 'select id from Groups where usr_id = (Select user_id from Authentication where user_login = ? ) and id = ?;', 
									[ req.userId, req.params.id],  function(err, grouprows){
								if(err)	{
					  		  		logger.error(err);
					  		  		return next(err);
					  		  	}
					  		  	else if (grouprows.length){		  		  	
					  		  	const sql = 'update Groups set name = ? where id = ?;'
						  		  	connection.query( sql , [req.body.name, grouprows[0].id],  function(err, rows){
							  		  	if(err)	{
							  		  		logger.error(err);
							  		  		return next(err);
							  		  	}else{
					
													logger.info( rows );
													var obj = {};
											  		obj.id = req.body.id;
											  		obj.name = req.body.name;
													res.send(200, obj);
													
											  		connection.release();	
							  		  	}
						  		  	});
					  		  	}
					  		  	else
					  		  		{
					  		  	res.send("No such Group found for the User");
					  		  	connection.release();
					  		  		}
						});
					}
				else{
					res.send(200,{"message":"Group Name cannot be updated since Name already exists"});
			  		connection.release();
				}
					
			});
	});

};


exports.deleteGroup = function(req, res,next){
	pool.getConnection(function(err, connection){	
		connection.query( 'select id from Groups where usr_id = (Select user_id from Authentication where user_login = ? ) and id = ?;', 
				[ req.userId, req.params.id],  function(err, grouprows){
			if(err)	{
  		  		logger.error(err);
  		  		return next(err);
  		  	}
  		  	else if (grouprows.length){  		
  		  	const sql = ' Delete from Group_Members where group_id = ? ; Delete from Groups where id = ? '
	  		  	connection.query( sql , [grouprows[0].id, grouprows[0].id],  function(err, rows){
		  		  	if(err)	{
		  		  		logger.error(err);
		  		  		return next(err);
		  		  	}else{

								logger.info( rows );								
								var obj = {"message": "Group Deleted"};
						  		res.send(200,obj);
						  		obj = null;
						  		connection.release();	
		  		  	}
	  		  	});
  		  	}
  		  	else
  		  		{
  		  	res.send(200, {"message": "No such Group found for the User"});
  		  	connection.release();	
  		  		}
			});
	});
};


exports.listAllGroups = function(req, res,next){
	pool.getConnection(function(err, connection){
		logger.info( "In list groups function" );
		const sql_ = 'Select * from Groups where usr_id = ( Select user_id from Authentication where user_login = ? );'
		connection.query( sql_,[req.userId],  function(err, rows){
					  	if(err)	{
					  		logger.error(err);
					  		return next(err);
					  	}else if(rows.length){
					  		logger.info( rows );
					  		const sql = 'Select gp.id as GroupId, gm.id as GroupMemberID, gm.usr_id as GroupUserID, gp.name as GroupName, usr.first_name , usr.phone\
					  			From ucorsa.Groups gp, ucorsa.Group_Members gm,ucorsa.Authentication auth,ucorsa.Users usr\
					  			where auth.user_login = ?\
					  			and gp.id = gm.group_id\
					  			and gm.usr_id= usr.id\
					  			and gp.usr_id = auth.user_id\
					  			and gp.id = ?';
					  		var groups = [];
					  		async.each(rows, function(row, callback) {
					  			connection.query(sql ,[req.userId,row.id],  function(err, ride_memberrows){
									if(err)	{
								  		return next(err);
								  	}else{
								  		row.members = ride_memberrows;
								  		groups.push(row);
								  		callback();
								  		}
						  		});
					  		}, function(err){				  		    
					  		    if( err ) {				  		    
					  		    console.log('Failed');
					  		    connection.release();
					  		    res.send(500," Error in code");
					  		    } else {							  		
					  		  /*	var uniqueList = _.uniq(groups.members, function(item, key, phone) { 
					    	        return item.phone;
					    	    });*/
						  	   console.log('Groups returned');
						  	   res.send(200,groups);
							  	   connection.release();
					  		    }
					  		});
					  		
					  	}else{
					  		res.send(200,rows);
				  			connection.release();
					  	}
					  });
		});
};

exports.listAllMembersInGroups = function(req, res,next){
	pool.getConnection(function(err, connection){
		const sql = 'Select gp.id as GroupId, gm.id as GroupMemberID, gm.usr_id as GroupUserID, gp.name as GroupName, usr.first_name , usr.phone\
		From ucorsa.Groups gp, ucorsa.Group_Members gm,ucorsa.Authentication auth,ucorsa.Users usr\
		where auth.user_login = ?\
		and gp.id = gm.group_id\
		and gm.usr_id= usr.id\
		and gp.usr_id = auth.user_id\
		and gp.id = ?'
		connection.query( sql ,[req.userId,req.query.groupId],  function(err, rows){
								  	if(err)	{
								  		logger.error(err);
								  		return next(err);
								  	}else{
								  		logger.info( rows );	
								  		 var uniqueList = _.uniq(rows, function(item, key, phone) { 
								    	        return item.phone;
								    	    });
								  		res.send(200,uniqueList);
								  		connection.release();
								  		}
								  });
				});
};



exports.addMembers = function(req, res,next){	
	pool.getConnection(function(err, connection){		
				var groupmembers = JSON.parse(JSON.stringify(req.body.members));
				async.each(groupmembers, function(member, callback) {
				checkMembersExists(req.body.GroupId,member.userId,function(membersExists){
					if(!membersExists){
						const sql = 'INSERT INTO ucorsa.Group_Members (ucorsa.Group_Members.group_id, ucorsa.Group_Members.usr_id) VALUES (?, ?)';				
			  			connection.query(sql ,[req.body.GroupId,member.userId],  function(err, groupmembers){
							if(err)	{
						  		return next(err);
						  	}else{	
						  		logger.info(JSON.stringify(groupmembers));	
						  		callback();
						  		}
				  		});
						}
					else{
						logger.info(member.userId + " Member Already exists");
						callback();
					}					
				});			
				}, function(err){				  		    
					  		    if( err ) {				  		    
					  		    console.log('Failed');
					  		    res.send(500," Error in code");
					  		    } else {	
				  		    	 res.send(200,{"message":"Group Members Added"});
				  		    	connection.release();
					  		    }						  	  				  		  		     
				  		    });
			});
};

var checkMembersExists = function(group_Id, user_Id, callback)
{
	pool.getConnection(function(err, connection) {		
		connection.query('SELECT * FROM ucorsa.Group_Members where group_id = ?	and usr_id = ?;',[group_Id, user_Id], function(err, contactrow) {
					if (err) {
						logger.error(err);
						return next(err);
						} 	
					if(contactrow.length)
						{
						logger.info("T " + user_Id);
						callback(true);  //if member exists
						}
					else{
						logger.info("F " + user_Id);
						callback(false);  //if member exists											
					}
		});
						
	});
};


exports.deleteMembers = function(req, res,next){
	pool.getConnection(function(err, connection){		
		const deleteQuery = 'select group_id from Group_Members where id = ?'
		connection.query( deleteQuery, [req.params.id],  function(err, rows){
	  	if(err)	{
	  		logger.error(err);
	  		return next(err);
	  	}else{
	  		logger.info("Group rows  " + JSON.stringify(rows));
			 async.waterfall([
				       		   function(callback){
				       			 logger.info("Deleting group_member");						       			   
				       			 connection.query('Delete from Group_Members where id = ?',[req.params.id],
				       				function(err, deleteRows ) {
				       		   			if (err) {
				       		   			logger.error(err);
				       			  		return next(err);		       		   				
				       		   			}else {    
				       		   				logger.info("Deleting Group_Members " + JSON.stringify(deleteRows));
				       						callback(null, deleteRows);
				       					}
				       						
				       		   		});
				       		     
				       		   },
				       		function(deleteRows,callback){
				       			   logger.info("Check whether members exists in Group_members table for deleting the Group");
				       		   connection.query('select * from Group_Members where group_id = ?;'
				       				   ,[rows[0].group_id],
				       				function(err, groupRows) {
				       		   			if (err) {
				       		   			logger.error(err);
				       			  		return next(err);	       		   				
				       		   			}else {     
				       		   				logger.info("Data from Group_members table ---> "+ JSON.stringify(groupRows));
				       						callback(null, groupRows);
				       					}
				       						
				       		   		});
				       		     
				       		   },
				       		function(groupRows,callback){
				       			   if(!groupRows.length){
				       			   logger.info("Deleting Group when no members exists in Group");
				       		   connection.query('delete from Groups where id = ? '
				       				   ,[rows[0].group_id],
				       				function(err, userRows) {
				       		   			if (err) {
				       		   			logger.error(err);
				       			  		return next(err);	       		   				
				       		   			}else {     
				       		   				logger.info("Deleting the group table  ---> "+ JSON.stringify(userRows));
				       						callback(null, userRows);
				       					}			       						
				       		   		});
				       			   }else
				       		callback(null, groupRows);				       		     
				       		   }], function(err, id) {
				       		    	if (err) {
				       		    		logger.error(err);
				       			  		return next(err);
				       		    	    res.send('Error inserting in all tables !!!!!!!!!');  
				       		    } else {
				       		    	logger.info(id);
				       		    	res.send(200,{"message" : "Group Member deleted"});
				       		    }
				       			connection.release();
				       		});	
	  				}
			});
	});
};