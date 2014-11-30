//Switch for alarm state
var alarmRunning = false;

/* Checks for new installs */
function install_notice() {
	var manifest = chrome.runtime.getManifest();
	
    if (localStorage['version'] == manifest.version) return;

    var now = new Date().getTime();
    localStorage['install_time'] = now;
    localStorage['version'] = manifest.version;
    chrome.tabs.create({url: "options.html#about"});
}

install_notice();
//watchlist();
var hashes = [];

/* Feed check timer */
document.addEventListener('DOMContentLoaded', function () {
	chrome.alarms.create("feed", {delayInMinutes: (modapi.manifest.debug ? 0 : 1), periodInMinutes: 1} );
});

//Handler for content script messager
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
	/*console.log("request: %O", request);
	console.log("sender: %O", sender);*/
	
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
});

/* Handler for feed alarm */
chrome.alarms.onAlarm.addListener(function(alarm) {
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
						console.group("Modation :: Check notifications");
						
						//Begin trace timing
						console.time("Modation feed notifications");
						
						//User is not logged in
						if (!me) {
							//Log failure
							console.warn("Could not login to Soundation");
							
							//End trace timing
							console.timeEnd("Modation feed notifications");
							
							//End trace group
							console.groupEnd();
							
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
							$.get("http://soundation.com/feed", function(html) {
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
								
								//End trace timing
								console.timeEnd("Modation feed notifications");
								
								//Begin trace timing
								console.time("Modation watchlist");
								
								//Grab current user's profile
								$.get("http://soundation.com/account/profile", function(html) {
									//Storage for profile link
									var profileLink = $(html).find(".public-url").text().replace("http://soundation.com", "")
									
									//Tweak user object to add profile link
									me.profile = profileLink;
									
									//Check watchlist
									check_watchlist(me, true, function(data) {
										//Re-generate alerts
										var regenAlerts = _generateAlerts(data);
										
										//Trace re-generated alerts
										console.log("Re-generated alerts:", regenAlerts);
										
										//End trace timing
										console.timeEnd("Modation watchlist");
										
										//End trace group
										console.groupEnd();
										
										//Set alarm state
										alarmRunning = false;
									});
								});
								
								function _generateAlerts(data) {
									var watchlistAlerts = data['watchlist-queue'].length;
									var alerts = feedAlerts + watchlistAlerts;
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
										alertString = authorCount + " new from ";
										
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
									else { /* Do nothing */ }
									
									//Watchlist notifs handler
									if (watchlistAlerts) {
										alertString += (alertString ? "\n" : "") + watchlistAlerts + " new from watchlist";
									}
									
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
});

//Check watchlist
function check_watchlist(me, update, callback) {
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
				
				$.get("http://soundation.com/" + link, function(html) {
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
				var isGroup = (link.match(/group\/.*/) ? true : false);
				
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
}

/* Check if desktop notifications should be shown */
function doNotifs(hash) {
	if ((typeof hash == "undefined") || (localStorage[hash + ".desktop_notifs"] == "on")) { return true; }
	else if (localStorage[hash + ".desktop_notifs"] == "off") { return false; }
	return true;
}