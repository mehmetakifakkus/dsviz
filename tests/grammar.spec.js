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

// js/codelang.js on its own: Düğüm -> C++ -> Düğüm for every example block must parse
function loadCodeLang() {
	const context = { window: {} };
	context.self = context;
	vm.createContext(context);
	vm.runInContext(fs.readFileSync(path.join(ROOT, 'js/grammar.js'), 'utf8'), context);
	vm.runInContext(fs.readFileSync(path.join(ROOT, 'js/codelang.js'), 'utf8'), context);
	return context.window;
}

for (const [lang, name, forbidden] of [['cpp', 'C++', /^\s*var\s|\bnull\b|\bfunction\b/m], ['java', 'Java', /^\s*var\s|->|\bnullptr\b|\bfunction\b|\bcout\b|^\s*delete\b/m]])
test(`every example translates to ${name} and back to code that parses`, () => {
	const w = loadCodeLang();
	const pages = fs.readdirSync(ROOT).filter(f => f.endsWith('.html') && f !== 'language.html');
	let blocks = 0;
	for (const file of pages) {
		const html = fs.readFileSync(path.join(ROOT, file), 'utf8');
		const code = [...html.matchAll(/<textarea id="(\w+)" class="deneme">\n?([\s\S]*?)<\/textarea>/g)]
			.map(m => m[2].replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&'));
		w.dsvCode.langs[lang].to(code).forEach((cpp, i) => {
			const codeOnly = cpp.split('\n').map(l => l.replace(/\/\/.*$/, '')).join('\n'); // comments may say "null"
			expect(codeOnly, `${file} #${i + 1}`).not.toMatch(forbidden);
			const back = w.dsvCode.langs[lang].from(cpp);
			expect(back.split('\n').length, `${file} #${i + 1} keeps its lines`).toBe(cpp.split('\n').length);
			expect(() => w.dsvParser.parse(back), `${file} #${i + 1}`).not.toThrow();
			blocks++;
		});
	}
	expect(blocks).toBeGreaterThan(80);
});

test('C++ types are inferred from the code', () => {
	const w = loadCodeLang();
	const [cpp] = w.dsvCode.toCpp([`var head = null
var n = 0
function add(v)
{
  head = new Node(v, head)
  n++
}
function count(p)
{
  if(p == null)
    return 0
  return 1 + count(p.next)
}
function isEmpty()
{
  return head == null
}
var t = new Array(3)
t[0] = head
add(5)
var c = count(head), e = isEmpty()
print "count: " + c
`]);
	expect(cpp).toBe(`Node* head = nullptr;
int n = 0;
void add(int v)
{
  head = new Node(v, head);
  n++;
}
int count(Node* p)
{
  if(p == nullptr)
    return 0;
  return 1 + count(p->next);
}
bool isEmpty()
{
  return head == nullptr;
}
Node* t[3];
t[0] = head;
add(5);
int c = count(head); bool e = isEmpty();
cout << "count: " << c << endl;
`);
});

test('Java types are inferred from the code', () => {
	const w = loadCodeLang();
	const [java] = w.dsvCode.toJava([`var head = null
var t = new Array(3)
var s = new Array(2)
function push(v)
{
  head = new Node(v, head)
}
function isEmpty()
{
  return head == null
}
t[0] = head
s[0] = 4
push(5)
var e = isEmpty()
print "top: " + head.data + ", sum: " + s[0] + 1
delete head
`]);
	expect(java).toBe(`Node head = null;
Node[] t = new Node[3];
int[] s = new int[2];
static void push(int v)
{
  head = new Node(v, head);
}
static boolean isEmpty()
{
  return head == null;
}
t[0] = head;
s[0] = 4;
push(5);
boolean e = isEmpty();
System.out.println("top: " + head.data + ", sum: " + (s[0] + 1));
// delete head: Java'da gerekmez, çöp toplayıcı ulaşılamayan düğümü siler
`.replace("Java'da gerekmez, çöp toplayıcı ulaşılamayan düğümü siler", 'not needed in Java'));
});

test('C++ and Java: integer division where both sides are integers', () => {
	const w = loadCodeLang();
	const cpp = w.dsvCode.fromCpp(`int a = 7, b = 2;
double d = a / 2.0;
Node* p = new Node(9);
int h = p->data / 2;
int f = a * b / 3 + a / b / 2;
double avg = (a + b) / 2;
int half(int x) {
  return x / 2;
}
cout << "x" << half(a) / b << endl;`).split('\n');
	expect(cpp[1]).toBe('var d = a / 2.0'); // a double side: a real division
	expect(cpp[3]).toBe('var h = tamBöl(p.data, 2)');
	expect(cpp[4]).toBe('var f = tamBöl(a * b, 3) + tamBöl(tamBöl(a, b), 2)'); // left to right
	expect(cpp[5]).toBe('var avg = tamBöl((a + b), 2)'); // int / int, even into a double
	expect(cpp[7]).toBe('  return tamBöl(x, 2)'); // a parameter
	expect(cpp[9]).toBe('print "x" + "" + tamBöl(half(a), b)'); // an int function
	const java = w.dsvCode.fromJava('double q = 7.0 / 2;\nint z = 9 / 2;\nint m = -9 / 2;').split('\n');
	expect(java).toEqual(['var q = 7.0 / 2', 'var z = tamBöl(9, 2)', 'var m = tamBöl(-9, 2)']);
	expect(w.dsvCode.displayCpp('c = tamBöl(tamBöl(a, b), 2)')).toBe('c = a / b / 2');
});

test('js/grammar.js is compiled from the current grammer.pegjs', () => {
	const { compileGrammar } = require('../tools/build-grammar.js');
	const built = fs.readFileSync(path.join(ROOT, 'js/grammar.js'), 'utf8');
	expect(built === compileGrammar(), 'grammer.pegjs changed: run "npm run build:grammar" and commit js/grammar.js').toBe(true);
});
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

test('a link can be set to the result of a call', () => {
	expect(parse('a.next = merge(a.next, b)\n')[0]).toMatchObject({ type: 'object property left', lhs: 'a', rhs: 'merge(a.next, b)' });
	expect(parse('a.next = b\n')[0]).toMatchObject({ type: 'object property left', rhs: 'b' });
});

test('math functions are calls inside expressions; a field can start an expression', () => {
	expect(parse('var r = karekök(16) + mutlak(-2)\n')[0]).toMatchObject({ type: 'declaration', lhs: 'r', rhs: 'karekök(16) + mutlak(-2)' });
	expect(parse('print taban(7 / 2) + 1\n')[0].list).toEqual([{ subtype: 'var', text: 'taban(7 / 2) + 1', lineNumber: 1 }]);
	expect(parse('var w = p.data * 2\n')[0]).toMatchObject({ lhs: 'w', rhs: 'p.data * 2' });
	expect(parse('var v = x.next.data\n')[0].rhs.trim()).toBe('x.next.data');
});

test('every name of a comma-separated declaration is declared', () => {
	expect(parse('var a = 1, b = a + 1\n')).toMatchObject([
		{ type: 'declaration', lhs: 'a', rhs: '1', lineNumber: 1 },
		{ type: 'declaration', lhs: 'b', rhs: 'a + 1', lineNumber: 1 }]);
	expect(parse('var x = new Node(1), y = new Node(2), z = x\n').map(d => d.lhs)).toEqual(['x', 'y', 'z']);
	expect(parse('a = 3, b = 4\n').map(d => [d.type, d.lhs])).toEqual([['assignment', 'a'], ['assignment', 'b']]);
	expect(parse('function f()\n{\n  var i = 0, j = 5\n  return j\n}\n')[0].body.map(d => d.lhs || d.type)).toEqual(['i', 'j', 'return']);
	expect(parse('for(var i = 0, j = 9; i < j; i++)\n  print i\n')[0].init.map(d => d.lhs)).toEqual(['i', 'j']);
	expect(parse('var v = f(1, 2), q = 3\n').map(d => d.rhs)).toEqual(['f(1, 2)', '3']); // the comma of a call is not a separator
});

test('the second value of Node is the new node\'s next', () => {
	expect(parse('head = new Node(0, head)\n')[0]).toMatchObject({ type: 'assignment', lhs: 'head', rhs: { type: 'node', data: 0, next: 'head' } });
	expect(parse('x.next = new Node(5, x.next)\n')[0].rhs).toMatchObject({ data: 5, next: 'x.next' });
	expect(parse('var n = Node(p.data + 1, null)\n')[0].rhs).toMatchObject({ data: 'p.data + 1', next: 'null' });
	expect(parse('var m = new Node(4)\n')[0].rhs.next).toBe(null);
});

test('a field of a call\'s result can be read; new nodes can be nested', () => {
	expect(parse('var v = pop().data\n')[0]).toMatchObject({ type: 'declaration', lhs: 'v', rhs: 'pop().data' });
	expect(parse('var s = middle(x).next.data + 1\n')[0].rhs).toBe('middle(x).next.data + 1');
	expect(parse('if(pop().data > 2)\n  print 1\n')[0].text).toBe('pop().data > 2');
	expect(parse('return f(a).data\n')[0].text).toBe('f(a).data');
	expect(parse('pop()\n')[0]).toMatchObject({ type: 'expression', text: 'pop()' });
	const nested = parse('var x = new Node(1, new Node(2, Node(3)))\n')[0].rhs;
	expect(nested).toMatchObject({ data: 1, next: { type: 'node', data: 2, next: { type: 'node', data: 3, next: null } } });
});

test('a condition can be the value of a variable', () => {
	expect(parse('var ok = counts[0] == 2\n')[0]).toMatchObject({ type: 'declaration', lhs: 'ok', rhs: 'counts[0] == 2' });
	expect(parse('var e = p.data == 4\n')[0].rhs.replace(/\s+/g, ' ')).toBe('p.data == 4');
	expect(parse('found = p != null && p.data > 3\n')[0]).toMatchObject({ type: 'assignment', lhs: 'found' });
	expect(parse('var s = a + 1\n')[0].rhs).toBe('a + 1'); // still a plain expression
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

test('Düğüm with Turkish words: translated word by word both ways, strings and comments left alone', () => {
	const w = loadCodeLang();
	const dugum = 'var p = head   // null olabilir\nwhile(p != null && p.next.data > 2.5)\n{\n  print "null kalır", p.data\n  p = p.next\n}\nvar x = new Node(3, null)\nif(!ok || not done)\n{\n  delete x\n}\nelse\n  var t = new Array(5)\nfor(var i = 0; i < 3; i++)\n  break\nvar prev = true, next = false';
	const turkish = w.dsvCode.toTurkish([dugum])[0];
	expect(turkish.split('\n')).toEqual([
		'değişken p = head   // null olabilir',
		'yinele(p != boş ve p.sonraki.veri > 2.5)',
		'{',
		'  yaz "null kalır", p.veri',
		'  p = p.sonraki',
		'}',
		'değişken x = yeni Düğüm(3, boş)',
		'eğer(!ok veya değil done)',
		'{',
		'  sil x',
		'}',
		'değilse',
		'  değişken t = yeni Dizi(5)',
		'için(değişken i = 0; i < 3; i++)',
		'  kır',
		'değişken prev = doğru, next = yanlış' // names of variables stay, only fields (.next) are words
	]);
	const back = w.dsvCode.fromTurkish(turkish);
	expect(back.split('\n').length).toBe(dugum.split('\n').length); // every line keeps its number
	expect(back).toContain('while(p != null and p.next.data > 2.5)');
	expect(back).toContain('  delete x');
	expect(back).toContain('var prev = true, next = false');
	expect(w.dsvCode.langs.turkce.display('p.left = null')).toBe('p.sol = boş');
	expect(w.dsvCode.langs.turkce.field('right')).toBe('sağ');
});

test('matrices: new Array(r, c) and g[i][j] = v', () => {
	expect(parse('var g = new Array(3, 4)\n')[0].rhs).toMatchObject({ type: 'array', size: '3', size2: '4' });
	expect(parse('var g = new Array(5)\n')[0].rhs).toMatchObject({ type: 'array', size: '5', size2: null });
	expect(parse('var g = new Dizi(r, c + 1)\n')[0].rhs).toMatchObject({ size: 'r', size2: 'c + 1' });
	expect(parse('g[1][2] = 5\n')[0]).toMatchObject({ type: 'matrix assignment', array: 'g', row: '1', col: '2', rhs: '5' });
	const s = parse('g[i][j] = g[i - 1][j] + g[i][j - 1]\n')[0];
	expect(s).toMatchObject({ type: 'matrix assignment', row: 'i', col: 'j', rhs: 'g[i - 1][j] + g[i][j - 1]' });
	expect(parse('g[i][j] = new Node(1)\n')[0]).toMatchObject({ type: 'matrix assignment' });
	expect(parse('a[i] = 3\n')[0].type).toBe('array assignment'); // one subscript is still a plain array
	expect(parse('if(g[i][j] == 0)\n  print g[i][j]\n')[0]).toMatchObject({ type: 'logical' }); // read inside conditions and prints
});

test('matrices are shown in C++, Java and Türkçe and translate back', () => {
	const w = loadCodeLang();
	const dugum = 'var g = new Array(3, 4)\ng[1][2] = 5\nvar b = new Array(2, 2)\nb[0][0] = true\ng[0][0] = null\nprint g[1][2]\n';
	const [cpp] = w.dsvCode.toCpp([dugum]);
	expect(cpp).toBe('int g[3][4];\ng[1][2] = 5;\nbool b[2][2];\nb[0][0] = true;\ng[0][0] = 0;\ncout << g[1][2] << endl;\n');
	const [java] = w.dsvCode.toJava([dugum]);
	expect(java).toContain('int[][] g = new int[3][4];\n');
	expect(java).toContain('boolean[][] b = new boolean[2][2];\n');
	expect(java).toContain('System.out.println(g[1][2]);');
	for (const text of [cpp, java]) {
		const lang = text === cpp ? w.dsvCode.langs.cpp : w.dsvCode.langs.java;
		const back = lang.from(text);
		expect(back).toContain('var g = new Array(3, 4)');
		expect(back).toContain('var b = new Array(2, 2)');
		expect(() => w.dsvParser.parse(back)).not.toThrow();
	}
	expect(w.dsvCode.toTurkish([dugum])[0]).toContain('değişken g = yeni Dizi(3, 4)');
	expect(w.dsvCode.fromTurkish(w.dsvCode.toTurkish([dugum])[0])).toBe(dugum);
});

test('a field can be the first operand of a sum, in a return or an assignment', () => {
	for (const code of ['return node.data + f(node.left)', 'return node.data + node.data', 'return p.data * 2 + 1', 'return a.next.data - b.data', 'x = p.data + 1', 'x = p.data - q.data'])
		expect(() => parser.parse('function f(node)\n{\n  ' + code + '\n}\n'), code).not.toThrow();
	expect(parser.parse('function f(node)\n{\n  return node.data + f(node.left)\n}\n')[0].body[0].text).toBe('node.data + f(node.left)');
	// the pointer moves and lone fields are what they were
	expect(parser.parse('p = p.next\n')[0].type).toBe('object property right');
	expect(parser.parse('p.next = q.next\n')[0].type).toBe('object property left-right');
	expect(parser.parse('function f(node)\n{\n  return node.left\n}\n')[0].body[0].text.trim()).toBe('node.left');
	expect(parser.parse('x = p.data + 1\n')[0]).toMatchObject({ type: 'assignment', rhs: 'p.data + 1' });
});
