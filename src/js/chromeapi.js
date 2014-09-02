/**
 * Chrome API Helpers
 *
 * @author cyberbit (D.J. Marcolesco) dj.marcolesco@gmail.com
 * @version 0.1
 */

const DEFAULT_CALLBACK = function(d){return (typeof d != "undefined" ? d : false)};

//Get local storage copy
function clone_storage(callback) {
	if (typeof callback == "undefined") callback = DEFAULT_CALLBACK;
	
	chrome.storage.local.get(function(d) {
        console.log("Storage cloned! Result: ");
		console.log(modationStorage);
		return callback(d);
	});
}

//Update storage for provided key
function update_storage(key, value, callback) {
	if (typeof callback == "undefined") callback = DEFAULT_CALLBACK;
	
	var updatedStorage = {};
	updatedStorage[key] = value;
	
	//Update storage
	chrome.storage.local.set(updatedStorage, callback);
}

//Update everything in storage
function update_all_storage(items, callback) {
	if (typeof callback == "undefined") callback = DEFAULT_CALLBACK;
	
	//Update storage
	chrome.storage.local.set(items, callback);
}

//Clone and update storage using callback
function clup_storage(cloneCallback, updateCallback) {
	if (typeof cloneCallback == "undefined") cloneCallback = DEFAULT_CALLBACK;
	if (typeof updateCallback == "undefined") updateCallback = DEFAULT_CALLBACK;
	
	//Clone storage using callback, update, run update callback
	update_all_storage(clone_storage(cloneCallback), updateCallback);
}

clup_storage(function(d) {
	d[key]['watchlist'] = "happiness";
	
	return d;
}, function() {
	alert("updated successfully! yay!");
});