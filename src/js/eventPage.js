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

var alarmRun = 0;

/* Checks for new installs */
function install_notice() {
	var manifest = chrome.runtime.getManifest();
	
    if (localStorage['version'] == manifest.version)
        return;

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

/* Handler for feed alarm */
chrome.alarms.onAlarm.addListener(function(alarm) {
	var views = chrome.extension.getViews({type: "popup"});
	
	//Grab storage
	crapi.clone(function(d) {
		console.log(d);
		
		//Login
		modapi.login(function(me) {
			console.log(me);
			
			//Feed alarm handler (runs if popup is closed)
			if (alarm.name == "feed" && !views.length) {
				//User is not logged in
				if (!me) {
					crapi.badge({
						title: "Please login to view notifications",
						color: "gray",
						text: "?"
					});
				}
				
				//User is logged in
				else {
					$.get("http://soundation.com/feed", function(html) {
						//Parse HTML to remove images and timing values
						html = html.replace(/<img\b[^>]*>/ig, '').replace(/<span class=\"time\">.*<\/span>/ig, '');
						
						var $html = $(html);
						var $aside = $html.find('aside');
						var asideHTML = $aside[0].outerHTML;
						var asideHash = String(asideHTML.hashCode());
						var feedLink = $html.find("a[href='/feed']")[0].innerText;
						var feedAlerts = parseInt(feedLink.match(/(\d+)/)) || 0;
						
						//Generate initial alerts
						_generateAlerts(d[me.email]);
						
						//Check watchlist and re-generate alerts
						check_watchlist(me.email, true, function(data) {
							_generateAlerts(data);
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
								
								//Trace authors
								console.log(alertString);
								
								if ((hashes.indexOf(asideHash) == -1) && data['desktop_notifs']) chrome.notifications.create(asideHash, {
									type: "basic",
									iconUrl: "img/iconapp.png",
									title: "Soundation Notifications",
									message: feedAlerts + " new notification" + (parseInt(feedAlerts) > 1 ? "s" : ""),
									contextMessage: alertString.replace(/\d* new /, "")
								}, function(notificationId) {hashes.push(asideHash)});
							}
							
							//No Soundation notifs
							else {
								console.log("modation: no notifs");
							}
							
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
								//Update badge
								crapi.badge({
									title: "No new notifications :(",
									text: ""
								});
							}
						}
					});
				}
			}
		});
	});
});

//Add to watchlist
function add_watchlist(email, link) {
	chrome.storage.local.get(email, function(d) {
		var watchlist = d[email]['watchlist'];
		var newItem = true;
		
		$.each(watchlist, function(i, v) {
			//Ensure no duplicates will be created
			if (v['link'] == link) {
				newItem = false;
				return false;
			}
			
			return true;
		});
		
		//Add new watchlist item and update
		if (newItem) {
			d[email]['watchlist'].push({link: link});
			
			update_storage(email, d[email]);
		}
	});
}

//Check watchlist
function check_watchlist(email, update, callback) {
	if (typeof update == "undefined") update = true;
	if (typeof callback == "undefined") callback = function(){};
	
	var wParsed = [];
	var wFailed = [];
	
	crapi.clone(function(d) {
		var watchlist = d[email]["watchlist"];
		var wLen = watchlist.length;
		var wCt = 0;
		
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
				wCt++;
				
				//If last index, run iteration
				if (wCt == wLen) {
					console.debug("final check complete!");
					_iterate();
				}
			}
		});
		
		//Iterate watchlist items
		function _iterate() {
			var wChanged = [];
			
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
					
					if (typeof attr != "undefined") wNewItem['comment'] = attr.match(/(\d+)/g)[0];
				}
				
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
					wNewItem['members'] = groupInfo.match(/(\d*) member/)[1];
					wNewItem['following'] = groupInfo.match(/(\d*) follower/)[1];
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
					console.log('title hook');
					wChangedItem['title'] = title;
					wChangedItem.state.title = title;
				}
				
				//Likes hook
				if (likes && wItem['likes'] != likes) {
					console.log('likes hook');
					var lDif = likes - wItem['likes'];
					var lDifStr = lDif;
					if (lDif > 0) lDifStr = "+" + lDif;
					
					//Set likes in storage
					wChangedItem.state.likes = likes;
					
					var isNew = typeof wItem['likes'] == "undefined";
					
					if (!isNaN(lDif) || isNew) {
						console.log('likes hook nan');
						if (isNew) lDif = lDifStr = likes;
						wChangedItem['likes'] = lDifStr + " like" + (Math.abs(lDif) > 1 || lDif == 0 ? "s" : "");
						wChangedItem['changes'].push(lDifStr + " like" + (Math.abs(lDif) > 1 || lDif == 0 ? "s" : ""));
						//alert(title + " :: " + lDifStr + " like" + (Math.abs(lDif) > 1 || lDif == 0 ? "s" : ""))
					}
				}
				
				//Downloads hook
				if (downloads && wItem['downloads'] != downloads) {
					console.log('downloads hook');
					var dDif = downloads - wItem['downloads'];
					var dDifStr = "+" + dDif;
					
					//Set downloads in storage
					wChangedItem.state.downloads = downloads;
					
					var isNew = typeof wItem['downloads'] == "undefined";
					
					if (!isNaN(dDif) || isNew) {
						console.log('downloads hook nan');
						if (isNew) dDif = dDifStr = downloads;
						wChangedItem['downloads'] = dDifStr + " download" + (dDif !== 1 ? "s" : "");
						wChangedItem['changes'].push(dDifStr + " download" + (dDif !== 1 ? "s" : ""));
						//alert(title + " :: " + dDifStr + " download" + (dDif > 1 ? "s" : ""));
					}
				}
				
				//Members hook
				if (members && wItem['members'] != members) {
					console.log('members hook');
					var mDif = members - wItem['members'];
					var mDifStr = mDif;
					if (mDif > 0) mDifStr = "+" + mDif;
					
					//Set members in storage
					wChangedItem.state.members = members;
					
					var isNew = typeof wItem['members'] == "undefined";
					
					if (!isNaN(mDif) || isNew) {
						console.log('members hook nan');
						if (isNew) mDif = mDifStr = members;
						wChangedItem['members'] = mDifStr + " member" + (Math.abs(mDif) > 1 || mDif == 0 ? "s" : "");
						wChangedItem['changes'].push(mDifStr + " member" + (Math.abs(mDif) > 1 || mDif == 0 ? "s" : ""));
						//alert(title + " :: " + mDifStr + " member" + (Math.abs(mDif) > 1 || mDif == 0 ? "s" : ""));
					}
				}
				
				//Followers hook
				if (following && wItem['following'] != following) {
					console.log('following hook');
					var fDif = following - wItem['following'];
					var fDifStr = fDif;
					if (fDif > 0) fDifStr = "+" + fDif;
					
					//Set following in storage
					wChangedItem.state.following = following;
					
					var isNew = typeof wItem['following'] == "undefined";
					
					if (!isNaN(fDif) || typeof wItem['following'] == "undefined") {
						console.log('following hook nan');
						if (isNew) fDif = fDifStr = following;
						wChangedItem['following'] = fDifStr + " follower" + (Math.abs(fDif) > 1 || fDif == 0 ? "s" : "");
						wChangedItem['changes'].push(fDifStr + " follower" + (Math.abs(fDif) > 1 || fDif == 0 ? "s" : ""));
						//alert(title + " :: " + fDifStr + " follower" + (Math.abs(fDif) > 1 || fDif == 0 ? "s" : ""));
					}
				}
				
				//Comments hook
				if (comment && wItem['comment'] != comment) {
					console.log('comment hook');
					//BUGFIX: Alert was displaying for every added watchlist item
					//if (typeof wItem['comment'] != "undefined") {
						console.log('comment hook nan');
						wChangedItem['comment'] = "New comment";
						wChangedItem['changes'].push("New comment");
						//alert(title + " :: New comment");
					//}
					
					//Set comment in storage
					wChangedItem.state.comment = comment;
				}
				
				console.log(wChangedItem);
				
				if (wChangedItem['changes'].length) {
					console.log('changes hook');
					wChangedItem['link'] = link;
					wChangedItem['index'] = i;
					
					wChanged.push(wChangedItem);
				}
			});
			
			//Store watchlist queue
			d[email]['watchlist-queue'] = wChanged;
			
			//Trace queue
			console.log(wChanged);
			
			//Trace state
			console.log(d[email]);
			
			//Debug results
			var results = "MODATION WATCHLIST\n----------------\n\n";
			
			$.each(wChanged, function(i, item) {
				results += item['title'] + /*" with link " + item['link'] + */" has changes!\n" + item['changes'].join(", ") + "\n\n";
				
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
			
			results += "END OF WATCHLIST";
			
			if (wChanged.length) //alert(results);
			
			console.debug("final iteration complete!");
			if (update) crapi.update(email, d[email], callback);
			else callback(d[email]);
		}
	});
}

//Update storage for provided key
function update_storage(key, value) {
	var updatedStorage = {};
	updatedStorage[key] = value;
	
	//Update storage
	chrome.storage.local.set(updatedStorage);
}

/* Check if desktop notifications should be shown */
function doNotifs(hash) {
	if ((typeof hash == "undefined") || (localStorage[hash + ".desktop_notifs"] == "on")) { return true; }
	else if (localStorage[hash + ".desktop_notifs"] == "off") { return false; }
	return true;
}