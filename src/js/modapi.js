/*!
 * ModAPI (Modation API)
 *
 * @author cyberbit (D.J. Marcolesco) dj.marcolesco@outlook.com
 * @version 2.0
 */

//Global identifier for ModAPI class
modapi = new ModAPI();

//Clone manifest (will move to CrAPI)
modapi.manifest = crapi.manifest();

//URI constants
var protocol = "https://";
var domain = "soundation.com";

//Define global variables
var global = {
	path: {
		home: protocol + domain,
		login: protocol + domain + "?login=yes",
		feed: protocol + domain + "/feed",
		api: protocol + "api." + domain + "/me",
		profile: protocol + domain + "/account/profile"
	}
};

/**
 * Contains helper functions specific to Modation
 */
function ModAPI() {
	console.log("%cModAPI%c :: Init", "font-weight: bold; color: #f60", "");
	
	//Default callback for all functions
	this.DEFAULT_CALLBACK = function(){};
}

/**
 * Get current user information from Soundation API
 *
 * @returns	{object}	User information
 */
ModAPI.prototype.login = function(callback) {
	if (typeof callback == "undefined") callback = this.DEFAULT_CALLBACK;
	
	console.log("%cModAPI%c :: Login", "font-weight: bold; color: #f60", "");
	
	//Ping Soundation to set session cookie
	$.get(global.path.home, function(html) {
		var parsedHtml = html.deres();
		var $html = $(parsedHtml);
		var profileLink = $html.find(".user-link").attr("href");
		var token = $html.filter("[name=csrf-token]").attr("content");
		
		//Grab Soundation user
		_me(function(me) {
			//Inject additional properties
			me.link = profileLink;
			
			//Globalize token
			global.token = token;
			
			//Pass user object to callback
			//Any failure here should be handled in the callback
			callback(me);
		});
	});
	
	//Grab Soundation user (attempt 1)
	/*_me(function(me) {
		//Attempt 1 failed
		if (!me.success) {
			//Log failure
			console.warn("Attempt 1 failed! Pinging Soundation...");
			
			//Ping Soundation to set session cookie
			$.get(global.path.home).always(function() {
				var args = arguments;
				
				console.log("login args: %o", args);
				
				_me(function(me) {
					//Pass user object to callback
					//Any failure here should be handled in the callback
					callback(me);
				});
			});
		}
		
		//Attempt 1 succeeded
		else {
			//Pass user object to callback
			callback(me);
		}
	});*/
	
	function _me(callback) {
		$.getJSON(global.path.api)
			.fail(function(jqXHR, textStatus) {
				//Log failure
				console.error("%cModAPI%c :: Unable to connect to Soundation API", "font-weight: bold; color: #f60", "");
			}).success(function(data) {
				var me = data.data || data;
				
				//Inject success
				me.success = data.success;
				
				//Run callback
				callback(me);
			});
	}
};

/**
 * Get current authenticity token
 *
 * @returns	{string}	Authenticity token
 */
ModAPI.prototype.token = function() { return global.token; }