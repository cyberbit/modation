/**
 * ModAPI (Modation API)
 *
 * @author cyberbit (D.J. Marcolesco) dj.marcolesco@outlook.com
 * @version 0.1
 */

//Global identifier for ModAPI class
modapi = new ModAPI();

//Clone manifest (will move to CrAPI)
modapi.manifest = crapi.manifest();

/**
 * Contains helper functions specific to Modation
 */
function ModAPI() {
	//Begin trace group
	console.groupCollapsed("ModAPI :: Init");
	
	//Begin trace timing
	console.time("ModAPI init");
	
	//Default callback for all functions
	this.DEFAULT_CALLBACK = function(){};
	
	//Trace default callback
	console.log("DEFAULT_CALLBACK: %O", this.DEFAULT_CALLBACK);
	
	//End trace timing
	console.timeEnd("ModAPI init");
	
	//End trace group
	console.groupEnd();
}

/**
 * Get current user information from Soundation API
 *
 * @returns	{object}	User information
 */
ModAPI.prototype.login = function(callback) {
	if (typeof callback == "undefined") callback = this.DEFAULT_CALLBACK;
	
	//Begin trace group
	console.groupCollapsed("ModAPI :: Login");
	
	//Begin trace timing
	console.time("ModAPI login");
	
	//Trace callback
	if (crapi.debug) console.trace("Stack trace");
	
	//Grab Soundation user (attempt 1)
	_me(function(me) {
		//Trace attempt 1
		console.log("Attempt 1: %O", me);
		
		//Attempt 1 failed
		if (!me) {
			//Log failure
			console.warn("Attempt 1 failed! Pinging Soundation...");
			
			//Ping Soundation to set session cookie
			$.get("http://soundation.com").always(function() {
				//Grab Soundation user (attempt 2)
				_me(function(me) {
					//Trace attempt 2
					console.log("Attempt 2: %O", me);
					
					//End trace timing
					console.timeEnd("ModAPI login");
					
					//End trace group
					console.groupEnd();
					
					//Pass user object to callback
					//Any failure here should be handled in the callback
					callback(me);
				});
			});
		}
		
		//Attempt 1 succeeded
		else {
			//End trace timing
			console.timeEnd("ModAPI login");
	
			//End trace group
			console.groupEnd();
			
			//Pass user object to callback
			callback(me);
		}
	});
	
	function _me(callback) {
		$.getJSON("http://api.soundation.com/me")
			.fail(function(jqXHR, textStatus) {
				//End trace timing
				console.timeEnd("ModAPI login");
	
				//End trace group
				console.groupEnd();
				
				//Log failure
				console.error("Unable to connect to Soundation API");
			}).success(function(data) {
				//Run callback
				callback(data.data);
			});
	}
};