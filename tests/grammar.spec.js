// The grammar on its own (no browser): grammer.pegjs is compiled with the same PEG.js
// that the pages load, every example code block must parse, and some tricky inputs
// must give the expected statements.
const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');

function buildParser() {
	const context = { window: {} };
	context.self = context;
	vm.createContext(context);
	vm.runInContext(fs.readFileSync(path.join(ROOT, 'js/peg-0.9.0.min.js'), 'utf8'), context);
	return context.PEG.buildParser(fs.readFileSync(path.join(ROOT, 'grammer.pegjs'), 'utf8'));
}

const parser = buildParser();
const parse = code => JSON.parse(JSON.stringify(parser.parse(code)));

// every statement of a parse result, nested ones too
function statements(items) {
	const out = [];
	(function visit(x) {
		if (Array.isArray(x)) return x.forEach(visit);
		if (!x || typeof x !== 'object' || !x.type) return;
		out.push(x);
		['truePart', 'falsePart', 'statements', 'body', 'init', 'update'].forEach(k => x[k] && visit(x[k]));
	})(items);
	return out;
}

test('every code block of the example pages parses', () => {
	const pages = fs.readdirSync(ROOT).filter(f => f.endsWith('.html'));
	let blocks = 0;
	for (const file of pages) {
		const html = fs.readFileSync(path.join(ROOT, file), 'utf8');
		for (const m of html.matchAll(/<textarea id="(\w+)" class="deneme">\n?([\s\S]*?)<\/textarea>/g)) {
			const code = m[2].replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
			expect(() => parser.parse(code), `${file} #${m[1]}`).not.toThrow();
			blocks++;
		}
		// English and German versions of a block: raw text, no HTML entities
		for (const m of html.matchAll(/<script type="text\/plain" class="code-variant" data-for="(\w+)" data-lang="(\w+)">\n?([\s\S]*?)<\/script>/g)) {
			expect(m[3], `${file} #${m[1]} (${m[2]}) has an HTML entity`).not.toMatch(/&\w+;/);
			expect(() => parser.parse(m[3]), `${file} #${m[1]} (${m[2]})`).not.toThrow();
			blocks++;
		}
	}
	expect(blocks).toBeGreaterThan(80);
});

test('names that start with a keyword are names', () => {
	const result = parse('var settle = 1\nvar geçici = 2\nvariable = 3\nvar forward = 4\nvar returned = 5\nvar İndis = 6\n');
	expect(result.map(s => [s.type, s.lhs])).toEqual([
		['declaration', 'settle'], ['declaration', 'geçici'], ['assignment', 'variable'],
		['declaration', 'forward'], ['declaration', 'returned'], ['declaration', 'İndis']
	]);
	expect(() => parser.parse('var a|b = 3\n')).toThrow();
});

test('an expression line can end with a newline', () => {
	expect(parse('var a = 5\na + 2\n').map(s => s.type)).toEqual(['declaration', 'expression']);
});

test('conditions: word operators, bare values and negation', () => {
	const conditions = statements(parse(
		'if(a se b and c ge d or e equal f)\n  x = 1\n' +
		'while(p.next)\n  p = p.next\n' +
		'if(!isEmpty())\n  x = 2\n' +
		'if(değil a)\n  x = 3\n' +
		'if((a > 1) && !(b == 2))\n  x = 4\n'
	)).filter(s => s.type === 'logical').map(s => s.text);
	expect(conditions).toEqual(['a <= b && c >= d || e == f', 'p.next', '!isEmpty()', '!a', '(a > 1) && !(b == 2)']);
});

test('a statement on its own line still needs a comparison', () => {
	// otherwise "var" would be read as a bare condition and the rest as a new statement
	expect(parse('var x = 1\n').map(s => s.type)).toEqual(['declaration']);
});

test('print joins its parts with + and does not swallow the next line', () => {
	const result = parse('print "değer: " + x + " son"\n  p = p.prev\n');
	expect(result[0].list.map(i => [i.subtype, i.text])).toEqual([['string', 'değer: '], ['var', 'x'], ['string', ' son']]);
	expect(result[1].type).toBe('object property right');
});

test('functions, return and calls', () => {
	const result = parse('function push(v, w)\n{\n  var n = new Node(v)\n  return n\n}\nfonksiyon f()\n{\n  döndür\n}\nvar a = push(1, 2) + 1\n');
	expect(result[0]).toMatchObject({ type: 'function', name: 'push', params: ['v', 'w'], lineNumber: 1, endLine: 5 });
	expect(result[0].body.map(s => s.type)).toEqual(['declaration', 'return']);
	expect(result[1]).toMatchObject({ type: 'function', name: 'f', params: [] });
	expect(result[1].body[0]).toMatchObject({ type: 'return', text: null });
	expect(result[2]).toMatchObject({ type: 'declaration', lhs: 'a', rhs: 'push(1, 2) + 1' });
});

test('for, break, continue and increments', () => {
	const [loop] = parse('for(var i = 0; i < 3; i++)\n{\n  if(i == 1)\n    continue\n  break\n}\n');
	expect(loop).toMatchObject({ mainType: 'for', text: 'i < 3' });
	expect(loop.init).toMatchObject({ type: 'declaration', lhs: 'i', rhs: '0' });
	expect(loop.update).toMatchObject({ type: 'assignment', lhs: 'i', rhs: 'i + 1' });
	expect(statements(loop.statements).map(s => s.type)).toEqual(['logical', 'continue', 'break']);
	expect(parse('n -= k * 2\n')[0]).toMatchObject({ rhs: 'n - (k * 2)' });
});

test('new Node takes a number or an expression', () => {
	expect(parse('var a = new Node(5)\n')[0].rhs.data).toBe(5);
	expect(parse('var a = new Node(i * 10)\n')[0].rhs.data).toBe('i * 10');
});
