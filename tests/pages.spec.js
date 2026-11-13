// Every page: runs all its code blocks to the end, without errors and without requests
// that leave the site, and ends in the expected state.
const { test } = require('@playwright/test');
const fs = require('fs');
const path = require('path');
const { expect, openPage, runAllBlocks, valueOf, stepCounter } = require('./helpers');

const ROOT = path.resolve(__dirname, '..');
// the lesson plan pages (teacher.html, plan.html) and the class page (class.html) hold no code: they are not examples (see tests/plan.spec.js, tests/classroom.spec.js)
const PAGES = fs.readdirSync(ROOT).filter(f => f.endsWith('.html') && !['teacher.html', 'plan.html', 'class.html'].includes(f) && !/^ex[A-Z]/.test(f)).sort();
// the exercise pages (ex*.html) end in whatever state the student's code leaves: see tests/exercise.spec.js
const EXERCISES = fs.readdirSync(ROOT).filter(f => /^ex[A-Z].*\.html$/.test(f)).sort();

// The state a page must end in: [expression evaluated in the page, expected value].
// walk(h) lists a list forwards, back(t) backwards (prev), output() the Çıktı lines.
const EXPECTED = {
	'index.html': ['walk(x)', '1>2>3'],
	'lengthOfALinkedList.html': ['[count, length]', [3, 3]],
	'sumMaxAndSearchInALinkedList.html': ['[sum, max, p.data]', [22, 9, 2]],
	'insertAtTheHeadOfALinkedList.html': ['walk(x)', '8>9>1>2>3'],
	'appendAnItemOnTheLinkedList.html': ['walk(x)', '1>2>3>5'],
	'insertIntoASortedLinkedList.html': ['walk(x)', '1>3>5>7>9'],
	'deleteANodeFromALinkedList.html': ['walk(x)', '1>2>4'],
	'removeDuplicatesOnAlinkedList.html': ['walk(x)', '1>2>3>4>5'],
	'reverseALinkedList.html': ['walk(prev)', '4>3>2>1'],
	'findTheMiddleOfALinkedList.html': ['slow.data', 3],
	'kthNodeFromTheEnd.html': ['slow.data', 4],
	'detectACycleInALinkedList.html': ['[found, slow.data]', [true, 5]],
	'doublyLinkedList.html': ['[walk(a), output()]', ['1>2>3>4', '4,3,2,1']],
	'insertDeleteInADoublyLinkedList.html': ['[walk(a), back(d)]', ['1>2>9>4', '4>9>2>1']],
	'reverseADoublyLinkedList.html': ['[walk(d), back(a)]', ['4>3>2>1', '1>2>3>4']],
	'stack.html': ['[walk(tepe), value, output()]', ['', 3, '2,1']],
	'queue.html': ['[walk(bas), son, value, output()]', ['', null, 10, '20,30,40']],
	'functions.html': ['[a, b, tepe, output()]', [3, 2, null, '1']],
	'recursion.html': ['[n, walk(x)]', [4, '4>3>2>1']],
	'checkIfTwoLinkedListAreEqual.html': ['flag', false],
	'compareLinkedListCheckOneIsGreater.html': ['flag', true],
	'circularLinkedList.html': ['[head.data, tail.data, tail.next === head, walk(head).slice(0, 9), count]', [1, 5, true, '1>2>3>4>5', 4]],
	'josephus.html': ['[p.data, p.next === p, head, output()]', [4, true, null, '3,6,2,7,5,1,4']],
	'bubbleSort.html': ['walk(x)', '1>2>3>4>5'],
	'insertionSort.html': ['walk(x)', '1>2>3>4>5'],
	'mergeSort.html': ['walk(x)', '1>2>3>4>5>6'],
	'binarySearchTree.html': ['[p.data, m.data, output()]', [6, 1, '6,1']],
	'treeTraversal.html': ['[h, output()]', [4, '4']],
	'language.html': ['[a, b, v, sum, n, m, r, first, t.length]', [8, 18, 8, 29, 3, 3, 9, 1, 3]],
	'treeDelete.html': ['[root.data, root.left.data, root.left.left.data, root.left.right.data, root.right.data, root.right.left]', [8, 6, 1, 7, 14, null]],
	'avlTree.html': ['[root.data, root.height, root.right.right.data, root.right.right.left.data, root.right.right.right.data]', [4, 4, 15, 7, 16]],
	'hashTable.html': ['[table.map(b => walk(b)), big.map(b => walk(b))]', [['', '', '', '', ''], ['', '', '12>22', '3', '', '15', '', '17', '8', '']]],
	'arrayStackQueue.html': ['[Array.from(s), size, a, Array.from(q), front, rear, count, b, c]', [[10, 20, null, null, null], 2, 30, [6, null, 3, 4, 5], 2, 1, 4, 1, 2]],
	'circularDoublyLinkedList.html': ['[head.prev.data, tail.data, head.prev.prev.data, tail.next.data, output()]', [5, 5, 4, 1, '']],
	'heap.html': ['[n, a, b, output()]', [0, 1, 2, '3,4,5,8,9']],
	'topologicalSort.html': ['[Array.from(order), done]', [[5, 4, 2, 3, 1, 0], 1]],
	'connectedComponents.html': ['[Array.from(comp), count]', [[1, 1, 1, 2, 2, 2, 3, 3], 3]],
	'unionFind.html': ['Array.from(leader)', [3, 3, 3, 3, 5, 7, 7, 7]],
	'kruskal.html': ['[Array.from(leader), total]', [[4, 4, 4, 4, 5, 5], 13]],
	'prim.html': ['[Array.from(key), Array.from(parent), total]', [[0, 1, 3, 2, 2, 5], [-1, 2, 0, 1, 3, 3], 13]],
	'bellmanFord.html': ['[Array.from(dist), Array.from(parent)]', [[0, 4, 7, 4, 6], [-1, 4, 0, 2, 3]]],
	'dijkstra.html': ['[Array.from(dist), Array.from(parent), output()]', [[0, 3, 1, 6, 9], [-1, 2, 0, 2, 3], '4,3,2,0']],
	'binarySearch.html': ['[Array.from(a), output()]', [[2, 5, 8, 12, 16, 23, 38, 45, 56, 67, 78], '8']],
	'selectionSort.html': ['Array.from(a)', [3, 7, 12, 19, 25, 28, 34, 41]],
	'arrayBubbleSort.html': ['Array.from(a)', [3, 7, 12, 19, 25, 28, 34, 41]],
	'arrayInsertionSort.html': ['Array.from(a)', [3, 7, 12, 19, 25, 28, 34, 41]],
	'quickSort.html': ['Array.from(a)', [3, 7, 12, 19, 25, 28, 34, 41]],
	'heapSort.html': ['[Array.from(a), size]', [[3, 7, 12, 19, 25, 28, 34, 41], 1]],
	'countingSort.html': ['[Array.from(a), Array.from(count)]', [[0, 2, 2, 4, 4, 7, 7, 9], [1, 0, 2, 0, 2, 0, 0, 2, 0, 1]]],
	'sortComparison.html': ['[Array.from(a), cmp, output()]', [[3, 8, 13, 18, 23, 28, 33, 38], 7, '7,28,7']],
	'graph.html': ['[output(), Array.from(visited), Array.from(q)]', ['0,5,4,3,2,1', [true, true, true, true, true, true], [0, 5, 1, 4, 2, 3]]],
	'mergeTwoSortedLinkedLists.html': ['walk(head.next)', '1>2>3>4>6>8'],
	'matrisGezme.html': ['[Array.from(rowSum), Array.from(colSum), trace]', [[10, 26, 42], [15, 18, 21, 24], 18]],
	'pascal.html': ['[Array.from(p[5]), total, output()]', [[1, 5, 10, 10, 5, 1], 32, '32']],
	'gridPaths.html': ['[dp[2][3], output()]', [10, '10']],
	'lcs.html': ['[dp[5][4], output()]', [3, '3']],
	'knapsack.html': ['[dp[4][7], output()]', [9, '9']],
	'nQueens.html': ['Array.from(board).map(r => Array.from(r).indexOf(1))', [1, 3, 0, 2]]
};

// In English and German some pages use English names (tepe -> topNode, bas/son -> front/rear);
// their expected state differs only in those names.
const EXPECTED_EN_DE = Object.assign({}, EXPECTED, {
	'stack.html': ['[walk(topNode), value, output()]', ['', 3, '2,1']],
	'queue.html': ['[walk(front), rear, value, output()]', ['', null, 10, '20,30,40']],
	'functions.html': ['[a, b, topNode, output()]', [3, 2, null, '1']]
});

test('every page has an expected final state in this file', () => {
	expect(PAGES.filter(f => !(f in EXPECTED)), 'add the new page to EXPECTED').toEqual([]);
	expect(Object.keys(EXPECTED).filter(f => !PAGES.includes(f)), 'this page does not exist any more').toEqual([]);
});

test('pages load the compiled parser, not PEG.js and the grammar', async ({ page }) => {
	const requests = [];
	page.on('request', r => requests.push(r.url()));
	await openPage(page, 'index.html');
	expect(requests.filter(u => /peg-0\.9\.0|grammer\.pegjs/.test(u))).toEqual([]);
	expect(requests.some(u => u.endsWith('/js/grammar.js'))).toBe(true);
	for (const file of PAGES)
		expect(fs.readFileSync(path.join(ROOT, file), 'utf8'), file).toContain('<script src="js/grammar.js">');
});

test('the examples menu lists every page', async ({ page }) => {
	const problems = await openPage(page, 'index.html');
	const listed = await page.evaluate(() => window.dsvExamples.flatMap(g => g.items.map(it => it[0])));
	expect([...listed, 'index.html'].sort()).toEqual([...PAGES, ...EXERCISES].sort());
	expect(problems).toEqual([]);
});

// In C++ an empty cell of an array of numbers is 0 (there is no null int)
const EXPECTED_CPP = Object.assign({}, EXPECTED, {
	'arrayStackQueue.html': ['[Array.from(s), size, a, Array.from(q), front, rear, count, b, c]', [[10, 20, 0, null, null], 2, 30, [6, 0, 3, 4, 5], 2, 1, 4, 1, 2]]
});

// Java: the same (an empty cell of an int array is 0 too; delete is a comment, nothing checked here depends on it)
const EXPECTED_JAVA = EXPECTED_CPP;

for (const lang of ['tr', 'en', 'de', 'turkce', 'cpp', 'java']) {
	for (const file of PAGES) {
		const code = lang === 'cpp' || lang === 'java' || lang === 'turkce';
		test(`${file} runs to the end` + (lang === 'tr' ? '' : ` (${lang === 'cpp' ? 'C++' : lang === 'java' ? 'Java' : lang === 'turkce' ? 'Türkçe kod' : lang})`), async ({ page }) => {
			const problems = await openPage(page, file, lang === 'tr' ? null : code ? { codeLang: lang } : { lang });
			if (code && file !== 'language.html') // the blocks are shown in C++ / Java / Turkish words
				expect(await page.evaluate(() => [...document.querySelectorAll('.CodeMirror')].map(e => e.CodeMirror.getValue()).join('\n'))).not.toMatch(/^\s*var\s/m);

			expect(await runAllBlocks(page)).toBeGreaterThan(0);

			const steps = await stepCounter(page);
			expect(steps.total).toBeGreaterThan(0);
			expect(steps.current).toBe(steps.total);

			expect(await page.locator('#output').textContent()).not.toMatch(/Hata|hatası|tanımlı değil|null olan|Error|Fehler|Satır \d|Line \d|Zeile \d/);

			const [expression, expected] = (lang === 'tr' || lang === 'turkce' ? EXPECTED : lang === 'cpp' ? EXPECTED_CPP : lang === 'java' ? EXPECTED_JAVA : EXPECTED_EN_DE)[file];
			expect(await valueOf(page, expression)).toEqual(expected);
			expect(problems).toEqual([]);
		});
	}
}
