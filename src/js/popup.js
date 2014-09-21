$(document).ready(function() {
	parseNotifs();
	
	initTabs();
});

//Get a factory item
function _factory(key) {
	return $(".factory ." + key).clone();
}

//Initialize tabs
function initTabs() {
	$("nav a").click(function() {
		$(this).parents("nav").find("a").removeClass("active");
		$(this).addClass("active");
		$(".main-wrapper .content").hide();
		
		//Storage for tab
		var tab = $(this).data("tab");
		
		$("#" + $(this).data("tab") + "-container").show();
		
		//Parse specific tabs
		if (tab == "modation-watchlist") {
			parseWatchlist();
		}
	});
	
	$("nav a:first").click();
}

//Get and parse notifications
function parseNotifs() {
	$.get("http://soundation.com/feed", function(html) {
		//Remove images and form usable object
		html = html.replace(/(<iframe\b.*?<\/iframe>)|(<img\b[^>]*>)/ig, '');
		var $aside = $(html).find('aside');
		$aside.attr("id", "modation-notifications");
		var $parse = $("<strong>Unknown error</strong>");
		
		//Notification box is there
		if ($aside.length) {
			$parse = $aside;
		}
		
		//Notification box is not there (potentially redirected)
		else {
			//Update badge
			chrome.browserAction.setTitle({title:"Please login to view notifications"});
			chrome.browserAction.setBadgeBackgroundColor({color:"#9a9a9a"});
			chrome.browserAction.setBadgeText({text:"?"});
			
			//Form error notification
			$parse = $(_factory("modation-notifications-login"));
		}
		
		//Show parsed notification box
		$('#modation-notifications').replaceWith($parse);
		
		$('#modation-notifications a').each(function() {
			var href = $(this).attr('href');
			$(this).attr('href', 'http://soundation.com' + href);
			$(this).attr('target', '_blank');
		});
		var ct = 0;
		$('#modation-notifications form[action*=clear_notification]').each(function() {
			var action = $(this).attr('action');
			$(this).attr('action', 'http://soundation.com' + action);
			$(this).attr('target', 'clearcatcher' + ct);
			$("#content").after('<iframe width="0" height="0" name="clearcatcher' + ct + '" style="display: none"></iframe>');
			++ct;
		});
		if (ct > 1) {
			$('#modation-notifications div.notifications h3').append('<span class="super clear-notification" id="superclear">Clear All</span>');
			$('#superclear').click(function() {
				$('#modation-notifications form[action*=clear_notification]').submit()
					.parents('div.notifications div').slideUp();
				if (!$('#modation-notifications div.notifications h3 img').length) {
					$('#modation-notifications div.notifications h3').append('<img src="img/loading.gif" style="float: right">');
					$(this).fadeOut();
					parseNotifs();
				}
			});
		}
		$('#modation-notifications input.clear-notification').each(function() {
			$(this).click(function() {
				$(this).parents('div.notifications div').slideUp();
				if (!$('#modation-notifications div.notifications h3 img').length) {
					$('#modation-notifications div.notifications h3').append('<img src="img/loading.gif" style="float: right">');
					parseNotifs();
				}
			});
		});
		var sCommunity = $(html).find("a[href='/feed']")[0].innerText;
		var numAlerts = sCommunity.match(/(\d+)/);
		if (numAlerts != null) {
			var iTotal = 0, authors = [];
			$aside.find('a.author').each(function() {
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
			//console.log(numAlerts[0]);
			chrome.browserAction.setTitle({title:authorString});
			chrome.browserAction.setBadgeBackgroundColor({color:"#d00"});
			chrome.browserAction.setBadgeText({text:numAlerts[0]});
		} else {
			console.log("modation: no notifs");
			chrome.browserAction.setTitle({title:"No new notifications :("});
			chrome.browserAction.setBadgeText({text:""})
		}
	});
}

//Get and parse watchlist
function parseWatchlist() {
	//Show loader
	$("#modation-watchlist .loader").show();
	
	crapi.clone(function(d) {
		console.log(d);
		
		modapi.login(function(me) {
			console.log(me);
			
			//Reset queue display
			$("#modation-watchlist").find(".modation-watchlist-item, .empty").remove();
			
			//Storage for queue
			var queue = d[me.email]['watchlist-queue'];
			
			//Queue is empty
			if (!queue.length) {
				$("#modation-watchlist .wrapper").append(_factory("modation-watchlist-empty"));
				
				_complete();
			}
			
			//Items in queue
			else {
				//Iterate through queue items
				$.each(queue, function(i, q) {
					$("#modation-watchlist .wrapper").append(_factory("modation-watchlist-item").addClass("modation-watchlist-item-" + i));
					
					//Select added item
					var wItem = $("#modation-watchlist .modation-watchlist-item-" + i);
					
					//Load added item
					wItem.find(".item-title").html('<a href="http://soundation.com/' + q.link + '" target="_blank">' + q.title);
					wItem.find(".item-body").html(q.changes.join(", "));
					
					//Initialize clear handler
					wItem.find(".clear-notification").click(function() {
						console.log("clearing queue item " + i);
						
						//Clear queue item
						clear_queue(me.email, i);
						
						//Hide and remove item, then parse watchlist again
						$(this).parents('.notifications .modation-watchlist-item').slideUp(400, function() {
							$(this).remove();
							
							//Only slightly recursive
							parseWatchlist();
						});
					});
				});
				
				_complete();
			}
			
			function _complete() {
				//Hide loader
				$("#modation-watchlist .loader").hide();
			}
		});
	});
}

//Clear queue item
function clear_queue(email, queueID) {
	crapi.clone(function(d) {
		console.log("=============== BEFORE ============");
		
		//Grab queue item
		var queueItem = d[email]['watchlist-queue'][queueID];
		
		//Grab watchlist item
		var watchlistItem = d[email]['watchlist'][queueItem.index];
		
		//Trace items
		console.log(queueItem);
		console.log(watchlistItem);
		
		//Iterate properties
		for (var prop in queueItem.state) watchlistItem[prop] = queueItem.state[prop];
		
		console.log("============ AFTER ===============");
		
		//Trace updates
		console.log(watchlistItem);
		
		//Push updated watchlist back into storage
		d[email]['watchlist'][queueItem.index] = watchlistItem;
		
		//Delete queue item
		d[email]['watchlist-queue'].splice(queueID, 1);
		
		//Update watchlist
		crapi.update(email, d[email], function() {
			console.log("cleared queue item " + queueID);
		});
	});
}