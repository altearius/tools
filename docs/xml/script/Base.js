/*global document */

var XMLUtilities = (function () {
	"use strict";

	var module = {};

	module.browser = (function () {
		/// <summary>Provide browser information through browser sniffing</summary>

		// This is from jQuery 1.8.3; the last version of jQuery that supported
		// this function.  It has been modified to work for IE versions up through
		// IE 11.

		/*jslint regexp: true */

		var ua, match, browser, version, output = {};

		ua = window.navigator.userAgent.toLowerCase();
		match =
			/(chrome)[ \/]([\w.]+)/.exec(ua) ||
				/(webkit)[ \/]([\w.]+)/.exec(ua) ||
				/(opera)(?:.*version|)[ \/]([\w.]+)/.exec(ua) ||
				/(msie) ([\w.]+)/.exec(ua) ||
				/(trident)(?:.*? rv:([\w.]+)|)/.exec(ua) ||
				(ua.indexOf("compatible") < 0 &&
				/(mozilla)(?:.*? rv:([\w.]+)|)/.exec(ua)) ||
				[];

		/*jslint regexp: false */

		browser = match[1] || "";
		version = match[2] || "0";

		if (browser) {
			output[browser] = true;
			output.version = version;
		}

		if (output.trident) {
			output.msie = true;
		} else if (output.chrome) {
			output.webkit = true;
		} else if (output.webkit) {
			output.safari = true;
		}

		return Object.freeze ? Object.freeze(output) : output;
	}());

	module.resolve = function (o) {
		var x;

		for (x in o) {
			if (o.hasOwnProperty(x) && typeof o[x] === 'string') {
				o[x] = document.getElementById(o[x]);
			}
		}
	};

	module.escapeAttrib = function (v) {
		var attr = /[\x26\x3C\x3E\x22]/g;
		attr.lastIndex = 0;

		return v.replace(attr, function (s) {
			switch (s) {
			case '&': // 26
				return '<span class="entity">&amp;amp;</span>';

			case '<': // 3C
				return '<span class="entity">&amp;lt;</span>';

			case '>': // 3E
				return '<span class="entity">&amp;gt;</span>';

			case '"': // 22
				return '<span class="entity">&amp;quot;</span>';

			// Should not be necessary; we use double-quotes on all attribs.
			//case "'": // 27
			//	return '<span class="entity">&amp;apos;</span>';

			}
			return '';
		});
	};

	module.escapeHtml = function (v) {
		var html = /[\x26\x3C\x3E]/g;

		html.lastIndex = 0;
		return v.replace(html, function (s) {
			switch (s) {
			case '&': // 26
				return '<span class="entity">&amp;amp;</span>';

			case '<': // 3C
				return '<span class="entity">&amp;lt;</span>';

			case '>': // 3E
				return '<span class="entity">&amp;gt;</span>';
			}
			return '';
		});
	};

	return module;
}());
