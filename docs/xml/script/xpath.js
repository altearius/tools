/**@fileoverview
  *
  * Provides the glue and events necessary to run an arbitrary
  * xPath against arbitrary XML in the browser and render the results.
  *
  * 2009-08-19: Provide highlighted raw view as well as list view.
  * 2009-08-02: First version
  */

/*global XMLUtilities, $, document */

XMLUtilities.XPath = (function () {
	"use strict";

	var ns = XMLUtilities,
		module = {},
		render = null,
		active = false,
		lastNSList = null,
		html = {
			xmlInput:    'xmlInput',
			xpathInput:  'xpathInput',
			nsContainer: 'xPathNSContainer',
			output:      'output',
			refresh:     'xpathRefreshNS'
		};

	function runXPath() {

		if (active === false) {
			return;
		}

		if (ns.browser.msie) {
			html.output.innerHTML = '<h2 class="error">Not supported in IE</h2>';
			return
		}

		var output,
			xml     = html.xmlInput.value,
			xpath   = html.xpathInput.value,
			failure = false;

		xml = ns.XML.parseXML(xml);

		if (xml.documentElement.nodeName === 'parsererror') {
			failure = true;
			output = '<h2 class="error">Error parsing XML Source:</h2>' +
				ns.XML.render.error(xml);
		} else {

			try {
				output = ns.XML.selectNodes(xml, xpath, lastNSList);
			} catch (ex) {
				failure = true;
				output = '<h2 class="error">Invalid XPath</h2>';
			}

		}

		if (failure === false) {
			if (ns.Layout.getOutputMode() === 'listView') {
				output = render.list(output);
				html.output.innerHTML = output;
			} else {
				html.output.innerHTML = ns.XML.renderXML(xml);
				ns.XML.highlight(output);
				output = html.output.innerHTML;
			}
		} else {
			html.output.innerHTML = output;
		}

		return output;
	}

	function updateNamespaces() {

		if (active === false) {
			return;
		}

		var xml        = html.xmlInput.value,
			namespaces = XMLUtilities.XML.extractNS(xml),
			innerHTML  = '',
			x;

		for (x = 0; x < namespaces.length; x++) {
			innerHTML += [
				'<tr><th>',
				(namespaces[x].generated) ?
					'<em>' + namespaces[x].prefix + '</em>' :
					namespaces[x].prefix,
				'</th><td>' + namespaces[x].key + '</td></tr>'
			].join('');
		}

		innerHTML = (innerHTML.length) ? '<tbody>' + innerHTML + '</tbody>' :
			'<tbody><tr><td colspan="2">No namespaces found.</td></tr></tbody>';

		innerHTML =
			'<table><caption>Namespace Reference</caption><thead><tr>' +
			'<th>Prefix</th><th>Namespace</th></tr></thead>' + innerHTML +
			'</table>';

		html.nsContainer.innerHTML = innerHTML;
		lastNSList = namespaces;
		ns.Layout.render();
	}

	function doModeChange(e, newMode) {

		if (newMode !== 'xPath') {
			active = false;
			return;
		}

		active = true;

		updateNamespaces();

		switch (ns.Layout.getOutputMode()) {
		case 'rawView':
		case 'listView':
			runXPath();
			break;

		default:
			ns.Layout.setOutputMode('rawView');
			// setOutputMode will trigger onRender
			// onRender will trigger runXPath.
			break;
		}
	}

	function rescanOnEnter(e) {
		if (e.which === 13) {
			updateNamespaces();
		}
	}

	module.init = function () {

		ns.resolve(html);

		$(document).bind({
			'renderEvent.XMLUtilities.Layout': runXPath,
			'modeChangeEvent.XMLUtilities.Layout': doModeChange
		});

		$(html.refresh).bind('click', updateNamespaces);
		$(html.xpathInput).bind('keyup', rescanOnEnter);
	};

	render = {

		list: function (a) {

			var out = [],
				o = 0,
				x;

			function html(v) {
				v = v.replace(/\x26/g, '&amp;');
				v = v.replace(/\x3C/g, '&lt;');
				v = v.replace(/\x3E/g, '&gt;');
				return v;
			}

			function truncate(s) {
				var trailingSpaces = /\s\s*$/;
				trailingSpaces.lastIndex = 0;

				if (s.length > 80) {
					s = s.substring(0, 80);
					s = s.replace(trailingSpaces, '');
					s += '\u2026';
				}
				return s;
			}

			function renderAttribute(el) {
				return '<span class="attributeName">' + el.nodeName +
					'</span>="<span class="attributeValue">' +
					ns.escapeAttrib(el.value) + '</span>"';
			}

			function renderElement(el) {
				var x,
					y,
					out =
						'&lt;<span class="element">' + el.nodeName +
						'</span>';

				for (x = 0, y = el.attributes.length; x < y; x++) {
					out += ' ' + renderAttribute(el.attributes[x]);
				}

				if (el.childNodes.length) {
					out += '&gt;\u2026&lt;/<span class="element">' +
						el.nodeName + '</span>&gt;';
				} else {
					out += ' /&gt;';
				}

				return out;
			}

			function renderText(el) {
				var out = el.nodeValue,
					nonWS = /\S/g,
					leadingWS = /^\s\s*/,
					newLines = /\n/g;

				nonWS.lastIndex = 0;
				if (nonWS.test(out) === false) {
					return '<span class="empty">[ ' +
						'White Space (Text Node) ]</span>';
				}

				leadingWS.lastIndex = 0;
				out = out.replace(leadingWS, '');

				// Limit to 80 characters or so...
				out = truncate(out);
				out = ns.escapeHtml(out);

				newLines.lastIndex = 0;
				out = out.replace(newLines, '<br />');
				return out;
			}

			function renderCData(el) {
				var out = el.nodeValue,
					newLines = /\n/g;

				newLines.lastIndex = 0;
				out = truncate(out);
				out = html(out);
				out = out.replace(newLines, '<br />');
				out =
					'<span class="cdata">&lt;![CDATA[' + out + ']]&gt;</span>';
				return out;
			}

			for (x = 0; x < a.length; x++) {
				switch (a[x].nodeType) {
				case 1: // Element
					out[o++] = renderElement(a[x]);
					break;

				case 2: // Attribute
					out[o++] = renderAttribute(a[x]);
					break;

				case 3: // Text
					out[o++] = renderText(a[x]);
					break;

				case 4: // CData
					out[o++] = renderCData(a[x]);
					break;

				case 7: // Processing Instruction
					out[o++] =
						'&lt;?<span class="piName">' + a[x].target +
						'</span> <span class="piData">' +
						html(truncate(a[x].data)) + '</span>?&gt;';
					break;

				case 8: // Comment
					out[o++] =
						'<span class="comment">&lt;!-- ' +
						html(truncate(a[x].data)) + ' --&gt;</span>';
					break;

				case 9: // Document
					out[o++] = '<span class="element">[ Document ]</span>';
					break;

				// Not handled yet:
				//  2: Attribute
				//  5: Entity Reference
				//  6: Entity
				//  9: Document
				// 10: Document Type
				// 11: Document Fragment
				// 12: Notation
				default:
					throw new Error('unknown node type: ' + a[x].nodeType);

				}
			}

			return (out.length) ?
				'<ol><li>' + out.join('</li><li>') + '</li></ol>' :
				'<p>No results</p>';
		}
	};

	return module;
}());
