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

String.prototype.deres = function() {
	return this.replace(/img[^>]*>/g, "");
}

Array.prototype.unique = function() {
    return this.reduce(function(p, c) {
        if (p.indexOf(c) < 0) p.push(c);
        return p;
    }, []);
};

Array.prototype.diff = function(compare) {
	return this.reduce(function(p, c) {
		if (compare.indexOf(c) == -1) p.push(c);
		return p;
	}, [])
}

//Add/replace handler
function handle(target, event, callback, trigger) {
    if (typeof trigger == "undefined") trigger = false;
    
    var $target = $(target);
    
    $target.off(event);
    $target.on(event, callback);
}

//Hide context, show view
function showView(context, view, fade) {
    if (typeof fade == "undefined") fade = 170;
    
    $(context).fadeOut(fade);
    $(view).delay(fade).fadeIn(fade);
}

//Clone factory item
function _factory(parent, key) {
	return $(parent + " " + key).clone();
}

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
 * (Un)set write lock
 */
CrAPI.prototype.lock = function(state) {
	if (typeof state == "undefined") state = "";
	
	localStorage.crapi_locked = state;
}

/**
 * Get lock state
 */
CrAPI.prototype.locked = function() {
	console.log("lock checked");
	return localStorage.crapi_locked;
}

/**
 * Contains workarounds for tricky bits in the Chrome API
 */
function CrAPI() {
	console.log("%cCrAPI%c :: Init", "font-weight: bold; color: green", "");
	
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
	
	//Storage lock state
	if (typeof localStorage.crapi_locked == "undefined") {
		localStorage.crapi_locked = "";
	}
}

/**
 * Grab storage solution (sync or local)
 *
 * $returns	{StorageArea}	Storage solution from chrome.storage
 */
CrAPI.prototype.storage = function(type) {
	type = typeof type == "undefined" ? "local" : type;
	
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
	
	//Grab storage
	this.storage().get(function(d) {
		//Trace storage
		console.log("%cCrAPI%c :: Clone storage: %O", "font-weight: bold; color: green", "", d);
		
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
	
	var _this = this;
	
	//Storage not locked
	if (!_this.locked()) {
		var updatedStorage = {};
		updatedStorage[key] = value;
		
		//Lock storage
		_this.lock("Update storage");
		
		//Update storage
		_this.storage().set(updatedStorage, function() {
			//Unlock storage
			_this.lock();
			
			//Trace updated storage
			console.log("%cCrAPI%c :: Update storage: %O", "font-weight: bold; color: green", "", updatedStorage);
			
			//Run callback
			callback(value);
		});
	}
	
	//Storage locked
	else {
		console.error("%cCrAPI%c :: Storage locked: %o", "font-weight: bold; color: green", "", this.locked);
		
		//Run callback
		callback(false);
	}
}

/**
 * Update everything in storage
 *
 * @param	{object}	items		New contents of storage
 * @param	{function}	callback	Function to run after update
 */
CrAPI.prototype.updateAll = function(items, callback) {
	if (typeof callback == "undefined") callback = this.DEFAULT_CALLBACK;
	
	var _this = this;
	
	//Storage not locked
	if (!_this.locked()) {
		//Lock storage
		_this.lock("Update all");
		
		//Update storage
		_this.storage().set(items, function() {
			//Unlock storage
			_this.lock();
			
			//Trace updated storage
			console.log("%cCrAPI%c :: Update all: %O", "font-weight: bold; color: green", "", items);
			
			//Run callback
			callback();
		});
	}
	
	//Storage locked
	else {
		console.error("%cCrAPI%c :: Storage locked: %o", "font-weight: bold; color: green", "", this.locked);
		
		//Run callback
		callback(false);
	}
}

/**
 * Modify extension badge from settings matrix
 *
 * @param	{object}	matrix		Badge options
 */
CrAPI.prototype.badge = function(matrix) {
	var options = $.extend({}, this.badgeOptions, matrix);
	var color = (typeof this.badgeColors[options.color] != "undefined" ? this.badgeColors[options.color] : options.color);
	
	if (options.title !== false) chrome.browserAction.setTitle({title: options.title});
	if (color !== false) chrome.browserAction.setBadgeBackgroundColor({color: color});
	if (options.text !== false) chrome.browserAction.setBadgeText({text: options.text});
}