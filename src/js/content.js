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

//Generate unique string ID (via http://stackoverflow.com/a/1349426)
function makeid() {
    var text = "";
    var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

    for (var i = 0; i < 10; i++)
        text += possible.charAt(Math.floor(Math.random() * possible.length));

    return text;
}

//Unique identifier for instance differentiation
var guid = makeid();
	
//Storage for audio player
var $player = {};
	
//Storage for cloned user settings
var storage = {};

//Storage for login information
var me = {};

//Initialize stuff without extra configuration
preinit();

//Wrapper
$(function() {
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
	//Initialize player
	$player = (typeof player == "undefined" ? $({}) : $(player));
	
	$.get(chrome.extension.getURL("content.html"), function(d) {
		$("body").append(d);
		
		modapi.login(function(mi) {
			me = mi;
			
			crapi.clone(function(d) {
				storage = d;
				
				init();
			});
		});
	});
	
	//Profile tips
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
	
	//Group tips
	Opentip.styles.groupTip = {
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
			var $groupInfo = $html.find("#group-info");
			var content = "";
			
			//Parse group info
			if ($groupInfo.length) {
				//Element cleanup
				$groupInfo.find(".join").remove();
				
				//Set container styles
				$groupInfo.css({
					width: "350px",
					margin: 0,
					border: "none"
				});
				
				content = $groupInfo[0].outerHTML;
			}
			
			//Unable to grab info
			else {
				var $main = $html.find("#main");
				
				//Catches unknown errors
				content = "An unknown error occurred!";
				
				//Catches private groups
				if ($main.find(".empty").text().toLowerCase().indexOf("private") != "-1") {
					content = $main.find(".empty")[0].outerHTML;
				}
			}
			
			//Return formatted data to tip
			return content;
		}
	}
	
	//Adjust Opentips z-index
	Opentip.lastZIndex = 676;
}

//Improved initialization
function init() {
	//Initialize recent tracks
	if (storage[me.email]["recent_tracks"]) {
		//Add recent tracks link
		if ($("body").hasClass("community")) {
			$("nav.wrapper a[href='/tracks']").after(' <a class="modation-recent-tracks" href="/tracks/recent">Recent</a>');
		}
		
		//Recent tracks page
		if (location.href.match(/\/tracks\/recent/)) {
			$("nav.wrapper .current").removeClass("current");
			$(".modation-recent-tracks").addClass("current");
		}
	}
	
	//Profile Tips
	if (storage[me.email]["profile_tips"]) {
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
		});
	}
	
	//Group Tips
	if (storage[me.email]["group_tips"]) {
		//Add group hover tips
		$('a[href*="/group/"]').not('[href*="/tracks"], [href*="/members"], [href*="?page="]').each(function(i, e) {
			//If an image is inside the link, tooltip the image
			var $e = $(e);
			var img = $e.children("img")[0];
			var link = $(img ? $(img).closest("a") : $e).attr("href");
			
			var elem = img || e;
				
			//Add tooltips
			var ot = $(elem).opentip("Just a moment...", {
				style: "groupTip",
				ajax: link,
				ajaxID: link
			});
		});
	}
	
	//Initialize sticky sidebars
	if (storage[me.email]["sticky_sidebars"]) sticky_sidebars();
	
	//Group page
	if (location.href.match(/\/group\//)) {
		//Generate watchlist UI
		watchlist_ui();
	
		//Initialize group mods
		if (storage[me.email]["group_mods"]) {
			//group_mods();
		}
	}
	
	//Group list page
	if (location.href.match(/\/groups/)) {
		//Initialize group mods
		if (storage[me.email]["group_mods"]) {
			group_mods();
		}
	}
	
	//Track page
	if (location.href.match(/\/user\/[\w-]*\/track\//)) {
		//Generate watchlist UI
		watchlist_ui();
	}
	
	//Player widget
	if (location.href.match(/\player\//)) {
		//Attach play event handler, if needed
		if (storage[me.email]["smart_player"]) $player.on("play", function() {
			//Send pause everything message
			chrome.runtime.sendMessage({action: "modation-pause-everything", guid: guid});
		});
		
		//Add player actions
		if (storage[me.email]["player_actions"]) {
			player_actions();
		}
		
		//Initialize small player
		small_player();
	}
	
	//Feed
	if (location.href.match(/\/feed/)) {
		//Initialize dynamic feed
		if (storage[me.email]["dynamic_feed"]) {
			dynamic_feed();
		}
		
		//Initialize small feed
		if (storage[me.email]["small_feed"]) {
			small_feed();
		}
	}
	
	//Comment Tags
	if (storage[me.email]["comment_tags"]) {
		comment_tags();
	}
}

//Get a factory item
function _factory(key) {
	return $(".modation-factory ." + key).clone();
}

/* ======== COMMUNITY MODS ======== */

/* Sticky Sidebars */
function sticky_sidebars() {
	$("aside").stick_in_parent({offset_top: 10});
}

/* Group Mods */
function group_mods() {
    $("div#main h2").after(_factory("modation-group-mods"));
	$(".modation-group-mods").fadeIn(2000);
	
	var $groupMods = $(".modation-group-mods");
	
	//Toggle old groups
	$groupMods.find(".old-groups").on("click", function() {
		toggleOldGroups(0, this);
	});
	
	//Toggle admin groups
	$groupMods.find(".admin-groups").on("click", function() {
		toggleOnlyAdminGroups(0, this);
	});
	
	//Minify groups
	$groupMods.find(".minify-groups").on("click", function() {
		minifyGroups(1, this);
	});

	/* Group Mods - Toggle old groups */
	function toggleOldGroups(iToggle, oFrom) {
		resetModLinks(1, iToggle, oFrom);
		$(oFrom).parents(".modation-group-mods").nextAll('.list-container').first().children("div.row.group").each(function (i, e) {
			elem = $(this).find("p.last-activity")[0];
			if ((typeof elem === 'undefined' || elem.innerHTML.indexOf("year") >= 0 || elem.innerHTML.indexOf("month") >= 0 || elem.innerHTML.search("([5-9]|[123]\\d) days") >= 0) && !($(this).find("div.admin").length > 0)) {
				node = $(this);
				(iToggle ? node.slideDown(600) : node.slideUp(600));
			} else {
				node = $(this);
				node.slideDown(600);
			}
		});
		resetModLinks(2, 1, oFrom);
	}
	
	/* Group Mods - Toggle only admin groups */
	function toggleOnlyAdminGroups(iToggle, oFrom) {
		resetModLinks(2, iToggle, oFrom);
		$(oFrom).parents(".modation-group-mods").nextAll('.list-container').first().children("div.row.group").each(function (i, e) {
			if ($(this).find("div.admin").length === 0) {
				node = $(this);
				
				if (iToggle) node.slideDown(600);
				else node.slideUp(600);
			}
		});
		if (iToggle) resetModLinks(1, iToggle, oFrom);
	}
	
	/* Group Mods - Reset mod links */
	function resetModLinks(iMode, iToggle, oFrom) {
		//alert(iMode + " " + iToggle);
		switch (iMode) {
			case 0: //All links reset
				//Reset old groups link
				$(oFrom).closest(".old-groups").off("click").on("click", function() {
					toggleOldGroups(iToggle ? 0 : 1, this);
				}).html((iToggle ? "Hide" : "Show") + " Old Groups");
				
				//Reset admin groups link
				$(oFrom).closest(".admin-groups").off("click").on("click", function() {
					toggleOnlyAdminGroups(iToggle ? 0 : 1, this);
				}).html((iToggle ? "Show Only Admin" : "Show All") + " Groups");
				break;
			case 1: //Old groups link reset
				$(oFrom).closest(".old-groups").off("click").on("click", function() {
					toggleOldGroups(iToggle ? 0 : 1, this);
				}).html((iToggle ? "Hide" : "Show") + " Old Groups");
				break;
			case 2: //Admin groups link reset
				$(oFrom).closest(".admin-groups").off("click").on("click", function() {
					toggleOnlyAdminGroups(iToggle ? 0 : 1, this);
				}).html((iToggle ? "Show Only Admin" : "Show All") + " Groups");
				break;
		}
	}
	
	/* Group Mods - Minify groups */
	function minifyGroups(iToggle, oFrom) {
		$(oFrom).parents(".modation-group-mods").nextAll('.list-container').first().children("div.row.group").each(function (i, e) {
			isAdmin = $(this).find("div.admin").length > 0;
			img = $(this).find("div.img")[0].outerHTML;
			link = $(this).find("a.name")[0].outerHTML;
			vLastActivity = $(this).find("p.last-activity");
			lastActivity = (vLastActivity.length > 0 ? vLastActivity[0].outerHTML.replace("Last activity ", "").replace(" ago", "") : '');
			minifiedContent = img + "<div class=\"info\">" + link + (isAdmin ? "<span id=\"spacer\" style=\"width: 80px; height: 20px; float:right;\"></span>" : "") + lastActivity;
			if (isAdmin) {
				adminButton = $(this).find("div.admin a")[0].outerHTML;
				$(this).find("div.admin").html(adminButton);
				admin = $(this).find("div.admin")[0].outerHTML;
				minifiedContent += admin + "</div>";
			}
			$(this).html(minifiedContent);
		});
		$(oFrom).parents(".modation-group-mods").nextAll('.list-container').first().find("div.row.group, div.img, div.info, p.last-activity, div.admin").addClass("minified");
	}
}

//Player Actions
function player_actions() {
	var $titleBar = $("#title-bar");
	var $a = $titleBar.find("a[href*=track]");
	var link = $a.attr("href");
	
	//Grab buttons
	var $likeBtn = $titleBar.find("#likes");
	var $downloadsBtn = _factory("modation-player-downloads");
	
	//Add downloads
	$likeBtn.before($downloadsBtn);
	$downloadsBtn.fadeIn(500);
	
	//Grab images
	var likesIcon = chrome.runtime.getURL("img/likes-icon.png");
	var likesIconPink = chrome.runtime.getURL("img/likes-icon-pink-2.png");
	
	//Grab track page
	$.get(link, function(html) {
		var $html = $(html);
		var $like = $html.find("#like a");
		var downloads = $html.find("span.downloads").text();
		var $downloadsContent = $('<span class="modation-player-downloads-content"></span>').text(downloads).hide()
		var downloadsContent = $downloadsContent[0].outerHTML;
		var likeLink = $like.attr("href");
		var liked = $like.find("img").attr("src").indexOf("broken") != -1;
		
		//Storage for button titles
		var downloadsTitle = "Download";
		var likeText = "Like this track", unlikeText = "You like this track";
		var likesTitle = liked ? unlikeText : likeText;
		
		//Show downloads
		$downloadsBtn.find("#circleG").fadeOut(200, function() {
			$(this).remove();
			
			$downloadsBtn.html(downloadsContent);
			$downloadsBtn.find(".modation-player-downloads-content").fadeIn(200);
		});
		
		//Modify downloads button
		$downloadsBtn.addClass("player-action");
		
		//Track is publicly downloadable
		if ($html.find("a[href*='/download']").length) {
			//Set button title
			downloadsTitle = "Download " + $html.find(".title").text();
			
			//Add downloads handler
			$downloadsBtn.click(function() {
				var $me = $(this);
				var downloads = parseInt($me.text());
				
				//Trace click
				console.log("you downloaded track %o", $a.text());
				
				//Increment downloads counter
				$me.text(downloads + 1);
				
				//Download track
				location = link + "/download";
			});
		}
		
		//Track is not publicly downloadable
		else {
			//Set button title
			downloadsTitle = "Downloads have been disabled for this track";
			
			//Disable button
			$downloadsBtn.addClass("disabled");
			
			//Fix cursor events
			$downloadsBtn.css({
				"cursor": "default",
				"pointer-events": "all"
			});
		}
		
		//Set downloads button title
		$downloadsBtn.attr("title", downloadsTitle);
		
		//Modify like button
		$likeBtn.addClass("player-action " + (liked ? "liked" : ""));
		$likeBtn.attr("title", likesTitle);
		$likeBtn.data("liked", liked);
		$likeBtn.click(function() {
			var $me = $(this);
			var likes = parseInt($me.text());
			
			//Trace click
			console.log("you %o track %o", $me.data("liked") ? "unlike" : "like", $a.text());
			
			//Disable button
			$me.addClass("disabled");
			
			//Like track
			if (!$me.data("liked")) {
				$me.text(likes + 1).data("liked", true).addClass("liked").attr("title", unlikeText);
			}
			
			//Unlike track
			else {
				$me.text(likes - 1).data("liked", false).removeClass("liked").attr("title", likeText);
			}
			
			//Request like
			$.getJSON(likeLink, function(datum) {
				//Trace datum
				console.log("like: %o", datum);
				
				//Enable button
				$me.removeClass("disabled");
			});
		});
	});
}

//Dynamic Feed
function dynamic_feed() {
	//Hide sidebar
	$("aside").hide();
	
	//Format containers
	//$(".main-wrapper").width(1080);
	$("#main").width("100%");
	$(".feed-item").width(430);
	$(".feed-item.news").width(890);
	
	//Initialize Isotope
	$("#main").isotope({
		itemSelector: ".feed-item",
		masonry: {
			columnWidth: 450,
			gutter: 10
		}
	});
}

//Small feed
function small_feed() {
	//Grab user feed item contents
	var $contents = $(".feed-item.user, .feed-item.group").find(".feed-content");
	
	//Remove any text not in a container
	$contents.contents().filter(function() {
		return (this.nodeType == 3);
	}).remove();
	
	//Hide everything else except for the track and time
	$contents.contents().not(".time, .track").hide();
	
	$("#main").isotope();
}

//Small player
function small_player() {
	//Grab elements
	var $play = $("#play-button");
	var $wfArea = $("#wf-area");
	var wf = waveform;
	var wfLoaded = loadedPart;
	
	//Hide logo
	$("#textlogo").hide();
	
	//Modify play button
	$play.css({
		position: "absolute",
		left: "14px",
		top: "26px",
		"z-index": "100"
	});
	
	//Modify waveform area
	$wfArea.css({
		"margin-left": "100px"
	});
	
	//Grab new width
	var width = $wfArea.width();
	
	//Modify waveform
	wf.width = width;
	wfLoaded.width = width;
}

//Comment Tags
function comment_tags() {
	$comment = $("#comment textarea");
	
	//Comment box exists
	if ($comment.length) {
		//Storage for unique names on page
		var names = $(".comment .content h4").map(function() {
			return $(this).text();
		}).get().unique();
		
		//Storage for parsed names
		var namesParsed = [];
		$.each(names, function(i, v) {
			namesParsed.push({val: v});
		});
		
		//Trace names
		console.log("names: %o", namesParsed);
		
		//Initialize inline select
		$comment.sew({values: namesParsed});
	}
	
	//Element factory for names
	function _elemFactory(elem, e) {
		//Grab tag template
		$tag = _factory("modation-tag");
		
		//Set data
		$tag.find(".modation-tag-val").text(e.val);
		$tag.find(".modation-tag-meta").text(e.meta);
		
		elem.append($tag);
	}
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
	var link = location.href.replace("http://soundation.com/", '').split("?")[0];
	var title = "Title";
	var email = me.email;
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
	
	/*if (isWatched) {
		//alert("you are being watched");
	}
	
	if (isQueued) {
		//alert("you are queued to isplooooode.");
	}*/
	
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

	//Add to watchlist
	function add_watchlist() {
		var d = storage;
		
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
			
			crapi.update(email, d[email]);
		}
	}
	
	//Remove from watchlist
	function delete_watchlist() {
		var d = storage;
		
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
			
			crapi.update(email, d[email]);
		}
	}
	
	//Remove from queue
	function delete_queue() {
		var d = storage;
		
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
			crapi.update(email, d[email]);
		}
	}
	
	//Check watchlist status
	function is_watched(link) {
		var d = storage;
		
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
		var d = storage;
		
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