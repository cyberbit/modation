$(function() {
	initOptions();
});

// Initialize options
function initOptions() {
	/**
	 * This block probably needs to be in eventPage.js (#90)
	 *
	 * Enforcing storage model:
	 *   Storage is blank:
	 *    - Storage model (<- Current storage) <- version
	 *   Storage has no version:
	 *    - Clear all storage
	 *    - Storage model (<- Current storage) <- version
	 *   Storage has incorrect version:
	 *    - Storage model <- Current storage <- version
	 *   Storage has correct version:
	 *    - No change
	 */
	
	// Clone storage
	crapi.clone("options", function(d) {
		var options = d.options;
		/*var version = crapi.manifest().version;
		
		// No storage version
		if (!d.version) {
			// Clear all storage
            crapi.storage("local").clear();
			crapi.storage("sync").clear();
			
			console.info("No storage version, clearing storage");
        }
		
		// Storage and app versions don't match
		if (d.version !== version) {
			// Update storage model
			crapi.updateAll($.extend(true, {}, global.storageModel, d, {version: version}), function() {
				console.info("Updated storage model");
				
				_continue();
			});
        }
		
		// Storage and app versions match
		else _continue();
		
		function _continue() {*/
			console.log("options: %o", options);
			
			// Update options
			$.each(options, function(i, v) {
				$("#" + i.decamel()).prop("checked", v);
			});
        //}
	});
	
	// Initialize option handlers
	handle($(".option"), "change.loadOptions", function(e) {
		var $this = $(this);
		var id = $this.attr("id");
		var state = $this.prop("checked");
		
		// Update storage
		crapi.clone("options", function(d) {
			d.options[$.camelCase(id)] = state;
			
			crapi.updateAll(d);
		});
	});
}