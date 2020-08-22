/**@fileoverview
  *
  * Handles transformation of an XML document with XSL in the browser.
  * Actually, the meat is in utilities.js, this just provides the necessary
  * glue and event handlers.
  */

/*global XMLUtilities, $, document, ActiveXObject, XSLTProcessor */

XMLUtilities.XSL = (function () {
	"use strict";

	var ns = XMLUtilities,
		module = {},
		active = false,
		html = {
			xmlInput:      'xmlInput',
			xslInput:      'xslInput',
			output:        'output'
		};

	function transform() {

		if (active === false) {
			return;
		}

		var failure, result, xml, xsl;
		xml     = html.xmlInput.value;
		xsl     = html.xslInput.value;
		failure = false;
		result  = "";

		xml = ns.XML.parseXML(xml);
		xsl = ns.XML.parseXML(xsl);

		if (!xml || !xml.documentElement) {
			failure = true;
			result += '<h2 class="error">Empty XML Source</h2>';
		} else if (xml.documentElement.nodeName === "parsererror") {
			failure = true;
			result += '<h2 class="error">Error parsing XML Source:</h2>' +
				ns.XML.render.error(xml);
		}

		if (!xsl || !xsl.documentElement) {
			failure = true;
			result += '<h2 class="error">Empty XSL Source</h2>';
		} else if (xsl.documentElement.nodeName === "parsererror") {
			failure = true;
			result += '<h2 class="error">Error parsing XSL Source:</h2>' +
				ns.XML.render.error(xsl);
		}

		if (failure === false) {
			try {
				result = module.transform(xml, xsl);
			} catch (failTransform) {
				failure = true;
				result += '<h2 class="error">Error during transformation</h2>';
			}
			if (failure === false) {
				result = ns.XML.renderXML(result);
			}
		}

		html.output.innerHTML = result;
	}
	
	function doModeChange(e, newMode) {
		if (newMode !== 'xsl') {
			active = false;
			return;
		}

		active = true;
		transform();
	}

	module.init = function () {

		ns.resolve(html);

		$(document).bind({
			'renderEvent.XMLUtilities.Layout': transform,
			'modeChangeEvent.XMLUtilities.Layout': doModeChange
		});

	};

	module.transform = function (xml, xsl) {

		var result, processor;

		if (ns.browser.msie) {
			result = new ActiveXObject("MSXML2.DOMDocument");
			xml.transformNodeToObject(xsl, result);
			return result;
		}

		processor = new XSLTProcessor();
		processor.importStylesheet(xsl);
		result = processor.transformToDocument(xml);

		if (!result) {
			throw new Error(
				"The stylesheet does not appear to be supported XSL."
			);
		}

		return result;

	};


	return module;
}());

