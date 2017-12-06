var user = require('../controllers/user');
var auth = require('../controllers/auth');
var address = require('../controllers/address');
var vehicle = require('../controllers/vehicle');
var payment = require('../controllers/payment');
var help = require('../controllers/help');
var ride = require('../controllers/ride');
var drive = require('../controllers/drive');
var carpool = require('../controllers/carpool');
var contacts = require('../controllers/contacts');
var saveregid = require('../controllers/saveregid');
var androidpush = require('../controllers/androidpush');
var groups = require('../controllers/groups');
var Tracking = require('../controllers/Tracking');
var saveNotifications =require('../controllers/saveNotifications');
var window =require('../controllers/window');
var stripe = require('../controllers/stripe');
var log =require('../controllers/log');
var role =require('../controllers/roleChange');
var chat =require('../controllers/chat');
var webhook = require('../controllers/webhooks');
var logger = require("../lib/logger");
///campaign
var campaign =require('../controllers/campaign');

module.exports = function(app){

/**
 * Api endpoints.
 */
	
	 
	 app.get("/help", help.help);
	 app.get("/", function(req, res) {
    	res.json({ message: 'hooray! welcome to our api!' });   
	 });

	 
	//API for user registration..
	app.post('/register', user.Register); 
	//API for login..
	app.post('/login', auth.login);
	//login for facebook and google plus
	app.post('/login/social', auth.externalLogin);
	
	//check user_login exists	
	app.post('/checkuserlogin',auth.checkuserlogin);
	
	//Check phone number exists or not during registration
	app.post('/checkphone',auth.checkPhoneNumberonRegistration);
	
	app.all('/api/*', [auth.validate]);
	//accessing authentication table data
	app.get('/api/auth', auth.validate, auth.getAuthentication);
	app.put('/api/auth', auth.validate, auth.updateAuthentication);
	 //Reset password
	 app.post('/resetpassword',auth.resetPassword); 
  	
	// accessing user table data	
	app.get('/api/users', auth.validate, user.getUser); // list a particular user details	
	app.put('/api/users', auth.validate,user.updateUsers);   
	
	
	// accessing address table data	 
	app.get('/api/address', auth.validate, address.getAddress);
	app.put('/api/address/:id', auth.validate, address.updateAddress);
	app.post('/api/address', auth.validate, address.addAddress);
	app.delete('/api/address/:id', auth.validate, address.deleteAddress);
	
	// accessing vehicle table data  
	app.get('/api/vehicle', auth.validate, vehicle.getVehicle); 
	app.put('/api/vehicle/:id', auth.validate, vehicle.updateVehicle);
	app.post('/api/vehicle', auth.validate, vehicle.addVehicle);
	app.delete('/api/vehicle/:id', auth.validate, vehicle.deleteVehicle);
	
	//ride table
	app.post('/api/rides', auth.validate, ride.addRide);//old ride request
	 //app.post('/api/ride', auth.validate, ride.addRide);
	// app.get('/api/ride/:userId ', auth.validate, ride.viewRide);  //not  in help
	 app.get('/api/rides',auth.validate, ride.uRides);
	 app.get('/api/rides/details/:id',auth.validate, ride.rideDetails); // not in help
	 app.post('/api/rides/accept', auth.validate, ride.acceptRide);
	 app.post('/api/rides/confirm', auth.validate, ride.confirmRide);
	 app.get('/api/rides/history', auth.validate, ride.uRideHistory);
	 app.get('/api/rides/confirmed',auth.validate, ride.TrackRides);
	 app.post('/api/rides/cancel', auth.validate, ride.cancelConfimedRideByRiderTest);
	 app.post('/api/rides/notify/start', auth.validate, ride.notifyRider_Start);
	 app.post('/api/rides/notify/stop', auth.validate, ride.notifyRider_Stop);
	 app.post('/api/rides/test', auth.validate, ride.test);
	 app.get('/api/rides/uRideFare', auth.validate, ride.uRideFare);
	 
	 //Drives 
	app.get('/api/drives',auth.validate, drive.uDrives);	
	 app.get('/api/drives/history', auth.validate, drive.uDriveHistory99);
	 app.post('/api/drives/cancel', auth.validate, drive.cancelConfimedRideByDriver99);
	 //carpool drives
	// app.get('/api/drives/carpool', drive.carpoolDrives);
	 
	 //Contacts
	 app.get('/api/showContacts',auth.validate, contacts.listContactsToAddGroupMembers);
	 //app.get('/api/Contacts',auth.validate, contacts.listContactsToChooseForRideRequest);
	 app.delete('/api/contacts/:contactId',auth.validate, contacts.deleteContact);
	// app.get('/api/Contacts/search',auth.validate, contacts.searchDriverSchedule);
	 app.get('/api/contacts',auth.validate, contacts.getContacts99);
	 app.post('/api/contacts/sync', auth.validate, contacts.syncContacts);
	 //app.post('/api/contacts/add', auth.validate, contacts.addUcorsaContacts);
	 app.post('/api/contacts/changeStatustoInvited', auth.validate, contacts.changeStatustoInvited)
	 
	 
	 //Driver schedule
	 app.get('/api/drives/schedule', auth.validate, drive.getSchedule);
	 app.post('/api/drives/schedule', auth.validate, drive.addSchedule);
	 app.put('/api/drives/schedule/:id', auth.validate, drive.updateSchedule);
	 app.delete('/api/drives/schedule/:id',auth.validate, drive.deleteSchedule);
	 
	 // carpool routes
	 app.get('/api/carpool', auth.validate, carpool.getCarpool);
	 app.post('/api/carpool/cancel', auth.validate, carpool.cancelConfimedCarpoolByDriver);
	 app.get('/api/carpool/history', auth.validate, carpool.uCarpoolHistory);
	 app.get('/api/carpool/payments/:id/:carpool_id', carpool.payments);
	 
	 app.post('/api/frequency/rider/cancel', carpool.riderFrequencyCancel);
	 app.post('/api/frequency/driver/cancel', carpool.driverFrequencyCancel);
	 app.post('/api/carpool/start', auth.validate, carpool.carpoolStart);
	 app.post('/api/carpool/stop', auth.validate, carpool.carpoolStop);
	 app.get('/api/carpool/uCarpoolFare', auth.validate, carpool.uCarpoolFare);
	 //save regid
	 app.post('/api/token',auth.validate, saveregid.save);
	 //groups	 
	 app.post('/api/groups', auth.validate, groups.addGroup);
	 app.put('/api/groups/:id', auth.validate, groups.updateGroup);
	 app.delete('/api/groups/:id', auth.validate, groups.deleteGroup); 
	 app.get('/api/groups', auth.validate, groups.listAllGroups);
	 //Members is Groups
	 app.get('/api/members', auth.validate, groups.listAllMembersInGroups);	 
	 app.post('/api/members', auth.validate, groups.addMembers); 
	 app.delete('/api/members/:id' , auth.validate, groups.deleteMembers);
	//Tracking 
	 app.post('/api/tracking', auth.validate, Tracking.addTracking);
	 app.get('/api/tracking', auth.validate, Tracking.getTracking);
	 app.put('/api/tracking/:id', auth.validate, Tracking.updateTracking);
	 // save notification to backend after receiving the notifications ....  
	 app.post('/api/notification', auth.validate, saveNotifications.save);
//	 app.post('/api/pay', payment.new_c_card);
//	 app.get('/api/payments',  auth.validate, payment.getPayments);
//	 app.post('/api/payments', auth.validate, payment.addPayments); 
//	 app.put('/api/payments/:id', auth.validate, payment.updatePayments);		
//	 app.delete('/api/payments/:id' , auth.validate, payment.deletePayments);
	 app.post('/api/payments/rider', auth.validate,  stripe.riderSave);
	 app.post('/api/payments/driver', auth.validate,  stripe.driverSave99);
	 //app.post('/api/payments/driver123',  stripe.driverSave99);
	 app.post('/api/payments/both', auth.validate,  stripe.bothSave);
	 app.get('/api/payments/tokens', auth.validate,  stripe.checkRidersCreditCard);//check riders credit card availability
	 app.get('/api/payments/tokensDriver', auth.validate,  stripe.checkDriversBankorDebitCard);//check drivers debit or bank availability
	 app.delete('/api/payments/tokens/:id', auth.validate,  stripe.deletePaymentDetails);
	 app.delete('/api/payments/tokensDriver/:id', auth.validate,  stripe.deleteDriverPaymentDetails);
	 app.post('/api/payments/commit', auth.validate,  stripe.riderCommit);
	// app.get('/api/payments/process', auth.validate,  stripe.paymentProcess);
	 app.get('/api/payments/today', auth.validate,  stripe.transactionToday);
	 app.get('/api/payments/history', auth.validate,  stripe.transactionHistory);
	 app.post('/api/payments/tip', auth.validate, stripe.updateTip);
	 app.get("/api/roles/role",auth.validate,  role.getRole);
	 app.post("/api/roles/rider",auth.validate,  role.changeToRider, role.riderDataEntry);
	 app.post("/api/roles/driver",auth.validate,  role.changeToDriver, role.driverDataEntry);
	 app.post("/api/roles/rider_both",auth.validate, role.driverDataEntry);
	 app.post("/api/roles/driver_both",auth.validate, role.riderDataEntry);
	 app.post('/api/log', auth.validate,  log.saveLog);	 
	 app.post('/api/window', window.addWindow);
	 app.delete('/api/window/:id', window.deleteWindow);
	 app.post('/api/chat/rider/start', chat.uRideStart);
	 app.post('/api/chat/driver/start', chat.uDriveStart);
	 //chat summary
	 app.get('/api/chat/summary' , chat.summary); 
	 app.post('/api/messages', chat.addMessage);
	 app.get('/api/messages', chat.getMessages);
	 // webhooks
	 app.post('/webhooks/chargeCreated', webhook.chargeCreated);
	 app.post('/webhooks/chargeFailed', webhook.chargeFailed);
	 
	 //campaign
	 app.get('/campaign', campaign.createCampaign);
	 //matching
     app.get('/matching', campaign.matchCampaign);	
     //get campaign link
     app.get('/campaignLink', campaign.getCampaignLink);
};