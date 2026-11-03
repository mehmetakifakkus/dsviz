// Every page: runs all its code blocks to the end, without errors and without requests
// that leave the site, and ends in the expected state.
const { test } = require('@playwright/test');
const fs = require('fs');
const path = require('path');
const { expect, openPage, runAllBlocks, valueOf, stepCounter } = require('./helpers');

const ROOT = path.resolve(__dirname, '..');
const PAGES = fs.readdirSync(ROOT).filter(f => f.endsWith('.html')).sort();

// The state a page must end in: [expression evaluated in the page, expected value].
// walk(h) lists a list forwards, back(t) backwards (prev), output() the Çıktı lines.
const EXPECTED = {
	'index.html': ['walk(x)', '1>2>3'],
	'lengthOfALinkedList.html': ['[count, length]', [3, 3]],
	'sumMaxAndSearchInALinkedList.html': ['[sum, max, p.data]', [22, 9, 2]],
	'insertAtTheHeadOfALinkedList.html': ['walk(x)', '9>1>2>3'],
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
	'mergeTwoSortedLinkedLists.html': ['walk(head.next)', '1>2>3>4>6>8']
};

test('every page has an expected final state in this file', () => {
	expect(PAGES.filter(f => !(f in EXPECTED)), 'add the new page to EXPECTED').toEqual([]);
	expect(Object.keys(EXPECTED).filter(f => !PAGES.includes(f)), 'this page does not exist any more').toEqual([]);
});

test('the examples menu lists every page', async ({ page }) => {
	const problems = await openPage(page, 'index.html');
	const listed = await page.evaluate(() => window.dsvExamples.flatMap(g => g.items.map(it => it[0])));
	expect([...listed, 'index.html'].sort()).toEqual(PAGES);
	expect(problems).toEqual([]);
});

for (const file of PAGES) {
	test(`${file} runs to the end`, async ({ page }) => {
		const problems = await openPage(page, file);

		expect(await runAllBlocks(page)).toBeGreaterThan(0);

		const steps = await stepCounter(page);
		expect(steps.total).toBeGreaterThan(0);
		expect(steps.current).toBe(steps.total);

		expect(await page.locator('#output').textContent()).not.toMatch(/Hata|hatası|tanımlı değil|null olan/);

		const [expression, expected] = EXPECTED[file];
		expect(await valueOf(page, expression)).toEqual(expected);
		expect(problems).toEqual([]);
	});
}
