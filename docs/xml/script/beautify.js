/**@fileoverview
  *
  * Provides the necessary glue and events to read an arbitrary XML
  * file and render it, with indentation and syntax highlighting.
  *
  * The user may click on elements produced by the rendered result and
  * obtain an xPath for that element.
  *
  */

/*global XMLUtilities, $, document */

XMLUtilities.Beautify = (function () {
	"use strict";

	var ns = XMLUtilities,
		module = {},
		active = false,

		/** HTML elements that we find interesting **/
		html = {
			xmlInput:      'xmlInput',
			output:        'output',
			outputXPath:   'outputXPath'
		};

	/** Called when the user hits the "beautify" button.
	  * @return {string}
	  */
	function beautify() {

		if (active === false) {
			return null;
		}

		var xml = html.xmlInput.value;

		if (xml) {
			xml = ns.XML.parseXML(xml);
			xml = ns.XML.renderXML(xml);
		}

		html.output.innerHTML = xml;
		html.outputXPath.innerHTML = '';
		return xml;
	}

	/** Called when the user flips into this mode out of some other mode. **/
	function doModeChange(e, newMode) {
		if (newMode !== 'beautify') {
			active = false;
			return;
		}

		active = true;
		beautify();
	}

	/** Called when the user clicks on a rendered item. */
	function showXPath(e) {

		if (active === false) {
			return null;
		}

		var target = ns.XML.resolveTarget(e.target),
			xpath = ns.XML.resolveXPath(target);

		html.outputXPath.innerHTML = xpath;
	}


	/** Called on dom ready. Assigns events, resolves elements. **/
	module.init = function () {
		ns.resolve(html);

		$(document).bind({
			'renderEvent.XMLUtilities.Layout': beautify,
			'modeChangeEvent.XMLUtilities.Layout': doModeChange
		});

		$(html.output).bind('click.XMLUtilities.Beautify', showXPath);
	};

	return module;

}());
