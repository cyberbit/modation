//This is a test change
//This is another change

String.prototype.hashCode = function(){
    var hash = 0, i, char;
    if (this.length == 0) return hash;
    for (i = 0, l = this.length; i < l; i++) {
        char  = this.charCodeAt(i);
        hash  = ((hash<<5)-hash)+char;
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
	chrome.alarms.create("feed", {delayInMinutes: 1, periodInMinutes: 1} );
});

/* Handler for feed alarm */
chrome.alarms.onAlarm.addListener(function(alarm) {
	var views = chrome.extension.getViews({type: "popup"});
	
	//Feed alarm handler
	if (alarm.name == "feed") {
		if (!views.length) $.get("http://soundation.com/feed", function(html) {
			html = html.replace(/<img\b[^>]*>/ig, '').replace(/<span class=\"time\">.*<\/span>/ig, '');
			var oHtml = $(html);
			var email = oHtml.find('.email').text();
			var emailHash = email.hashCode();
			if (typeof localStorage[email] == "undefined") {
				localStorage[email] = emailHash;
				localStorage[emailHash + ".desktop_notifs"] = "on";
			}
			var aside = oHtml.find('aside')[0];
			if (typeof aside == "undefined") {
				chrome.browserAction.setTitle({title:"Please login to view notifications"});
				chrome.browserAction.setBadgeBackgroundColor({color:"#9a9a9a"});
				chrome.browserAction.setBadgeText({text:"?"});
			}
			var asideHTML = aside.outerHTML;
			var asideHash = String(asideHTML.hashCode());
			//console.log(asideHash);
			var sCommunity = oHtml.find("a[href='/feed']")[0].innerText;
			var numAlerts = sCommunity.match(/(\d+)/);
			if (numAlerts != null) {
				var iTotal = 0, authors = [];
				$(asideHTML).find('a.author').each(function() {
					author = $(this).text();
					if (authors.indexOf(author) == -1) authors.push(author);
					++iTotal;
				});
				var iAuthors = authors.length, iOthers = iAuthors - 3, i = 0, authorString = iTotal + " new from ";
				for (i = 0; i < 2 && i < (iAuthors - 1); ++i) {
					authorString += authors[i] + ", ";
				}
				authorString += authors[i];
				if (iOthers > 0) authorString += ", plus " + iOthers + " other" + (iOthers > 1 ? "s" : "");
				console.log(authorString);
				chrome.browserAction.setTitle({title:authorString});
				chrome.browserAction.setBadgeBackgroundColor({color:"#d00"});
				chrome.browserAction.setBadgeText({text:numAlerts[0]});
				if ((hashes.indexOf(asideHash) == -1) && doNotifs(emailHash)) chrome.notifications.create(asideHash, {
					type: "basic",
					iconUrl: "iconapp.png",
					title: "Soundation Notifications",
					message: numAlerts[0] + " new notification" + (parseInt(numAlerts[0]) > 1 ? "s" : ""),
					contextMessage: authorString.replace(/\d* new /, "")
				}, function(notificationId) {hashes.push(asideHash)});
			} else {
				console.log("modation: no notifs");
				chrome.browserAction.setTitle({title:"No new notifications :("});
				chrome.browserAction.setBadgeText({text:""})
			}
			
			//Check watchlist
			check_watchlist(email);
		});
	}
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
	
	chrome.storage.local.get(email, function(d) {
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
				
				//If failed, don't do stuff
				/*if (wItem['fail']) {
					delete d[email]['watchlist'][i]['fail'];
					delete d[email]['watchlist'][i]['html'];
					console.debug(v['link'] + " failed! deleted from watchlist");
					//delete d[email]['watchlist'][i];
				}*/
				
				//Do stuff
				//else {
					var link = wItem['link'];
					var html = wItem['html'];
					var $html = $(html);
					var wNewItem = {};
					var wChangedItem = {};
					
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
						wChangedItem['title'] = title;
						d[email]['watchlist'][i]['title'] = title;
					}
					
					//Likes hook
					if (likes && wItem['likes'] != likes) {
						var lDif = likes - wItem['likes'];
						var lDifStr = lDif;
						if (lDif > 0) lDifStr = "+" + lDif;
						
						//Set likes in storage
						d[email]["watchlist"][i]['likes'] = likes;
						
						if (!isNaN(lDif)) {
							wChangedItem['likes'] = lDifStr + " like" + (lDif > 1 || lDif < -1 ? "s" : "");
							wChangedItem['changes'].push(lDifStr + " like" + (lDif > 1 || lDif < -1 ? "s" : ""));
							//alert(title + " :: " + lDifStr + " like" + (lDif > 1 || lDif < -1 ? "s" : ""))
						}
					}
					
					//Downloads hook
					if (downloads && wItem['downloads'] != downloads) {
						var dDif = downloads - wItem['downloads'];
						var dDifStr = "+" + dDif;
						
						//Set downloads in storage
						d[email]["watchlist"][i]['downloads'] = downloads;
						
						if (!isNaN(dDif)) {
							wChangedItem['downloads'] = dDifStr + " download" + (dDif > 1 ? "s" : "");
							wChangedItem['changes'].push(dDifStr + " download" + (dDif > 1 ? "s" : ""));
							//alert(title + " :: " + dDifStr + " download" + (dDif > 1 ? "s" : ""));
						}
					}
					
					//Members hook
					if (members && wItem['members'] != members) {
						var mDif = members - wItem['members'];
						var mDifStr = mDif;
						if (mDif > 0) mDifStr = "+" + mDif;
						
						//Set members in storage
						d[email]["watchlist"][i]['members'] = members;
						
						if (!isNaN(mDif)) {
							wChangedItem['members'] = mDifStr + " members" + (mDif > 1 || mDif < -1 ? "s" : "");
							wChangedItem['changes'].push(mDifStr + " members" + (mDif > 1 || mDif < -1 ? "s" : ""));
							//alert(title + " :: " + mDifStr + " members" + (mDif > 1 || mDif < -1 ? "s" : ""));
						}
					}
					
					//Followers hook
					if (following && wItem['following'] != following) {
						var fDif = following - wItem['following'];
						var fDifStr = fDif;
						if (fDif > 0) fDifStr = "+" + fDif;
						
						//Set following in storage
						d[email]["watchlist"][i]['following'] = following;
						
						if (!isNaN(fDif)) {
							wChangedItem['following'] = fDifStr + " follower" + (fDif > 1 || fDif < -1 ? "s" : "");
							wChangedItem['changes'].push(fDifStr + " follower" + (fDif > 1 || fDif < -1 ? "s" : ""));
							//alert(title + " :: " + fDifStr + " follower" + (fDif > 1 || fDif < -1 ? "s" : ""));
						}
					}
					
					//Comments hook
					if (comment && wItem['comment'] != comment) {
						//BUGFIX: Alert was displaying for every added watchlist item
						if (typeof wItem['comment'] != "undefined") {
							wChangedItem['comment'] = "New comment";
							wChangedItem['changes'].push("New comment");
							//alert(title + " :: New comment");
						}
						
						//Set comment in storage
						d[email]["watchlist"][i]['comment'] = comment;
					}
					
					if (wChangedItem['changes'].length) {
						wChangedItem['link'] = link;
						
						wChanged.push(wChangedItem);
					}
				//}
			});
			
			console.log(wChanged);
			
			var results = "MODATION WATCHLIST\n----------------\n\n";
			
			$.each(wChanged, function(i, item) {
				results += item['title'] + /*" with link " + item['link'] + */" has changes!\n" + item['changes'].join(", ") + "\n\n";
			});
			
			results += "END OF WATCHLIST";
			
			if (wChanged.length) alert(results);
			
			console.debug("final iteration complete!");
			if (update) update_storage(email, d[email], callback);
			else callback();
		}
	});
}

//Check watchlist backup
function check_watchlist_bk(email, update) {			
	if (typeof update == "undefined") update = true;
	
	var wParsed = [];
	var wFailed = [];
	
	chrome.storage.local.get(email, function(d) {
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
				//v['fail'] = true;
				wParsed[i] = v;
				wFailed[i] = v;
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
			$.each(wParsed, function(i, v) {
				var wItem = v;
				
				//If failed, don't do stuff
				if (wItem['fail']) {
					delete d[email]['watchlist'][i]['fail'];
					delete d[email]['watchlist'][i]['html'];
					console.debug(v['link'] + " failed! deleted from watchlist");
					//delete d[email]['watchlist'][i];
				}
				
				//Do stuff
				else {
					var link = wItem['link'];
					var html = wItem['html'];
					var $html = $(html);
					var wNewItem = {};
					
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
					
					//Title hook
					if (title) {
						d[email]['watchlist'][i]['title'] = title;
					}
					
					//Likes hook
					if (likes && wItem['likes'] != likes) {
						var lDif = likes - wItem['likes'];
						var lDifStr = lDif;
						if (lDif > 0) lDifStr = "+" + lDif;
						
						//Set likes in storage
						d[email]["watchlist"][i]['likes'] = likes;
						
						if (!isNaN(lDif)) {
							alert(title + " :: " + lDifStr + " like" + (lDif > 1 || lDif < -1 ? "s" : ""))
						}
					}
					
					//Downloads hook
					if (downloads && wItem['downloads'] != downloads) {
						var dDif = downloads - wItem['downloads'];
						var dDifStr = "+" + dDif;
						
						//Set downloads in storage
						d[email]["watchlist"][i]['downloads'] = downloads;
						
						if (!isNaN(dDif)) {
							alert(title + " :: " + dDifStr + " download" + (dDif > 1 ? "s" : ""));
						}
					}
					
					//Members hook
					if (members && wItem['members'] != members) {
						var mDif = members - wItem['members'];
						var mDifStr = mDif;
						if (mDif > 0) mDifStr = "+" + mDif;
						
						//Set members in storage
						d[email]["watchlist"][i]['members'] = members;
						
						if (!isNaN(mDif)) {
							alert(title + " :: " + mDifStr + " members" + (mDif > 1 || mDif < -1 ? "s" : ""));
						}
					}
					
					//Followers hook
					if (following && wItem['following'] != following) {
						var fDif = following - wItem['following'];
						var fDifStr = fDif;
						if (fDif > 0) fDifStr = "+" + fDif;
						
						//Set following in storage
						d[email]["watchlist"][i]['following'] = following;
						
						if (!isNaN(fDif)) {
							alert(title + " :: " + fDifStr + " follower" + (fDif > 1 || fDif < -1 ? "s" : ""));
						}
					}
					
					//Comments hook
					if (comment && wItem['comment'] != comment) {
						//BUGFIX: Alert was displaying for every added watchlist item
						if (typeof wItem['comment'] != "undefined") {
							alert(title + " :: New comment");
						}
						
						//Set comment in storage
						d[email]["watchlist"][i]['comment'] = comment;
					}
				}
			});
			
			console.debug("final iteration complete!");
			if (update) update_storage(email, d[email]);
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