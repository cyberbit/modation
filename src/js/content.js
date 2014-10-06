//Needs to be up here for original hash check (ugh)
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

function makeid()
{
    var text = "";
    var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

    for( var i=0; i < 10; i++ )
        text += possible.charAt(Math.floor(Math.random() * possible.length));

    return text;
}

//Unique identifier for instance differentiation
var guid = makeid();
	
//Storage for audio player
var $player = (typeof player == "undefined" ? $({}) : $(player));
	
//Storage for cloned user settings
var modationStorage = {};

//Wrapper
$(function() {
	//Initialize stuff without extra configuration
	preinit();
	
	//Clone storage into modationStorage
	clone_storage(function() {
		init();
	});
	
	//Handler for content script messager
	chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
		/*console.log("request: %O", request);
		console.log("sender: %O", sender);*/
		
		//Requested to pause everything
		if (request.action == "modation-pause") {
			//Pause requested by another page
			if (request.guid != guid) {				
				//Pause player
				$player.trigger("pause");
				
				sendResponse({status: "paused", guid: guid});
			}
			
			//Pause requested by current page
			else {
				sendResponse({status: "ignored", guid: guid});
			}
		}
	});
});

/* ======== HELPERS ======== */

//Initialization that is independent of user settings
function preinit() {
	//Define Opentip styles
	Opentip.styles.profileTip = {
		//Targeting
		target: true,
		tipJoint: "left",
		
		//Animation
		hideDelay: .5,
		
		//Styles
		background: "#eee",
		borderRadius: 3,
		borderColor: "#ddd",
		
		//Ajax
		ajaxCallback: function(html) {
			var $html = $(html);
			var $userInfo = $html.find("#user-info");
			
			//Element cleanup
			$userInfo.find(".report-user").remove();
			
			//Set container styles
			$userInfo.css({
				width: "350px",
				margin: 0,
				border: "none"
			});
			
			//Grab HTML for tip
			var userInfo = $userInfo[0].outerHTML;
			
			//Return formatted data to tip
			return userInfo;
		}
	}
	
	//Adjust Opentips z-index
	Opentip.lastZIndex = 676;
	
	//Add recent tracks link
	if ($("body").hasClass("community")) {
		$("nav.wrapper a[href='/tracks']").after(' <a class="modation-recent-tracks" href="/tracks/recent">Recent</a>');
	}
	
	//Recent tracks page
	if (location.href.match(/\/tracks\/recent/)) {
		$("nav.wrapper .current").removeClass("current");
		$(".modation-recent-tracks").addClass("current");
	}
	
	//Add profile hover tips
	$('a[href*="/user/"]').not('[href*="/track/"], [href*=youtube]').each(function(i, e) {
		//If an image is inside the link, tooltip the image
		var $e = $(e);
		var img = $e.children("img")[0];
		var link = $(img ? $(img).closest("a") : $e).attr("href");
		
		var elem = img || e;
			
		//Add tooltips
		var ot = $(elem).opentip("Just a moment...", {
			style: "profileTip",
			ajax: link,
			ajaxID: link
		});
		
		//Attach content handler
		/*$.get(link, function(html) {
			var $html = $(html);
			var $userInfo = $html.find("#user-info");
			
			//Element cleanup
			$userInfo.find(".report-user").remove();
			
			//Set container styles
			$userInfo.css({
				width: "350px",
				margin: 0,
				border: "none"
			});
			
			//Grab HTML for tip
			var userInfo = $userInfo[0].outerHTML;
			
			//Update opentip content
			ot.setContent(userInfo);
		});*/
	});
}

function init() {
	var hash = getEmailHash();
	//alert(hash);
	//alert(JSON.stringify(modationStorage));
	if (doMod(hash, "sticky_sidebars")) sticky_sidebars();
	if (doMod(hash, "group_mods") && $("div#main:has(.group)").length) {
		addJQuery(group_mods);
	}
	if (doMod(hash, "player_downloads")) player_downloads();
	if (doMod(hash, "super_pages_global")) {
		if (doMod(hash, "super_pages_track_comments") && location.href.match(/\/user\/[\w-]*\/track\//)) super_pages("div#comments", "modation-sptc");
		if (doMod(hash, "super_pages_account_tracks") && location.href.match(/\/account\/tracks/)) super_pages("div.tracks-container", "modation-spat");
		if (doMod(hash, "super_pages_product_list") && location.href.match(/\/products|\/categories\/|\/genres\//)) super_pages("table.product-list", "modation-sppl");
		if (doMod(hash, "super_pages_feed") && location.href.match(/\/feed\//)) super_pages("div#main", "modation-spf");
		if (doMod(hash, "super_pages_tracks") && location.href.match(/\/tracks\//)) super_pages("div#main", "modation-spt");
		if (doMod(hash, "super_pages_groups") && location.href.match(/\/groups\//)) super_pages("div.list-container.groups", "modation-spg");
		if (doMod(hash, "super_pages_user_tracks") && location.href.match(/\/user\/[\w-]*/)) super_pages("div#tracks", "modation-sput");
		if (doMod(hash, "super_pages_group_comments") && location.href.match(/\/group\/[\w-]*/)) super_pages("div#comments", "modation-spgc");
	}
	
	//Attach factories
	$("body").append('' +
		'<div class="factory" style="display: none">' +
			'<button class="modation_watch nice-button pink" style="display: block">Watch Me</button>' +
		'</div>');
	
	//Group page
	if (location.href.match(/\/group\//)) {
		/*var commentActions = $(".comment .actions").children(".flag, .delete");
		var commentIDs = [];
		
		commentActions.each(function() {
			var attr;
			switch ($(this).attr("class")) {
				case "flag":
					attr = $(this).attr("onclick");
					break;
				case "delete":
					attr = $(this).attr("href");
					break;
			}
			commentIDs.push(attr.match(/(\d+)/)[0]);
		});
		
		latestComment = commentIDs[0];
		alert(latestComment);
		
		if (typeof modationStorage["watchlistg_team-soundation_comment"] == "undefined") {
			modationStorage["watchlistg_team-soundation_comment"] = latestComment;
		}
		
		commentIndex = $.inArray(modationStorage["watchlistg_team-soundation_comment"], commentIDs);
		alert(commentIndex);
		
		if (commentIndex >= 0) {
			if (commentIndex) {
				alert(commentIndex - 1 + " new comment" + (commentIndex > 2 ? "s" : ""));
			} else {
				alert("No new comments");
			}
		} else {
			/*
			 * As of version 0.6, there is no way to check if a comment
			 * fell off the first page or was deleted. I plan to implement
			 * the ability to look at first five pages to determine for sure
			 * if comment fell off. This is only accurate to the first fifty
			 * comments, however. Perhaps an easier way would be to store
			 * the time the comment was added and compare the difference?
			 *
			alert("10+ new comments");
		} */
		
		//Generate watchlist ui
		watchlist_ui();
	}
	
	//Track page
	if (location.href.match(/\/user\/[\w-]*\/track\//)) {
		watchlist_ui();
	}
	
	//Player widget
	if (location.href.match(/\player\//)) {
		//Attach play event handler
		$player.on("play", function() {
			//Send pause everything message
			chrome.runtime.sendMessage({action: "modation-pause-everything", guid: guid});
		});
	}
}

//Get a factory item
function _factory(key) {
	return $(".factory ." + key).clone();
}

//suggestion by @kennebec: http://stackoverflow.com/a/3620258/3402854
function addCode(parent, code) {
	var doc = parent[0]; //Get document from jQuery selector
    var JS = doc.createElement('script');
    JS.text = code;
    doc.body.appendChild(JS);
}

function addLinkedCode(parent, src) {
	var head = parent.find("head");
	head.append("<script src='" + src + "'></script>");
}

function addCSS(parent, css, id) {
	var noID = false;
	if (typeof id == "undefined") noID = true;
	var head = parent.find("head");
	if (!noID && parent.find('style#' + id).length) return false;
	head.append("<style " + (noID ? "" : "id='" + id + "'") + ">" + css + "</style>");
	return true;
}

function addJQuery(callback) {
    var includeFunctions = [toggleOldGroups, toggleOnlyAdminGroups, resetModLinks, minifyGroups];
    var script = document.createElement("script");
    script.setAttribute("src", "http://code.jquery.com/jquery-1.10.2.min.js");
    script.addEventListener('load', function () {
        var script = document.createElement("script");
        var sIncludeFunctions = "";
        includeFunctions.forEach(function (f) {
            sIncludeFunctions += f.toString();
        });
        script.textContent = "window.jQ=jQuery.noConflict(true);(" + callback.toString() + ")();" + sIncludeFunctions;
        document.body.appendChild(script);
    }, false);
    document.body.appendChild(script);
}

function getEmailHash() {
	var email = $(".email").text();
	return email.hashCode();
}

/* Mod Settings Super Handler */
//Default off for v1.0-beta
function doMod(hash, setting) {
	return false;
	if ((typeof hash == "undefined") || (modationStorage[hash + "." + setting] == "on")) { return true; }
	else if (modationStorage[hash + "." + setting] == "off") { return false; }
	return true;
}

/* ======== COMMUNITY MODS ======== */

/* Sticky Sidebars */
function sticky_sidebars() {
	$("aside").stick_in_parent({offset_top: 10});
}

/* Group Mods */
function group_mods() {
    var minifiedStyles = "div.row.group.minified { padding: 4px; } div.img.minified, div.img.minified img { width: 20px !important; height: 20px !important; } div.info.minified { min-height: 20px !important; margin-left: 24px !important; } p.last-activity.minified { float: right; display: inline; } p.last-activity.minified:before { content: \"(\"; } p.last-activity.minified:after { content: \")\"; } div.admin.minified a { margin-top: -2px !important; }";
    var style = document.createElement("style");
    style.textContent = minifiedStyles;
    style.setAttribute("type", "text/css");
    document.head.appendChild(style);
    $("div#main h2").after("<div id=\"groupmods\" style=\"display: none; padding: 8px; background: #e5f3d6; border: 1px solid #709343; border-radius: 2px\">cyberbit's Group Mods: <p><a id=\"oldgroups\" href=\"javascript:;\" onclick=\"toggleOldGroups(0, this)\">Hide Old Groups</a> | <a id=\"admingroups\"href=\"javascript:;\" onclick=\"toggleOnlyAdminGroups(0, this)\">Show Only Admin Groups</a> | <a id=\"minifygroups\"href=\"javascript:;\" onclick=\"minifyGroups(1, this)\">Minify Groups</a></p></div>");
	$("div#groupmods").fadeIn(2000);
}

/* Player Downloads */
function player_downloads() {
	$('iframe[src*="/player/"]').load(function() {
		var player = $(this).contents();
		addCSS(player, '#title-bar #downloads { display: none; background: url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAkAAAAICAYAAAArzdW1AAAABmJLR0QAJAAkACTORThWAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAB3RJTUUH3gQHEDcJeUryZgAAAFtJREFUGNONjjEKwDAMA002TZ3yA/n1/pb8DndJg6Gh9MaTEDJbkGQ1SPLJhv1grJV5CrcnOesDknOYmWVmnpaWv/ZpSeoLktTP72JERFVVRMSr8AAA7u4A0P0NFStRvu/GlrMAAAAASUVORK5CYII=") no-repeat 13px 6px; float: right; padding: 0 0 0 28px; color: white; height: 19px;}');
		addCSS(player, "#circleG{position:relative;top:8px;width:10.5px}.circleG{background-color:#FFF;float:left;height:2px;margin-left:1px;width:2px;-webkit-animation-name:bounce_circleG;-webkit-animation-duration:1.5s;-webkit-animation-iteration-count:infinite;-webkit-animation-direction:linear;-webkit-border-radius:1px}#circleG_1{-webkit-animation-delay:.3s}#circleG_2{-webkit-animation-delay:.7s}#circleG_3{-webkit-animation-delay:.9s}@-webkit-keyframes bounce_circleG{50%{background-color:#262627}}");
		player.find("span#likes").before('<span id="downloads"><div id="circleG"><div id="circleG_1" class="circleG"></div><div id="circleG_2" class="circleG"></div><div id="circleG_3" class="circleG"></div></div></span>');
		player.find("span#downloads").fadeIn(500);
		var trackPage = player.find("a").attr("href");
		$.get(trackPage, function(data) {
			player.find(".circleG").fadeOut(200, function() {
				$(this).remove();
				var downloads = $(data).find("span.downloads").text();
				var oDownloads = '<span id="downloads_count" style="display: none">' + downloads + '</span>';
				player.find("span#downloads").html(oDownloads);
				player.find("#downloads_count").fadeIn(200);
			});
		});
	});
}

/* Super Pages Super Handler */
function super_pages(selector, id) {
	if ($('nav.pagination').length) {
		addCSS($(document), '.disabled { pointer-events: none; -webkit-user-select: none; -webkit-filter: grayscale(1) opacity(.6); transition: all .3s; } ' + selector + ' { transition: all .3s; }', id + "-cover-css");
		$('nav.pagination a').each(function() {
			var href = $(this).attr("href");
			$(this).click(function(e) {
				_load(href);
				e.preventDefault();
			});
		});
	
		$(window).on("popstate." + id, function(e) {
			_load(location.href, false);
		});
	}
	
	//Internal load function for callbacks
	function _load(href, push) {
		if (typeof push == "undefined") push = true;
		$(selector + ', nav.pagination').addClass("disabled");
		$.get(href, function(data) {
			var datum = $(data);
			var tracks = datum.find(selector);
			var pagination = datum.find('nav.pagination');
			$(selector).html(tracks.contents());
			$('nav.pagination').html(pagination.contents());
			
			//Push location to history to fake a saved state (fancy pants!)
			if (push) history.pushState({id: id}, '', href);
			
			//Recursive, but only slightly
			super_pages(selector, id);
			$(selector + ', nav.pagination').removeClass("disabled");
		});
	}
}

/* Watchlist UI generation */
function watchlist_ui() {
	var isGroup = location.href.match(/\/group\//);
	var isTrack = location.href.match(/\/user\/[\w-]*\/track\//);
	var link = location.href.replace("http://soundation.com/", '');
	var title = "Title";
	var email = $(".email").text();
	var isWatched = is_watched(link);
	var isQueued = is_queued(link);
				
	//Is track
	if (isTrack) {
		title = $("#main .title").text();
	}
	
	//Is group
	else if (isGroup) {
		title = $("#group-info h2").html();
	}
	
	if (isWatched) {
		//alert("you are being watched");
	}
	
	if (isQueued) {
		//alert("you are queued to isplooooode.");
	}
	
	_generate();
	
	//Generate buttons
	function _generate() {
		$button = _factory("modation_watch");
		
		//Group handler
		if (isGroup) {
			$("#group-info .join").append("<br>").append($button);
			$(".modation_watch").css("float", "right");
		}
		
		//Track handler
		if (isTrack) {
			$("#main .title").append($button);
		}
			
		//Is watched
		if (isWatched) {
			$(".modation_watch").off("click");
			$(".modation_watch").html("Unwatch");
			$(".modation_watch").click(function() {
				//alert("first unwatch");
				delete_watchlist();
			});
		}
		
		//Not watched
		else {
			$(".modation_watch").off("click");
			$(".modation_watch").html("Watch");
			$(".modation_watch").click(function() {
				//alert("first watch");
				add_watchlist();
			});
		}
		
		//Is queued
		if (isQueued) {
			delete_queue();
		}
	}
	
	//Change handlers
	function _handle(state) {
		//Is watched
		if (state) {
			$(".modation_watch").off("click");
			$(".modation_watch").html("Unwatch");
			$(".modation_watch").click(function() {
				//alert("second unwatch");
				delete_watchlist();
			});
		}
		
		//Not watched
		else {
			$(".modation_watch").off("click");
			$(".modation_watch").html("Watch");
			$(".modation_watch").click(function() {
				//alert("second watch");
				add_watchlist();
			});
		}
	}
	
	//Handler handler old version
	/*function _handle(generate) {
		if (typeof generate == "undefined") generate = true;
		
		//Group handler
		if (isGroup) {
			if (generate) $("#group-info .join").append("<br>").append(_factory("modation_watch"));
			$("#main .modation_watch").css("float", "right");
			
			//Not watched
			if (!isWatched) {
				$("#main .modation_watch").off("click.modation");
				$("#main .modation_watch").text("Watch Group").on("click.modation", function() {
					alert("group watch");
					add_watchlist();
				});
			}
			
			//Is watched
			else {
				$("#main .modation_watch").off("click.modation");
				$("#main .modation_watch").text("Unwatch Group").on("click.modation", function() {
					alert("group unwatch!!)!@)#");
					delete_watchlist();
				});
			}
		}
		
		//Track handler
		else if (isTrack) {
			if (generate) $("#main .title").append(_factory("modation_watch"));
			
			//Not watched
			if (!isWatched) {
				$("#main .modation_watch").off("click.modation");
				$("#main .modation_watch").text("Watch Track").on("click.modation", function() {
					alert("track watch");
					add_watchlist();
				});
			}
			
			//Is watched
			else {
				$("#main .modation_watch").off("click.modation");
				$("#main .modation_watch").text("Unwatch Track").on("click.modation", function() {
					alert("track unwatch!!@$*#(@)");
					delete_watchlist();
				})
			}
		}
	}*/

	//Add to watchlist
	function add_watchlist() {
		var d = modationStorage;
		
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
			d[email]['watchlist'].push({link: link, title: title});
			
			//Reapply handlers
			_handle(true);
			
			update_storage(email, d[email]);
		}
	}
	
	//Remove from watchlist
	function delete_watchlist() {
		var d = modationStorage;
		
		var watchlist = d[email]['watchlist'];
		var hasItem = false;
		
		$.each(watchlist, function(i, v) {
			//Ensure no duplicates will be created
			if (v['link'] == link) {
				d[email]['watchlist'].splice(i, 1);
				hasItem = true;
				return false;
			}
			
			return true;
		});
		
		//Delete watchlist item and update
		if (hasItem) {			
			//Reapply handlers
			_handle(false);
			
			update_storage(email, d[email]);
		}
	}
	
	//Remove from queue
	function delete_queue() {
		var d = modationStorage;
		
		var queue = d[email]['watchlist-queue'];
		var hasItem = false;
		
		$.each(queue, function(i, v) {
			//Ensure no duplicates will be created
			if (v['link'] == link) {
				//Grab watchlist item
				var watchlistItem = d[email]['watchlist'][v.index];
				
				//Iterate properties
				for (var prop in v.state) watchlistItem[prop] = v.state[prop];
				
				//Push updated watchlist back into storage
				d[email]['watchlist'][v.index] = watchlistItem;
				
				//Remove queue item
				d[email]['watchlist-queue'].splice(i, 1);
				
				hasItem = true;
				return false;
			}
			
			return true;
		});
		
		//Delete watchlist item and update
		if (hasItem) {
			console.info("Modation :: Queue cleared!");
			update_storage(email, d[email]);
		}
	}
	
	//Add to watchlist old version
	/*function add_watchlist() {
		var d = modationStorage;
		
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
			
			alert("is a new day!");
			console.log(d[email]['watchlist']);
			
			var label = $("#main .modation_watch").text();
			$("#main .modation_watch").text(label.replace("Watch", "Unwatch"));
			
			//Reapply handlers
			_handle2(true);
			
			update_storage(email, d[email]);
		}
	}*/
	
	//Remove from watchlist old version
	/*function delete_watchlist() {
		var d = modationStorage;
		
		var watchlist = d[email]['watchlist'];
		var hasItem = false;
		
		$.each(watchlist, function(i, v) {
			//Ensure no duplicates will be created
			if (v['link'] == link) {
				delete d[email]['watchlist'][i];
				hasItem = true;
				return false;
			}
			
			return true;
		});
		
		//Delete watchlist item and update
		if (hasItem) {
			alert("deleteding watchlist.,.,.");
			console.log(d[email]['watchlist']);
			
			var label = $("#main .modation_watch").text();
			$("#main .modation_watch").text(label.replace("Unwatch", "Watch"));
			
			//Reapply handlers
			_handle2(false);
			
			update_storage(email, d[email]);
		}
	}*/
	
	//Check watchlist status
	function is_watched(link) {
		var d = modationStorage;
		
		var watchlist = d[email]['watchlist'];
		var isListed = false;
		
		//Iterate watchlist items
		$.each(watchlist, function(i, v) {
			if (v['link'] == link) {
				isListed = true;
				return false;
			}
			
			return true;
		});
		
		return isListed;
	}
	
	//Check watchlist queue
	function is_queued(link) {
		var d = modationStorage;
		
		var queue = d[email]['watchlist-queue'];
		var isQueued = false;
		
		//Iterate watchlist items
		$.each(queue, function(i, v) {
			if (v['link'] == link) {
				isQueued = true;
				return false;
			}
			
			return true;
		});
		
		return isQueued;
	}
}

//Get local storage copy
function clone_storage(callback) {
	if (typeof callback == "undefined") callback = function(){};
	
	chrome.storage.local.get(function(d) {
		modationStorage = d;
		//console.log(modationStorage);
		callback();
	});
}

//Update storage for provided key
function update_storage(key, value) {
	var updatedStorage = {};
	updatedStorage[key] = value;
	
	//Update storage
	chrome.storage.local.set(updatedStorage, clone_storage);
}

/* Group Mods - Toggle old groups */
function toggleOldGroups(iToggle, oFrom) {
    resetModLinks(1, iToggle, oFrom);
    jQ(oFrom).parents("#groupmods").nextAll('.list-container').first().children("div.row.group").each(function (i, e) {
        elem = jQ(this).find("p.last-activity")[0];
        if ((typeof elem === 'undefined' || elem.innerHTML.indexOf("year") >= 0 || elem.innerHTML.indexOf("month") >= 0 || elem.innerHTML.search("([5-9]|[123]\\d) days") >= 0) && !(jQ(this).find("div.admin").length > 0)) {
            node = jQ(this);
            (iToggle ? node.slideDown(600) : node.slideUp(600));
        } else {
            node = jQ(this);
            node.slideDown(600);
        }
    });
    resetModLinks(2, 1, oFrom);
}

/* Group Mods - Toggle only admin groups */
function toggleOnlyAdminGroups(iToggle, oFrom) {
    resetModLinks(2, iToggle, oFrom);
    jQ(oFrom).parents("#groupmods").nextAll('.list-container').first().children("div.row.group").each(function (i, e) {
        if (jQ(this).find("div.admin").length === 0) {
            node = jQ(this);
            (iToggle ? node.slideDown(600) : node.slideUp(600));
        }
    });
    (iToggle ? resetModLinks(1, iToggle, oFrom) : null);
}

/* Group Mods - Reset mod links */
function resetModLinks(iMode, iToggle, oFrom) {
	//alert(iMode + " " + iToggle);
    switch (iMode) {
        case 0: //All links reset
            jQ(oFrom).closest("a#oldgroups").attr("onclick", "toggleOldGroups(" + (iToggle ? "0" : "1") + ", this)").html((iToggle ? "Hide" : "Show") + " Old Groups");
            jQ(oFrom).closest("a#admingroups").attr("onclick", "toggleOnlyAdminGroups(" + (iToggle ? "0" : "1") + ", this)").html((iToggle ? "Show Only Admin" : "Show All") + " Groups");
            break;
        case 1: //Old groups link reset
            jQ(oFrom).closest("a#oldgroups").attr("onclick", "toggleOldGroups(" + (iToggle ? "0" : "1") + ", this)").html((iToggle ? "Hide" : "Show") + " Old Groups");
            break;
        case 2: //Admin groups link reset
            jQ(oFrom).closest("a#admingroups").attr("onclick", "toggleOnlyAdminGroups(" + (iToggle ? "0" : "1") + ", this)").html((iToggle ? "Show Only Admin" : "Show All") + " Groups");
            break;
    }
}

/* Group Mods - Minify groups */
function minifyGroups(iToggle, oFrom) {
    jQ(oFrom).parents("#groupmods").nextAll('.list-container').first().children("div.row.group").each(function (i, e) {
        isAdmin = jQ(this).find("div.admin").length > 0;
        img = jQ(this).find("div.img")[0].outerHTML;
        link = jQ(this).find("a.name")[0].outerHTML;
        vLastActivity = jQ(this).find("p.last-activity");
        lastActivity = (vLastActivity.length > 0 ? vLastActivity[0].outerHTML.replace("Last activity ", "").replace(" ago", "") : '');
        minifiedContent = img + "<div class=\"info\">" + link + (isAdmin ? "<span id=\"spacer\" style=\"width: 80px; height: 20px; float:right;\"></span>" : "") + lastActivity;
        if (isAdmin) {
            adminButton = jQ(this).find("div.admin a")[0].outerHTML;
            jQ(this).find("div.admin").html(adminButton);
            admin = jQ(this).find("div.admin")[0].outerHTML;
            minifiedContent += admin + "</div>";
        }
        jQ(this).html(minifiedContent);
    });
    jQ(oFrom).parents("#groupmods").nextAll('.list-container').first().find("div.row.group, div.img, div.info, p.last-activity, div.admin").addClass("minified");
}