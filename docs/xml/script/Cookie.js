/*global XMLUtilities, document */

XMLUtilities.Cookie = (function () {
	"use strict";

	var module = {};

	module.set = function (name, value) {
		var expires = new Date(),
			cookie  =
				encodeURIComponent(name) + '=' +
				encodeURIComponent(value);

		expires.setFullYear(expires.getFullYear() + 1);
		expires = expires.toGMTString();
		cookie += '; expires=' + expires + '; path=/';

		document.cookie = cookie;
		return cookie;
	};

	module.get = function (name) {
		var cookie, cookies, x, split;

		split = /;\s*/;
		split.lastIndex = 0;

		cookies = document.cookie.split(split);
		x = cookies.length;
		while (x--) {
			cookie = cookies[x];
			if (cookie.indexOf(name) === 0) {
				// +1 is for the equal sign
				return cookie.substring(name.length + 1);
			}
		}
		return null;
	};

	module.del = function (name) {
		var expires = new Date(),
			cookie  = encodeURIComponent(name) + '=';

		expires.setDate(expires.getDate() - 1);
		expires = expires.toGMTString();

		cookie += '; expires=' + expires + '; path=/';
		document.cookie = cookie;
		return cookie;
	};

	return module;
}());
