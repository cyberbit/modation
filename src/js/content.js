//Storage for cloned user settings
var storage = {};

//Storage for login information
var me = {};

//Initialize stuff without extra configuration
preinit();

//Wrapper
/*$(function() {
	//Nutin.
});*/

//Initialization that is independent of user settings
function preinit() {
	$.get(chrome.extension.getURL("content.html"), function(d) {
		$("body").append(d);
		
		crapi.clone(function(d) {
			//Cache storage
			storage = d;
			
			//Initialize all the things
			if (storage.options.userTags) initTags();
			if (storage.options.moveCommentBox) initComments();
			if (storage.options.groupFilters) initGroups();
			if (storage.options.moveGroupInvites) initGroupInvites();
			if (storage.options.showAlertsOnTop) initAlerts();
			if (storage.options.watchlist) initWatchlist();
			
			modapi.login(function(mi) {
				//Cache user
				me = mi;
			});
		});
	});

	//Initialize user tagging
	function initTags() {
		var userTagLinks = storage.options.userTagLinks;
		
		var $newComment = $(".new_comment #comment_content");
		
		//Comment box exists
		if ($newComment.length) {
			var $comments = $(".main div.comments");
			
			//Storage for unique names on page
			var names = $comments.find(".comment .content > h4").map(function() {
				return (userTagLinks) ? $(this).html() : $(this).text();
			}).get().unique();
			
			//Storage for parsed names
			var namesParsed = [];
			$.each(names, function(i, v) {
				namesParsed.push({val: v});
			});
			
			//Initialize inline select
			$newComment.sew({
				values: namesParsed,
				elementFactory: function($el, e) {
					$el.html(userTagLinks ? $(e.val).text() : e.val);
				}
			});
		}
	}
	
	//Initialize comments
	function initComments() {
		var $writeComment = $(".write-comment");
		
		//Comment box exists
		if ($writeComment.length) {
			var $header = $writeComment.prevAll("h3").first();
			var $comments = $writeComment.siblings("div.comments");
			
			//Set up comments
			$writeComment.addClass("mod-write-comment");
			$comments.addClass("mod-comments");
			
			//Move comment box to top of thread
			$header.after($writeComment);
		}
	}
	
	//Initialize group list
	function initGroups() {
		var $groupList = $(".main .group-list");
		var $groupFilter = _factory(".modation-factory", ".modation-group-filter");
		var $filter = $groupFilter.find(".filter");
		
		//Set up group list
		$groupList.addClass("mod-group-list");
		
		//Add group filter before list
		$groupList.before($groupFilter);
		
		//Initialize Isotope
		$groupList.isotope({
			itemSelector: ".group",
			layoutMode: "vertical",
			transitionDuration: ".3s"
		});
		
		//Trigger layout after each image loads
		$groupList.imagesLoaded().progress(function() {
			$groupList.isotope("layout");
		});
		
		//Set up search
		handle($filter, "input.initGroups", function() {
			var $this = $(this);
			var val = $this.val();
			var search = val.toLowerCase();
			
			//Filter group list
			$groupList.isotope({
				filter: function() {
					var $this = $(this);
					var $name = $this.find(".name");
					var text = $name.text().toLowerCase();
					
					return (text.indexOf(search) != -1);
				}
			});
		});
	}
	
	// Initialize group invites
	function initGroupInvites() {
		var $groupList = $(".main .group-list");
		var $invitations = $(".main .invitations");
		var $header = $invitations.prev("h3");
		
		// Set up invitations
		$invitations.addClass("mod-group-invites");
		
		// Move invitations above group list
		$groupList.before($invitations);
		$invitations.before($header);
	}
	
	// Initialize alert
	function initAlerts() {
		var $alert = $(".alert");
		
		// Set up alert
		$alert.addClass("mod-alert");
	}
	
	// Initialize watchlist buttons
	function initWatchlist() {
		var link = global.path.home + location.pathname;
		
		// Request watchlist type
		chrome.runtime.sendMessage({action: "watchlistItemType", link: link}, function(result) {
			var type = result;
			
			// Check to make sure only watchable pages are modified
			if (type) {
				/**
				 * There is a potential problem lurking in here regarding
				 * watchlist actions outside of the current tab. If an item
				 * is removed from the watchlist outside of the current tab,
				 * the stored watchlist in the current tab is out of sync, and
				 * adding/removing an item could add back the previously removed
				 * item and/or delete some other item. A solution to this would
				 * be to clone the storage before every action, but I'll leave
				 * that for a future update. This is the beta, after all!
				 *
				 * I simplified the implementation of the watchlist grab due to
				 * the above statements, as the storage is already grabbed when
				 * the page is loaded.
				 */
				
				// Grab current watchlist
				//crapi.clone(["watchlist"], function(d) {
				{
					var d = {watchlist: storage.watchlist};
					var watchlist = d.watchlist;
					
					// Determine if item is watched
					var watchedIndex = watchlist.findIndex(function(e) {
						return e.link == link;
					});
					
					var $firstSection = $("aside > section").first();
					
					// Set up actions section
					var $actions = _factory(".modation-factory", ".modation-watchlist-actions");
					var $addContainer = $actions.children(".add");
					var $removeContainer = $actions.children(".remove");
					var $target, $context;
					
					// Add actions section before first section (admin/artist)
					$firstSection.before($actions);
					
					// Helper function to update view
					(function _updateView() {
						// Use ~ trick to convert index result into coerced boolean
						// (see http://stackoverflow.com/a/12299678)
						var watched = ~watchedIndex;
						
						/**
						 * These two blocks are very similar. It would be great
						 * to find some way to abstract them together.
						 */
						
						// Item not on watchlist
						if (!watched) {
							$target = $addContainer;
							$context = $removeContainer;
							
							var $watch = $addContainer.find(".watch");
							handle($watch, "click.initWatchlist", function(e) {
								e.preventDefault();
								
								// Request watchlist metadata
								chrome.runtime.sendMessage({action: "parseWatchlistItem", link: link, html: document.documentElement.innerHTML, type: type}, function(result) {
									// Add item to watchlist
									var newIndex = d.watchlist.push(result.updates) - 1;
									
									crapi.updateAll(d, function(success) {
										if (success) {
											if (global.debug) console.log("item watched! %o", d);
											
											// Update watched index
											watchedIndex = newIndex;
											
											// Trigger view update
											_updateView();
										}
										
										else {
											console.error("Item not watched due to storage lock! Please try again in a few seconds.");
										}
									});
								});
							});
						}
						
						// Item on watchlist
						else {
							$target = $removeContainer;
							$context = $addContainer;
							
							var $unwatch = $removeContainer.find(".unwatch");
							handle($unwatch, "click.initWatchlist", function(e) {
								e.preventDefault();
								
								// Remove item from watchlist
								var deleted = d.watchlist.splice(watchedIndex, 1);
								
								crapi.updateAll(d, function(success) {
									if (success) {
										if (global.debug) console.log("item unwatched! %o", deleted);
										
										// Update watched index
										watchedIndex = -1;
										
										// Trigger view update
										_updateView();
									}
									
									else {
										console.error("Item not unwatched due to storage lock! Please try again in a few seconds.");
									}
								});
							});
						}
						
						showView($context, $target, 0);
					})();
				}
				//});
			}
		});
	}
	
	//Profile tips
	/*Opentip.styles.profileTip = {
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
	Opentip.lastZIndex = 676;*/
}

//Improved initialization
/*function init() {
	//Profile Tips
	/*if (storage[me.email]["profile_tips"]) {
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
		if (storage[me.email]["smart_player"]) {
			$player.on("play", function() {
				//Send pause everything message
				chrome.runtime.sendMessage({action: "modation-pause-everything", guid: guid});
			});
			
			//Initialize small player
			small_player();
		}
		
		//Add player actions
		if (storage[me.email]["player_actions"]) {
			player_actions();
		}
	}
	
	//Feed
	if (location.href.match(/\/feed/)) {
		//Initialize dynamic feed
		if (storage[me.email]["dynamic_feed"]) {
			//dynamic_feed();
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
	
	//Chrome studio
	if (location.href.match(/chrome.soundation.com/)) {
		afdStudio();
	}
	
	//Rest of the site
	else {
		afdCommunity();
	}/*
}*/

//Initialize tracks
/*function initTracks() {
	var $myTracks = $(".feed-item.track").has(".info a[href='" + me.link + "']");
	
	//Feed has editable tracks
	if ($myTracks.length) {
		//Iterate tracks
		$myTracks.each(function(i, e) {
			var $track = $(this);
			
			var shortlink = $track.find(".share-sheet input").val();
			
			console.log("shortlink: %o", shortlink);
		});
	}
}*/

/* Watchlist UI generation */
/*function watchlist_ui() {
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

function isAfd() {
	var afd = moment();
	afd.month(3); //April
	afd.date(1); //1st
	
	return moment().isSame(afd, "day");
}

function afdStudio() {
	if (!isAfd()) return;
	
	//Set up page
	$("html, body").height("100%");
	
	$("html").on("click", "button, a", function(e) {
		var $this = $(this);
		
		$this.toggleClass("afd-mirror");
	});
	
	//Set up AprilApril
	var april = new AprilApril({
		rotate: true
	});
	
	//:D
	//april.fool();
}

function afdCommunity() {
	if (!isAfd()) return;
	
	//Set up AprilApril
	var april = new AprilApril({
		replaceImages: true,
		scrambleLinks: true
	});
	
	//:D
	april.fool();
}*/