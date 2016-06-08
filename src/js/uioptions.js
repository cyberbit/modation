$(function() {
	// Option state change hooks
	var hooks = {
		rememberMe: initRememberMe
	};
	
	initOptions();
	
	// Initialize options
	function initOptions() {
		// Clone storage
		crapi.clone("options", function(d) {
			var options = d.options;
			
			// Update options
			$.each(options, function(i, v) {
				$("#" + i.decamel()).prop("checked", v);
			});
		});
		
		// Initialize option handlers
		handle($(".option"), "change.initOptions", function() {
			var $this = $(this);
			var id = $.camelCase($this.attr("id"));
			var state = $this.prop("checked");
			
			// Run option hook, if needed
			if (hooks[id]) {
				hooks[id](state, function(granted) {
					// Option hook succeeded
					if (granted) {
                        _continue();
                    }
					
					// Option hook failed
					else {
						$this.prop("checked", !state);
					}
				});
            }
			
			else _continue();
			
			function _continue() {
				// Update storage
				crapi.clone("options", function(d) {
					d.options[id] = state;
					
					// Update option cache
					var optionCache = localJSON("options") || {};
					optionCache[id] = state;
					localJSON("options", optionCache);
					
					crapi.updateAll(d);
				});
            }
		});
	}
	
	// Remember me hook
	function initRememberMe(state, callback) {
		// Option disabled
        if (!state) {
			// Ping Soundation to set cookie
			$.get(global.path.home);
			
			callback(true);
		}
		
		// Option enabled
		else {
			// Request permissions
			chrome.permissions.request({
				permissions: ["cookies"]
			}, function(granted) {
				// Bind cookie change handler
				chrome.runtime.sendMessage({action: "rememberMe"});
				
				callback(granted);
			});
		}
    }
});