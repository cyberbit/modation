//Switch for alarm state
var alarmRunning = false;

//Storage for runtime event functions
var msgFunctions = {};

// Storage cache keys
var cacheKeys = ["notifData", "blobs", "options"];

$(function() {
	//Initialize all the things
	initEvents();
	initAlarms();
	initNotifs();
	initWatchlist();
	//initCookies();
	
	//Initialize runtime event handler
	function initEvents() {
		// Runtime installed handler
		chrome.runtime.onInstalled.addListener(function(details) {
            clearCache();
			initUpdate(details);
		});
		
		// Runtime startup handler
		chrome.runtime.onStartup.addListener(function() {
            clearCache();
			cacheOptions();
			updateBadge();
		});
		
		// Runtime message handler
		chrome.runtime.onMessage.addListener(function(msg, sender, response) {
			// Pass message data to event handler
			if (msgFunctions[msg.action]) msgFunctions[msg.action](msg, sender, response);
		});
		
		// Remote confirm handler
		msgFunctions.confirm = function(msg, sender, response) {
			response(confirm(msg.msg));
		};
		
		// "Remember me" handler
		(msgFunctions.rememberMe = function() {
			// Cookie change handler
			if (chrome.cookies) chrome.cookies.onChanged.addListener(function(info) {
				//console.log("cookie info: %o", info);
				
				if (info.cause != "explicit") initCookies();
			});
		})();
	}
	
	//Initialize update
	function initUpdate(details) {
		//console.log("initUpdate: %o", details);
		
		// Clone storage
		crapi.clone($.extend(true, {}, global.storageModel, {options: global.optionDefaults}), function(d) {
			var version = crapi.manifest().version;
			
			// No storage version
			if (!d.version) {
				// Clear all storage
				crapi.storage("local").clear();
				crapi.storage("sync").clear();
				
				console.info("No storage version, clearing storage");
			}
			
			// Storage and app versions don't match
			if (d.version !== version || details.reason == "update") {
				// Update storage model
				crapi.updateAll($.extend(true, {}, global.storageModel, d, {version: version}), function() {
					console.info("Updated storage model");
					
					_continue();
				});
			}
			
			// Storage and app versions match
			else _continue();
			
			function _continue() {
				//Set up installation metadata
				var now = moment().format();
				localStorage.installed = now;
				localStorage.version = version;
				
				// Cache options
				console.log("cache options");
				localJSON("options", d.options);
				
				//Show new install notification
				var notif = {
					type: "basic",
					iconUrl: "img/newiconflat128.png",
					title: "Modation has updated!",
					message: "Click here to see what's new.",
					contextMessage: (details.reason == "update" ? "v" + details.previousVersion + " => " : "") + "v" + version
				};
				
				//Storage for notif ID
				var id = "modation_update";
				
				//Update notification, or create if needed
				chrome.notifications.create(id, notif, function (updated) {
					//if (!updated) chrome.notifications.create(id, notif);
					
					//Update notification data
					notifData(id, {
						notif: notif,
						link: "http://djmarcolesco.me/modation/",
						actions: []
					});
				});
			}
		});
	}
	
	// Initialize alarms
	function initAlarms() {
		// Feed alarm
		chrome.alarms.create("feed", {
			delayInMinutes: (modapi.manifest.debug ? 0 : 1),
			periodInMinutes: 1
		});
		
		// Watchlist alarm
		chrome.alarms.create("watchlist", {
			delayInMinutes: (modapi.manifest.debug ? 0 : 1),
			periodInMinutes: 10
		});
		
		// Alarm handler
		chrome.alarms.onAlarm.addListener(alarmHandler);
		
		// Manually run all alarms: $("body").trigger("alarm")
		handle($("body"), "alarm.initAlarms", function() {
			alarmHandler({name: "feed"});
			alarmHandler({name: "watchlist"});
		});
	}
	
	//Initialize notifications
	function initNotifs() {
		//Click handler
		chrome.notifications.onClicked.addListener(function(notifId) {
			var data = notifData(notifId);
			
			//Notification data exists
			if (data) {
				//console.log("clicked notification: %o, traveling to %o", data.notif, data.link);
				
				//Follow link and clear notification
				_follow(data.link, notifId);
			}
		});
		
		//Button handler
		chrome.notifications.onButtonClicked.addListener(function(notifId, i) {
			var data = notifData(notifId);
			
			//Notification data exists
			if (data) {
				var btn = data.actions[i];
				
				//console.log("clicked button: %o", btn);
				
				//Confirmation required
				if (btn.data.confirm) {
					if (confirm(btn.data.confirm)) {
						//console.log("action confirmed");
						
						//Follow link and clear notification
						_follow(data.link, notifId, i);
					}
				}
				
				//Confirmation not required
				else {
					//Follow link and clear notification
					_follow(data.link, notifId, i);
				}
			}
		});
		
		//Close handler
		chrome.notifications.onClosed.addListener(function(notifId, user) {
			if (user) {
				//console.log("closed by user: %o", notifData(notifId));
				
				//Clear notification
				_clear(notifId);
			}
		});
		
		//Show all notifications handler
		msgFunctions.showAllNotifications = function() {
			showAllNotifs();
		};
		
		function _follow(link, id, i) {
			//Do action, if needed
			if (typeof i != "undefined") {
				var btn = notifData(id).actions[i];
				
				//No method, follow action link
				if (!btn.data.method) link = btn.link;
				
				//Method exists, run action seperately
				else {
					$.post(btn.link, {_method: btn.data.method, authenticity_token: modapi.token()});
				}
			}
			
			//Follow link
			chrome.windows.getCurrent(function(window) {
				//Create tab
				chrome.tabs.create({
					windowId: window.id,
					url: link
				});
				
				//Focus window
				chrome.windows.update(window.id, {focused: true});
			});
			
			//Clear notification
			_clear(id);
		}
		
		function _clear(id) {
			chrome.notifications.clear(id);
			
			//Clear remote notification, if needed
			if (notifData(id).clear) $.post(notifData(id).clear, {_method: "delete", authenticity_token: modapi.token()});
			
			//Clear notif data
			notifData(id, "");
			
			//Update badge
			updateBadge();
		}
	}
	
	function initCookies() {
        var options = localJSON("options");
		
		//console.log("initCookies: %o", JSON.stringify(options));
        
        /*// Option not cached
        if (typeof options.rememberMe == "undefined") {
            crapi.clone({options: global.optionDefaults}, function(d) {
                // Cache option
                options.rememberMe = d.options.rememberMe;
                localJSON("options", options);
                
                _continue(d.options);
            });
        }
        
        // Option cached
        else {*/
            _continue(options);
        /*}*/
        
        function _continue(options) {
            // Remember me option enabled
            if (options.rememberMe) {
                chrome.cookies.get({url: global.path.cookie, name: global.cookie}, function(cookie) {
					cookie = cookie || {};
                    
                    // Session cookie
                    if (cookie.session) {
                        chrome.cookies.set({
                            url: global.path.cookie,
                            name: global.cookie,
                            value: cookie.value,
                            domain: cookie.domain,
                            path: cookie.path,
                            secure: cookie.secure,
                            httpOnly: cookie.httpOnly,
                            expirationDate: moment().add(1, "w").unix()
                        }, function(cookie) {
                            //console.log("cookie: %o, error: %o", cookie, chrome.runtime.lastError);
                        });
                    }
                });
            }
        }
    }
	
	function initWatchlist() {
		/**
		 * Usage:
		 * chrome.runtime.sendMessage({action: "parseWatchlistItem", link: location.href, html: document.documentElement.innerHTML}, function(result) {
		 *     console.log("%o", result);
		 * })
		 */
		msgFunctions.watchlistItemType = function(msg, sender, response) {
			response(watchlistItemType(msg.link));
		};
		
		msgFunctions.parseWatchlistItem = function(msg, sender, response) {
			response(parseWatchlistItem(msg.link, msg.html, msg.type));
		};
	}
	
	// Determine watchlist type
	function watchlistItemType(link) {
		return link.matchAny({
			group: global.regex.groupLink,
			track: global.regex.trackLink
		});
	}
	
	// Parse and return metadata from watchable page
	function parseWatchlistItem(link, html, type) {
		type = type || watchlistItemType(link);
		
		// Enforce watchlist model
		var updates = global.watchlistModel[type];
		updates.link = link;
		
		var $html = $(html);
		
		// Track handler
		if (type == "track") {
			var likes = parseInt($html.find(".stats .likes").text());
			var downloads = parseInt($html.find(".stats .downloads").text());
			var comments = parseInt($html.find(".stats .comments").text());
			
			// Store updates
			$.extend(updates, {
				likes: likes,
				downloads: downloads,
				comments: comments
			});
		}
		
		// Group handler
		else if (type == "group") {
			/**
			 * Here, I'm using the hash of the comment body to determine if the top
			 * comment is new. It's not ideal, but there is such variance in other
			 * methods that I've decided to go this way. There are a few drawbacks:
			 *  - If someone posts a new comment with exactly the same text as the
			 *    previous comment, it will not be detected
			 *  - If a comment is deleted or flagged and is still at the top of the
			 *    thread, it will be detected as a new comment
			 *  - If a comment body cannot be determined, a blank string is used,
			 *    which could confuse the parser and cause a detection miss
			 *
			 * There are advantages, though:
			 *  + No complex, buggy ID determination
			 *  + Not affected by login status (except private groups and tracks)
			 *  + Ignores user changes (profile image, username, link, etc.)
			 * 
			 * ================
			 * 
			 * However, using a count for determining new comments has a bunch of
			 * advantages as well:
			 *  + Ability to detect multiple new comments
			 *  + Simpler parsing
			 *
			 * Some disadvantages:
			 *  - Negative changes in comments would have to be specially handled
			 *  - Groups do not have an obvious comment counter, so it would need to
			 *    calculated via comment pages (potentially slow and buggy)
			 */
			
			var lastCommentContent = $html.find(".comments .comment:first .content > p").html() || "";
			var lastComment = lastCommentContent.hashCode();
			var members = parseInt($html.find(".stats a[href*=members] b").text());
			var followers = parseInt($html.find(".stats a[href*=followers] b").text());
			var tracks = parseInt($html.find(".stats a[href*=tracks] b").text());
			
			// Store updates
			$.extend(updates, {
				lastComment: lastComment,
				members: members,
				followers: followers,
				tracks: tracks
			});
		}
		
		return {
			updates: updates,
			type: type
		};
	}
	
	//New alarm handler
	function alarmHandler(alarm) {
		var views = chrome.extension.getViews({type: "popup"});
		var options = localJSON("options") || {};
		
        //Login
        modapi.login(function(me) {
            //Feed alarm handler
            if (alarm.name == "feed") {
                //Handle unknown errors
                try {
                    //User is not logged in
                    if (!me.success) {
                        //Log failure
                        console.warn("Could not login to Soundation");
                        
                        //Update badge
                        crapi.badge({
                            title: "Please login to view notifications",
                            color: "gray",
                            text: "?"
                        });
                        
                        var actions = [
                            {
                                title: "Login with Facebook",
                                link: global.path.home + "/users/auth/facebook",
                                data: {}
                            },
                            {
                                title: "Login with Google",
                                link: global.path.home + "/users/auth/google_oauth2",
                                data: {}
                            }
                        ];
                        
                        var notif = {
                            type: "basic",
                            iconUrl: "img/newiconflat128.png",
                            title: "Login to Soundation",
                            message: "Click here to login, or use one of the buttons below.",
                            buttons: actions.map(function(v) { return {title: v.title}; })
                        };
                        
                        //Storage for notif ID
                        var id = "modation_login";
                        
                        //Notification not shown yet
                        if (!notifData(id)) {
                            //Update notification, or create if needed
                            chrome.notifications.create(id, notif, function (updated) {
                                //if (!updated) chrome.notifications.create(id, notif);
                                
                                //Update notification data
                                notifData(id, {
                                    notif: notif,
                                    link: global.path.login,
                                    actions: actions
                                });
                            });
                        }
                        
                        //Set alarm state
                        alarmRunning = false;
                    }
                    
                    //Alarm is running
                    else if (alarmRunning) console.info("Alarm running, notification handler cancelled");
                    
                    //Popup is open
                    else if (views.length) console.info("Popup open, notification handler cancelled");
                    
                    //Popup is not open
                    else {
                        // Clear login notification
                        notifData("modation_login", "");
                        
                        //Set alarm state
                        alarmRunning = true;
                        
                        console.log("Modation :: Check notifications");
                        
                        //Grab feed
                        $.get(global.path.feed, function(html) {
                            var $html = $(html.deres()/*.replace(/<time>.*<\/time>/ig, "")*/);
                            var $aside = $html.find("aside");
                            var $notifications = $aside.find(".notifications .notification");
                            
                            //Storage for message links
                            var messageLinks = [];
                            
                            //Storage for server notification IDs
                            var serverNotifs = [];
                            
                            //Add hostname to links
                            $notifications.find("a").attr("href", function(i, v) {
								return global.path.home + v;
							});
                            
                            // Storage for number of notifications processed
                            var processed = 0;
                            
                            //Iterate notifications
                            $notifications.each(function(i, e) {
                                //Grab elements
                                var $notif = $(e);
                                var $actions = $notif.find(".actions").children();
                                var $msg = $notif.clone();
                                $msg.find("time, .clear, .actions").remove();
                                var $links = $msg.find("a");
                                $msg.find(".author").remove();
                                
                                //Parse elements
                                var id = "modation" + $notif.find(".clear").attr("href").match(/(?:\/)(\d+)/)[1];
                                var time = $notif.find("time").text();
                                var $author = $notif.find(".author");
                                var from = $author.text();
                                var fromLink = $author.attr("href");
                                var msg = $msg.text().trim();
                                var link = $links.last().attr("href");
                                var clear = $notif.find(".clear").attr("href");
                                var actions = [];
                                $actions.each(function(i, e) {
                                    actions.push({
                                        title: $(this).text(),
                                        link: $(this).attr("href"),
                                        data: $(this).data()
                                    });
                                });
                                
                                // Match message links
                                if (link.match(global.regex.messageLink)) {
                                    // Prevent duplicate message notification (issue #63)
                                    if ($.inArray(link, messageLinks) != -1) return;
                                    
                                    // Remember link
                                    messageLinks.push(link);
                                }
                                
                                // Add notification ID to server list
                                serverNotifs.push(id);
								
								// Determine if notification is group-related
								var isGroup = link.match(global.regex.groupLink);
                                
                                var blobs = localJSON("blobs") || {};
                                
                                // Blob is cached
                                if (blobs[(isGroup ? link : fromLink)]) {
                                    _continue(blobs[(isGroup ? link : fromLink)]);
                                }
                                
                                // Blob is not cached
                                else {
                                    // Grab author profile page
                                    $.get((isGroup ? link : fromLink), function(html) {
                                        var $html = $(html);
                                        var img = $html.find((isGroup ? ".top .inner .container" : "aside") + " img").attr("src");
                                        
                                        // Get blob URL
                                        getDataUri("img/newiconflat128.png", img, function(blob) {
                                            var blobs = localJSON("blobs") || {};
                                            
                                            // Cache blob
                                            blobs[(isGroup ? link : fromLink)] = blob;
                                            localJSON("blobs", blobs);
                                            
                                            //_continue("img/newiconflat128.png");
                                            _continue(blob);
                                        });
                                    });
                                }
                                
                                function _continue(blob) {
                                    //Set up notification
                                    var notif = {
                                        type: "basic",
                                        iconUrl: blob,
                                        title: from,
                                        message: msg,
                                        contextMessage: time,
                                        buttons: actions.map(function(v) { return {title: v.title}; })
                                    };
                                    
                                    //Notification not shown yet
                                    if (!notifData(id)) {
                                        chrome.notifications.create(id, notif, function (updated) {
                                            //if (!updated) chrome.notifications.create(id, notif);
                                            
                                            _updateData();
                                        });
                                    }
                                    
                                    //Notification shown
                                    else {
                                        _updateData();
                                    }
                                    
                                    //Store notification
                                    function _updateData() {
                                        //console.log("update data: %o", id);
                                        
                                        //Update notification data
                                        notifData(id, {
                                            notif: notif,
                                            link: link,
                                            clear: clear,
                                            actions: actions
                                        });
                                        
                                        ++processed;
                                        
                                        // Processed final notification, update badge
                                        if (processed == $notifications.length) updateBadge();
                                    }
                                }
                            });
                            
                            //Get all local feed notifications (regex filters out watchlist items)
                            var localNotifs = Object.keys(notifData()).filter(function(v) {
								return v.match(/modation(\d)+/);
							});
                            
                            //console.log("local: %o, server: %o, diff: %o", localNotifs, serverNotifs, localNotifs.diff(serverNotifs));
                            
                            //Dismiss notifications no longer on server (issue #64)
                            $.each(localNotifs.diff(serverNotifs), function(i, v) {
                                chrome.notifications.clear(v);
                                
                                //Clear notif data
                                notifData(v, "");
                            });
                            
                            // No notifications were processed
                            if (processed === 0) updateBadge();
                            
                            //Set alarm state
                            alarmRunning = false;
                        });
                    }
                }
                
                //Report error and stop running
                catch (e) {
                    console.error("Unknown error occurred: %o", e);
                    
                    //Set alarm state
                    alarmRunning = false;
                }
            }
			
			// Watchlist alarm handler
			else if (alarm.name == "watchlist" && options.watchlist) {
				// Grab current watchlist
				crapi.clone(["watchlist"], function(d) {
					/*var testWatchlist = [
						// Track w/ comments
						{
							link: "https://soundation.com/user/cyberbit/track/an-hour",
							likes: 0,
							downloads: 0,
							comments: 0
						},
						
						// Group w/ comments
						{
							link: "https://soundation.com/group/team-soundation",
							lastComment: "",
							members: 0,
							followers: 0,
							tracks: 0
						},
						
						// Track w/ no comments
						{
							link: "https://soundation.com/user/cyberbit/track/sdf-3",
							likes: 0,
							downloads: 0,
							comments: 0
						},
						
						// Track w/ bad link
						{
							link: "https://soundation.com/user/cyberbit/track/this-track-is-invalid",
							likes: 0,
							downloads: 0,
							comments: 0
						},
						
						// Group w/ no comments
						{
							link: "https://soundation.com/group/no-comment",
							lastComment: "",
							members: 0,
							followers: 0,
							tracks: 0
						},
						
						// Group w/ comments disabled
						{
							link: "https://soundation.com/group/pts",
							lastComment: "",
							members: 0,
							followers: 0,
							tracks: 0
						},
						
						// Private group w/ comments
						{
							link: "https://soundation.com/group/privately-owned",
							lastComment: "",
							members: 0,
							followers: 0,
							tracks: 0
						}
					];*/
					
					// User is not logged in
					if (!me.success) {
						console.info("Not logged in, skipping watchlist");
					}
					
					// User is logged in
					else {
						// Storage for watchlist and metadata
						var watchlist = (typeof testWatchlist == "undefined" ?  d.watchlist : testWatchlist);
						var processed = [];
						var meta = [];
						
						// Storage for watchlist proccessing counter
						var numProcessed = 0;
						
						// Iterate watchlist
						$.each(watchlist, function(i, v) {
							// Set next processed item as current version
							processed[i] = v;
							meta[i] = {};
							
							// Store type in metadata
							var type = watchlistItemType(v.link);
							meta[i].type = type;
							
							// Grab page
							$.get(v.link, function(html) {
								var $html = $(html);
								
								// Parse item
								var info = parseWatchlistItem(v.link, $html, type);
								
								// Storage for item updates to merge later
								var updates = info.updates;
								
								// Track handler
								if (type == "track") {
									// Store meta information
									meta[i].title = $html.find(".main > h2").text();
									
									if (global.debug) console.log("track %o: current %o, new %o", v.link, {
										likes: v.likes,
										downloads: v.downloads,
										comments: v.comments
									}, updates);
								}
								
								// Group handler
								else if (type == "group") {
									/**
									 * Here, I'm using the hash of the comment body to determine if the top
									 * comment is new. It's not ideal, but there is such variance in other
									 * methods that I've decided to go this way. There are a few drawbacks:
									 *  - If someone posts a new comment with exactly the same text as the
									 *    previous comment, it will not be detected
									 *  - If a comment is deleted or flagged and is still at the top of the
									 *    thread, it will be detected as a new comment
									 *  - If a comment body cannot be determined, a blank string is used,
									 *    which could confuse the parser and cause a detection miss
									 *
									 * There are advantages, though:
									 *  + No complex, buggy ID determination
									 *  + Not affected by login status (except private groups and tracks)
									 *  + Ignores user changes (profile image, username, link, etc.)
									 * 
									 * ================
									 * 
									 * However, using a count for determining new comments has a bunch of
									 * advantages as well:
									 *  + Ability to detect multiple new comments
									 *  + Simpler parsing
									 *
									 * Some disadvantages:
									 *  - Negative changes in comments would have to be specially handled
									 *  - Groups do not have an obvious comment counter, so it would need to
									 *    calculated via comment pages (potentially slow and buggy)
									 */
									
									var $lastComment = $html.find(".comments .comment:first");
									var $lastCommentAuthor = $lastComment.find(".content > h4 a");
									var $lastCommentBody = $lastComment.find(".content > p");
									
									// Store meta information
									meta[i].title = $html.find(".top .inner .container h2").text();
									meta[i].commentBody = $lastCommentBody.text();
									meta[i].commentAuthor = $lastCommentAuthor.text();
									meta[i].commentAuthorLink = $lastCommentAuthor.attr("href");
									
									if (global.debug) console.log("group %o: current %o, new %o", v.link, {
										lastComment: v.lastComment,
										members: v.members,
										followers: v.followers,
										tracks: v.tracks
									}, updates);
								}
								
								// Merge current and new watchlist results
								processed[i] = $.extend({}, processed[i], updates);
							}).always(function() {
								++numProcessed;
								
								// Detect end of watchlist
								if (numProcessed == watchlist.length) {
									var changes = [];
									
									/**
									 * These can be optimised by combining the
									 * two $.each routines, but that can be an
									 * easy pick for another time.
									 */
									
									// Iterate processed items and determine changes
									$.each(processed, function(i, v) {
										var current = watchlist[i];
										var metum = meta[i];
										changes[i] = [];
										
										if (metum.type == "track") {
                                            var likes = v.likes - current.likes;
											var downloads = v.downloads - current.downloads;
											var comments = v.comments - current.comments;
											
											if (likes) changes[i].push(likes + " like" + (Math.abs(likes) == 1 ? "" : "s"));
											if (downloads) changes[i].push(downloads + " download" + (Math.abs(downloads) == 1 ? "" : "s"));
											if (comments) changes[i].push(comments + " comment" + (Math.abs(comments) == 1 ? "" : "s"));
											
											if (global.debug) console.log("changes for track %o: %o", v.link, changes[i]);
                                        }
										
										else if (metum.type == "group") {
                                            var followers = v.followers - current.followers;
											var lastComment = (v.lastComment !== current.lastComment) ? metum.commentBody : false;
											var members = v.members - current.members;
											var tracks = v.tracks - current.tracks;
											
											if (lastComment) changes[i].push("New comment from @" + metum.commentAuthor);
											if (followers) changes[i].push(followers + " follower" + (Math.abs(followers) == 1 ? "" : "s"));
											if (members) changes[i].push(members + " member" + (Math.abs(members) == 1 ? "" : "s"));
											if (tracks) changes[i].push(tracks + " track" + (Math.abs(tracks) == 1 ? "" : "s"));
											
											if (global.debug) console.log("changes for group %o: %o", v.link, changes[i]);
                                        }
									});
									
									// Generate notifications
									numProcessed = 0;
									$.each(changes, function(i, v) {
										var current = watchlist[i];
										var id = "modationwatch" + current.link.hashCode();
										var metum = meta[i];
										
										//Set up notification
										var notif = {
											type: "basic",
											iconUrl: "img/newiconflat128.png",
											title: metum.title,
											message: v.join(", ")
										};
										
										// Changes exist
										if (v.length) {
											// Notification not shown yet
											if (!notifData(id)) {
												chrome.notifications.create(id, notif, function() {
													_updateData();
												});
											}
											
											//Notification shown
											else {
												_updateData();
											}
										}
										
										// No changes
										else ++numProcessed;
										
										// Store notification
										function _updateData() {
											++numProcessed;
											
											//Update notification data
											notifData(id, {
												notif: notif,
												link: current.link
											});
											
											// Generated final notification, update storage and badge
											if (numProcessed == changes.length) {
												// Update watchlist storage
												crapi.updateAll({watchlist: processed});
												
												// Update badge
												updateBadge();
											}
										}
									});
                                }
							});
						});
					}
				});
            }
        });
	}
	
	//Get/set notification data
	function notifData(id, value) {
		var notifsJSON = localStorage.notifData;
		var notifs = (notifsJSON) ? $.parseJSON(notifsJSON) : {};
		
		if (typeof id == "undefined") return notifs;
		if (typeof value == "undefined") value = false;
		var notif = notifs[id];
		
		// Delete notification data
		if (value === "") delete notifs[id];
		
		// Set notification data
		else if (value) notifs[id] = value;
		
		// Update storage
		localStorage.notifData = JSON.stringify(notifs);
		
		return notif;
	}
	
	//Show all notifications
	function showAllNotifs() {
		var notifs = notifData();
		
		$.each(notifs, function(i, v) {
			chrome.notifications.create(i, v.notif, function(){});
		});
		
		// Update badge if no login notification
		if (!notifs.modation_login) updateBadge();
	}
	
	//Update badge
	function updateBadge() {
		//console.log("updateBadge: %o", notifData());
		
		var notifs = Object.keys(notifData()).length;
		var title = (notifs == 0 ? "No new notifications :(" : notifs + " new notification" + (notifs > 1 ? "s" : ""));
		
		//Update badge
		crapi.badge({
			title: title,
			color: "red",
			text: notifs ? String(notifs) : ""
		});
	}
    
    // Clear localStorage cache
    function clearCache() {
        $.each(cacheKeys, function(i, v) {
            delete localStorage[v];
        });
        
        console.info("Cache cleared");
    }
	
	// Cache options
	function cacheOptions() {
		// Clone storage with defaults
		crapi.clone({options: global.optionDefaults}, function(d) {
			// Cache options
			console.log("cache options");
			localJSON("options", d.options);
		});
	}
});

/* Checks for new installs */
/*function install_notice() {
	var manifest = chrome.runtime.getManifest();
	
    if (localStorage['version'] == manifest.version) return;

    var now = new Date().getTime();
    localStorage['install_time'] = now;
    localStorage['version'] = manifest.version;
    chrome.tabs.create({url: "options.html#about"});
}*/

//install_notice();
//watchlist();
//var hashes = [];

//Handler for content script messager
/*chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
	/*console.log("request: %O", request);
	console.log("sender: %O", sender);*
	
	//Requested to pause everything
	if (request.action == "modation-pause-everything") {
		//Grab all tabs
		chrome.tabs.query({url: "http://*.soundation.com/*"}, function(tabs) {
			//Iterate tabs
			$.each(tabs, function(i, tab) {
				//Send pause message to tab
				chrome.tabs.sendMessage(tab.id, {action: "modation-pause", guid: request.guid}, function(response) {
					//console.log(response);
				});
			});
		});
	}
});*/

//Alarm handler
/*function alarmHandler(alarm) {
	var views = chrome.extension.getViews({type: "popup"});
	
	//Grab storage
	crapi.clone(function(d) {
		//Login
		modapi.login(function(me) {
			//Feed alarm handler
			if (alarm.name == "feed") {
				//Alarm is running
				if (alarmRunning) {
					console.info("Alarm running, notification handler cancelled");
				}
				
				//Alarm is not running
				else {
					//Popup is open
					if (views.length) {
						//Log status
						console.info("Popup open, notification handler cancelled");
					}
					
					//Popup is not open
					else {
						//Set alarm state
						alarmRunning = true;
						
						//Begin trace group
						console.log("Modation :: Check notifications");
						
						//User is not logged in
						if (!me.success) {
							//Log failure
							console.warn("Could not login to Soundation");
							
							crapi.badge({
								title: "Please login to view notifications",
								color: "gray",
								text: "?"
							});
							
							//Set alarm state
							alarmRunning = false;
						}
						
						//User is logged in
						else {
							$.get(global.path.feed, function(html) {
								//Parse HTML to remove images and timing values
								html = html.replace(/<img\b[^>]*>/ig, '').replace(/<span class=\"time\">.*<\/span>/ig, '');
								
								var $html = $(html);
								var $aside = $html.find('aside');
								var asideHash = "";
								var feedAlerts = 0;
								
								//Parse feed
								if ($aside.length) {
									//Hash notifications for Chrome popup
									var asideHTML = $aside[0].outerHTML;
									asideHash = String(asideHTML.hashCode());
									
									//Grab number of feed notifications
									var feedLink = $html.find("a[href='/feed']")[0].innerText;
									feedAlerts = parseInt(feedLink.match(/(\d+)/)) || 0;
								}
								
								//Unable to parse feed
								else {
									//Log failure
									console.warn("Unable to parse feed notifications, continuing to watchlist");
								}
								
								//Generate initial alerts
								var initialAlerts = _generateAlerts(d[me.email]);
								
								//Trace initial alerts
								console.log("Initial alerts:", initialAlerts);
								
								//Grab current user's profile
								/*$.get(global.path.profile, function(html) {
									//Storage for profile link
									var profileLink = $(html).find(".public-url").text().replace("http://soundation.com", "")
									
									//Tweak user object to add profile link
									me.profile = profileLink;
									
									//Check watchlist
									//Unavailable in 2.0
									check_watchlist(me, true, function(data) {
										//Re-generate alerts
										var regenAlerts = _generateAlerts(data);
										
										//Trace re-generated alerts
										console.log("Re-generated alerts:", regenAlerts);
										
										//Set alarm state
										alarmRunning = false;
									});
								});*
								
								//Set alarm state
								alarmRunning = false;
								
								function _generateAlerts(data) {
									var watchlistAlerts = data['watchlist-queue'].length;
									var alerts = feedAlerts;// + watchlistAlerts;
									var alertString = "";
									
									//Soundation notifs handler
									if (feedAlerts) {
										var authors = [];
										
										//Grab authors
										$aside.find('a.author').each(function() {
											author = $(this).text();
											if (authors.indexOf(author) == -1) authors.push(author);
										});
										
										//Initialize author string
										var authorCount = authors.length
										var others = authorCount - 3;
										alertString = feedAlerts + " new from ";
										
										//Iterate authors
										var i = 0;
										for (; i < 2 && i < (authorCount - 1); ++i) {
											alertString += authors[i] + ", ";
										}
										
										//Add final author
										alertString += authors[i];
										
										//Add others, if needed
										if (others > 0) alertString += ", plus " + others + " other" + (others > 1 ? "s" : "");
										
										if ((hashes.indexOf(asideHash) == -1) && data['desktop_notifs']) chrome.notifications.create(asideHash, {
											type: "basic",
											iconUrl: "img/iconapp.png",
											title: "Soundation Notifications",
											message: feedAlerts + " new notification" + (parseInt(feedAlerts) > 1 ? "s" : ""),
											contextMessage: alertString.replace(/\d* new /, "")
										}, function(notificationId) {hashes.push(asideHash)});
									}
									
									//No Soundation notifs
									else { /* Do nothing * }
									
									//Watchlist notifs handler
									/*if (watchlistAlerts) {
										alertString += (alertString ? "\n" : "") + watchlistAlerts + " new from watchlist";
									}*
									
									//Global notifs handler
									if (alerts) {
										//Updage badge
										crapi.badge({
											title: alertString,
											color: "red",
											text: String(alerts)
										});
									}
									
									//No global notifs
									else {
										alertString = "No new notifications :(";
										
										//Update badge
										crapi.badge({
											title: alertString,
											text: ""
										});
									}
									
									return alertString;
								}
							});
						}
					}
				}
			}
		});
	});
}*/

//Check watchlist
/*function check_watchlist(me, update, callback) {
	if (typeof update == "undefined") update = true;
	if (typeof callback == "undefined") callback = function(){};
	
	var email = me.email;
	
	//Begin trace group
	console.group("Modation :: Check watchlist");
	
	var wParsed = [];
	var wFailed = [];
	
	crapi.clone(function(d) {
		//Use empty array if no watchlist (issue #42)
		var watchlist = d[email]["watchlist"] || [];
		var wLen = watchlist.length;
		var wCt = 0;
		
		//Skip empty watchlist iteration (issue #42)
		if (wLen) {
			//Trace watchlist queueing start
			console.group("Queueing watchlist...");
			
			//Count up invalid links and adjust wLen accordingly
			$.each(watchlist, function(i, v) {
				var link = v['link'];
				
				$.get(global.path.home + "/" + link, function(html) {
					v['html'] = html;
					//console.log("link " + link + " success, pushing to wParsed");
					wParsed[i] = v;
				}).fail(function() {
					//console.log("link " + link + " failed, pushing to wFailed");
					v['fail'] = true;
					wParsed[i] = v;
					wFailed[i] = v;
				}).done(function() {
					delete v['fail'];
				}).always(function() {
					_complete();
				});
				
				function _complete() {
					//Trace queued item and increment counter
					console.log("Queued item %d of %d: %s", ++wCt, wLen, link);
					
					//If last index, run iteration
					if (wCt == wLen) {
						//End trace group
						console.groupEnd();
						
						//Iterate items
						_iterate();
					}
				}
			});
		}
		
		//Watchlist is empty
		else {
			console.info("Watchlist is empty, bypassing watchlist check");
			
			//End trace group
			console.groupEnd();
			
			//Run callback
			callback(d[email]);
		}
		
		//Iterate watchlist items
		function _iterate() {
			//Trace watchlist iteration start
			console.groupCollapsed("Iterating watchlist...");
			
			var wChanged = [];
			
			//Loop through queued items
			$.each(wParsed, function(i, v) {
				var wItem = v;
				var link = wItem['link'];
				var html = wItem['html'];
				var $html = $(html);
				var wNewItem = {};
				var wChangedItem = {};
				wChangedItem.state = {};
				
				//Clear temporary source storage
				delete wItem['html'];
				
				//Type switches
				var isTrack = (link.match(/user\/.*\/track\//) ? true : false);
				//NOTE: Asterisk in the /./ thing!!!!!
				var isGroup = (link.match(/group\/./) ? true : false);
				
				//Grab first comment's action buttons to determine ID
				var $cActions = $html.find(".comment .actions").children(".flag, .delete").first();
				
				//Is track
				if (isTrack) {
					wNewItem['title'] = $html.find("#main .title").text();
					wNewItem['likes'] = $html.find(".stats .likes").text();
					wNewItem['downloads'] = $html.find(".stats .downloads").text();
				}
				
				//Is group
				else if (isGroup) {
					wNewItem['title'] = $html.find("#group-info h2").html();
					var groupInfo = $html.find("#group-info .info").text();
					
					//Catch network errors (issue #31)
					if (groupInfo) {
						wNewItem['members'] = groupInfo.match(/(\d*) member/)[1];
						wNewItem['following'] = groupInfo.match(/(\d*) follower/)[1];
					}
					
					else {
						//Log failure
						console.warn("Network change detected, skipping group parse");
					}
				}
				
				//Comments exist
				if ($cActions.length) {
					var attr;
					switch ($cActions.attr("class")) {
						case "flag":
							attr = $cActions.attr("onclick");
							break;
						case "delete":
							attr = $cActions.attr("href");
							break;
					}
					
					if (typeof attr != "undefined") {
						wNewItem['comment'] = attr.match(/(\d+)/g)[0];
						
						//Storage for user links
						var myLink = me.profile;
						var yourLink = $cActions.parents(".comment").find("h4 a").attr("href");
						
						//If self-comment detected, bypass notification queue
						if (myLink == yourLink) {
							console.info("Detected self-comment, bypassing queue for " + wNewItem['title']);
							
							//Save state directly to watchlist
							d[email]['watchlist'][i]['comment'] = wNewItem['comment'];
						}
					}
				}
				
				//Initialize checker things
				var title = wNewItem['title'];
				var likes = wNewItem['likes'];
				var downloads = wNewItem['downloads'];
				var members = wNewItem['members'];
				var following = wNewItem['following'];
				var comment = wNewItem['comment'];
				
				wChangedItem['changes'] = [];
				
				//Title hook
				if (title) {
					wChangedItem['title'] = title;
					wChangedItem.state.title = title;
				}
				
				//Likes hook
				if (likes && wItem['likes'] != likes) {
					var lDif = likes - wItem['likes'];
					var lDifStr = lDif;
					if (lDif > 0) lDifStr = "+" + lDif;
					
					//Set likes in storage
					wChangedItem.state.likes = likes;
					
					var isNew = typeof wItem['likes'] == "undefined";
					
					if (!isNaN(lDif) || isNew) {
						if (isNew) lDif = lDifStr = likes;
						wChangedItem['likes'] = lDifStr + " like" + (Math.abs(lDif) > 1 || lDif == 0 ? "s" : "");
						wChangedItem['changes'].push(lDifStr + " like" + (Math.abs(lDif) > 1 || lDif == 0 ? "s" : ""));
						//alert(title + " :: " + lDifStr + " like" + (Math.abs(lDif) > 1 || lDif == 0 ? "s" : ""))
					}
				}
				
				//Downloads hook
				if (downloads && wItem['downloads'] != downloads) {
					var dDif = downloads - wItem['downloads'];
					var dDifStr = "+" + dDif;
					
					//Set downloads in storage
					wChangedItem.state.downloads = downloads;
					
					var isNew = typeof wItem['downloads'] == "undefined";
					
					if (!isNaN(dDif) || isNew) {
						if (isNew) dDif = dDifStr = downloads;
						wChangedItem['downloads'] = dDifStr + " download" + (dDif !== 1 ? "s" : "");
						wChangedItem['changes'].push(dDifStr + " download" + (dDif !== 1 ? "s" : ""));
						//alert(title + " :: " + dDifStr + " download" + (dDif > 1 ? "s" : ""));
					}
				}
				
				//Members hook
				if (members && wItem['members'] != members) {
					var mDif = members - wItem['members'];
					var mDifStr = mDif;
					if (mDif > 0) mDifStr = "+" + mDif;
					
					//Set members in storage
					wChangedItem.state.members = members;
					
					var isNew = typeof wItem['members'] == "undefined";
					
					if (!isNaN(mDif) || isNew) {
						if (isNew) mDif = mDifStr = members;
						wChangedItem['members'] = mDifStr + " member" + (Math.abs(mDif) > 1 || mDif == 0 ? "s" : "");
						wChangedItem['changes'].push(mDifStr + " member" + (Math.abs(mDif) > 1 || mDif == 0 ? "s" : ""));
						//alert(title + " :: " + mDifStr + " member" + (Math.abs(mDif) > 1 || mDif == 0 ? "s" : ""));
					}
				}
				
				//Followers hook
				if (following && wItem['following'] != following) {
					var fDif = following - wItem['following'];
					var fDifStr = fDif;
					if (fDif > 0) fDifStr = "+" + fDif;
					
					//Set following in storage
					wChangedItem.state.following = following;
					
					var isNew = typeof wItem['following'] == "undefined";
					
					if (!isNaN(fDif) || typeof wItem['following'] == "undefined") {
						if (isNew) fDif = fDifStr = following;
						wChangedItem['following'] = fDifStr + " follower" + (Math.abs(fDif) > 1 || fDif == 0 ? "s" : "");
						wChangedItem['changes'].push(fDifStr + " follower" + (Math.abs(fDif) > 1 || fDif == 0 ? "s" : ""));
						//alert(title + " :: " + fDifStr + " follower" + (Math.abs(fDif) > 1 || fDif == 0 ? "s" : ""));
					}
				}
				
				//Comments hook
				if (comment && wItem['comment'] != comment) {
					//BUGFIX: Alert was displaying for every added watchlist item
					//if (typeof wItem['comment'] != "undefined") {
						wChangedItem['comment'] = "New comment";
						wChangedItem['changes'].push("New comment");
						//alert(title + " :: New comment");
					//}
					
					//Set comment in storage
					wChangedItem.state.comment = comment;
				}
				
				if (wChangedItem['changes'].length) {
					wChangedItem['link'] = link;
					wChangedItem['index'] = i;
					
					wChanged.push(wChangedItem);
				}
				
				//Trace iteration
				console.log("Parsed item %s: %O", link, wChangedItem);
			});
			
			//End trace group
			console.groupEnd();
			
			//Store watchlist queue
			d[email]['watchlist-queue'] = wChanged;
			
			$.each(wChanged, function(i, item) {
				var hash = String(JSON.stringify(item).hashCode());
				
				//Generate notification
				if ((hashes.indexOf(hash) == -1)) {
					chrome.notifications.create(hash, {
						type: "basic",
						iconUrl: "img/iconapp.png",
						title: "Modation Watchlist",
						message: item['title'],
						contextMessage: item['changes'].join(", ")
					}, function(nID){hashes.push(hash)});
				}
			});
			
			//End trace group
			console.groupEnd();
			
			if (update) crapi.update(email, d[email], callback);
			else callback(d[email]);
		}
	});
}*/

/* Check if desktop notifications should be shown */
/*function doNotifs(hash) {
	if ((typeof hash == "undefined") || (localStorage[hash + ".desktop_notifs"] == "on")) { return true; }
	else if (localStorage[hash + ".desktop_notifs"] == "off") { return false; }
	return true;
}*/