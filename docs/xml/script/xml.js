/*global XMLUtilities, window, DOMParser, ActiveXObject, $, document,
         XPathResult */

XMLUtilities.XML = (function () {
	"use strict";

	/** HTML elements that we find interesting **/
	var ns = XMLUtilities,
		module = {},
		data = {
			/** When clicking on a "beautified" xml result, we want to display
			  * an xPath that can be used to reach the clicked-on node. This is
			  * done by wrapping each possible click-target in a span tag with
			  * an id.
			  *
			  * The id looks like: p00, where 00 is the index of the original
			  * element in this array.  When clicking, we look for the nearest
			  * ID and use it to resolve the original element that generated
			  * the "beautified" result. This is the array that contains those
			  * elements.
			  */
			paths: [],

			/** The spec does not require attributes to know what element they
			  * belong to. Mozilla implements an "ownerElement" which is quite
			  * useful, but other implementations don't have this. Therefore,
			  * we keep a pair of look-up arrays that we can use to determine
			  * this information.  Find the index of an attribute node in
			  * attribs, use that index in parents to get its parent.
			  */
			attribs: [],
			parents: [],

			/** This is a sparse array that helps out when expanding or
			  * collapsing nodes in the tree view.
			  */
			treeView: {}
		};

	/** Resolves a rendered item into the original element.
	  * @param {Node} node Dom node
	  * @return {XML Node}
	  */
	module.resolveTarget = function (node) {
		var getIdx = /^p(\d+)$/;

		function parentOrSelf(start, test) {
			var n = start;
			if (test(n)) {
				return n;
			}

			n = n.parentNode;
			while (n) {
				if (test(n)) {
					return n;
				}
				n = n.parentNode;
			}
			return null;
		}


		node = parentOrSelf(node, function (n) {
			getIdx.lastIndex = 0;
			return (n.id && getIdx.test(n.id));
		});

		if (!node) {
			return null;
		}

		getIdx.lastIndex = 0;
		node = node.id.match(getIdx)[1];
		node = parseInt(node, 10);
		return data.paths[node];
	};


	module.expandTreeNode = function (node) {

		if ($(node).hasClass('element') === false) {
			return true;
		}

		var li = node.parentNode;

		function collapse() {
			var xml = module.resolveTarget(node),

				output =
					'&lt;<span class="element collapsed">' +
					xml.nodeName + '</span>';

			if (xml.attributes.length > 0) {
				output += ' \u2026';
			}

			output += (xml.childNodes.length > 0) ?
				'&gt;\u2026&lt;/<span class="element collapsed">' +
				xml.nodeName + '</span>&gt;' :
				' /&gt;';

			return output;
		}

		// Need a slight delay, as use of innerHTML is causing issues while
		// displaying the xpath.
		window.setTimeout(function () {
			if ($(node).hasClass('collapsed')) {
				li.innerHTML = data.treeView[li.id];
			} else {
				data.treeView[li.id] = li.innerHTML;
				li.innerHTML = collapse();
			}
		}, 10);

		return true;
	};


	/** Locate the parent node of an attribute.
	  * Not valid to use this until renderXML has been called.
	  */
	function getAttributeParent(attrib) {
		var a = data.attribs,
			x = a.length;

		if (attrib.ownerElement) {
			return attrib.ownerElement;
		}

		while (x--) {
			if (a[x] === attrib) {
				return data.parents[x];
			}
		}
		return null;
	}


	/** Resolves an xpath that can be used to reach the target node.
	  * @return {string}
	  */
	module.resolveXPath = function (node) {

		function locate(el, test) {

			var x, y, matches, parent, child, location;

			if (el.parentNode.nodeType === 9) {
				return '';
			}

			parent = el.parentNode;
			matches = 0;
			location = null;

			for (x = 0, y = parent.childNodes.length; x < y; x++) {
				child = parent.childNodes[x];
				if (test(child, el)) {
					matches++;
					if (child === el) {
						location = matches;
					}
				}
			}

			return (matches === 1) ? '' : '[' + location + ']';
		}

		function testElement(el, target) {
			return (el.nodeType === 1 && el.nodeName === target.nodeName);
		}

		function testText(el, target) {
			return (el.nodeType === 3 || el.nodeType === 4);
		}

		function testPI(el, target) {
			return (el.nodeType === 7 && el.target === target.target);
		}

		function testComment(el, target) {
			return (el.nodeType === 8);
		}

		function walk(el) {
			switch (el.nodeType) {
			case 1: // Element
				return walk(el.parentNode) +
					'/<span class="element">' + el.nodeName + '</span>' +
					locate(el, testElement);

			case 2: // Attribute
				return walk(getAttributeParent(el)) +
					'/<span class="attributeName">@' + el.nodeName + '</span>';

			case 3: // Text (xpath makes no distiction between cdata and text)
			case 4: // cdata
				return walk(el.parentNode) +
					'/<span class="attributeValue">text()</span>' +
					locate(el, testText);

			case 7: // Processing instruction
				return walk(el.parentNode) +
					'/processing-instruction("<span class="piName">' +
					el.target + '</span>")' + locate(el, testPI);

			case 8: // Comment
				return walk(el.parentNode) +
					'/<span class="comment">comment()</span>' +
					locate(el, testComment);

			case 9: // Document
				return '';

			//  5: Entity Reference
			//  6: Entity
			// 10: Document Type
			// 11: Document Fragment
			// 12: Notation
			default:
				throw new Error("Unknown nodeType while generating xpath");
			}
		}

		return (node) ? walk(node) : '';
	};


	/** Produce an XML document from the given string of text.
	  * Normalizes differences between IE / others.
	  * Normalizes output of error messages.
	  * @return {XML Document}
	  */
	module.parseXML = function (xml) {
		var doc, err, errTxt, x;

		// IE9 supports DOMParser, but gives more useful error messages with
		// the legacy ActiveXObject.
		if (typeof DOMParser !== 'undefined' && !ns.browser.msie) {
			doc = new DOMParser().parseFromString(xml, 'application/xml');

		} else if (typeof ActiveXObject !== 'undefined') {
			doc = new ActiveXObject("MSXML2.DOMDocument");

			if (doc.loadXML(xml) === false) {
				// IE8- error condition
				err = doc.parseError;
				x = doc.appendChild(doc.createElement('parsererror'));

				errTxt =
					err.reason + '\n' +
					'Line Number ' + err.line + ', Column ' + err.linepos +
					':\n';

				x.appendChild(doc.createTextNode(errTxt));

				x = x.appendChild(doc.createElement('source'));

				errTxt = [];
				errTxt.length = err.linepos;
				errTxt = errTxt.join('-') + '^';
				errTxt = err.srcText + '\n' + errTxt;
				x.appendChild(doc.createTextNode(errTxt));

			}
		}

		// Firefox and Opera return <parsererror> for errors.
		// IE is coerced into doing the same by the loading process.
		// Safari / Chrome return <html><body><parsererror>

		// Safari / Chrome
		if (
			ns.browser.webkit &&
				doc.documentElement.childNodes[0] &&
				doc.documentElement.childNodes[0].childNodes[0] &&
				doc.documentElement.childNodes[0].childNodes[0].nodeName ===
					'parsererror'
		) {

			err = doc.documentElement.childNodes[0].childNodes[0];

			doc = doc.implementation.createDocument('', 'parsererror', null);
			doc.documentElement.appendChild(doc.createTextNode(
				err.childNodes[1].childNodes[0].nodeValue
			));

			doc.documentElement.appendChild(doc.createElement('sourcetext'))
				.appendChild(doc.createTextNode(
					'Source not available in Safari / Chrome.'
				));

		}

		return doc;
	};



	/** Scan a string of XML and extract namespaces from it.
	  * Assigns generated prefixes (deterministic) for un-prefixed
	  * namespaces.
	  * @param  {string} xml
	  * @return {array}
	  * @config {string}  prefix
	  * @config {string}  key
	  * @config {boolean} generated
	  */
	module.extractNS = function (xml) {

		var x, y, z, a, tags, found,
			findTags = /<\w+(?:\:\w+)?\s+([\s\S]*?)>/g,
			findNS   = /xmlns(?:\:(\w+))?\s*=\s*([\x22\x27])([\s\S]+?)\2/g,
			prefix   = 'abcdefghijklmnopqrstuvwxyz',
			ns       = [];

		findTags.lastIndex = 0;
		tags = xml.match(findTags) || [];

		// Locate all defined xmlns attributes in the source. If they have a
		// prefix, grab that too. First, we find all tags. Then we find all
		// attributes within those tags.
		for (x = 0; x < tags.length; x++) {
			findNS.lastIndex = 0;
			if (findNS.test(tags[x])) {
				findNS.lastIndex = 0;

				a = findNS.exec(tags[x]);
				while (a !== null) {

					ns.push({
						prefix: (a[1] === '') ? undefined : a[1],
						key: a[3],
						generated: (!a[1])
					});

					a = findNS.exec(tags[x]);
				}
			}
		}

		/*jslint continue: true */

		// No point in returning duplicate keys, so we consolidate now... The
		// shortest prefix is preferred.
		a = [];

outer:
		for (x = 0; x < ns.length; x++) {

			for (y = 0; y < a.length; y++) {
				if (a[y].key === ns[x].key) {

					// If our unique array has an undefined prefix,
					if (a[y].prefix === undefined) {
						// And the source array is also undefined,
						if (ns[x].prefix === undefined) {
							// Skip to the next source item.
							continue outer;
						}
						// Otherwise, update the unique array.
						a[y].prefix = ns[x].prefix;
						a[y].generated = false;
						continue outer;
					}

					// If the source has an undefined prefix
					// (but the unique array does not),
					// continue to the next source item.
					if (ns[x].prefix === undefined) {
						continue outer;
					}

					// If neither unique nor source have an undefined
					// prefix, then take the shorter of the two prefixes.
					if (ns[x].prefix.length < a[y].prefix.length) {
						a[y].prefix = ns[x].prefix;
						continue outer;
					}
				}
			}

			a.push(ns[x]);
		}
		ns = a;

		/*jslint continue: false */

		// We also wish to remove duplicate prefix / key sets.
		x = ns.length;
		while (x--) {
			for (y = 0; y < x; y += 1) {
				if (
					a[x].prefix === a[y].prefix &&
						a[x].key === a[y].key
				) {
					a.splice(x, 1);
					break;
				}
			}
		}

		// Any "undefined" prefix must be given a key, or else it would be
		// darn hard to reach it with an xpath request.  We assign prefixes
		// out of the alphabet, starting at "a" and going until we run out.
		// Of course, we have to check to make sure it is unused before we
		// assign it...
		prefix += prefix.toUpperCase();
		prefix = prefix.split('');
		for (x = 0; x < ns.length; x++) {
			if (ns[x].prefix === undefined) {

				for (y = 0; y < prefix.length; y++) {

					found = false;

					for (z = 0; z < ns.length; z++) {
						if (ns[z].prefix === prefix[y]) {
							found = true;
							break;
						}
					}

					if (found === false) {
						ns[x].prefix = prefix[y];
						break;
					}
				}

				if (y === prefix.length) {
					throw new Error(
						"Cannot handle so many undeclared namespaces."
					);
				}

			}
		}

		return ns;
	};


	/** Applies an xPath expression to the XML document and returns an
	  * array containing the result.  Optionally accepts an array of
	  * namespace prefix/values to use in the xpath.
	  *
	  * @param  {XML Document} xml
	  * @param  {string}       xpath
	  * @param  {array}        ns
	  * @config {string}       prefix
	  * @config {string}       key
	  * @return {array}
	  */
	module.selectNodes = function (xml, xpath, ns) {

		ns = $.isArray(ns) ? ns : [];

		var result, x, output = [];

		function nsResolver(prefix) {
			var i;
			for (i = 0; i < ns.length; i++) {
				if (ns[i].prefix === prefix) {
					return ns[i].key;
				}
			}
			return null;
		}

		// IE supports this natively, but we still have to handle namespaces.
		if (ns.browser.msie) {

			result = [];
			for (x = 0; x < ns.length; x++) {
				result[x] = 'xmlns:' + ns[x].prefix + '="' + ns[x].key + '"';
			}

			result = result.join(' ');
			xml.setProperty('SelectionNamespaces', result);

			result = module.selectNodes(xpath);
			for (x = 0; x < result.length; x++) {
				output[x] = result[x];
			}

			return output;
		}

		result = xml.evaluate(
			xpath,
			xml,
			nsResolver,
			XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
			null
		);

		for (x = 0; x < result.snapshotLength; x++) {
			output[x] = result.snapshotItem(x);
		}
		return output;
	};


	module.renderXML = function (xml) {

		if (xml.documentElement.nodeName === 'parsererror') {
			return module.render.error(xml);
		} else if (ns.Layout.getOutputMode() === 'treeView') {
			return module.render.tree(xml.documentElement);
		}
		return module.render.raw(xml.documentElement);

	};

	module.highlight = function (a) {

		var x, y, el, wrapper;

		x = a.length;
		while (x--) {

			y = data.paths.length;
			while (y--) {

				if (a[x] === data.paths[y]) {

					switch (a[x].nodeType) {

					case 1: // Element
						wrapper = document.createElement('span');
						wrapper.className = 'highlighted';
						el = $('#p' + y + ' > span.element')[0];
						el.parentNode
							.insertBefore(wrapper, el)
							.appendChild(el);
						break;

					case 3: // Text node
					case 4: // CData
					case 8: // Comment
						wrapper = document.createElement('span');
						wrapper.className = 'highlighted';
						el = document.getElementById('p' + y);

						el.parentNode
							.insertBefore(wrapper, el)
							.appendChild(el);

						break;

					case 2: // Attribute
					case 7: // Processing Instruction
						$('#p' + y).addClass('highlighted');
						break;

					default:
						throw new Error(
							"unknown node type: " + a[x].nodeType
						);
					}
				}
			}
		}
	};

	module.render = {

		/** Produce the HTML necessary to pretty-print an XML document.
		  * @param {XML Element} xml
		  * @return {string}
		  */
		raw: function (xml) {

			var pIdx = 0;

			data.paths.length = 0;

			function whiteSpace(amount) {
				var a = [];
				a.length = amount + 1;
				return a.join('\xA0');
			}

			function html(v) {
				v = v.replace(/\x26/g, '&amp;');
				v = v.replace(/\x3C/g, '&lt;');
				v = v.replace(/\x3E/g, '&gt;');
				return v;
			}

			function renderTextNode(el, indent) {
				var s = el.nodeValue,
					nonWS = /\S/g,
					leadingWS = /^\s\s*/,
					trailingWS = /\s\s*$/,
					newLine = /\n/g,
					ws = whiteSpace(indent);

				nonWS.lastIndex = 0;
				if (nonWS.test(s) === false) {
					return '';
				}

				leadingWS.lastIndex = 0;
				trailingWS.lastIndex = 0;
				newLine.lastIndex = 0;
				s = s.replace(leadingWS, '').replace(trailingWS, '');
				s = ns.escapeHtml(s);
				s = s.replace(newLine, '<br />' + ws);
				s =
					ws + '<span id="p' + pIdx + '" class="text">' + s +
					'</span><br />';
				data.paths[pIdx++] = el;
				return s;
			}

			function walk(el, indent) {

				var x, y, z,
					out = [
						whiteSpace(indent) + '<span id="p' + pIdx +
							'">&lt;<span class="element">' + el.nodeName +
							'</span>'
					];

				data.paths[pIdx++] = el;

				for (x = 0, y = el.attributes.length; x < y; x++) {
					z = el.attributes[x];

					out[out.length] =
						' <span id="p' + pIdx +
						'"><span class="attributeName">' + z.name +
						'</span>="<span class="attributeValue">' +
						ns.escapeAttrib(z.value) + '</span>"</span>';

					data.attribs[data.attribs.length] = z;
					data.parents[data.parents.length] = el;
					data.paths[pIdx++] = z;
				}

				if (el.childNodes.length === 0) {
					out[out.length] = ' /></span><br />';
					return out.join('');
				}

				out[out.length] = '&gt;<br />';
				for (x = 0, y = el.childNodes.length; x < y; x++) {

					z = el.childNodes[x];

					switch (z.nodeType) {
					case 1: // Element
						out[out.length] = walk(z, indent + 4);
						break;

					case 3: // Text
						out[out.length] = renderTextNode(z, indent + 4);
						break;

					case 4: // CData
						out[out.length] =
							whiteSpace(indent + 4) +
							'<span id="p' + pIdx +
							'" class="cdata">&lt;![CDATA[' +
							html(z.nodeValue) + ']]&gt;</span><br />';
						data.paths[pIdx++] = z;
						break;

					case 7: // Processing Instruction
						out[out.length] =
							whiteSpace(indent + 4) + '<span id="p' + pIdx +
							'">&lt;?<span class="piName">' + z.target +
							'</span> <span class="piData">' + html(z.data) +
							'</span>?&gt;</span><br />';
						data.paths[pIdx++] = z;
						break;

					case 8: // Comment
						out[out.length] =
							whiteSpace(indent + 4) +
							'<span id="p' + pIdx +
							'" class="comment">&lt;!-- ' + html(z.data) +
							' --&gt;</span><br />';
						data.paths[pIdx++] = z;
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
						throw new Error('unknown node type: ' + z.nodeType);

					}

				}

				out[out.length] =
					whiteSpace(indent) +
					'&lt;\/<span class="element">' +
					el.nodeName + '</span>&gt;</span><br />';

				return out.join('');
			}

			return walk(xml, 0);
		},

		tree: function (xml) {

			var pIdx = 0,
				out  = ['<ul>'],
				o    = 1;

			data.paths.length = 0;
			data.treeView = {};

			function html(v) {
				v = v.replace(/\x26/g, '&amp;');
				v = v.replace(/\x3C/g, '&lt;');
				v = v.replace(/\x3E/g, '&gt;');
				return v;
			}

			function renderTextNode(el) {
				var s = el.nodeValue,
					nonWS = /\S/g,
					leadingWS = /^\s\s*/,
					trailingWS = /\s\s*$/,
					newLine = /\n/g;

				nonWS.lastIndex = 0;
				if (nonWS.test(s) === false) {
					return '';
				}

				leadingWS.lastIndex = 0;
				trailingWS.lastIndex = 0;
				newLine.lastIndex = 0;
				s = s.replace(leadingWS, '').replace(trailingWS, '');
				s = ns.escapeHtml(s);
				s = s.replace(newLine, '<br />');
				s = '<li id="p' + pIdx + '">' + s + '</li>';
				data.paths[pIdx++] = el;
				return s;
			}

			function walk(el) {

				var x, y, z;

				out[o++] =
					'<li id="p' + pIdx + '">&lt;<span class="element">' +
					el.nodeName + '</span>';

				data.paths[pIdx++] = el;

				out[o++] = (el.attributes.length + el.childNodes.length > 0) ?
					'&gt;<ul>' : '/&gt;';

				for (x = 0, y = el.attributes.length; x < y; x++) {
					z = el.attributes[x];

					out[o++] =
						'<li id="p' + pIdx +
						'"><span class="attributeName">@' + z.name +
						'</span>="<span class="attributeValue">' +
						ns.escapeAttrib(z.value) + '</span>"</li>';

					data.attribs[data.attribs.length] = z;
					data.parents[data.parents.length] = el;
					data.paths[pIdx++] = z;
				}

				for (x = 0, y = el.childNodes.length; x < y; x++) {
					z = el.childNodes[x];

					switch (z.nodeType) {
					case 1: // Element
						walk(z);
						break;

					case 3: // Text
						out[o++] = renderTextNode(z);
						break;

					case 4: // CData
						out[o++] =
							'<li id="' + pIdx +
							'" class="cdata">&lt;![CDATA[' +
							html(z.nodeValue) + ']]&gt;</li>';
						data.paths[pIdx++] = z;
						break;

					case 7: // Processing Instruction
						out[o++] =
							'<li id="p' + pIdx +
							'">&lt;?<span class="piName">' + z.target +
							'</span> <span class="piData">' + html(z.data) +
							'</span>?&gt;</li>';
						data.paths[pIdx++] = z;
						break;

					case 8: // Comment
						out[o++] =
							'<li id="p' + pIdx + '" class="comment">&lt;!-- ' +
							html(z.data) + ' --&gt;</li>';
						data.paths[pIdx++] = z;
						break;

					default:
						throw new Error("unknown node type: " + z.nodeType);

					}

				}

				if (el.attributes.length + el.childNodes.length > 0) {
					out[o++] = '</ul>';
				}

				out[o++] = '</li>';
			}

			walk(xml);

			out[o++] = '</ul>';
			return out.join('');

		},

		error: function (xml) {
			var newLine = /\n/g,
				msg = xml.documentElement.childNodes[0].nodeValue,
				source =
					xml.documentElement.childNodes[1].childNodes[0].nodeValue;

			newLine.lastIndex = 0;
			msg = msg.replace(newLine, '<br />');

			newLine.lastIndex = 0;
			source = source.replace(/\x26/g, '&amp;');
			source = source.replace(/\x3C/g, '&lt;');
			source = source.replace(/\x3E/g, '&gt;');
			source = source.replace(newLine, '<br />');

			return '<span class="error">' + msg +
				'<br />\xA0<br />' + source + '</span>';
		}

	};

	return module;

}());

