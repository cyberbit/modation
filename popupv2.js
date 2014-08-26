$(document).ready(function() {
	parseNotifs();
});

//Get a factory item
function _factory(key) {
	return $(".factory ." + key).clone();
}

//Get and parse notifications
function parseNotifs_v2() {
	$.get("http://soundation.com/feed", function(html) {
		//Remove images and form usable object
		var $aside = $(html.replace(/<img\b[^>]*>/ig, '')).find('aside');
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
		$('#modation-notifications').replace($parse);
		
		$('.main-wrapper a').each(function() {
			var href = $(this).attr('href');
			$(this).attr('href', 'http://soundation.com' + href);
			$(this).attr('target', '_new');
		});
		var ct = 0;
		$('form').each(function() {
			var action = $(this).attr('action');
			$(this).attr('action', 'http://soundation.com' + action);
			$(this).attr('target', 'clearcatcher' + ct);
			$("#content").after("<iframe width=\"0\" height=\"0\" name=\"clearcatcher" + ct + "\" style=\"display: none\"></iframe>");
			++ct;
		});
		if (ct > 1) {
			$('div.notifications h3').append('<span class="super clear-notification" id="superclear">Clear All</span>');
			$('#superclear').click(function() {
				$('form').submit()
					.parents('div.notifications div').slideUp();
				if (!$('div.notifications h3 img').length) {
					$('div.notifications h3').append('<img src="loading.gif" style="float: right">');
					$(this).fadeOut();
					parseNotifs_v2();
				}
			});
		}
		$('input.clear-notification').each(function() {
			$(this).click(function() {
				$(this).parents('div.notifications div').slideUp();
				if (!$('div.notifications h3 img').length) {
					$('div.notifications h3').append('<img src="loading.gif" style="float: right">');
					parseNotifs_v2();
				}
			});
		});
		var sCommunity = $(html).find("a[href='/feed']")[0].innerText;
		var numAlerts = sCommunity.match(/(\d+)/);
		if (numAlerts != null) {
			var iTotal = 0, authors = [];
			$(aside).find('a.author').each(function() {
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

function parseNotifs() {
	var xhr = new XMLHttpRequest();
	xhr.open("GET", "http://soundation.com/feed", true);
	xhr.onreadystatechange = function() {
		if (xhr.readyState == 4) {
			html = xhr.responseText;
			html = html.replace(/<img\b[^>]*>/ig, '');
			var aside = $(html).find('aside')[0];
			var parse = "<strong>Unknown error</strong>";
			if (typeof aside == "undefined") {
				chrome.browserAction.setTitle({title:"Please login to view notifications"});
				chrome.browserAction.setBadgeBackgroundColor({color:"#9a9a9a"});
				chrome.browserAction.setBadgeText({text:"?"});
				parse = '<aside>\
					<div class="container">\
						<div class="wrapper notifications last">\
							<h3>You are not logged in</h3>\
							<span class="empty">Please <a href="/feed">login</a> to view notifications.</span>\
						</div>\
					</div>\
				</aside>';
			} else {
				parse = aside.outerHTML;
			}
			$('.main-wrapper').html(parse);
			$('.main-wrapper a').each(function() {
				var href = $(this).attr('href');
				$(this).attr('href', 'http://soundation.com' + href);
				$(this).attr('target', '_new');
			});
			var ct = 0;
			$('form').each(function() {
				var action = $(this).attr('action');
				$(this).attr('action', 'http://soundation.com' + action);
				$(this).attr('target', 'clearcatcher' + ct);
				$("#content").after("<iframe width=\"0\" height=\"0\" name=\"clearcatcher" + ct + "\" style=\"display: none\"></iframe>");
				++ct;
			});
			if (ct > 1) {
				$('div.notifications h3').append('<span class="super clear-notification" id="superclear">Clear All</span>');
				$('#superclear').click(function() {
					$('form').submit()
						.parents('div.notifications div').slideUp();
					if (!$('div.notifications h3 img').length) {
						$('div.notifications h3').append('<img src="loading.gif" style="float: right">');
						$(this).fadeOut();
						parseNotifs();
					}
				});
			}
			$('input.clear-notification').each(function() {
				$(this).click(function() {
					$(this).parents('div.notifications div').slideUp();
					if (!$('div.notifications h3 img').length) {
						$('div.notifications h3').append('<img src="loading.gif" style="float: right">');
						parseNotifs();
					}
				});
			});
			var sCommunity = $(html).find("a[href='/feed']")[0].innerText;
			var numAlerts = sCommunity.match(/(\d+)/);
			if (numAlerts != null) {
				var iTotal = 0, authors = [];
				$(aside).find('a.author').each(function() {
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
		}
	}
	xhr.send();
}