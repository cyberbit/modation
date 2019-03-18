/*!
 * ModAPI (Modation API)
 *
 * @author cyberbit (D.J. Marcolesco) dj.marcolesco@outlook.com
 * @version 2.0
 */

//Global identifier for ModAPI class
modapi = new ModAPI();

//Clone manifest (will move to CrAPI)
modapi.manifest = crapi.manifest();

//URI constants
var protocol = "https://";
var domain = "soundation.com";

//Define global variables
var global = {
	// Debug mode
	debug: modapi.manifest.debug,

	// Generated paths for common locations
	path: {
		protocol: protocol,
		domain: domain,
		home: protocol + domain,
		cookie: protocol + domain,
		login: protocol + domain + "?login=yes",
		feed: protocol + domain + "/feed",
		api: protocol + "api." + domain + "/me",
		profile: protocol + domain + "/account/profile",
		messages: protocol + domain + "/account/messages"
	},

	// Cookie to change for Remember Me mod
	cookie: "_soundation_session",

	// Storage model
	storageModel: {
		options: {},
		watchlist: [],
		version: ""
	},

	// Option defaults used for updates or new installs
	optionDefaults: {
		/**
		 * Global
		 */

		// Login
		rememberMe: false,

		/**
		 * Community
		 */

		// General
		showAlertsOnTop: false,

		// Watchlist
		watchlist: false,

		// Comments
		userTags: true,
		userTagLinks: false,
		moveCommentBox: true,

		// Groups
		groupFilters: true,
		moveGroupInvites: true
	},

	// Regular expressions to match common strings
	regex: {
		messageLink: /\/account\/messages\/\d+/,
		groupLink: /\/group\//,
		trackLink: /\/user\/.*\/track\//,
		userLink: /\/user\/[^\/]*$/,
		profileLink: /\/account\/profile/,
		generalLink: /\/soundation.com\//,
		feedLink: /soundation.com\/feed/
	},

	maps: {
		message: function (url, $html) {
			var $container = $html.find('.account.messages .inner.container');
			var $messages = $container.find('.messages .message');
			var $pagination = $container.find('.pagination');

			var messages = $.map($messages, function (v, i) {
				var $this = $(v);

				return {
					author: $this.find('h4 a').text(),
					age: $this.find('.age').text(),
					body: $this.find('.body').text()
				}
			});

			return {
				user: $container.find('.raw-users a').text(),
				messages: messages,
				firstPage: $pagination.find('.first a').attr('href'),
				prevPage: $pagination.find('.prev a').attr('href'),
				currentPage: $pagination.find('.page.current').text(),
				nextPage: $pagination.find('.next a').attr('href'),
				lastPage: $pagination.find('.last a').attr('href')
			};
		},
		group: function (url, $html) {
			var $remix = $html.find('[data-react-class=RemixGroupView');

			if ($remix.length) {
				var react = JSON.parse($remix.attr('data-react-props'));

				return {
					title: react.groupData.name,
					members: react.groupData.groupMembershipsCount,
					followers: react.groupData.followersCount,
					tracks: react.groupData.tracksCount,
					react: react
				};
			}

			var $hero = $html.find('.group-hero-container');
			var $stats = $hero.find('.stats');

			return {
				title: $hero.find('h2').text(),
				members: $stats.find('a[href$=members] .count').text(),
				followers: $stats.find('a[href$=followers] .count').text(),
				tracks: $stats.find('a[href$=tracks] .count').text()
			};
		},
		track: function (url, $html) {
			var $hero = $html.find('.player.hero');
			var $aside = $html.find('.community.tracks aside');

			return {
				artist: $hero.find('.artist a').text(),
				title: $hero.find('.title a').text(),
				plays: $hero.find('.stats .plays').text(),
				likes: $hero.find('.stats .likes').text(),
				downloads: $hero.find('.stats .downloads').text(),
				comments: $hero.find('.stats .comments').text()
			};
		},
		user: function (url, $html) {
			var $hero = $html.find('[data-react-class=ProfileHeroHoc]');

			return JSON.parse($hero.attr('data-react-props'));
		},
		profile: function (url, $html) {
			return {};
		},
		general: function (url, $html) {
			// get csrf token
			var token = $html.find('meta[name=csrf-token]').attr('content');

			return {
				token: token
			};
		},
		feed: function (url, $html) {
			var $container = $html.find('.community.feed .inner.container');
			var $feedItems = $container.find('.feed-item');
			var $pagination = $container.find('.pagination');

			var feedItems = $.map($feedItems, function (v, i) {
				var $this = $(v);
				var type = $this.is('.track') ? 'track' : 'news';

				return {
					type: type,
					artist: $this.find('.info .artist').text(),
					title: $this.find('.info .title').text(),
					time: $this.find('.info time').text(),
					content: $this.find('.content').get(0).innerHTML
				}
			});

			return {
				feedItems: feedItems,
				firstPage: $pagination.find('.first a').attr('href'),
				prevPage: $pagination.find('.prev a').attr('href'),
				currentPage: $pagination.find('.page.current').text(),
				nextPage: $pagination.find('.next a').attr('href'),
				lastPage: $pagination.find('.last a').attr('href')
			};
		}
	},

	// Watchlist model
	watchlistModel: {
		track: {
			link: "",
			likes: 0,
			downloads: 0,
			comments: 0
		},

		group: {
			link: "",
			lastComment: "",
			members: 0,
			followers: 0,
			tracks: 0
		}
	}
};

/**
 * Contains helper functions specific to Modation
 */
function ModAPI() {
	console.log("%cModAPI%c :: Init", "font-weight: bold; color: #f60", "");

	//Default callback for all functions
	this.DEFAULT_CALLBACK = function(){};
}

/**
 * Get current user information from Soundation API
 *
 * @returns	{object}	User information
 */
ModAPI.prototype.login = function(callback) {
	if (typeof callback == "undefined") callback = this.DEFAULT_CALLBACK;

	console.log("%cModAPI%c :: Login", "font-weight: bold; color: #f60", "");

	//Ping Soundation to set session cookie
	$.get(global.path.home, function(html) {
		var parsedHtml = html.deres();
		var $html = $(parsedHtml);
		var profileLink = $html.find(".user-link").attr("href");
		var token = $html.filter("[name=csrf-token]").attr("content");

		//Grab Soundation user
		_me(function(me) {
			//Inject additional properties
			me.link = profileLink;

			//Globalize token
			global.token = token;

			//Pass user object to callback
			//Any failure here should be handled in the callback
			callback(me);
		});
	});

	//Grab Soundation user (attempt 1)
	/*_me(function(me) {
		//Attempt 1 failed
		if (!me.success) {
			//Log failure
			console.warn("Attempt 1 failed! Pinging Soundation...");

			//Ping Soundation to set session cookie
			$.get(global.path.home).always(function() {
				var args = arguments;

				console.log("login args: %o", args);

				_me(function(me) {
					//Pass user object to callback
					//Any failure here should be handled in the callback
					callback(me);
				});
			});
		}

		//Attempt 1 succeeded
		else {
			//Pass user object to callback
			callback(me);
		}
	});*/

	function _me(callback) {
		$.getJSON(global.path.api).fail(function() {
			//Log failure
			console.error("%cModAPI%c :: Unable to connect to Soundation API", "font-weight: bold; color: #f60", "");
		}).success(function(data) {
			var me = data.data || data;

			//Inject success
			me.success = data.success;

			//Run callback
			callback(me);
		});
	}
};

/**
 * Get current authenticity token
 *
 * @returns	{string}	Authenticity token
 */
ModAPI.prototype.token = function() { return global.token; };