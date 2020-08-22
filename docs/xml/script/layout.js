/**@fileoverview
  * Handles the positioning of elements on the screen. Some positions
  *   require calculations that cannot be done (or are otherwise outside
  *   of my skill) in pure CSS.
  * Adjusts for window resizing.  Surprised how easy that was, neat.
  * Captures the F5 key and pipes it into "Render" (instead of
  *   Refresh) on supported browsers. Unsupported browsers will
  *   still refresh, but this causes a re-render anyway.
  */

/*global XMLUtilities, $, document, window */

XMLUtilities.Layout = (function () {
	"use strict";

	var ns = XMLUtilities,

		module = {},
		modes,

		html = {
			options:         'options',
			xmlContainer:    'xmlContainer',
			xmlInput:        'xmlInput',
			xpathContainer:  'xpathContainer',
			xpathInput:      'xpathInput',
			xslContainer:    'xslContainer',
			xslInput:        'xslInput',
			outputContainer: 'outputContainer',
			output:          'output',
			outputXPath:     'outputXPath'
		},

		mode = null,
		resizeTimer = null,

		outputMode = {
			r: 'rawView',
			l: 'listView',
			t: 'treeView'
		};

	function updateShareLink(text, href) {
		var link, parent = $('#opt_savedLink');

		parent.empty();

		if (href && text) {
			link = document.createElement('a');
			link.href = href;
			link.appendChild(document.createTextNode(text));
			parent.append(link);
		} else if (text) {
			link = document.createTextNode(text);
			parent.append(link);
		}
	}

	function logError(message) {
		$.ajax({
			url: "action/Log.aspx",
			type: 'POST',
			data: { message: message }
		});
	}

	function saveState() {

		// Need to collect cookie state, xml input value, xpath input, and
		// xslt input.

		// Output can be ignored.

		var state = new ns.SavedState(
			ns.Cookie.get('xml'),
			html.xmlInput.value,
			html.xpathInput.value,
			html.xslInput.value
		);

		$.ajax({
			url: "action/Persist.aspx",
			type: 'POST',
			data: state.serialize(),
			success: function (response) {
				updateShareLink(
					'Share This Link',
					new ns.QueryString('').set('state', response).toString()
				);
			},
			error: function (jqXHR) {
				logError(
					"Error while saving state.\n" +
					state.serialize() + '\n' +
					jqXHR.responseText);

				window.alert(
					'Sorry, an unknown error was encountered.'
				);
			}
		});
	}

	function loadState() {

		var hash = new ns.QueryString().get('state')[0] || '';
		if (!hash) {
			return false;
		}

		$.ajax({
			url: "action/Persist.aspx?load=" + encodeURIComponent(hash),
			type: "GET",
			success: function (response) {

				var state = ns.SavedState.deserialize(response),
					cookie = state.getCookie().split(''),
					modes = $('#options input[name="mode"]');

				cookie[0] = parseInt(cookie[0], 10);
				if (
					isNaN(cookie[0]) ||
						cookie[0] < 0 ||
						cookie[0] > modes.length
				) {
					cookie[0] = 0;
				}

				cookie[1] = {
					r: 'rawView',
					l: 'listView',
					t: 'treeView'
				}[cookie[1]];

				if (!cookie[1]) {
					cookie[1] = 'rawView';
				}

				html.xmlInput.value = state.getXML();
				html.xpathInput.value = state.getXPath();
				html.xslInput.value = state.getXSL();

				modes.eq(cookie[0]).click();
				module.setOutputMode(cookie[1]);

				updateShareLink(
					'State: ' + hash,
					new ns.QueryString('').set('state', hash).toString()
				);
			},

			error: function (jqXHR) {

				logError(
					"Error while loading state: " + hash + "\n" +
					jqXHR.responseText
				);

				window.alert(
					'Sorry, an unknown error was encountered.'
				);

			}
		});

		return true;
	}

	function normalizeResize() {
		window.clearTimeout(resizeTimer);
		resizeTimer = window.setTimeout(function () {
			$(document).trigger('resizeEvent.XMLUtilities.Layout');
		}, 50);
	}

	function changeMode() {
		var x, cookie,
			newMode = this.value,
			modes   = [ 'beautify', 'xPath', 'xsl' ];

		// Someday: useless but glittery animation
		mode = newMode;

		$(document).trigger('modeChangeEvent.XMLUtilities.Layout', newMode);

		// Save cookie
		x = modes.length;
		while (x--) {
			if (modes[x] === newMode) {
				break;
			}
		}

		if (x === -1) {
			return;
		}

		cookie = ns.Cookie.get('xml');
		cookie = (cookie) ? cookie : '0r';
		cookie = x + cookie.substring(1);
		ns.Cookie.set('xml', cookie);
	}

	module.render = function () {
		modes[mode]();
		$(document).trigger('renderEvent.XMLUtilities.Layout');
	};

	function onKeyDown(e) {
		var code = e.charCode;

		if (code === 116) { // F5
			$(document).trigger('renderEvent.XMLUtilities.Layout');
			return false;
		}

		return true;
	}

	function selectAll() {
		var sel;
		// IE
		if (document.selection) {
			sel = document.body.createTextRange();
			sel.moveToElementText(html.output);
			sel.select();
		} else {
			sel = document.createRange();
			sel.setStartBefore(html.output);
			sel.setEndAfter(html.output);
			window.getSelection().addRange(sel);
		}
	}

	function onOptionClick(e) {
		var target = e.target.innerHTML;

		switch (target) {
		case 'select all':
			selectAll();
			break;

		case 'tree view':
			module.setOutputMode('treeView');
			break;

		case 'raw view':
			module.setOutputMode('rawView');
			break;

		case 'list view':
			module.setOutputMode('listView');
			break;

		}

		return false;
	}

	module.setOutputMode = function (mode) {
		$(document.body)
			.removeClass('treeView rawView listView')
			.addClass(mode);

		outputMode = mode;
		$(document).trigger('renderEvent.XMLUtilities.Layout');

		// Save cookie
		var cookie = ns.Cookie.get('xml');
		cookie = (cookie) ? cookie : '0r';
		cookie = cookie.substring(0, 1) + mode.substring(0, 1);
		ns.Cookie.set('xml', cookie);
	};

	module.getOutputMode = function () {
		return outputMode;
	};

	modes = {
		beautify: function () {

			var region1, region2,
				width  = $(window).width(),
				height = $(window).height();

			$(document.body).removeClass('xPath xsl').addClass('beautify');

			width -= 170;
			width = Math.floor(width / 2);

			html.options.style.height = height + 'px';

			html.xmlContainer.style.width = width + 'px';
			html.xmlContainer.style.height = (height - 50) + 'px';

			html.outputContainer.style.top = '0px';
			html.outputContainer.style.left = (150 + width) + 'px';
			html.outputContainer.style.width = width + 'px';
			html.outputContainer.style.height = (height - 50) + 'px';

			region1 = $(html.xmlContainer);
			region2 = $(html.xmlInput);

			html.xmlInput.style.height =
				Math.floor(
					(region1.offset().top + region1.height()) -
						region2.offset().top - 2
				) + 'px';

			html.xmlInput.style.width = (width - 2) + 'px';

			region1 = $(html.outputContainer);
			region2 = $(html.output);

			html.output.style.height =
				Math.floor(
					(region1.offset().top + region1.height()) -
						region2.offset().top - 2
				) + 'px';

			html.output.style.width = (width - 1) + 'px';

			html.outputXPath.style.top  = (height - 40) + 'px';
		},

		xPath: function () {

			var region1, region2,
				width  = $(window).width(),
				height = $(window).height() - 20;

			$(document.body).removeClass('beautify xsl').addClass('xPath');

			width -= 170;
			width = Math.floor(width / 2);

			html.options.style.height = height + 'px';

			html.xmlContainer.style.width = width + 'px';
			html.xmlContainer.style.height = height + 'px';

			html.xpathContainer.style.left = (150 + width) + 'px';
			html.xpathContainer.style.width = width + 'px';

			region1 = $(html.xpathContainer);

			html.outputContainer.style.top =
				Math.floor(region1.offset().top + region1.height() + 20) +
				'px';

			html.outputContainer.style.left = (150 + width) + 'px';
			html.outputContainer.style.width = width + 'px';

			html.outputContainer.style.height =
				(height - (region1.offset().top + region1.height() + 20)) +
				'px';

			region1 = $(html.xmlContainer);
			region2 = $(html.xmlInput);

			html.xmlInput.style.height = Math.floor(
				(region1.offset().top + region1.height()) -
					region2.offset().top - 2
			) + 'px';

			html.xmlInput.style.width = (width - 2) + 'px';

			html.xpathInput.style.width = (width - 2) + 'px';

			region1 = $(html.outputContainer);
			region2 = $(html.output);

			html.output.style.height = Math.floor(
				(region1.offset().top + region1.height()) -
					region2.offset().top - 2
			) + 'px';

			html.output.style.width = (width - 1) + 'px';

		},

		xsl: function () {

			var region1, region2,
				width  = $(window).width(),
				height = $(window).height() - 20;

			$(document.body).removeClass('beautify xPath').addClass('xsl');

			width -= 170;
			width = Math.floor(width / 2);

			html.options.style.height = height + 'px';

			html.xslContainer.style.left = (150 + width) + 'px';
			html.xslContainer.style.width = width + 'px';
			html.xslContainer.style.height = height + 'px';

			region1 = $(html.xslContainer);
			region2 = $(html.xslInput);

			html.xslInput.style.height = Math.floor(
				(region1.offset().top + region1.height()) -
					region2.offset().top - 2
			) + 'px';

			html.xslInput.style.width = (width - 2) + 'px';

			height = Math.floor(height / 2);

			html.xmlContainer.style.width = width + 'px';
			html.xmlContainer.style.height = height + 'px';

			html.outputContainer.style.top = (height - 1) + 'px';
			html.outputContainer.style.width = (width - 1) + 'px';
			html.outputContainer.style.height = (height - 1) + 'px';
			html.outputContainer.style.left = '130px';

			region1 = $(html.xmlContainer);
			region2 = $(html.xmlInput);

			html.xmlInput.style.height = Math.floor(
				(region1.offset().top + region1.height()) -
					region2.offset().top - 2
			) + 'px';

			html.xmlInput.style.width = (width - 2) + 'px';

			region1 = $(html.outputContainer);
			region2 = $(html.output);

			html.output.style.height = Math.floor(
				(region1.offset().top + region1.height()) -
					region2.offset().top - 2
			) + 'px';

			html.output.style.width = (width - 1) + 'px';
		}
	};

	module.init = function () {

		var modes  = $("#options input[name='mode']"),
			cookie = ns.Cookie.get('xml');

		cookie = (cookie) ? cookie : '0r';
		cookie = cookie.split('');
		cookie[0] = parseInt(cookie[0], 10);

		// Set overall mode
		if (isNaN(cookie[0]) || cookie[0] >= modes.length || cookie[0] < 0) {
			cookie[0] = 0;
		}

		mode = modes[cookie[0]].value;
		modes[cookie[0]].checked = true;

		// Set output mode
		if (outputMode.hasOwnProperty(cookie[1]) === false) {
			cookie[1] = 'r';
		}

		outputMode = outputMode[cookie[1]];

		$(document.body)
			.removeClass('treeView rawView listView')
			.addClass(outputMode);

		ns.resolve(html);
		ns.Beautify.init();
		ns.XPath.init();
		ns.XSL.init();

		$('#opt_render').bind('click', function () {
			$(document).trigger('renderEvent.XMLUtilities.Layout');
		});

		$('#opt_save').bind('click', saveState);

		$(window).bind('resize', normalizeResize);

		modes.bind('click', changeMode);

		$(document).bind('keydown', onKeyDown);

		$('#outputOptions a').bind('click', onOptionClick);

		$(html.output).bind('click', function (e) {
			if (outputMode !== 'treeView') {
				return true;
			}

			ns.XML.expandTreeNode(e.target);
		});

		$(document).bind({
			'resizeEvent.XMLUtilities.Layout': module.render,
			'modeChangeEvent.XMLUtilities.Layout': module.render
		});

		window.setTimeout(function () {
			$(document).trigger('modeChangeEvent.XMLUtilities.Layout', mode);
		}, 0);

		loadState();
	};


	return module;
}());

$(document).ready(function () {
	XMLUtilities.Layout.init();
});

