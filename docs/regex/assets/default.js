/**@fileoverview
  *
  * 2010-03-06: Added support for regex replacement. No longer very happy with
  *             layout and appearance.  Also, coded under the influence of cold
  *             medication. Don't think I broke anything, though. Use at your
  *             own risk.
  *
  * 2010-03-02: Add additional meaning to some unicode tokens
  *             Pass latest JSLint
  */

/*! non-minimized version at default.js, enjoy! */

/*global Event, document, REXP: true, REXP_JS: true
*/


"use strict";

var REXP = {

	data: {
		input:    'reInput',
		exp:      'reExp',
		outLabel: 'reOutLabel',
		output:   'reOutput',
		replace:  'reReplacement',
		literal:  'reLiteral',
		update:   'cmdUpdate',
		clear:    'cmdClear',
		repCont:  'replaceContainer'
	},

	options: {
		global:     'optGlobal',
		ignoreCase: 'optIgnoreCase',
		multiLine:  'optMultiLine',
		truncate:   'optTrunc',
		update:     'optUpdate',
		execute:    'optExecute',
		explain:    'optExplain',
		replace:    'optReplace',
		repFunc:    'optReplaceFunction'
	},

	init: function () {

		function resolve(o) {
			for (var x in o) {
				if (o.hasOwnProperty(x) && typeof o[x] === 'string') {
					o[x] = document.getElementById(o[x]);
				}
			}
		}

		resolve(this.data);
		resolve(this.options);

		Event.addListener(
			[this.data.input, this.data.exp, this.data.replace],
			'keyup',
			this.do_keyup,
			this, true);

		Event.addListener(this.data.clear, 'click', this.do_clear, this, true);

		Event.addListener([
			this.data.update,
			this.options.global,
			this.options.ignoreCase,
			this.options.multiLine,
			this.options.execute,
			this.options.explain,
			this.options.replace,
			this.options.repFunc
		], 'click', this.do_update, this, true);

	},

	do_clear: function () {

		this.data.input.value = '';
		this.data.exp.value = '';
		this.data.input.focus();
		this.do_update();

	},

	process: function (action, input, exp, flags, replace) {
		var re = null,
		output = {
			literal: '',
			body: ''
		};

		try {
			re = new RegExp(exp, flags);
		} catch (ex) {
			output.literal = '<span class="ERR">Invalid<\/span>';
			output.body = this.render.error(ex);
			return output;
		}

		output.literal = this.render.literal(re);

		output.body =
			(action === 'execute') ? this.render.execute(input, re) :
			(action === 'explain') ? this.render.explain(re) :
			(action === 'repFunc') ? this.render.repFunc(input, re, replace) :
			this.render.replace(input, re, replace);

		return output;
	},

	do_keyup: function () {
		if (this.options.update.checked === false) {
			return;
		}

		this.do_update();
	},

	do_update: function () {
		var input = this.data.input.value,
		exp       = this.data.exp.value,
		replace   = this.data.replace.value,
		global    = (this.options.global.checked)     ? 'g' : '',
		ignore    = (this.options.ignoreCase.checked) ? 'i' : '',
		multi     = (this.options.multiLine.checked)  ? 'm' : '',
		flags     = global + ignore + multi,

		action    =
			(this.options.execute.checked) ? 'execute' :
			(this.options.explain.checked) ? 'explain' :
			(this.options.repFunc.checked) ? 'repFunc' : 'replace',

		output = this.process(action, input, exp, flags, replace);

		this.data.repCont.style.display =
			(action === 'replace' || action === 'repFunc') ? 'block' : 'none';

		this.data.literal.innerHTML = output.literal;
		this.data.output.innerHTML  = output.body;

	},


	render: {

		lastFN: null,

		html: function (s) {
			return s
				.toString()
				.replace(/&/g, '&amp;')
				.replace(/</g, '&lt;')
				.replace(/>/g, '&gt;');
		},

		string: function (s) {

			if (s === null) {
				return '<span class="NULL">null<\/span>';
			}

			if (s === undefined) {
				return '<span class="UNDEF">undefined<\/span>';
			}

			if (s.length === 0) {
				return '<span class="EMPTY">[zero-length string]</span>';
			}

			if (/^\s+$/.test(s) === true) {
				return '<span class="EMPTY">[string of all white space]</span>';
			}

			if (REXP.options.truncate.checked && s.length > 70) {
				s = s.substring(0, 70) + '\u2026'; // 2026 = "..."
			}

			return '<span class="STRING">' + this.html(s) + '</span>';
		},


		error: function (err) {
			return '<p class="ERR">' + this.html(err.message) + '<\/p>';
		},

		literal: function (re) {
			var output = "/" + this.html(re.source) + "/";
			if (re.global) {
				output += 'g';
			}
			if (re.ignoreCase) {
				output += 'i';
			}
			if (re.multiline) {
				output += 'm';
			}
			return output;
		},

		execute: function (input, re) {
			var match, matches,
			kill   = 50,
			output = '';

			if (input.length === 0) {
				output += '<p class="EMPTY">[ zero-length input ]</p>';
			}

			if (re.source.length === 0) {
				output +=
					'<p class="EMPTY">' +
					'[ zero-length regular expression ]</p>';
			}

			if (re.test(input) === false) {
				output += '<p class="EMPTY">[ No Matches ]</p>';
			}

			if (output.length !== 0) {
				return output;
			}

			if (re.global) {
				re.lastIndex = 0;
				matches = [];
				while ((match = re.exec(input)) !== null &&
					matches.length < kill) {
					matches.push(match);
				}

				return (matches.length >= kill && match !== null) ?
				this.matches(matches, true) : this.matches(matches, false);
			}

			match = re.exec(input);
			return this.match(match);
		},

		matches: function (matches, killed) {
			var x, y, output;

			output =
			'<table class="OBJ"><caption><span class="NUM">' + matches.length;
			output += (killed) ? '+<\/span> match' : '<\/span> match';
			output += (matches.length === 1) ? '' : 'es';
			if (killed) {
				output +=
				' (showing first <span class="NUM">' + matches.length +
				'</span> matches)';
			}

			output +=
				'</caption><thead><tr><th>Num</th>' +
				'<th>Index</th><th>Match</th>';

			for (x = 1; x < matches[0].length; x++) {
				output += '<th class="NUM">' + x + '<\/th>';
			}

			output += '<\/tr><\/thead><tbody>';

			for (x = 0; x < matches.length; x++) {
				output += '<tr><th class="NUM">' + x + '<\/th>' +
				'<th class="NUM">' + matches[x].index + '<\/th>' +
				'<th>' + this.string(matches[x][0]) + '<\/th>';
				for (y = 1; y < matches[x].length; y++) {
					output += '<td>' + this.string(matches[x][y]) + '<\/td>';
				}
				output += '<\/tr>';
			}

			output += '<\/tbody><\/table>';
			return output;
		},

		match: function (match) {

			var x, output =
			'<table class="OBJ"><caption>Match at character ' +
			'<span class="NUM">' + match.index + '<\/span><\/caption>' +
			'<thead><tr><th>Num<\/th><th>Match<\/th><\/thead>' +
			'<tbody><tr><th class="NUM">0<\/th><td>' + this.string(match[0]) +
			'<\/td><\/tr>';

			for (x = 1; x < match.length; x++) {
				output +=
				'<tr><th class="NUM">' + x + '<\/th><td>' +
				this.string(match[x]) + '<\/td><\/tr>';
			}

			output += '<\/tbody><\/table>';

			return output;
		},

		explain: function (re) {
			var tokens = REXP_JS.tokenize(re.source),
			html = this.html, useHeader = true;

			function count(list) {
				var x, o = list.length;
				for (x = 0; x < list.length; x++) {
					if (list[x].hasOwnProperty('tokens')) {
						o += count(list[x].tokens);
					}
				}
				return o;
			}

			function render(list) {
				var x, length = count(list),
				output =
					'<table><caption><span class="NUM">' + length +
					'</span> token';

				if (length !== 1) {
					output += 's';
				}

				output += '<\/caption>';

				if (useHeader) {
					output +=
						'<thead><tr><th>Token</th><th>' +
						'Meaning</th></tr></thead>';

					useHeader = false;
				}

				output += '<tbody>';

				for (x = 0; x < list.length; x++) {

					output += '<tr><th>' + html(list[x].id) + '<\/th>' +
					'<td>' + list[x].meaning + '<\/td><\/tr>';

					if (list[x].hasOwnProperty('tokens')) {
						output += '<tr><td colspan="2" class="SUB">' +
						render(list[x].tokens) +
						'<\/td><\/tr>';
					}

				}

				if (list.length === 0) {
					output +=
						'<tr><th colspan="2" class="EMPTY">' +
						'[ Empty ]</th></tr>';
				}

				return output + '<\/tbody><\/table>';
			}

			return render(tokens);
		},

		replace: function (input, re, replace) {

			re.lastIndex = 0;
			return this.string(input.replace(re, replace));

		},

		/*jslint evil: true */
		repFunc: function (input, re, replace) {

			try {
				REXP.render.lastFN = null;
				eval('REXP.render.lastFN = (' + replace + ');');
			} catch (ex) {
				return '<p class="ERR">Could not parse ' +
				'replacement function.</p>' + this.error(ex);
			}

			if (typeof REXP.render.lastFN !== 'function') {
				return '<p class="ERR">Replacement is of type "' +
					(typeof REXP.render.lastFN) + '", expected type ' +
					'"function"</p>';
			}

			var output;

			try {
				output = this.replace(input, re, REXP.render.lastFN);
			} catch (ex2) {
				return '<p class="ERR">Error in replacement function.</p>' +
					this.error(ex2);
			}

			return output;
		}
		/*jslint evil: false */

	}

};


var REXP_JS = {

	charcode: {
		'00': 'Null',
		'01': 'Start of heading',
		'02': 'Start of text',
		'03': 'End of text',
		'04': 'End of transmission',
		'05': 'Enquiry',
		'06': 'Acknowledge',
		'07': 'Bell',
		'08': 'Backspace',
		'09': 'Tab (\\t)',
		'0A': 'Line feed',
		'0B': 'Vertical tab',
		'0C': 'Form feed',
		'0D': 'Carriage return',
		'0E': 'Shift out',
		'0F': 'Shift in',
		'10': 'Data link escape',
		'11': 'Device control one',
		'12': 'Device control two',
		'13': 'Device control three',
		'14': 'Device control four',
		'15': 'Negative acknowledge',
		'16': 'Synchronous idle',
		'17': 'End of transmission block',
		'18': 'Cancel',
		'19': 'End of medium',
		'1A': 'Substitute',
		'1B': 'Escape',
		'1C': 'File separator',
		'1D': 'Group separator',
		'1E': 'Record separator',
		'1F': 'Unit separator',
		'20': 'Space',
		'21': 'Exclamation mark: !',
		'22': 'Quotation mark: "',
		'23': 'Number sign: #',
		'24': 'Dollar sign: $',
		'25': 'Percent sign: %',
		'26': 'Ampersand: &',
		'27': 'Apostrophe: \'',
		'28': 'Left parenthesis: (',
		'29': 'Right parenthesis: )',
		'2A': 'Asterisk: *',
		'2B': 'Plus sign: +',
		'2C': 'Comma: ,',
		'2D': 'Hyphen: -',
		'2E': 'Period: .',
		'2F': 'Solidus: \/',
		'3F': 'Question mark: ?',
		'5B': 'Left square bracket: [',
		'5C': 'Backslash: \\',
		'5D': 'Right square bracket: ]',
		'7B': 'Left curly bracket: {',
		'7D': 'Right curly bracket: }',
		'7F': 'Delete',
		'A0': 'Non-breaking space'
	},

	unicode: {
		'2000': 'EN Quad',
		'2001': 'EM Quad',
		'2002': 'EN Space',
		'2003': 'EM Space',
		'2004': 'Three-Per-EM Space',
		'2005': 'Four-Per-EM Space',
		'2006': 'Size-Per-EM Space',
		'2007': 'Figure Space',
		'2008': 'Punctuation Space',
		'2009': 'Thin space',
		'200A': 'Hair space',
		'200B': 'Zero-width space',
		'200C': 'Zero-width non-joiner',
		'200D': 'Zero-width joiner',
		'200E': 'Left-To-Right mark',
		'200F': 'Right-To-Left mark',
		'2010': 'Hyphen',
		'2028': 'Line separator',
		'2029': 'Paragraph separator',
		'3000': 'Ideographic space'
	},

	initialized: false,
	init: function () {

		if (this.initialized === true) {
			return;
		}

		for (var x in this.charcode) {
			if (this.charcode.hasOwnProperty(x)) {
				this.unicode['00' + x] = this.charcode[x];
			}
		}

	},

	tokenizeCharacterClass: function (source, negated) {
		var pos = 0,
		tokens  = [],
		simple  = {
			'\\n': 'New line',
			'\\d': 'Any digit',
			'\\D': 'Any non-digit',
			'\\b': 'Backspace',
			'\\f': 'Form feed',
			'\\r': 'Carriage return',
			'\\s': 'White space',
			'\\S': 'Non-white space',
			'\\t': 'Tab',
			'\\v': 'Vertical tab',
			'\\w': 'Any alphanumeric character',
			'\\W': 'Any non-alphanumeric character',
			'\\0': 'NUL'
		};

		function readLiteral() {
			var c = source.charAt(pos),
			m =
			(c === ' ')      ? '<i class="EMPTY">[space]<\/i>':
			(c === '\t')     ? '<i class="EMPTY">[tab]<\/i>':
			(c === '\n')     ? '<i class="EMPTY">[newline]<\/i>':
			(c === '\u00A0') ? '<i class="EMPTY">[non-breaking space]<\/i>':
			REXP.render.html(c);

			tokens.push({ id: c, meaning: m, literal: true });
			pos++;
		}

		function readControlCharacter() {
			var id = source.substring(pos, pos + 3),
			match  = /\\c[A-Z]/.exec(id);

			if (match === null) {
				pos++;
				readLiteral();
				tokens[tokens.length - 1].id = '\\c';
				return;
			}

			tokens.push({
				id: match[0],
				meaning: (negated) ?
				'Not control character ' + id.substring(2):
				'Control character ' + id.substring(2)
			});
			pos += 3;
		}

		function readCharCode() {
			var match = /^\\x([0-9A-Fa-f]{2})/.exec(source.substring(pos)),
			value, meaning;

			if (match === null) {
				pos++;
				readLiteral();
				tokens[tokens.length - 1].id = '\\x';
				return;
			}

			value = match[1].toUpperCase();
			meaning = (negated) ? 'Not c' : 'C';
			meaning += (REXP_JS.charcode.hasOwnProperty(value)) ?
				'haracter code <i class="HEX">' + value +
				'</i> (<i class="LITERAL">' +
				REXP.render.html(REXP_JS.charcode[value]) + '</i>).' :

				'haracter code <i class="HEX">' + value + '</i>.';

			tokens.push({
				id: match[0],
				meaning: meaning
			});
			pos += match[0].length;
		}

		function readUnicode() {
			var match = /^\\u([0-9A-Fa-f]{4})/.exec(source.substring(pos)),
			value, meaning;

			if (match === null) {
				pos++;
				readLiteral();
				tokens[tokens.length - 1].id = '\\u';
				return;
			}

			value = match[1].toUpperCase();
			meaning = (negated) ? 'Not u' : 'U';
			meaning += (REXP_JS.unicode.hasOwnProperty(value)) ?
				'nicode character <i class="HEX">' + value +
				'</i> (<i class="LITERAL">' +
				REXP.render.html(REXP_JS.unicode[value]) + '</i>).' :

				'nicode character <i class="HEX">' + value + '</i>.';

			tokens.push({
				id: match[0],
				meaning: meaning
			});
			pos += match[0].length;
		}

		function readSlashie() {
			var c = source.substring(pos, pos + 2);

			if (simple.hasOwnProperty(c)) {
				tokens.push({ id: c, meaning: simple[c] });
				pos += 2;
				return;
			}

			switch (c) {
			case '\\c':
				readControlCharacter();
				break;

			case '\\x':
				readCharCode();
				break;

			case '\\u':
				readUnicode();
				break;

			default:
				pos++;
				readLiteral();
				tokens[tokens.length - 1].id = c;
				break;
			}

		}

		function readRange() {
			if (pos > 0 && pos + 1 < source.length) {
				tokens.push('range');
				pos++;
			} else {
				readLiteral();
			}
		}

		function readTokens() {
			var c;

			while (pos < source.length) {
				c = source.charAt(pos);

				switch (c) {
				case '\\':
					readSlashie();
					break;

				case '-':
					readRange();
					break;

				default:
					readLiteral();
					break;
				}
			}
		}

		function combineRanges() {
			var x = tokens.length;

			while (x--) {
				if (tokens[x] === 'range') {

					tokens[x - 1].meaning = (negated) ?
						'Match any characters other than those between ' +
						'[<i class="LITERAL">' + tokens[x - 1].meaning +
						'</i>] and [<i class="LITERAL">' +
						tokens[x - 1].meaning + '</i>].' :

						'Match any characters between ' +
						'[<i class="LITERAL">' + tokens[x - 1].meaning +
						'</i>] and [<i class="LITERAL">' +
						tokens[x + 1].meaning + '</i>].';

					tokens[x - 1].id += '-' + tokens[x + 1].id;
					tokens[x - 1].literal = false;

					tokens.splice(x, 2);
				}
			}
		}

		function combineLiterals() {
			var x, y, output = [ tokens[0] ];
			output[0].total = 1;

			for (x = 1, y = 1; x < tokens.length; x++) {

				if (tokens[x].literal === true &&
					output[y - 1].literal === true) {

					output[y - 1].id += tokens[x].id;
					output[y - 1].meaning += tokens[x].meaning;
					output[y - 1].total++;
				} else {
					output[y] = tokens[x];
					output[y].total = 1;
					y++;
				}
			}

			for (x = 0; x < output.length; x++) {
				if (output[x].literal === true && output[x].total > 1) {
					output[x].meaning =
						(negated) ?
							'Match any characters other than these ' +
							'characters: [<i class="LITERAL">' +
							output[x].meaning + '</i>].' :

							'Match any of these characters: ' +
							'[<i class="LITERAL">' + output[x].meaning +
							'</i>].';
				}
			}

			return output;
		}

		readTokens();
		combineRanges();
		return (tokens.length > 1) ? combineLiterals() : tokens;
	},

	tokenize: function (source) {
		var pos = 0,
		tokens = [],
		simple = {
			'|':   'Or',
			'.':   'Matches any single character except newline characters.',
			'\\b': 'Matches a word boundary, such as a space.',
			'\\B': 'Matches a non-word boundary.',
			'\\f': 'Matches a form feed (whatever that is).',
			'\\n': 'Matches a linefeed.',
			'\\r': 'Matches a carriage return.',
			'\\s': 'Matches a single white space character.',
			'\\S': 'Matches a single character other than white space.',
			'\\t': 'Matches a tab.',
			'\\v': 'Matches a vertical tab (whatever that is).',
			'\\d': 'Matches a digit character in the basic Latin alphabet.',

			'\\D':
				'Matches any non-digit character in the basic Latin ' +
				'alphabet',

			'^':
				'Matches beginning of input. If the multiline flag is set ' +
				'to true, also matches immediately after a line break ' +
				'character.',

			'$':
				'Matches end of input. If the multiline flag is set to ' +
				'true, also matches immediately before a line break ' +
				'character.',

			'\\w':
				'Matches any alphanumeric character from the basic Latin ' +
				'alphabet, including the underscore.',

			'\\W':
				'Matches any character that is not a word character from ' +
				'the basic Latin alphabet.',

			'\\0':
				'Matches a NUL character. Mysterious warning: do not ' +
				'follow this with another digit.'
		};

		function readLiteral() {
			var c = source.charAt(pos),
			m =
			(c === ' ')      ? '<i class="EMPTY">[space]<\/i>':
			(c === '\t')     ? '<i class="EMPTY">[tab]<\/i>':
			(c === '\n')     ? '<i class="EMPTY">[newline]<\/i>':
			(c === '\u00A0') ? '<i class="EMPTY">[non-breaking space]<\/i>':
			REXP.render.html(c);

			tokens.push({ id: c, meaning: m, literal: true });
			pos++;
		}

		function readQuantifier() {
			var match = /^[*+?]\??/.exec(source.substring(pos)),
			id = match[0],
			c = id.charAt(0),

			meaning =
			'<br />The ' + id + ' quantifier causes this item to be ';

			meaning +=
			(c === '*') ? 'matched 0 or more times' :

			(c === '+') ? 'matched 1 or more times' :

			'optional';

			if (c !== '?') {
				meaning +=
					(id.charAt(1) === '?') ?
					' (non-greedy).' : ' (greedy).';
			}

			tokens[tokens.length - 1].id += id;
			tokens[tokens.length - 1].meaning += meaning;
			tokens[tokens.length - 1].literal = false;
			pos += id.length;
		}

		function readRepeater() {
			var pattern = /^\{(\d+),?(\d*)\}/,
			match = pattern.test(source.substring(pos)),
			d1, d2, id, meaning;

			if (!match) {
				readLiteral();
				return;
			}

			match = pattern.exec(source.substring(pos));
			id = match[0];
			d1 = match[1];
			d2 = match[2];

			meaning  =
				'<br />The ' + id + ' modifier causes this item to match ';

			meaning +=
				(d2.length > 0) ?
					'at least <i class="NUM">' + d1 +
					'</i> occurrences and up to <i class="NUM">' + d2 +
					'</i> occurrences.' :

					(id.indexOf(',') !== -1) ?
						'at least <i class="NUM">' + d1 + '</i> occurrences.' :
						'exactly <i class="NUM">' + d1 + '</i> occurrences.';

			tokens[tokens.length - 1].id += id;
			tokens[tokens.length - 1].meaning += meaning;
			tokens[tokens.length - 1].literal = false;
			pos += id.length;
		}

		function readParenthetical() {
			var paren, x, type, n, meaning, depth = 0, token;

			type = source.substring(pos + 1, pos + 3);

			meaning =
				(type === '?:') ?
					'Non-capturing parentheses. This is used to group ' +
					'matching items without causing the group to be ' +
					'recalled as a submatch.' :

					(type === '?=') ?
						'Look ahead. <code>x(?=y)</code> matches ' +
						'<code>x</code> only if <code>x</code> is followed ' +
						'by <code>y</code>.' :

						(type === '?!') ?
							'Negative look ahead. <code>x(?!y)</code> ' +
							'matches <code>x</code> only if <code>x</code> ' +
							'is not followed by <code>y</code>.' :

							'Capturing parenthesis. <code>(x)</code> ' +
							'matches <code>x</code> and remembers the match.';

			// Locate closing parenthesis.
			for (x = pos; x < source.length; x++) {
				n = source.charAt(x);
				if (n === '(') {
					depth++;
				}
				if (n === ')') {
					if (depth > 1) {
						depth--;
					} else {
						paren = source.substring(pos, x + 1);
						pos = x + 1;
						break;
					}
				}
				if (n === '\\') {
					// Skip whatever is next; it cannot help us.
					x++;
				}
			}

			if (x === source.length) {
				throw new Error("Expected closing parenthesis");
			}

			token = { id: paren, meaning: meaning };
			switch (type) {
			case '?:':
			case '?=':
			case '?!':
				token.tokens = paren.substring(3, paren.length - 1);
				break;
			default:
				token.tokens = paren.substring(1, paren.length - 1);
			}
			token.tokens = REXP_JS.tokenize(token.tokens);

			tokens.push(token);
		}

		function readCharacterSet() {
			var charset, x, n, meaning, token;

			meaning = (source.charAt(pos + 1) === '^') ?
			'Negated character set':'Character set';

			for (x = pos; x < source.length; x++) {
				n = source.charAt(x);

				if (n === ']') {
					charset = source.substring(pos, x + 1);
					pos = x + 1;
					break;
				}

				if (n === '\\') {
					x++; // Skip next character
				}
			}

			if (x === source.length) {
				throw new Error("Expected closing brace");
			}

			if (charset === '[\\b]') {
				meaning = 'Backspace';
				tokens.push({ id: charset, meaning: meaning });
			} else {

				token = {
					id: charset,
					meaning: meaning
				};

				token.tokens =
					(meaning === 'Negated character set') ?
						REXP_JS.tokenizeCharacterClass(
							charset.substring(2, charset.length - 1),
							true) :

						REXP_JS.tokenizeCharacterClass(
							charset.substring(1, charset.length - 1),
							false);

				if (charset === '[\\s\\S]' || charset === '[\\S\\s]') {
					token.meaning +=
						'<br />This character set is commonly used to match ' +
						'all characters, including new lines.';
				}

				tokens.push(token);
			}
		}

		function readControlCharacter() {
			var id = source.substring(pos, pos + 3);

			if (/\\c[A-Z]/.test(id) === false) {
				pos++;
				readLiteral();
				tokens[tokens.length - 1].id = '\\c';
				return;
			}

			tokens.push({
				id: id,
				meaning: 'Control character: ' + id.substring(2)
			});
			pos += 3;

		}

		function readBackReference() {
			var match = /^\\(\d+)/.exec(source.substring(pos)),
			id = match[0],
			num = match[1],
			a, s, d, x;

			num = parseInt(num, 10);
			s = num.toString();
			if (s.length > 3) {
				a = s.split('');
				for (x = (a.length - 3); x > 0; x -= 3) {
					a.splice(x, 0, ',');
				}
				s = a.join('');
			}
			d = num % 10;
			s +=
			(num === 11) ? 'th' :
			(num === 12) ? 'th' :
			(num === 13) ? 'th' :
			(d === 1)    ? 'st' :
			(d === 2)    ? 'nd' :
			(d === 3)    ? 'rd' : 'th';

			tokens.push({
				id: id,
				meaning: 'A back reference to the last substring ' +
				'matching the <i class="NUM">' + s + '<\/i> parenthetical ' +
				' in the regular expression (counting left parenthesis).'
			});
			pos += id.length;

		}

		function readCharCode() {
			// Is it cheating to use a regular expression to parse
			// another regular expression?
			var match = /^\\x([0-9A-Fa-f]{2})/.exec(source.substring(pos)),
			value, meaning;

			if (match === null) {
				pos++;
				readLiteral();
				tokens[tokens.length - 1].id = '\\x';
				return;
			}

			value = match[1].toUpperCase();
			meaning =
				(REXP_JS.charcode.hasOwnProperty(value)) ?
					'Character code <i class="HEX">' + value +
					'</i> (<i class="LITERAL">' +
					REXP.render.html(REXP_JS.charcode[value]) + '</i>).' :

					'Character code <i class="HEX">' + value + '</i>.';

			tokens.push({
				id: match[0],
				meaning: meaning
			});

			pos += match[0].length;
		}

		function readUnicode() {
			var match = /^\\u([0-9A-Fa-f]{4})/.exec(source.substring(pos)),
			value, meaning;

			if (match === null) {
				pos++;
				readLiteral();
				tokens[tokens.length - 1].id = '\\u';
				return;
			}

			value = match[1].toUpperCase();
			meaning =
				(REXP_JS.unicode.hasOwnProperty(value)) ?
					'Unicode character <i class="HEX">' + value +
					'</i> (<i class="LITERAL">' +
					REXP.render.html(REXP_JS.unicode[value]) + '</i>).' :

					'Unicode character <i class="HEX">' + value + '</i>.';

			tokens.push({
				id: match[0],
				meaning: meaning
			});

			pos += match[0].length;
		}

		function readSlashie() {
			var c = source.substring(pos, pos + 2);

			if (simple.hasOwnProperty(c)) {
				tokens.push({ id: c, meaning: simple[c] });
				pos += 2;
				return;
			}

			switch (c) {
			case '\\c':
				readControlCharacter();
				break;

			case '\\0':
			case '\\1':
			case '\\2':
			case '\\3':
			case '\\4':
			case '\\5':
			case '\\6':
			case '\\7':
			case '\\8':
			case '\\9':
				readBackReference();
				break;

			case '\\x':
				readCharCode();
				break;

			case '\\u':
				readUnicode();
				break;

			default:
				pos++;
				readLiteral();
				tokens[tokens.length - 1].id = c;
			}

		}

		function readTokens() {
			var c;

			while (pos < source.length) {
				c = source.charAt(pos);

				if (simple.hasOwnProperty(c)) {
					tokens.push({ id: c, meaning: simple[c] });
					pos++;
					continue;
				}

				switch (c) {

				case '*':
				case '+':
				case '?':
					readQuantifier();
					break;

				case '{':
					readRepeater();
					break;

				case '(':
					readParenthetical();
					break;

				case '[':
					readCharacterSet();
					break;

				case '\\':
					readSlashie();
					break;

				default:
					readLiteral();
					break;
				}
			}
		}

		function combineLiterals() {
			var x, y, output = [ tokens[0] ];
			output[0].total = 1;

			for (x = 1, y = 1; x < tokens.length; x++) {
				if (tokens[x].literal === true &&
					output[y - 1].literal === true) {

					output[y - 1].id += tokens[x].id;
					output[y - 1].meaning += tokens[x].meaning;
					output[y - 1].total++;
				} else {
					output[y] = tokens[x];
					output[y].total = 1;
					y++;
				}
			}

			for (x = 0; x < output.length; x++) {
				if (output[x].literal === true) {

					output[x].meaning =
						'<i class="LITERAL">' + output[x].meaning + '</i>';

				}
			}

			return output;
		}

		this.init();
		readTokens();
		return (tokens.length > 1) ? combineLiterals() : tokens;
	}


};


Event.onDOMReady(REXP.init, REXP, true);
