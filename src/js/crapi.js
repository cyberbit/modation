/*!
 * App Helpers
 */
String.prototype.hashCode = function(){
    var hash = 0, i, c;
    if (this.length == 0) return hash;
    for (i = 0, l = this.length; i < l; i++) {
        c  = this.charCodeAt(i);
        hash  = ((hash<<5)-hash)+c;
        hash |= 0; // Convert to 32bit integer
    }
    return hash;
};


/*!
 * CrAPI (Chrome API Helper)
 *
 * @author cyberbit (D.J. Marcolesco) dj.marcolesco@outlook.com
 * @version 0.1
 */

//Global identifier for CrAPI class
crapi = new CrAPI();

/**
 * Grab extension manifest
 *
 * @returns	{object}	Serialization of full manifest file (from API docs)
 * @name 
 */
CrAPI.prototype.manifest = function() { return chrome.runtime.getManifest(); }

/**
 * Reload the current page
 */
CrAPI.prototype.reload = function() { location.reload(); }

/**
 * Quick-access debug switch
 *
 * @type boolean
 */
CrAPI.prototype.debug = crapi.manifest().debug;

/**
 * Contains workarounds for tricky bits in the Chrome API
 */
function CrAPI() {
	//Begin trace group
	console.groupCollapsed("CrAPI :: Init");
	
	//Begin trace timing
	console.time("CrAPI init");
	
	//Default callback for all functions
	this.DEFAULT_CALLBACK = function(d){return (typeof d != "undefined" ? d : false)};
	
	//Trace default callback
	console.log("DEFAULT_CALLBACK: %O", this.DEFAULT_CALLBACK);
	
	//Quick badge colors
	this.badgeColors = {
		gray: "#9a9a9a",
		red: "#d00"
	};
	
	//Trace badge colors
	console.log("badgeColors: %O", this.badgeColors);
	
	//Default badge options
	this.badgeOptions = {
		title: false,
		color: false,
		text: false
	};
	
	//Trace badge options
	console.log("badgeOptions: %O", this.badgeOptions);
	
	//End trace timing
	console.timeEnd("CrAPI init");
	
	//End trace group
	console.groupEnd();
}

/**
 * Grab storage solution (sync or local)
 *
 * $returns	{StorageArea}	Storage solution from chrome.storage
 */
CrAPI.prototype.storage = function(type) {
	type = typeof type == "undefined" ? "sync" : type;
	
	//Parse type
	switch (type) {
		//Local storage
		case "local":
			return chrome.storage.local;
			break;
		
		//Synced storage
		case "sync":
			return chrome.storage.sync;
			break;
		
		//Unknown type
		default:
			return false;
			break;
	}
	
	//Something weird happened
	return -1;
}

/**
 * Clone local storage
 *
 * @param	{function}	callback	Revieves cloned storage and returns modified storage
 * @returns	{object}				Modified contents of storage from callback
 */
CrAPI.prototype.clone = function(callback) {
	if (typeof callback == "undefined") callback = this.DEFAULT_CALLBACK;
	
	//Begin trace group
	console.groupCollapsed("CrAPI :: Clone storage");
	
	//Begin trace timing
	console.time("CrAPI clone");
	
	//Trace callback
	if (crapi.debug) console.trace("Stack trace");
	
	//Grab storage
	this.storage().get(function(d) {
		//Trace storage
		console.log("Storage: %O", d);
		
		//Begin trace timing
		console.timeEnd("CrAPI clone");
		
		//End trace group
		console.groupEnd();
		
		//Run callback
		callback(d);
	});
}

/**
 * Update storage for provided key
 *
 * @param	{String}	key			Key to update
 * @param	{object}	value		New contents of key
 * @param	{function}	callback	Function to run after update
 */
CrAPI.prototype.update = function(key, value, callback) {
	if (typeof callback == "undefined") callback = this.DEFAULT_CALLBACK;
	
	//Begin trace group
	console.groupCollapsed("CrAPI :: Update storage");
	
	//Begin trace timing
	console.time("CrAPI update");
	
	//Trace callback
	if (crapi.debug) console.trace("Stack trace");
	
	var updatedStorage = {};
	updatedStorage[key] = value;
	
	//Update storage
	this.storage().set(updatedStorage, function() {
		//Trace updated storage
		console.log("New storage: %O", updatedStorage);
		
		//End trace timing
		console.timeEnd("CrAPI update");
		
		//End trace group
		console.groupEnd();
		
		//Run callback
		callback(value);
	});
}

/**
 * Update everything in storage
 *
 * @param	{object}	items		New contents of storage
 * @param	{function}	callback	Function to run after update
 */
CrAPI.prototype.updateAll = function(items, callback) {
	if (typeof callback == "undefined") callback = this.DEFAULT_CALLBACK;
	
	//Begin trace group
	console.groupCollapsed("CrAPI :: Update all storage");
	
	//Begin trace timing
	console.time("CrAPI update all");
	
	//Trace callback
	if (crapi.debug) console.trace("Stack trace");
	
	//Update storage
	this.storage().set(items, function() {
		//Trace updated storage
		console.log("New storage: %O", items);
		
		//End trace timing
		console.timeEnd("CrAPI update all");
		
		//End trace group
		console.groupEnd();
		
		//Run callback
		callback();
	});
}

/**
 * Modify extension badge from settings matrix
 *
 * @param	{object}	matrix		Badge options
 */
CrAPI.prototype.badge = function(matrix) {
	//Begin trace group
	console.groupCollapsed("CrAPI :: Update badge");
	
	//Begin trace timing
	console.time("CrAPI badge");
	
	//Trace callback
	if (crapi.debug) console.trace("Stack trace");
	
	var options = $.extend({}, this.badgeOptions, matrix);
	var color = (typeof this.badgeColors[options.color] != "undefined" ? this.badgeColors[options.color] : options.color);
	
	//Trace options
	console.log("Options: %O", options);
	
	//Trace color
	console.log("Color:", color);
	
	if (options.title !== false) chrome.browserAction.setTitle({title: options.title});
	if (color !== false) chrome.browserAction.setBadgeBackgroundColor({color: color});
	if (options.text !== false) chrome.browserAction.setBadgeText({text: options.text});
	
	//End trace timing
	console.timeEnd("CrAPI badge");
	
	//End trace group
	console.groupEnd();
}