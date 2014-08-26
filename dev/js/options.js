var lastPage;
var save = true;
var tracks = [];
var pages = [];
var trackInfo = [];

$(document).ready(function() {
	$('#pdalogincheck').click(getLogin);
	$('#download_tracks').click(getTracks);
	$('#watchlist_check').click(function() {
		$("#watchlist-container .wItem").addClass("load");
		check_watchlist(true, refresh_watchlist);
	});
	$('.main-wrapper:not(#tab-tracks) input').on("change", save_options);
	$('#track-filter').hide();
	$('header .sub a').click(function() {
		var tab = $(this).attr("data-tab");
		location.hash = "#" + $(this).attr("data-hash");
	});
	$('.menu a').click(function(){
		var currentPage = $(this).parents(".main-wrapper").attr("id");
		var menu = $(this).attr("data-menu");
		selectMenu(currentPage, menu, function(id) {
			if (id == "menu-watchlist") {
				refresh_watchlist();
			}
		});
	});
	$(window).on("hashchange", function() {
		parseHash();
	});
	//This is now initiated by the getLogin function
	/* $(window).trigger("hashchange"); */
	selectMenu("tab-community", "menu-sticky-sidebars");
	getLogin();
});

//Get a factory item
function _factory(key) {
	return $(".factory ." + key).clone();
}

//Parse hash and do stuff
function parseHash() {
	if (location.hash === "") location.hash = "#general";
	if (location.hash === "#general") selectTab("tab-general");
	if (location.hash === "#notifs") selectTab("tab-notifs");
	if (location.hash === "#community") selectTab("tab-community");
	if (location.hash === "#tracks") selectTab("tab-tracks");
	if (location.hash === "#about") selectTab("tab-about");
}

//Change tab
function selectTab(id) {
	if (!$('[data-tab="' + id + '"]').is(".current")) {
		$('header .sub a').removeClass("current");
		$('[data-tab="' + id + '"]').addClass("current");
		$('.main-wrapper').hide();
		$('#' + id).show();
		if (id == "tab-about") {
			var manifest = getManifest();
			$('#modation_version').html("Version: <strong>" + manifest.version + "</strong>");
			$('#modation_author').html("Author: <strong>" + manifest.author + "</strong>");
			getChangelog();
		}
	}
}

function selectMenu(parentID, id, callback) {
	//console.log("parent:" + parentID);
	//console.log("id:" + id);
	if (typeof callback == "undefined") callback = function(){};
	
	if (!$('#' + parentID + ' [data-menu="' + id + '"]').is(".current")) {
		$('#' + parentID + ' .menu.column a').removeClass("current");
		$('#' + parentID + ' [data-menu="' + id + '"]').addClass("current");
		$('#' + parentID + ' [id^="menu-"]').hide();
		$('#' + parentID + ' #' + id).show();
	}
	
	callback(id);
}

//Grab email and resore settings
function getLogin() {
	if (!$('#logincheck .loader').length) {
		$('#pdalogincheck').before('<img class="loader" src="img/loadingf5t.gif">');
		$('#logincheck .loader').hide();
		$('#logincheck .loader').fadeIn(150);
	}
	$('header .sub a:not(.current)').addClass("disabled");
	$.get("http://soundation.com/account/profile", function(html) {
		html = html.replace(/<img\b[^>]*>/ig, '');
		var oHtml = $(html);
		var email = oHtml.find('.email').text();
		if (email == "") {
			save = false;
			$(".cover").fadeIn(150);
			error('<strong>Please <a href="http://soundation.com/feed" target="_new" style="color: #de5931">login</a> to change settings!</strong><br><input class="nice-button orange noshadow" id="pdalogincheckagain" type="button" style="padding: 5px 8px;" value="Double-check">');
			$("#pdalogincheckagain").click(function() {$("#pdalogincheck").click()});
		} else {
			if (!save) {
				$('#notification-bar').animate({top: "-" + (58 + 1) + "px"}, "fast", "easeOutQuart", function() {
					$(this).remove();
				});
			}
			save = true;
			$(".cover").fadeOut(150);
			$('#email').val(email);
			restore_options(email);
			$('header .sub a').removeClass("disabled");
			$(window).trigger("hashchange");
		}
		$('#logincheck .loader').fadeOut(150, function(){$(this).remove();});
	});
}

function getTracks() {
	$(".track").fadeOut(400, function() { $(this).remove(); });
	$("#track-filter, #filter-result").fadeOut();
	$('#tab-tracks aside').fadeOut(400, function() {
		$('#tab-tracks .aside-cover').fadeOut(200);
		$('#tab-tracks aside').trigger("sticky_kit:detach");
		$(this).remove();
	});
	if (!$('#tab-tracks #progress').length) {
		$("#tab-tracks #progressContainer").html('<div><div id="progressStatus">&nbsp;</div><div id="progress"></div><div>');
		$("#tab-tracks #progress").parent().hide();
		$("#tab-tracks #progress").progressbar({
			value: false
		});
		$("#tab-tracks #progress").height(10);
		$("#tab-tracks #progress").parent().fadeIn(150);
	}
	progressStatus("tab-tracks", "Paginating...");
	$.get("http://soundation.com/account/tracks", function(html) {
		html = html.replace(/<img\b[^>]*>/ig, '');
		var oHtml = $(html);
		lastPage = oHtml.find('.pagination .last a').prop("href");
		if (typeof lastPage == "undefined") { lastPage = 1; }
		else { lastPage = lastPage.match(/(?:page=)(\d*)/i)[1]; }
		for (var i = 1; i <= lastPage; i++) {
			getTrackPage(i);
		}
	});
}

function getTrackPage(page) {
	var pageTracks = [];
	pages.push(page);
	
	$.get("http://soundation.com/account/tracks?page=" + page, function(html) {
		var oHtml = $(html);
		oHtml.find('.track').each(function() { pageTracks.push($($(this)[0].outerHTML).append('<input type="hidden" value="' + page + '">')[0].outerHTML) });
		tracks[page] = pageTracks;
		var pageIndex = pages.indexOf(page);
		pages.splice(pageIndex, 1);
		var percent = ((lastPage - pages.length) / lastPage) * 100;
		progressStatus("tab-tracks", "Working page " + page + "...");
		progress("tab-tracks", percent);
		if (!pages.length) {
			$('#tab-tracks #progress').parent().fadeOut(150, function(){$(this).remove();});
			enumerateTrackList();
		}
	});
}

function getChangelog() {
	$('#tab-about h3').after('<span class="loader">Grabbing current information... <img src="img/loadingf5t.gif"></span>');
	$.get("http://soundation.com/group/modation", function(html) {
		var oHtml = $(html);
		var changelog = oHtml.find('h3:contains("Changelog") + div').html();
		$('#modation_changelog').html(changelog);
		$('#tab-about .loader').remove();
	});
}

function getManifest() {
	return chrome.runtime.getManifest();
}

function editTrack(id, page) {
	if (!$('#tab-tracks aside').length) {
		$('#tab-tracks').prepend('<aside style="display: none">\
			<div class="container">\
				<div class="aside-cover"><img src="img/loadingealarget.gif"></div>\
				<div class="wrapper"><h3>Modation Track Editor</h3></div>\
				<form accept-charset="UTF-8" enctype="multipart/form-data" id="edit_mixdown">\
					<div class="wrapper">\
						<input name="_method" type="hidden" value="put">\
						<input id="token" name="authenticity_token" type="hidden" value="">\
						<label for="mixdown_title">Title</label>\
						<input id="mixdown_title" maxlength="100" name="mixdown[title]" size="100" type="text" style="width: 93%">\
						<label for="mixdown_description">Description</label>\
						<textarea id="mixdown_description" maxlength="255" name="mixdown[description]" style="width: 93%; height: 75px; resize: vertical"></textarea>\
						<label for="mixdown_genre_id" style="padding-right: 3px">Genre:</label>\
						<select id="mixdown_genre_id" name="mixdown[genre_id]" style="margin: 0">\
							<option value="">None</option>\
							<option value="1">Blues</option>\
							<option value="2">Classical</option>\
							<option value="3">Country</option>\
							<option value="4">DJ Effects</option>\
							<option value="5">Electronica</option>\
							<option value="6">Funk</option>\
							<option value="7">Hip Hop/Urban</option>\
							<option value="8">Jazz</option>\
							<option value="9">Latin</option>\
							<option value="10">Reggae</option>\
							<option value="11">Rock</option>\
							<option value="12">World</option>\
						</select>\
					</div>\
					<div class="wrapper" style="text-align: center">\
						<input name="mixdown[published]" type="hidden" value="0">\
						<input id="mixdown_published" class="toggle visible nice-button green" name="mixdown[published]" type="checkbox" value="1">\
						<input name="mixdown[allow_comments]" type="hidden" value="0">\
						<input id="mixdown_allow_comments" class="toggle comments nice-button orange" name="mixdown[allow_comments]" type="checkbox" value="1">\
						<input name="mixdown[allow_download]" type="hidden" value="0">\
						<input id="mixdown_allow_download" class="toggle download nice-button blue" name="mixdown[allow_download]" type="checkbox" value="1">\
					</div>\
				</form>\
				<div class="wrapper last" style="text-align: center">\
					<a id="save" class="nice-button orange large">Save</a>\
				</div>\
			</div>\
		</aside>');
		$('#tab-tracks aside').fadeIn();
	}
	$('#edit_mixdown').off("submit");
	$('#edit_mixdown').submit(function(e) {
		saveTrack(id, page);
		e.preventDefault();
	});
	$('#tab-tracks aside').stick_in_parent();
	$('#tab-tracks aside').addClass("disabled");
	$('#tab-tracks .aside-cover').fadeIn(200);
	$.get("http://soundation.com/account/tracks/" + id + "/edit", function(html) {
		trackInfo = [];
		var oHtml = $(html);
		trackInfo["token"] = oHtml.find('[name="authenticity_token"]').val();
		trackInfo["title"] = oHtml.find('#mixdown_title').val();
		trackInfo["desc"] = oHtml.find('#mixdown_description').text();
		trackInfo["genre"] = oHtml.find('#mixdown_genre_id').val();
		trackInfo["visible"] = oHtml.find('#mixdown_published').is(":checked");
		trackInfo["comments"] = oHtml.find('#mixdown_allow_comments').is(":checked");
		trackInfo["download"] = oHtml.find('#mixdown_allow_download').is(":checked");
		$('#token').val(trackInfo["token"]);
		$('#mixdown_title').val(trackInfo["title"]);
		$('#mixdown_description').text(trackInfo["desc"]);
		$('#mixdown_genre_id').prop("selectedIndex", trackInfo["genre"]);
		$('#mixdown_published').prop("checked", trackInfo["visible"]);
		$('#mixdown_allow_comments').prop("checked", trackInfo["comments"]);
		$('#mixdown_allow_download').prop("checked", trackInfo["download"]);
		$('#tab-tracks aside').removeClass("disabled");
		$('#tab-tracks .aside-cover').fadeOut(200);
	});
	$('#save').off("click.save");
	$('#save').on("click.save", function() { saveTrack(id, page) });
}

function saveTrack(id, page) {
	$('#tab-tracks aside').addClass("disabled");
	$('#tab-tracks .aside-cover').fadeIn(200);
	$.post("http://soundation.com/account/tracks/" + id, $("#edit_mixdown").serialize(), function() {
		$('#tab-tracks aside').fadeOut(400, function() {
			$('#tab-tracks .aside-cover').fadeOut(200);
			$('#tab-tracks aside').trigger("sticky_kit:detach");
			$(this).remove();
		});
		updateTrack(id);
		status("Track saved.");
	});
}

function enumerateTrackList() {
	var allTracks = [];
	for (var i = 1; i < tracks.length; i++) {
		allTracks = allTracks.concat(tracks[i]);
	}
	$.each(allTracks, function(i, v) {
		$('.tracks-container').append(v);
	});
	$('.track').hide();
	$('a[href*="edit"]').each(function() {
		var trackID = $(this).prop("href").match(/tracks\/(\d*)/)[1];
		$(this).on("click", function(e) {
			editTrack(trackID, $(this).parents('div.track').find('input[type="hidden"]').val());
			e.preventDefault();
		});
	});
	$('.actions a').each(function() {
		var href = $(this).attr("href");
		if (!href.match(/powerfx\.soundation-mixdowns/)) {
			$(this).attr("href", "http://soundation.com" + href);
			$(this).prop("target", "_blank");
		} else $(this).prop("target", "dummy");
	});
	$('#track-filter').val('');
	$('.track, #track-filter, #filter-result').fadeIn();
	$('#track-filter').fastLiveFilter('.tracks-container', {
		selector: "h3",
		callback: function(t) {
			$('#filter-result').html("Showing " + t + " track" + (t != 1 ? "s" : ""));
			$('#tab-tracks aside').trigger("sticky_kit:detach");
			$('#tab-tracks aside').stick_in_parent();
		}
	});
}

function updateTrack(id) {
	var page = getTrack(id).wrapInner('<div class="inner-wrap"></div>').prepend('<div class="track-cover"><img src="img/loadingealarget.gif" style="border-bottom: none"></div>').find('input[type="hidden"]').val()
	var trackContainer = getTrack(id);
	trackContainer.addClass("disabled");
	trackContainer.find('.track-cover').fadeIn(200);
	$.get("http://soundation.com/account/tracks?page=" + page, function(html) {
		var oHtml = $(html);
		var data = $(getTrack(id, oHtml)[0].outerHTML).append('<input type="hidden" value="' + page + '">')[0].innerHTML;
		getTrack(id).find('.inner-wrap').replaceWith(data);
		var track = getTrack(id);
		track.prepend('<div class="track-cover" style="display: block"><img src="img/loadingealarget.gif" style="border-bottom: none"></div>');
		track.find('a[href*="edit"]').each(function() {
			$(this).on("click", function(e) {
				editTrack(id, page);
				e.preventDefault();
			});
		});
		track.removeClass("disabled");
		track.find('.track-cover').fadeOut(200);
	});
}

function getTrack(id, parent) {
	if (typeof parent != "undefined") return parent.find('a[href*="/tracks/' + id + '/edit"]').parents('div.track');
	return $('a[href*="/tracks/' + id + '/edit"]').parents('div.track');
}

// Saves options to localStorage.
function save_options() {
	chrome.storage.local.get(email, function(d) {
		var emailSettings = d[email];
		
		if (save) {
			var email = $('#email').val();
			var desktop_notifs = $('[name^="desktop_notifs"]:checked').val();
			var sticky_sidebars = $('[name^="sticky_sidebars"]:checked').val();
			var group_mods = $('[name^="group_mods"]:checked').val();
			var player_downloads = $('[name^="player_downloads"]:checked').val();
			var super_pages_global = $('[name^="super_pages_global"]:checked').val();
			var super_pages_track_comments = $('[name^="super_pages_track_comments"]:checked').val();
			var super_pages_account_tracks = $('[name^="super_pages_account_tracks"]:checked').val();
			var super_pages_product_list = $('[name^="super_pages_product_list"]:checked').val();
			var super_pages_feed = $('[name^="super_pages_feed"]:checked').val();
			var super_pages_tracks = $('[name^="super_pages_tracks"]:checked').val();
			var super_pages_groups = $('[name^="super_pages_groups"]:checked').val();
			var super_pages_user_tracks = $('[name^="super_pages_user_tracks"]:checked').val();
			var super_pages_group_comments = $('[name^="super_pages_group_comments"]:checked').val();
			/*var watchlist = [];
			watchlist.push({
				"title": "Team Soundation",
				"link": "group/team-soundation",
				"following": 0,
				"comments": 85502,
				//"changed": 1402191771040
			});
			watchlist.push({
				"title": "Distant by cyberbit",
				"link": "user/cyberbit/track/distant",
				"comments": 83881,
				"likes": 5,
				"downloads": 2,
				//"changed": 1402191771040
			});
			watchlist.push({
				"link": "user/foobar/track/htied"
			});*/
			emailSettings["desktop_notifs"] = desktop_notifs;
			emailSettings["sticky_sidebars"] = sticky_sidebars;
			emailSettings["group_mods"] = group_mods;
			emailSettings["player_downloads"] = player_downloads;
			emailSettings["super_pages_global"] = super_pages_global;
			emailSettings["super_pages_track_comments"] = super_pages_track_comments;
			emailSettings["super_pages_account_tracks"] = super_pages_account_tracks;
			emailSettings["super_pages_product_list"] = super_pages_product_list;
			emailSettings["super_pages_feed"] = super_pages_feed;
			emailSettings["super_pages_tracks"] = super_pages_tracks;
			emailSettings["super_pages_groups"] = super_pages_groups;
			emailSettings["super_pages_user_tracks"] = super_pages_user_tracks;
			emailSettings["super_pages_group_comments"] = super_pages_group_comments;
			
			update_storage(email, emailSettings, function() {
				// Update status to let user know options were saved.
				status("Settings saved.");
			});
		}
	});
}

function progressStatus(tab, msg) {
	$("#" + tab + " #progressStatus").text(msg);
}

function progress(tab, val) {
	$("#" + tab + " #progress").progressbar("value", val);
}

function status(msg) {
	msg = (typeof msg == "undefined" ? "Something happened." : msg);
	
	showNotificationBar(msg, 1300, "#15842f", "white");
}

function newFunc() {
	//Doesn't do anything yet, just chillin'
	alert("this is a new func!");
}

function newFunc2() {
	alert("this is a new func, too!");
}

function newFunc3() {
	
}

function error(msg) {
	msg = (typeof msg == "undefined" ? "Something <strong>bad</strong> happened." : msg);
	
	showNotificationBar(msg, 0, "#842f15", "white", 58);
}

// Restores options to saved values from localStorage.
function restore_options(email) {
	chrome.storage.local.get(email, function(d) {
		var emailSettings = d[email];
		
		//set up defaults (need more fool-proof method)
		if ($.isEmptyObject(emailSettings)) {
			$('#desktop_notifs_on').prop("checked", true);
			$('#sticky_sidebars_on').prop("checked", true);
			$('#group_mods_on').prop("checked", true);
			$('#player_downloads_on').prop("checked", true);
			$('#super_pages_global_on').prop("checked", true);
			$('#super_pages_track_comments_on').prop("checked", true);
			$('#super_pages_account_tracks_on').prop("checked", true);
			$('#super_pages_product_list_on').prop("checked", true);
			$('#super_pages_feed_on').prop("checked", true);
			$('#super_pages_tracks_on').prop("checked", true);
			$('#super_pages_groups_on').prop("checked", true);
			$('#super_pages_user_tracks_on').prop("checked", true);
			$('#super_pages_group_comments_on').prop("checked", true);
			save_options();
		} else {
			//Parse desktop notification settings
			var desktop_notifs = emailSettings["desktop_notifs"];
			var sticky_sidebars = emailSettings["sticky_sidebars"];
			var group_mods = emailSettings["group_mods"];
			var player_downloads = emailSettings["player_downloads"];
			var super_pages_global = emailSettings["super_pages_global"];
			var super_pages_track_comments = emailSettings["super_pages_track_comments"];
			var super_pages_account_tracks = emailSettings["super_pages_account_tracks"];
			var super_pages_product_list = emailSettings["super_pages_product_list"];
			var super_pages_feed = emailSettings["super_pages_feed"];
			var super_pages_tracks = emailSettings["super_pages_tracks"];
			var super_pages_groups = emailSettings["super_pages_groups"];
			var super_pages_user_tracks = emailSettings["super_pages_user_tracks"];
			var super_pages_group_comments = emailSettings["super_pages_group_comments"];
			$('#desktop_notifs_' + desktop_notifs).prop("checked", true);
			$('#sticky_sidebars_' + sticky_sidebars).prop("checked", true);
			$('#group_mods_' + group_mods).prop("checked", true);
			$('#player_downloads_' + player_downloads).prop("checked", true);
			$('#super_pages_global_' + super_pages_global).prop("checked", true);
			$('#super_pages_track_comments_' + super_pages_track_comments).prop("checked", true);
			$('#super_pages_account_tracks_' + super_pages_account_tracks).prop("checked", true);
			$('#super_pages_product_list_' + super_pages_product_list).prop("checked", true);
			$('#super_pages_feed_' + super_pages_feed).prop("checked", true);
			$('#super_pages_tracks_' + super_pages_tracks).prop("checked", true);
			$('#super_pages_groups_' + super_pages_groups).prop("checked", true);
			$('#super_pages_user_tracks_' + super_pages_user_tracks).prop("checked", true);
			$('#super_pages_group_comments_' + super_pages_group_comments).prop("checked", true);
			
			status("Settings restored.");
		}
	});
}

//Check watchlist
function check_watchlist(update, callback) {
	if (typeof update == "undefined") update = true;
	if (typeof callback == "undefined") callback = function(){};
	
	var email = $('#email').val();
	
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
				
				$("[value='" + link + "']").closest(".wItem").removeClass("load");
				
				//If last index, run iteration
				if (wCt == wLen) {
					status("Watchlist updated successfully.");
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
							//alert(title + " :: " + fDifStr + " follower" + (fDif > 1 || fDif < -1 ? "s" : ""));
						}
					}
					
					//Comments hook
					if (comment && wItem['comment'] != comment) {
						//BUGFIX: Alert was displaying for every added watchlist item
						if (typeof wItem['comment'] != "undefined") {
							wChangedItem['comment'] = "New comment";
							//alert(title + " :: New comment");
						}
						
						//Set comment in storage
						d[email]["watchlist"][i]['comment'] = comment;
					}
					
					if (Object.keys(wChangedItem).length > 1) {
						wChangedItem['link'] = link;
						
						wChanged.push(wChangedItem);
					}
				//}
			});
			
			console.log(wChanged);
			
			console.debug("final iteration complete!");
			if (update) update_storage(email, d[email], callback);
			else callback();
		}
	});
}

//Update storage for provided key
function update_storage(key, value, callback) {
	if (typeof callback == "undefined") callback = function(){};
	
	var updatedStorage = {};
	updatedStorage[key] = value;
	
	//Update storage
	chrome.storage.local.set(updatedStorage, callback);
}
	
//Remove from watchlist
function delete_watchlist(link, callback) {
	if (typeof callback == "undefined") callback = function(){};
	
	var email = $("#email").val();
	
	chrome.storage.local.get(email, function(d) {
		var watchlist = d[email]['watchlist'];
		var hasItem = false;
		
		$.each(watchlist, function(i, v) {
			//Loop through items until link is found
			if (v['link'] == link) {
				d[email]['watchlist'].splice(i, 1);
				hasItem = true;
				return false;
			}
			
			return true;
		});
		
		//Delete watchlist item and update
		if (hasItem) {
			update_storage(email, d[email], callback);
		}
	});
}

function refresh_watchlist() {
	var email = $('#email').val();
	
	chrome.storage.local.get(email, function(d) {
		var watchlist = d[email]["watchlist"];
		
		//Save container for future use
		var $wContainer = $("#watchlist-container");
		
		//Clear watchlist
		$wContainer.html('');
		
		//Iterate items
		$.each(watchlist, function(i, v) {
			//Set up variables
			var $wItem = _factory("wItem");
			var wItem = v;
			
			//Exception block to capture errors
			try {
				var link = wItem['link'];
				var title = wItem['title'];
						
				//Type switches
				var isTrack = (link.match(/user\/.*\/track\//) ? true : false);
				var isGroup = (link.match(/group\/.*/) ? true : false);
				
				//Apply changes
				if (isTrack) $wItem.addClass("track");
				if (isGroup) $wItem.addClass("group");
				if (wItem['fail']) $wItem.addClass("fail");
				
				$wItem.find(".label").html(title);
				$wItem.find(".link").val(link);
				$wItem.find("button.view").click(function() {
					window.open("http://soundation.com/" + link, "_blank");
				});
				$wItem.find("button.remove").click(function() {
					var r = confirm("Click OK to remove '" + title + "' from your watchlist.\n\nYou can always add it again later by using the 'Watch' button on the page.");
					
					if (r) {
						delete_watchlist(link, refresh_watchlist);
					}
				});
			} catch (e) {
				console.err(e);
			}
			
			$wItem.appendTo($wContainer);
		});
	});
}

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

function showNotificationBar(message, duration, bgColor, txtColor, height) {
	/*set default values*/
	fallbackHeight = 25;
	duration = typeof duration !== 'undefined' ? duration : 1500;
	bgColor = typeof bgColor !== 'undefined' ? bgColor : "#F4E0E1";
	txtColor = typeof txtColor !== 'undefined' ? txtColor : "#A42732";
	height = typeof height !== 'undefined' ? height : 25;
	
	var HTMLmessage = "<div class='notification-message' style='text-align:center; line-height: " + (height == 58 ? fallbackHeight : height) + "px;'> " + message + " </div>";
	
	/*create the notification bar div if it doesn't exist*/
	if ($('#notification-bar').length > 0) {
		$('#notification-bar').html(HTMLmessage);
		$('#notification-bar').effect("highlight", {color: "#0b4218"}, "fast");
	} else {
		$('body').prepend("<div id='notification-bar' style='width:100%; height:0px; background-color: " + bgColor + "; position: fixed; z-index: 100; color: " + txtColor + ";border-bottom: 1px solid " + txtColor + ";left: 0px;top: 0px;'>" + HTMLmessage + "</div>");
	}
	
	/*animate the bar*/
	$('#notification-bar').animate({height: height + "px"}, "fast", "easeOutBack");
	window.clearTimeout($('#notification-bar').data("timeout"));
	if (duration != 0) {
		$('#notification-bar').data("timeout", setTimeout(function() {
			$('#notification-bar').animate({top: "-" + (height + 1) + "px"}, "fast", "easeOutQuart", function() {
				$(this).remove();
			});
		}, duration));
	}
}