// The language: code runs on the main page (like the command prompt does) and the result
// is checked in the page. Error cases check the Turkish message in the Çıktı panel.
const { test } = require('@playwright/test');
const { expect, openPage, runCode, runBlock, valueOf, outputText } = require('./helpers');

const LIST = 'var x = new Node(1)\nvar y = new Node(2)\nvar z = new Node(3)\nx.next = y\ny.next = z\n';

const STACK = `var tepe = null
function push(v)
{
  var n = new Node(v)
  n.next = tepe
  tepe = n
}
function pop()
{
  var t = tepe
  tepe = tepe.next
  var v = t.data
  delete t
  return v
}
function isEmpty()
{
  return tepe == null
}
`;

// [name, code blocks, expression, expected value]
const RESULTS = [
	// loops
	['for over a list', [LIST, 'var c = 0\nfor(var p = x; p != null; p = p.next)\n  c++\n'], '[c, p]', [3, null]],
	['for with an index', [LIST, 'var f = x\nfor(var i = 0; i < 2; i++)\n  f = f.next\n'], '[i, f.data]', [2, 3]],
	['break', [LIST, 'var p = x\nwhile(p != null)\n{\n  if(p.data == 2)\n    break\n  p = p.next\n}\n'], 'p.data', 2],
	['continue', [LIST, 'var s = 0\nfor(var p = x; p != null; p = p.next)\n{\n  if(p.data == 2)\n    continue\n  s += p.data\n}\n'], 's', 4],
	['break leaves only the inner loop', [LIST, 'var pairs = 0\nfor(var a = x; a != null; a = a.next)\n{\n  for(var b = x; b != null; b = b.next)\n  {\n    if(b == a)\n      break\n    pairs++\n  }\n}\n'], 'pairs', 3],
	['++ -- += -=', ['var n = 10\nn--\nn -= 3\nn += 2 * 2\nn++\n'], 'n', 11],
	['else if', ['var a = 0\nvar r = 0\nif(a > 1)\n  r = 1\nelse if(a == 0)\n  r = 2\nelse\n  r = 3\n'], 'r', 2],

	// names that start with a keyword or an operator word
	['identifiers that start with keywords', ['var settle = 1\nvar geçici = 2\nvariable = 3\nvar orta = 4\nvar doğrusu = 5\nvar forward = 6\n'], '[settle, geçici, variable, orta, doğrusu, forward]', [1, 2, 3, 4, 5, 6]],
	['comments with any characters', ['var a = 1 // İlk değer: bir? (evet!)\n'], 'a', 1],

	// conditions without a comparison
	['while(p)', [LIST, 'var c = 0\nvar p = x\nwhile(p)\n{\n  c++\n  p = p.next\n}\n'], 'c', 3],
	['while(p.next)', [LIST, 'var p = x\nwhile(p.next)\n  p = p.next\n'], 'p.data', 3],
	['bare for condition', [LIST, 'var s = 0\nfor(var r = x; r; r = r.next)\n  s += r.data\n'], 's', 6],
	['&& and !', [LIST, 'var found = false\nvar p = x\nwhile(p && !found)\n{\n  if(p.data == 2)\n    found = true\n  else\n    p = p.next\n}\n'], '[found, p.data]', [true, 2]],
	['değil / and / or', ['var a = false\nvar b = true\nvar r = 0\nif(değil a and (b or a))\n  r = 1\n'], 'r', 1],

	// nodes
	['new Node(expression)', ['var v = 4\nvar n = new Node(v * 2 + 1)\n'], 'n.data', 9],
	['x.next.next = new Node(...)', [LIST, 'x.next.next.next = new Node(7)\n'], 'walk(x)', '1>2>3>7'],
	['p.next = q.next', [LIST, 'x.next = y.next\n'], 'walk(x)', '1>3'],
	['doubly linked prev', ['var a = new Node(1)\nvar b = new Node(2)\na.next = b\nb.prev = a\n'], 'back(b)', '2>1'],
	['print', [LIST, 'print "değer: " + x.data + " ve " + y.data\n'], 'output()', 'değer: 1 ve 2'],

	// functions
	['stack functions', [STACK, 'push(1)\npush(2)\npush(3)\nvar a = pop()\nvar b = pop() * 10\n'], '[a, b, tepe.data, typeof n, typeof t]', [3, 20, 1, 'undefined', 'undefined']],
	['while(!isEmpty())', [STACK, 'push(1)\npush(2)\npush(3)\nwhile(!isEmpty())\n  print pop()\n'], 'output()', '3,2,1'],
	['hoisting', ['var r = twice(4)\nfunction twice(a)\n{\n  return a * 2\n}\n'], 'r', 8],
	['two parameters, local var', ['function add(a, b)\n{\n  var s = a + b\n  return s\n}\nvar s = 100\nvar t = add(2, 3)\n'], '[t, s]', [5, 100]],
	['a parameter hides a global', ['var p = 5\nfunction f(p)\n{\n  p = p + 1\n  return p\n}\nvar q = f(10)\n'], '[p, q]', [5, 11]],
	['a function changes a global', ['var total = 0\nfunction addTo(v)\n{\n  total = total + v\n}\naddTo(3)\naddTo(4)\n'], 'total', 7],
	['Turkish keywords fonksiyon / döndür', ['fonksiyon kare(a)\n{\n  döndür a * a\n}\nvar k = kare(5)\n'], 'k', 25],
	['recursion: count', [LIST, 'function count(p)\n{\n  if(p == null)\n    return 0\n  return 1 + count(p.next)\n}\nvar k = count(x)\n'], 'k', 3],
	['recursion: print backwards', [LIST, 'function printReverse(p)\n{\n  if(p == null)\n    return\n  printReverse(p.next)\n  print p.data\n}\nprintReverse(x)\n'], 'output()', '3,2,1'],
	['recursion: reverse a list', [LIST, 'function reverse(p)\n{\n  if(p == null || p.next == null)\n    return p\n  var rest = reverse(p.next)\n  p.next.next = p\n  p.next = null\n  return rest\n}\nx = reverse(x)\n'], 'walk(x)', '3>2>1']
];

// [name, code, the message in Çıktı]
const ERRORS = [
	['syntax error with line, column and caret', 'var x = new Node(1)\nwhile(p = null)\n  p = p.next\n', /Yazım hatası \(satır 2, sütun 9\): burada "=" beklenmiyordu\.\s+while\(p = null\)\s+\^/],
	['reading a field of null', LIST + 'var p = z.next\nvar d = p.data\n', /Satır 7: null olan bir pointer'ın \.data alanı okunmaya çalışıldı/],
	['setting a field of null', LIST + 'var p = z.next\np.next = x\n', /Satır 7: null olan bir pointer'ın \.next alanı değiştirilmeye çalışıldı/],
	['undefined variable', 'var a = b + 1\n', /Satır 1: "b" tanımlı değil/],
	['infinite loop', 'var i = 0\nwhile(i < 10)\n  i = i + 0\n', /Satır 2: döngü 1000 kereden fazla döndü/],
	['break outside a loop', 'var k = 1\nbreak\n', /Satır 2: break yalnızca bir döngünün/],
	['return outside a function', 'var a = 1\nreturn a\n', /Satır 2: return yalnızca bir fonksiyonun içinde/],
	['break that would leave a function', 'function g()\n{\n  break\n}\nfor(var i = 0; i < 3; i++)\n  g()\n', /Satır 3: break yalnızca bir döngünün/],
	['endless recursion', 'function down(n)\n{\n  return down(n + 1)\n}\ndown(0)\n', /iç içe 200 fonksiyon çağrısı aşıldı/],
	['a name the browser owns (top)', 'var top = null\n', /"top" adı tarayıcıya ayrılmış.*tepe/],
	['a name the app uses (parse)', 'function parse(a)\n{\n  return a\n}\n', /"parse" adı uygulamanın kendisi tarafından kullanılıyor/],
	['ifif is not a keyword', 'ifif(1 < 2)\n  print "x"\n', /Yazım hatası/]
];

test.describe('results', () => {
	for (const [name, blocks, expression, expected] of RESULTS) {
		test(name, async ({ page }) => {
			const problems = await openPage(page, 'index.html');
			await runCode(page, blocks);
			expect(await outputText(page)).not.toMatch(/Hata|hatası|tanımlı değil|null olan/);
			expect(await valueOf(page, expression)).toEqual(expected);
			expect(problems).toEqual([]);
		});
	}
});

test.describe('error messages', () => {
	for (const [name, code, message] of ERRORS) {
		test(name, async ({ page }) => {
			const problems = await openPage(page, 'index.html');
			await runCode(page, code);
			expect(await outputText(page)).toMatch(message);
			expect(problems).toEqual([]); // errors are shown to the learner, the page itself does not fail
		});
	}
});

test('a comma-separated declaration declares every name, also in functions and for', async ({ page }) => {
	const problems = await openPage(page, 'index.html');
	await runCode(page, `var a = 1, b = 2
var x = new Node(1), y = new Node(2), z = x
x.next = y
function f(n)
{
  var i = 0, s = 0
  for(var k = 1, m = n; k <= m; k++)
  {
    s += k
  }
  return s
}
var total = f(4), c = a + b
`);
	expect(await valueOf(page, '[a, b, c, total, z === x, walk(x)]')).toEqual([1, 2, 3, 10, true, '1>2']);
	expect((await page.evaluate(() => window.dsvState())).pointers).toEqual(['x', 'y', 'z']);
	expect(problems).toEqual([]);
});

test('Node(value, next) links the new node, also in a field and an array cell', async ({ page }) => {
	const problems = await openPage(page, 'index.html');
	await runCode(page, 'var x = new Node(3)\nvar y = new Node(2, x)\ny = new Node(1, y)\nx.next = new Node(4, null)\n');
	expect(await valueOf(page, 'walk(y)')).toBe('1>2>3>4');
	expect((await page.evaluate(() => window.dsvState())).rows).toEqual([[1, 2, 3, 4]]);
	await expect(page.locator('#narration')).toHaveText('Yeni bir düğüm [4] oluşturuldu ve [3] düğümünün next bağı ona bağlandı.');

	await runCode(page, 'var t = new Array(2)\nt[1] = new Node(7, y)\n');
	expect(await valueOf(page, 'walk(t[1])')).toBe('7>1>2>3>4');

	await runCode(page, 'var bad = new Node(1, 5)\n');
	await expect(page.locator('#output')).toContainText('Yeni düğümün ikinci değeri (new Node(1, x) içindeki x) onun .next bağı olur; bir düğüm ya da null olmalı (5 verildi).');
	expect(problems).toEqual([]);
});

test('a field of a call\'s result is read, and nested new nodes are drawn linked', async ({ page }) => {
	const problems = await openPage(page, 'index.html');
	await runCode(page, `var x = new Node(1, new Node(2, new Node(3)))
function find(v)
{
  var p = x
  while(p != null && p.data != v)
  {
    p = p.next
  }
  return p
}
var a = find(2).data
var q = find(2).next
var b = find(1).next.next.data + 10
if(find(3).data == 3)
  print "found: " + find(3).data
`);
	expect(await valueOf(page, '[a, q.data, b, walk(x)]')).toEqual([2, 3, 13, '1>2>3']);
	const drawn = await page.evaluate(() => window.dsvState());
	expect(drawn.rows).toEqual([[1, 2, 3]]);
	expect(drawn.pointers).toEqual(['q', 'x']);
	expect(await outputText(page)).toBe('found: 3\n');

	await runCode(page, 'var c = find(99).data\n'); // find returns null
	await expect(page.locator('#output')).toContainText("null olan bir pointer'ın .data alanı okunmaya çalışıldı");
	expect(problems).toEqual([]);
});

test('a function inside a function is an explained error, before anything runs', async ({ page }) => {
	const problems = await openPage(page, 'index.html');
	await runCode(page, `var ran = 1
function outer(n)
{
  if(n > 0)
  {
    function inner(v)
    {
      return v
    }
  }
  return n
}
`);
	await expect(page.locator('#output')).toContainText('Satır 6: "inner" bir fonksiyonun içinde tanımlanmış; Düğüm\'de fonksiyonlar yalnızca en dışta tanımlanır.');
	expect(await page.evaluate(() => typeof window.ran)).toBe('undefined'); // nothing ran
	expect(problems).toEqual([]);
});

test('C++: a hand-written program runs (struct, cout, arrays, ++x, nullptr, main)', async ({ page }) => {
	const problems = await openPage(page, 'index.html', { codeLang: 'cpp' });
	await runCode(page, `#include <iostream>
using namespace std;

struct Node {
  int data;
  Node* next;
};

int length(Node* head)
{
  int n = 0;
  for (Node* p = head; p != nullptr; p = p->next)
    ++n;
  return n;
}

int main() {
  Node *a = new Node(1), *b = new Node(2);
  a->next = b;
  b->next = NULL;
  int counts[3];
  counts[0] = length(a);
  Node* empty;
  cout << "length: " << counts[0] << endl;
  delete b;
  a->next = nullptr;
  return 0;
}
`);
	expect(await outputText(page)).toBe('length: 2\n');
	expect(await valueOf(page, 'typeof main')).toBe('function');
	expect(problems).toEqual([]);
});

test('C++: an error points at the line as it was written', async ({ page }) => {
	const problems = await openPage(page, 'index.html', { codeLang: 'cpp' });
	await runCode(page, 'Node* p = nullptr;\nint v = p->data;\n');
	await expect(page.locator('#output')).toContainText("Satır 2: nullptr olan bir pointer'ın ->data alanı okunmaya çalışıldı");
	await expect(page.locator('#output')).toContainText('(ör. p != nullptr ya da kısaca p)'); // the advice in C++ too
	await runCode(page, 'int a = b + 1;\n');
	await expect(page.locator('#output')).toContainText('"b" tanımlı değil. Önce tanımlayın (ör. auto b = ...).');
	expect(problems).toEqual([]);
});

test('Turkish code and Java: the code in error messages is in the chosen language', async ({ page }) => {
	const problems = await openPage(page, 'index.html', { codeLang: 'turkce' });
	await runCode(page, 'değişken p = boş\ndeğişken v = p.veri\n');
	await expect(page.locator('#output')).toContainText("Satır 2: boş olan bir pointer'ın .veri alanı okunmaya çalışıldı");
	await expect(page.locator('#output')).toContainText('(ör. p != boş ya da kısaca p)');
	await runCode(page, 'değişken k = 1\nkır\n');
	await expect(page.locator('#output')).toContainText('Satır 2: kır yalnızca bir döngünün (yinele ya da için) içinde kullanılabilir.');
	await runCode(page, 'değişken a = b + 1\n');
	await expect(page.locator('#output')).toContainText('Önce tanımlayın (ör. değişken b = ...)');
	await runCode(page, 'değişken w = 3\nw[0] = 1\n');
	await expect(page.locator('#output')).toContainText('(ör. değişken t = yeni Dizi(n))');
	await runCode(page, 'değişken bad = yeni Düğüm(1, 5)\n');
	await expect(page.locator('#output')).toContainText('(yeni Düğüm(1, x) içindeki x) onun .sonraki bağı olur; bir düğüm ya da boş olmalı');

	await page.evaluate(() => localStorage.setItem('dsv-settings', JSON.stringify({ codeLang: 'java' })));
	await page.reload();
	await page.waitForFunction(() => window.dsvReady === true);
	await runCode(page, 'int w = 3;\nw[0] = 1;\n');
	await expect(page.locator('#output')).toContainText('(ör. int[] t = new int[n])');
	expect(problems).toEqual([]);
});

test('Java: a hand-written program runs (class, println, arrays, ++x, main); garbage is marked', async ({ page }) => {
	const problems = await openPage(page, 'index.html', { codeLang: 'java' });
	await runCode(page, `import java.util.*;

public class Main {
  static class Node {
    int data;
    Node next;
    Node(int d) { data = d; }
  }

  static int length(Node head) {
    int n = 0;
    for (Node p = head; p != null; p = p.next)
      ++n;
    return n;
  }

  public static void main(String[] args) {
    Node a = new Node(1), b = new Node(2);
    a.next = b;
    int[] counts = new int[3];
    counts[0] = length(a);
    boolean ok = counts[0] == 2;
    System.out.println("length: " + counts[0] + " " + ok);
    a.next = null;
  }
}
`);
	expect(await outputText(page)).toBe('length: 2 true\n');

	// no delete in Java: a node nothing reaches is marked for the garbage collector
	await runCode(page, 'Node x = new Node(7);\nx = new Node(8);\n');
	await expect(page.locator('#narration .narration-warning')).toHaveText("⚠ [7] düğümüne artık ulaşılamıyor; Java'nın çöp toplayıcısı onu silecek.");
	expect((await page.evaluate(() => window.dsvState())).lost.sort((a, b) => a - b)).toEqual([1, 2, 7]); // main has returned: its nodes are garbage too
	expect(problems).toEqual([]);
});

test('C++ and Java: integer division cuts toward zero, by zero is an error', async ({ page }) => {
	const problems = await openPage(page, 'index.html', { codeLang: 'cpp' });
	await runCode(page, `int a = 7, b = 2;
int c = a / b;
int e = -7 / 2;
double d = a / 2.0;
double avg = (a + b) / 2;
cout << c << " " << e << " " << d << " " << avg << endl;
`);
	expect(await outputText(page)).toBe('3 -3 3.5 4\n');
	await runCode(page, 'int zero = 0;\nint bad = 5 / zero;\n');
	await expect(page.locator('#output')).toContainText('Satır 2: Sıfıra bölme: bir tam sayı sıfıra bölünemez.');

	await page.evaluate(() => localStorage.setItem('dsv-settings', JSON.stringify({ codeLang: 'java' })));
	await page.reload();
	await page.waitForFunction(() => window.dsvReady === true);
	await runCode(page, 'int n = 9;\nint half = n / 2;\nSystem.out.println(half + " " + n / 2.0);\n');
	expect(await outputText(page)).toBe('4 4.5\n');
	expect(problems).toEqual([]);
});

test('writing to a field of a call\'s result is an explained error (left out on purpose)', async ({ page }) => {
	const problems = await openPage(page, 'index.html');
	await runCode(page, 'var x = new Node(1)\nfunction first()\n{\n  return x\n}\nfirst().next = new Node(2)\n');
	await expect(page.locator('#output')).toHaveText("Satır 6: Bir çağrının sonucunun alanına doğrudan yazılamaz (first().next = …). Önce sonucu bir değişkene alın, sonra alanına yazın: var p = first(), ardından p.next = …");
	expect(problems).toEqual([]);
});

test('Düğüm with Turkish words: chosen in the settings, examples shown and run, narration and panels in the same words', async ({ page, context }) => {
	await context.grantPermissions(['clipboard-read', 'clipboard-write']);
	const problems = await openPage(page, 'reverseALinkedList.html', { lang: 'en' });
	const code = i => page.evaluate(i => document.querySelectorAll('.CodeMirror')[i].CodeMirror.getValue(), i);
	await page.locator('.topbar .settings-btn').click();
	await Promise.all([page.waitForEvent('load'), page.locator('#settings-panel select[name=codeLang]').selectOption('turkce')]);
	await page.waitForFunction(() => window.dsvReady === true);

	await expect(page.locator('.code-label').first()).toHaveText('Block 1 · Türkçe');
	expect(await code(0)).toMatch(/^değişken x = yeni Düğüm\(1\)$/m);
	expect(await code(1)).toContain('yinele(curr != boş)');
	expect(await code(1)).toContain('// listenin kalanını hatırla'); // the Turkish comments, though the interface is English
	await expect(page.locator('.CodeMirror .cm-keyword').first()).toHaveText('değişken');
	await expect(page.locator('main.lesson p code', { hasText: 'boş' }).first()).toBeVisible(); // code in the text too

	await runBlock(page, 1);
	expect(await valueOf(page, 'walk(prev)')).toBe('4>3>2>1');
	await page.locator('.dsv-player button[title="Step back"]').click();
	await page.locator('.dsv-player button[title="Step back"]').click();
	await page.locator('.dsv-player button[title="Step back"]').click();
	await expect(page.locator('#narration')).toHaveText('sonraki of [4] now points to [3].');
	await expect(page.locator('#variables li').filter({ hasText: 'nxt' })).toHaveText('nxt =boş');

	// hand-written Turkish code: an error names the line as it was written
	await runCode(page, 'değişken a = yeni Düğüm(1)\nyaz a.veri\ndeğişken b = boş\nyaz b.veri\n');
	await expect(page.locator('#output')).toContainText('1');
	await expect(page.locator('#output')).toContainText('Line 4');

	// a shared link keeps the language
	await page.locator('.dsv-share').first().click();
	expect(await page.evaluate(() => navigator.clipboard.readText())).toMatch(/#c=turkce/);
	expect(problems).toEqual([]);
});
