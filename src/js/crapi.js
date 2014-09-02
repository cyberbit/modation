/**
 * CrAPI (Chrome API Helper)
 *
 * @author cyberbit (D.J. Marcolesco) dj.marcolesco@gmail.com
 * @version 0.1
 */

//Universal identifier for CrAPI class
_cr = new CrAPI();

/**
 * Contains workarounds for tricky bits in the Chrome API
 */
function CrAPI() {
	this.DEFAULT_CALLBACK = function(d){return (typeof d != "undefined" ? d : false)};
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
        console.log("Storage cloned! Result: ");
		console.log(modationStorage);
		return callback(d);
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
	if (typeof callback == "undefined") callback = DEFAULT_CALLBACK;
	
	var updatedStorage = {};
	updatedStorage[key] = value;
	
	//Update storage
	chrome.storage.local.set(updatedStorage, callback);
}

/**
 * Update everything in storage
 *
 * @param	{object}	items		New contents of storage
 * @param	{function}	callback	Function to run after update
 */
CrAPI.prototype.updateAll = function(items, callback) {
	if (typeof callback == "undefined") callback = DEFAULT_CALLBACK;
	
	//Update storage
	chrome.storage.local.set(items, callback);
}

/**
 * Clone and update storage using callback
 *
 * @param	{function}	cloneCallback	Recieves cloned storage and returns modified storage
 * @param	{function}	updateCallback	Executes after update
 *
 * Usage:
 *		clup_storage(function(d){return d},function(){});
 */
//Clone and update storage using callback
CrAPI.prototype.clup = function(cloneCallback, updateCallback) {
	if (typeof cloneCallback == "undefined") cloneCallback = DEFAULT_CALLBACK;
	if (typeof updateCallback == "undefined") updateCallback = DEFAULT_CALLBACK;
	
	//Clone storage using callback, update, run update callback
	this.updateAll(this.clone(cloneCallback), updateCallback);
}

/**
 * Grab extension manifest
 *
 * @returns	{object}	Serialization of full manifest file (from API docs)
 * @name 
 */
CrAPI.prototype.manifest = function() { return chrome.runtime.getManifest(); }