/*global XMLUtilities, document, $ */

XMLUtilities.QueryString = (function () {
	"use strict";

	function parseSource(source) {
		source = String(source);

		if (source.substring(0, 1) === '?') {
			source = source.substring(1);
		}

		source = source.split('&');

		var x = source.length;
		while (x--) {
			source[x] = source[x].split('=');

			if (source[x].length === 2) {
				source[x][0] = decodeURIComponent(source[x][0]);
				source[x][1] = decodeURIComponent(source[x][1]);
			} else {
				source.splice(x, 1);
			}
		}

		return source;
	}

	function QueryString(source) {

		source = (source === null || source === undefined) ?
			document.location.search : String(source);

		source = parseSource(source);

		this.get = function (key) {
			key = key.toUpperCase();
			var x, output = [];
			for (x = 0; x < source.length; x += 1) {
				if (source[x][0].toUpperCase() === key) {
					output.push(source[x][1]);
				}
			}

			return output;
		};

		this.set = function (key, values) {

			key = String(key);

			if ($.isArray(values) === false) {
				values = [values];
			}

			var x, ucKey = key.toUpperCase();

			x = values.length;
			while (x--) {
				if (values[x] === null || values[x] === undefined) {
					values.splice(x, 1);
				} else {
					values[x] = String(values[x]);
				}
			}

			x = source.length;
			while (x--) {
				if (source[x][0].toUpperCase() === ucKey) {
					source.splice(x, 1);
				}
			}

			for (x = 0; x < values.length; x += 1) {
				source.push([ key, values[x] ]);
			}

			return this;
		};

		this.toString = function () {
			if (source.length === 0) {
				return '';
			}

			var x, output = [];
			for (x = 0; x < source.length; x += 1) {
				output.push(
					encodeURIComponent(source[x][0]) + '=' +
						encodeURIComponent(source[x][1])
				);
			}

			return '?' + output.join('&');
		};
	}

	return QueryString;
}());
