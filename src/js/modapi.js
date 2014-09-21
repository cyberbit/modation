/**
 * ModAPI (Modation API)
 *
 * @author cyberbit (D.J. Marcolesco) dj.marcolesco@outlook.com
 * @version 0.1
 */

//Global identifier for ModAPI class
modapi = new ModAPI();

//Set debug mode
modapi.debug = false;

//Disable all console logs
console.log = function(){};
console.debug = function(){};

/**
 * Contains helper functions specific to Modation
 */
function ModAPI() {
	this.DEFAULT_CALLBACK = function(){};
}

/**
 * Get current user information from Soundation API
 *
 * @returns	{object}	User information
 */
ModAPI.prototype.login = function(callback) {
	if (typeof callback == "undefined") callback = this.DEFAULT_CALLBACK;
	
	//Grab Soundation user
	$.getJSON("http://api.soundation.com/me", function(data) {
		//Pass user object to callback
		callback(data.data);
	});
};