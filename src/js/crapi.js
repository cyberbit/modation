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

String.prototype.decamel = function() {
    return this.replace(/(?=[a-zA-z])(?=[A-Z])/g, "-").toLowerCase();
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

// Get blob URL
function getBlob(url, callback) {
    var xhr = new XMLHttpRequest();
    xhr.open("GET", url, true);
    xhr.responseType = "blob";
    xhr.onload = function(e) {
        var blob = window.URL.createObjectURL(this.response);
        
        // Run callback
        callback(blob);
    }
    
    xhr.send();
}

// Get data URI (overlay parameter is optional)
// (via https://davidwalsh.name/convert-image-data-uri-javascript)
function getDataUri(url, overlayUrl, callback) {
    if (typeof callback == "undefined") {
        callback = overlayUrl;
        overlayUrl = false;
    }
    
    var image = new Image();

    image.onload = function() {
        var canvas = document.createElement("canvas");
        canvas.width = this.naturalWidth; // or "width" if you want a special/scaled size
        canvas.height = this.naturalHeight; // or "height" if you want a special/scaled size
        
        var context = canvas.getContext("2d");
        
        context.drawImage(this, 0, 0);
        
        // Draw overlay
        if (overlayUrl) {
            // Calculations for position and size
            var halfWidth = canvas.width / 2;
            var halfHeight = canvas.height / 2;
            
            var overlay = new Image();
            
            overlay.onload = function() {
                // Draw white background to handle images with transparency
                context.fillStyle = "white";
                context.fillRect(halfWidth, halfHeight, halfWidth, halfHeight);
                
                // Draw overlay
                context.drawImage(this, halfWidth, halfHeight, halfWidth, halfHeight);
                
                _continue();
            }
            
            overlay.src = overlayUrl;
        }
        
        // No overlay
        else _continue();
        
        function _continue() {
            // Run callback with data URL
            callback(canvas.toDataURL("image/png"));
        }
    };
    
    image.src = url;
}

// Get/modify localStorage key as JSON
function localJSON(key, json) {
    if (typeof json == "undefined") {
        var value = localStorage[key];
        
        if (typeof value !== "undefined") {
            value = $.parseJSON(value);
        }
        
        return value;
    }
    
    else {
        if (json === "") delete localStorage[key];
        
        else localStorage[key] = JSON.stringify(json);
    }
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
	type = (typeof type == "undefined") ? "sync" : type;
	
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
}

/**
 * Clone local storage
 *
 * @param   {string=null}   keys        Passed directly as first parameter to .get
 * @param	{function}	callback	Revieves cloned storage and returns modified storage
 * @returns	{object}				Modified contents of storage from callback
 */
CrAPI.prototype.clone = function(keys, callback) {
    //if (this.debug) console.trace("crapi.clone stack trace");
    
    if (typeof keys == "undefined") {
        keys = null;
        callback = this.DEFAULT_CALLBACK;
    }
    
	if (typeof callback == "undefined") {
        callback = keys;
        keys = null;
    }
	
	//Grab storage
	this.storage().get(keys, function(d) {
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

/**
 * Storage for CrAPI tests
 */
CrAPI.prototype.tests = {};

/**
 * Run all tests
 */
CrAPI.prototype.runTests = function() {
    console.group("== CrAPI Tests ==");
    try {
        var _this = this;
        var queue = [];
        
        /**
         * Assume an array of n functions, where ()=direct call, []=stacked call, i=index of queue
         *   For the first function, it should be (i + 0).call(_this, [i + 1])
         *   For the next function, it should be (i + 1).call(_this, [i + 2])
         *   For the second to last function, it should be (i + n - 1).call(_this, i + n)
         *
         *   queue contains iterated functions. Stack needs to be generated in reverse queue order.
         */
        
        $.each(_this.tests, function() {
            queue.push(this);
        });
        
        console.debug("queue: %o", queue);
        
        var nextFn = function(next){console.debug("== End of Tests =="); console.groupEnd()};
        for (i = queue.length - 1; i >= 0; i--) {
            nextFn = _wrap(queue[i], _this, [nextFn]);
        }
        
        nextFn();
    } catch (e) {
        console.error(e);
        console.groupEnd();
    }
    
    function _wrap(fn, context, params) {
        return function() {
            fn.apply(context, params);
        };
    }
}

/**
 * Test Chrome storage functions
 */
CrAPI.prototype.tests.storageTest1 = function(next) {
    console.groupCollapsed("Test Chrome storage functions");
    try {
        var _this = this;
        
        console.log("storageTest this: %o", this);
        
        var testKeys = ["test1", "test2"];
        var testData1 = {
            test1: "root set",
            test2: {
                initial: "data"
            }
        };
        var testData2 = {
            test2: {
                secondary: "data"
            }
        };
        
        console.debug("Clearing test storage...");
        _this.storage().remove(testKeys, function() {
            _this.storage().get(testKeys, function(d) {
                console.debug("Blank storage: %s", JSON.stringify(d));
                
                console.debug("Setting testData1: %o", testData1);
                _this.storage().set(testData1, function() {
                    _this.storage().get(testKeys, function(d) {
                        console.debug("Result: %s", JSON.stringify(d));
                        
                        console.debug("Setting testData2: %o", testData2);
                        _this.storage().set($.extend(true, {}, d, testData2), function() {
                            _this.storage().get(testKeys, function(d) {
                                console.debug("Result: %s", JSON.stringify(d));
                                
                                console.groupEnd();
                                
                                next();
                            });
                        });
                    });
                });
            });
        });
    } catch (e) {
        console.error(e);
        console.groupEnd();
    }
}

/**
 * Test CrAPI storage functions
 */
CrAPI.prototype.tests.storageTest2 = function(next) {
    console.groupCollapsed("Test CrAPI storage functions");
    try {
        var _this = this;
        
        var testKeys = ["test1", "test2"];
        var testData1 = {
            test1: "root set",
            test2: {
                initial: "data"
            }
        };
        var testData2 = {
            test2: {
                secondary: "data"
            }
        };
        
        console.debug("Clearing test storage...");
        _this.storage().remove(testKeys, function() {
            _this.clone(testKeys, function(d) {
                console.debug("Blank storage: %s", JSON.stringify(d));
                
                console.debug("Setting testData1: %o", testData1);
                _this.updateAll(testData1, function() {
                    _this.clone(testKeys, function(d) {
                        console.debug("Result: %s", JSON.stringify(d));
                        
                        console.debug("Setting testData2: %o", testData2);
                        _this.updateAll($.extend(true, {}, d, testData2), function() {
                            _this.clone(testKeys, function(d) {
                                console.debug("Result: %s", JSON.stringify(d));
                                
                                console.groupEnd();
                                
                                next();
                            });
                        });
                    });
                });
            });
        });
    } catch (e) {
        console.error(e);
        console.groupEnd();
    }
}