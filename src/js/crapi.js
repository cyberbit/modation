/**
 * CrAPI (Chrome API Helper)
 *
 * @author cyberbit (D.J. Marcolesco) dj.marcolesco@outlook.com
 * @version 0.1
 */

//Global identifier for CrAPI class
crapi = new CrAPI();

/**
 * Contains workarounds for tricky bits in the Chrome API
 */
function CrAPI() {
	//Default callback for all functions
	this.DEFAULT_CALLBACK = function(d){return (typeof d != "undefined" ? d : false)};
	
	//Quick badge colors
	this.badgeColors = {
		gray: "#9a9a9a",
		red: "#d00"
	};
	
	//Default badge options
	this.badgeOptions = {
		title: false,
		color: false,
		text: false
	};
}

/**
 * Clone local storage
 *
 * @param	{function}	callback	Revieves cloned storage and returns modified storage
 * @returns	{object}				Modified contents of storage from callback
 */
CrAPI.prototype.clone = function(callback) {
	if (typeof callback == "undefined") callback = this.DEFAULT_CALLBACK;
	
	chrome.storage.local.get(function(d) {
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
	
	var updatedStorage = {};
	updatedStorage[key] = value;
	
	//Update storage
	chrome.storage.local.set(updatedStorage, function() {
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
	
	//Update storage
	chrome.storage.local.set(items, callback);
}

/**
 * Grab extension manifest
 *
 * @returns	{object}	Serialization of full manifest file (from API docs)
 * @name 
 */
CrAPI.prototype.manifest = function() { return chrome.runtime.getManifest(); }

/**
 * Modify extension badge from settings matrix
 *
 * @param	{object}	matrix		Badge options
 */
CrAPI.prototype.badge = function(matrix) {
	var options = $.extend({}, this.badgeOptions, matrix);
	
	var color = (typeof this.badgeColors[options.color] != "undefined" ? this.badgeColors[options.color] : options.color);
	
	console.log(options);
	
	if (options.title !== false) chrome.browserAction.setTitle({title: options.title});
	if (color !== false) chrome.browserAction.setBadgeBackgroundColor({color: color});
	if (options.text !== false) chrome.browserAction.setBadgeText({text: options.text});
}