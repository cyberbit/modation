var lastPage;
var save = true;
var tracks = [];
var pages = [];
var trackInfo = [];

//Storage for option defaults
var optionDefaults = {
	desktop_notifs: true,
	sticky_sidebars: true,
	group_mods: true,
	recent_tracks: true,
	profile_tips: true,
	group_tips: true,
	smart_player: true,
	player_actions: true,
	comment_tags: true,
	dynamic_feed: false,
	small_feed: false
};

$(function() {
	//Initialize all the things
	initAlerts();
	initNav();
	initNewOptions();
	
	/*initOptions();
	initStorage();
	initTracks();
	initWatchlist();
	initPages();
	
	//Hash parsing for tabs
	$(window).on("hashchange", function() {
		parseHash();
	});
	
	//Pick initial menu
	selectMenu("tab-community", "menu-sticky-sidebars");
	
	//Login
	login();*/
});

//Initialize new options handler
function initNewOptions() {
	$(window).load(function() {
		//Hide loader
		$(".page-loader").fadeOut("slow");
		
		//Login
		newLogin();
	});
}

//Login to Soundation
function newLogin() {
	var $nav = $("nav.login");
	var $link = $nav.find(".user-link");
	var $btn = $nav.find(".user-login");
	
	modapi.login(function(me) {
		console.log("login: %o", me);
		
		//Login unsuccessful
		if (!me.success) {
			//Format login navigation
			$link.hide();
			$btn.text("Login").attr("href", global.path.login);
			
			//Show login message
			showAlert("You are not logged in. Please login to Soundation", 0);
		}
		
		//Login successful
		else {
			//Format login navigation
			$link.show().text(me.username).attr("href", global.path.home + me.link);
			$btn.text("Account").attr("href", global.path.profile);
			showAlert("Logged in as " + me.username);
			
			//Load options
			loadOptions(me);
		}
	});
}

//Load options
function loadOptions(me) {
	//Clear local storage, if any
	crapi.storage("local").clear();
	
	crapi.clone(function(d) {
		var options = d;
		
		console.log("options: %o", options);
	});
}

//Initialize alerts
function initAlerts() {
	var $alert = $(".alert");
	
	//Close button handler
	handle($alert.find(".close"), "click.initAlerts", function() {
		$alert.addClass("hidden");
	});
}

//Show alert
function showAlert(text, timeout) {
	if (typeof timeout == "undefined") timeout = 1700;
	
	var $alert = $(".alert");
	
	//Set up alert
	$alert.find(".text").text(text);
	
	//Show alert
	$alert.removeClass("hidden");
	
	//Wait a bit
	if (timeout) setTimeout(_callback, timeout);
	
	function _callback() {
		//Hide alert
		$alert.addClass("hidden");
	}
}

//Initialize navigation
function initNav() {
	var $pageLinks = $("nav.main [data-page]");
	var $tabGroups = $("nav.inner[data-page]");
	var $contentGroups = $("main .inner[data-page]");
	
	/*$contentGroups.each(function(i, e) {
		var $contentGroup = $(e);
		var $first = $contentGroup.find("[data-content]").first();
		
		//Show first content group
		$first.siblings().hide();
		$first.show();
	});*/
	
	//Window hash handler
	handle(window, "hashchange.initNav", function() {
		//Parse hash into page and tab
		var hash = location.hash.substring(1);
		var split = hash.split("/");
		var page = split[0];
		var tab = (typeof split[1] != "undefined" ? split[1] : "");
		
		//Grab links
		var $pageLink = $pageLinks.filter("[data-page='" + page + "']");
		var $tabGroup = $tabGroups.filter("[data-page='" + page + "']");
		var $tabLink = (tab) ? $tabGroup.find("[data-tab='" + tab + "']") : $tabGroup.find("a").first();
		var $contentGroup = $contentGroups.filter("[data-page='" + page + "']");
		var $content = (tab) ? $contentGroup.find("[data-content='" + hash + "']") : $contentGroup.find("[data-content]").first();
		
		//Format page links
		$pageLink.siblings().removeClass("current");
		$pageLink.addClass("current");
		
		//Show tab group
		$tabGroup.siblings().hide();
		$tabGroup.show();
		
		//Format tab link
		$tabLink.siblings().removeClass("current");
		$tabLink.addClass("current");
		
		//Show content group
		$contentGroup.siblings().hide();
		$contentGroup.show();
		
		//Show content
		$content.siblings().hide();
		$content.show();
	});
	
	//Select first page if none specified
	if (!location.hash) {
		var page = $pageLinks.first().attr("href");
		
		location = firstTab(page.substring(1));
	}
	
	//Select tab
	else $(window).trigger("hashchange");
	
	function firstTab(page) {
		return $tabGroups.filter("[data-page=" + page + "]").children().first().attr("href");
	}
}

//Initialize options handler
function initOptions() {
	$("#check-login").click(login);
	$(".option").change(save_options);
}

//Initialize storage handler
function initStorage() {
	var $tab = $("#tab-storage");
	var $copyBox = $(".storage-copy");
	var $confirm = $(".storage-confirm");
	
	//Initialize progress container
	$tab.find("#progressContainer").html('<div><div class="progressStatus">&nbsp;</div><div id="progress"></div><div>');
	
	//Grab progress elements
	var $progress = $tab.find("#progress");
	var $status = $tab.find(".progressStatus");
	
	//Format progress bar
	$status.text("Loading...");
	$progress.progressbar({value: false});
	$progress.height(20);
	
	//Divisor for storage display
	var divisor = 1024; //KiB
	
	//Grab storage information
	var quota = crapi.storage().QUOTA_BYTES;
	var quotaFixed = (quota / divisor).toFixed(2);
	
	//Grab usage
	crapi.storage().getBytesInUse(function(bytes) {
		var bytesFixed = (bytes / divisor).toFixed(2);
		var percent = (100 * bytes / quota).toFixed(2);
		
		//Format progress bar
		$status.text(bytesFixed + " of " + quotaFixed + " KiB (" + percent + "%)");
		progress("tab-storage", parseFloat(percent))
	});
	
	//Grab and display current data
	crapi.clone(function(d) {
		$copyBox.text(btoa(JSON.stringify(d)));
	});
	
	//Copy box handler
	$copyBox.click(function() {
		this.select();
	});
	
	//Paste box handler
	$(".storage-paste").on("input change", function() {
		var $this = $(this);
		var parsedStorage = {};
		var status = "No data";
		var pre = "", context = "empty";
		
		//Pasted storage exists
		if ($this.val()) {
			pre = "text-";
			
			//Attempt conversion of data
			try {
				parsedStorage = $.parseJSON(atob($this.val()));
				
				//Conversion succeeded
				status = "Looks good!";
				context = "success";
				
				//Enable button
				$confirm.removeClass("disabled");
			}
			
			//Conversion failed
			catch (e) {
				status = "Invalid storage, try again!";
				context = "danger";
				
				//Disable button
				$confirm.addClass("disabled");
			}
		}
		
		//Pasted storage does not exist
		else {
			//Disable button
			$confirm.addClass("disabled");
		}
		
		//Update status
		$(".storage-status")
			.removeClass("empty text-danger text-success")
			.addClass(pre + context)
			.text(status);
	});
	
	//Confirm button handler
	$confirm.click(function() {
		var result = confirm("Are you sure you wish to overwrite your saved storage? This action is not reversible!\n\nPress OK to confirm.");
		
		//Action confirmed
		if (result) {
			var parsedStorage = $.parseJSON(atob($(".storage-paste").val()));
			
			//Replace storage
			crapi.updateAll(parsedStorage, function() {
				//Show notification
				error('<strong>Storage pasted! Please reload Modation to load these changes.</strong><br><input class="nice-button orange noshadow" id="reload-browser" type="button" style="padding: 5px 8px;" value="Reload now">');
				
				//Bind double-check button
				$("#reload-browser").click(function() {
					chrome.runtime.reload();
				});
				
				//Modalize
				$(".cover").fadeIn(150);
			});
		}
	})
}

//Initialize track manager
function initTracks() {
	$("#track-filter").hide();
	$("#download-tracks").click(getTracks);
}

//Initialize watchlist
function initWatchlist() {
	$("#check-watchlist").click(function() {
		$("#watchlist-container .wItem").addClass("load");
		check_watchlist(true, refresh_watchlist);
	});
}

//Initialize pages
function initPages() {
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
}

//Get a factory item
function _factory(key) {
	return $(".factory ." + key).clone();
}

//Parse hash and do stuff
function parseHash() {
	if (location.hash === "") location.hash = "#general";
	if (location.hash === "#general") selectTab("tab-general");
	if (location.hash === "#storage") selectTab("tab-storage");
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
			var manifest = crapi.manifest();
			$('#modation_version').html("Version: <strong>" + manifest.version + (manifest.version_suffix ? "-" + manifest.version_suffix : "") + "</strong>");
			$('#modation_author').html("Author: <strong>" + manifest.author + "</strong>");
			getChangelog();
		}
	}
}

function selectMenu(parentID, id, callback) {
	if (typeof callback == "undefined") callback = function(){};
	
	if (!$('#' + parentID + ' [data-menu="' + id + '"]').is(".current")) {
		$('#' + parentID + ' .menu.column a').removeClass("current");
		$('#' + parentID + ' [data-menu="' + id + '"]').addClass("current");
		$('#' + parentID + ' [id^="menu-"]').hide();
		$('#' + parentID + ' #' + id).show();
	}
	
	callback(id);
}

//Login to settings
/*function login() {
	//Grab loader
	$loader = $("#logincheck .loader");
	
	//Show loader
	$loader.fadeIn(150);
	
	//Disable navigation
	$("header .sub a:not(.current)").addClass("disabled");
	
	//Grab current user
	modapi.login(function(me) {
		//If successful, do stuff
		if (me.success) {
			//Hide notif bar, if needed
			if (!save) {
				$('#notification-bar').animate({top: "-" + (58 + 1) + "px"}, "fast", "easeOutQuart", function() {
					$(this).remove();
				});
			}
			
			//Enable option saving
			save = true;
			
			//Demodalize
			$(".cover").fadeOut(150);
			
			//Set email
			$("#email").val(me.email);
			
			//Restore options
			restore_options();
			
			//Enable navigation
			$("header .sub a").removeClass("disabled");
			
			//Load (bookmarked) page
			$(window).trigger("hashchange");
		}
		
		//Not successful
		else {
			//Disable option saving
			save = false;
			
			//Modalize
			$(".cover").fadeIn(150);
			
			//Show error
			error('<strong>Uh oh, looks like you are not logged in! <a href="http://soundation.com/feed" target="_blank" style="color: #de5931">Login</a></strong><br><input class="nice-button orange noshadow" id="check-login-again" type="button" style="padding: 5px 8px;" value="Double-check">');
			
			//Bind double-check button
			$("#check-login-again").click(login);
		}
		
		//Hide loader
		$loader.fadeOut(150);
	});
}*/

//Loads track manager list
function getTracks() {
	$(".track").fadeOut(400, function() { $(this).remove(); });
	$("#track-filter, #filter-result").fadeOut();
	$('#tab-tracks aside').fadeOut(400, function() {
		$('#tab-tracks .aside-cover').fadeOut(200);
		$('#tab-tracks aside').trigger("sticky_kit:detach");
		$(this).remove();
	});
	if (!$('#tab-tracks #progress').length) {
		$("#tab-tracks #progressContainer").html('<div><div class="progressStatus">&nbsp;</div><div id="progress"></div><div>');
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

//Grabs page of tracks
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

//Grabs information from Modation group
function getChangelog() {
	$('#modation_changelog').before('<span class="loader">Grabbing current information... <img src="img/loadingf5t.gif"></span>');
	$.get("http://soundation.com/group/modation", function(html) {
		var oHtml = $(html);
		var changelog = oHtml.find('h3:contains("Changelog") + div').html();
		$('#modation_changelog').html(changelog);
		$('#tab-about .loader').remove();
	});
}

//Opens track edit form
function editTrack(id, page) {
	if (!$('#tab-tracks aside').length) {
		$('#tab-tracks').prepend('<aside style="display: none">' +
			'<div class="container">' +
				'<div class="aside-cover"><img src="img/loadingealarget.gif"></div>' +
				'<div class="wrapper"><h3>Modation Track Editor</h3></div>' +
				'<form accept-charset="UTF-8" enctype="multipart/form-data" id="edit_mixdown">' +
					'<div class="wrapper">' +
						'<input name="_method" type="hidden" value="put">' +
						'<input id="token" name="authenticity_token" type="hidden" value="">' +
						'<label for="mixdown_title">Title</label>' +
						'<input id="mixdown_title" maxlength="100" name="mixdown[title]" size="100" type="text" style="width: 93%">' +
						'<label for="mixdown_description">Description</label>' +
						'<textarea id="mixdown_description" maxlength="255" name="mixdown[description]" style="width: 93%; height: 75px; resize: vertical"></textarea>' +
						'<label for="mixdown_genre_id" style="padding-right: 3px">Genre:</label>' +
						'<select id="mixdown_genre_id" name="mixdown[genre_id]" style="margin: 0">' +
							'<option value="">None</option>' +
							'<option value="1">Blues</option>' +
							'<option value="2">Classical</option>' +
							'<option value="3">Country</option>' +
							'<option value="4">DJ Effects</option>' +
							'<option value="5">Electronica</option>' +
							'<option value="6">Funk</option>' +
							'<option value="7">Hip Hop/Urban</option>' +
							'<option value="8">Jazz</option>' +
							'<option value="9">Latin</option>' +
							'<option value="10">Reggae</option>' +
							'<option value="11">Rock</option>' +
							'<option value="12">World</option>' +
						'</select>' +
					'</div>' +
					'<div class="wrapper" style="text-align: center">' +
						'<input name="mixdown[published]" type="hidden" value="0">' +
						'<input id="mixdown_published" class="toggle visible nice-button green" name="mixdown[published]" type="checkbox" value="1">' +
						'<input name="mixdown[allow_comments]" type="hidden" value="0">' +
						'<input id="mixdown_allow_comments" class="toggle comments nice-button orange" name="mixdown[allow_comments]" type="checkbox" value="1">' +
						'<input name="mixdown[allow_download]" type="hidden" value="0">' +
						'<input id="mixdown_allow_download" class="toggle download nice-button blue" name="mixdown[allow_download]" type="checkbox" value="1">' +
					'</div>' +
				'</form>' +
				'<div class="wrapper last" style="text-align: center">' +
					'<a id="save" class="nice-button orange large">Save</a>' +
				'</div>' +
			'</div>' +
		'</aside>');
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

//Saves track
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

//Grabs tracks from page
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

//Update track data
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

//Get track list item by id
function getTrack(id, parent) {
	if (typeof parent != "undefined") return parent.find('a[href*="/tracks/' + id + '/edit"]').parents('div.track');
	return $('a[href*="/tracks/' + id + '/edit"]').parents('div.track');
}

//Save options
function save_options() {
	crapi.clone(function(d) {
		//Storage for email
		var email = $("#email").val();
		
		//Storage for account options
		var o = d[email];
		
		//Save options, if needed
		if (save) {
			$(".option").each(function() {
				//Storage for ID
				var id = $(this).attr("id");
				
				//Store option state for ID
				o[id] = $(this).is(":checked");
			});
		}
		
		//Update storage
		crapi.update(email, o, function() {
			status("Settings saved.");
		});
	});
}

//Update progress bar status
function progressStatus(tab, msg) {
	$("#" + tab + " .progressStatus").text(msg);
}

//Update progress bar
function progress(tab, val) {
	$("#" + tab + " #progress").progressbar("value", val);
}

//Show status notification
function status(msg) {
	msg = (typeof msg == "undefined" ? "Something happened." : msg);
	showNotificationBar(msg, 1300, "#15842f", "white");
}

//Show error notification
function error(msg) {
	msg = (typeof msg == "undefined" ? "Something <strong>bad</strong> happened." : msg);
	
	showNotificationBar(msg, 0, "#842f15", "white", 58);
}

//Restores options and sets defaults
function restore_options() {
	var email = $("#email").val();
	
	crapi.clone(function(d) {
		//Initialize user, if needed
		if (typeof d[email] == "undefined") {
			d[email] = {};
		}
		
		//Storage for options
		var options = $(".option");
		
		//Storage for missing settings counter
		var missing = 0;
		
		//Storage for completion callback
		var cb = function() {
			status("Settings restored.");
		};
		
		//Iterate through options
		options.each(function() {
			var id = $(this).attr("id");
			
			//Add unsaved options to storage
			if (!(id in d[email])) {
				d[email][id] = (id in optionDefaults ? optionDefaults[id] : true);
				missing++;
			}
			
			//Apply option to element
			$("#" + id).attr("checked", d[email][id]);
		});
		
		//Default for watchlist?
		if (typeof d[email]['watchlist'] == "undefined") d[email]['watchlist'] = [];
		if (typeof d[email]['watchlist-queue'] == "undefined") d[email]['watchlist-queue'] = [];
		
		//Set defaults, if needed
		if (missing) {
			console.info("Some settings missing, setting defaults...");
			save_options();
			crapi.update(email, d[email], cb);
		} else {
			cb();
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
	
	crapi.clone(function(d) {
		var watchlist = d[email]["watchlist"] || {};
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
					var isGroup = (link.match(/group\/.*-/) ? true : false);
					
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
			if (update) crapi.update(email, d[email], callback);
			else callback();
		}
	});
}
	
//Remove from watchlist
function delete_watchlist(link, callback) {
	if (typeof callback == "undefined") callback = function(){};
	
	var email = $("#email").val();
	
	crapi.clone(function(d) {
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
			crapi.update(email, d[email], callback);
		}
	});
}

//Loads watchlist form
function refresh_watchlist() {
	var email = $('#email').val();
	
	crapi.clone(function(d) {		
		var watchlist = d[email]["watchlist"] || {};
		
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

//Display notification bar
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