/*global XMLUtilities */

XMLUtilities.SavedState = (function () {
	"use strict";

	function SavedState(cookie, xml, xpath, xsl) {

		cookie = String(cookie || '');
		xml = String(xml || '');
		xpath = String(xpath || '');
		xsl = String(xsl || '');

		this.getCookie = function () {
			return cookie.length === 2 ? cookie : '0r';
		};

		this.getXML = function () {
			return xml;
		};

		this.getXPath = function () {
			return xpath;
		};

		this.getXSL = function () {
			return xsl;
		};

	}

	SavedState.prototype = {
		serialize: function () {
			return {
				cookie: this.getCookie(),
				xml:    this.getXML(),
				xpath:  this.getXPath(),
				xsl:    this.getXSL()
			};
		}
	};

	SavedState.deserialize = function (stateJSON) {
		var state = JSON.parse(stateJSON);
		return new SavedState(state.Cookie, state.XML, state.XPath, state.XSL);
	};

	return SavedState;
}());
