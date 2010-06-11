function CloudSponge(domainKey, domainPassword, opts) {
	var $ = jQuery;
	var API_ROOT = 'https://api.cloudsponge.com/';
	var SERVICES = {
		'gmail': { auth: 'user_consent', width: 987, height: 600 },
		'yahoo': { auth: 'user_consent', width: 500, height: 500 },
		'windowslive': { auth: 'user_consent', width: 987, height: 600 },

		'outlook': { auth: 'desktop_applet' },
		'addressbook': { auth: 'desktop_applet' },

		'aol': { auth: 'import' },
		'plaxo': { auth: 'import' }
	};

	var options = {
		domainKey: domainKey,
		domainPassword: domainPassword,
		updateInterval: 1000,
		popupURL: '',
		appletContainer: document.body,
		includeMailingAddress: false,
		update: function(){},
		complete:function(){}
	};

	$.extend(options, opts || {});


	// public methods
	this.beginImport = function(serviceName, opts) {
		var importId = null, interval = null;

		opts = $.extend({}, options, opts || {});

		var service = SERVICES[serviceName];

		var params = {
			'domain_key': opts.domainKey,
			'domain_password': opts.domainPassword
		};

		if(service.auth == 'import') {
			params['username'] = opts.username;
			params['password'] = opts.password;
		}

		// open the popup right away to avoid popup blockers
		if(opts.popupURL.indexOf('?') < 0) opts.popupURL += '?';
		opts.popupURL += '&service=' + serviceName;
		if(service.auth == 'user_consent') var popup = window.open(opts.popupURL, "_blank", 'height='+service.height+',width='+service.width+',location=no,menubar=no,resizable=no,status=no,toolbar=no');


		// private callbacks and timers
		var contactsCallback = function(result) {
			opts.complete(result.contacts, result, serviceName);
		};

		var getContacts = function() {
			$.ajax({
				url: API_ROOT + 'contacts.json/' + importId,
				dataType: 'jsonp',
				type: 'GET',
				data: params,
				success: contactsCallback
			});
		};

		var eventsCallback = function(result) {
			var checkAgain = true;
			if(typeof(result.events) !== 'undefined') {
				for(var i=0;i<result.events.length;i++) {
					var event = result.events[i];
					opts.update(event);
					if(event.event_type === 'COMPLETE') {
						checkAgain = false;
						getContacts();
					}
				}
			}

			if(checkAgain) setTimeout(checkEvents, opts.updateInterval);
		};

		var checkEvents = function() {
			if(importId == null) return;

			$.ajax({
				url: API_ROOT + 'events.json/' + importId,
				dataType: 'jsonp',
				type: 'GET',
				success: eventsCallback,
				data: params
			});
		};

		var beginImportCallback = function(result) {
			if(result.status === 'success') {
				importId = result.import_id;
				if(typeof(opts.begin) === 'function') opts.begin(result);

				if(service.auth === 'user_consent') {
					popup.location = result.url;
//					opts.popup(result.url, service.width, service.height);
				} else if(service.auth === 'desktop_applet') {
					var appletURL = opts.appletURL || result.url,
						appletHTML = '';
					if(!$.browser.msie) {
						appletHTML += '<!--[if !IE]> Firefox and others will use outer object -->\
						<object classid="java:ContactsApplet" type="application/x-java-applet" archive="' + appletURL + '" height="1" width="1" >\
						<!-- Konqueror browser needs the following param -->\
						<param name="archive" value="' + appletURL + '" />\
						<param name="cookieValue" value="document.cookie"/>\
						<param name="importId" value="' + importId + '"/>';
					}
					appletHTML += '\
					<object classid="clsid:8AD9C840-044E-11D1-B3E9-00805F499D93" codebase="http://java.sun.com/update/1.5.0/jinstall-1_5_0-windows-i586.cab" height="0" width="0" >\
					<param name="code" value="ContactsApplet" />\
					<param name="archive" value="' + appletURL + '" />\
					<param name="cookieValue" value="document.cookie"/>\
					<param name="importId" value="' + importId + '"/>  <strong>\
					To import contacts from Microsoft Outlook or Mac Address Book, you must have the Java Plug-in installed.\
					<br>\
					<a href="http://java.sun.com/products/plugin/downloads/index.html">\
					Get the latest Java Plug-in here.\
					</a>\
					</strong>\
					</object>';
					if(!$.browser.msie) {
						appletHTML += '</object>';
					}

					$(opts.appletContainer).append(appletHTML);//'<div id="cs_applet_' + importId + '"><APPLET archive="' + appletURL + '" code="ContactsApplet" id="Contact_Importer_' + importId + '" width="0" height="0"><PARAM name="cookieValue" value="document.cookie"/><PARAM name="importActionID" value="' + importId + '">Your browser does not support Java which is required for this utility to operate correctly.</APPLET></div>')
				}

				checkEvents();
			} else {
//				console.log(result);
			}
		};

		var includeParam = opts.includeMailingAddress ? 'mailing_address' : '';

		// make the request
		$.ajax({
			url: API_ROOT + 'begin_import/' + service.auth + '.json',
			dataType: 'jsonp',
			type: 'GET',
			data: $.extend({ service: serviceName, 'include': includeParam }, params),
			success: beginImportCallback,
			error: function() {
//				console.log('error');console.log(arguments)
			}
		});
	};

	
}