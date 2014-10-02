/**
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
	
	//End trace group
	console.groupEnd();
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
	
	//Trace callback
	if (crapi.debug) console.trace("Stack trace");
	
	//Grab storage
	chrome.storage.local.get(function(d) {
		//Trace storage
		console.log("Storage: %O", d);
		
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
	
	//Trace callback
	if (crapi.debug) console.trace("Stack trace");
	
	var updatedStorage = {};
	updatedStorage[key] = value;
	
	//Update storage
	chrome.storage.local.set(updatedStorage, function() {
		//Trace updated storage
		console.log("New storage: %O", updatedStorage);
		
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
	
	//Trace callback
	if (crapi.debug) console.trace("Stack trace");
	
	//Update storage
	chrome.storage.local.set(items, function() {
		//Trace updated storage
		console.log("New storage: %O", items);
		
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
	
	//End trace group
	console.groupEnd();
}