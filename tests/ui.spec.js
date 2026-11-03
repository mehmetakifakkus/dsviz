// The user interface: player, panels, command prompt, theme, menu and layout.
const { test } = require('@playwright/test');
const { expect, openPage, skipToEnd, runBlock, runAllBlocks, runCode, valueOf, stepCounter } = require('./helpers');

const player = (page, title) => page.locator(`.dsv-player button[title="${title}"]`);

test('player: step back, step forward, play', async ({ page }) => {
	const problems = await openPage(page, 'reverseALinkedList.html');
	await runAllBlocks(page);
	const { total } = await stepCounter(page);

	for (let i = 0; i < 3; i++)
		await player(page, 'Geri adım').click();
	expect(await stepCounter(page)).toEqual({ current: total - 3, total });

	await player(page, 'İleri adım').click();
	expect((await stepCounter(page)).current).toBe(total - 2);

	await player(page, 'Oynat').click();
	await expect(page.locator('.dsv-counter')).toHaveText(`Adım ${total} / ${total}`);
	await expect(player(page, 'Sona atla')).toBeDisabled();
	expect(problems).toEqual([]);
});

test('step back replays the call stack of a recursion', async ({ page }) => {
	const problems = await openPage(page, 'recursion.html');
	await runBlock(page, 0);
	await runBlock(page, 1);

	const frames = page.locator('#callstack li:not(.more)');
	for (let i = 0; i < 40 && await frames.count() < 4; i++)
		await player(page, 'Geri adım').click();

	await expect(frames).toHaveCount(4);
	await expect(frames.first()).toContainText('count(düğüm(4))');
	await expect(frames.first()).toHaveClass(/current/);
	await expect(frames.last()).toContainText('count(düğüm(1))');

	await player(page, 'Sona atla').click();
	await expect(frames).toHaveCount(0);
	await expect(page.locator('#callstack-note')).toHaveText('count(düğüm(1)) döndürdü: 4');
	expect(problems).toEqual([]);
});

test('variables panel shows values and null pointers', async ({ page }) => {
	const problems = await openPage(page, 'reverseALinkedList.html');
	await runAllBlocks(page);
	const items = page.locator('#variables li');
	await expect(items.filter({ hasText: 'nxt' })).toHaveText('nxt =null');
	await expect(items.filter({ hasText: 'curr' })).toHaveClass(/is-null/);

	await openPage(page, 'sumMaxAndSearchInALinkedList.html');
	await runAllBlocks(page);
	await expect(page.locator('#variables li').filter({ hasText: 'sum' })).toHaveText('sum =22');
	expect(problems).toEqual([]);
});

test('command prompt runs a line and calls a function once', async ({ page }) => {
	const problems = await openPage(page, 'index.html');
	await runBlock(page, 0);
	await runCode(page, 'var calls = 0\nfunction tick()\n{\n  calls = calls + 1\n  return calls\n}\n');

	await page.locator('.tab[data-tab="tab-command"]').click();
	await page.keyboard.type('tick()');
	await page.keyboard.press('Enter');
	await expect(page.locator('#output')).toHaveText('1');
	expect(await valueOf(page, 'calls')).toBe(1);

	await page.keyboard.type('var k = x.next.data');
	await page.keyboard.press('Enter');
	await skipToEnd(page);
	await expect(page.locator('#variables li').filter({ hasText: 'k =' })).toHaveText('k =2');
	expect(problems).toEqual([]);
});

test('command prompt prints a circular list without looping forever', async ({ page }) => {
	const problems = await openPage(page, 'circularLinkedList.html');
	await runBlock(page, 0);
	await page.locator('.tab[data-tab="tab-command"]').click();
	await page.keyboard.type('head');
	await page.keyboard.press('Enter');
	const printed = JSON.parse(await page.locator('#output').textContent());
	expect(printed.next.next.next).toEqual({ data: 4, next: '↺ yine [1] düğümüne döner' });
	expect(problems).toEqual([]);
});

test('theme chosen in the settings panel is applied and remembered', async ({ page }) => {
	const problems = await openPage(page, 'stack.html');
	const theme = () => page.evaluate(() => document.documentElement.getAttribute('data-theme'));

	await page.locator('.topbar .settings-btn').click();
	const panel = page.locator('#settings-panel');
	await expect(panel).toBeVisible();
	await panel.getByText('Koyu', { exact: true }).click();
	expect(await theme()).toBe('dark');
	await panel.getByText('Açık', { exact: true }).click();
	expect(await theme()).toBe('light');

	await page.keyboard.press('Escape');
	await expect(panel).toBeHidden();

	await page.reload();
	await page.waitForFunction(() => window.dsvReady === true);
	expect(await theme()).toBe('light');
	expect(problems).toEqual([]);
});

test('examples menu opens, marks the page and closes', async ({ page }) => {
	const problems = await openPage(page, 'queue.html');
	await page.locator('.menu-btn').click();
	await expect(page.locator('body')).toHaveClass(/drawer-open/);

	const examples = await page.evaluate(() => window.dsvExamples.reduce((n, g) => n + g.items.length, 0));
	await expect(page.locator('.drawer a')).toHaveCount(examples + 1); // + the main page
	await expect(page.locator('.drawer a.active')).toHaveAttribute('href', 'queue.html');

	await page.keyboard.press('Escape');
	await expect(page.locator('body')).not.toHaveClass(/drawer-open/);

	await expect(page.locator('.pager a')).toHaveCount(2); // previous and next example
	expect(problems).toEqual([]);
});

test('a long list is scaled down to fit the card', async ({ page }) => {
	const problems = await openPage(page, 'index.html');
	let code = 'var h = new Node(0)\nvar t = h\n';
	for (let i = 1; i < 16; i++)
		code += 't.next = new Node(' + i + ')\nt = t.next\n';
	await runCode(page, code);

	const sizes = await page.evaluate(() => ({
		canvas: document.getElementById('myCanvas0').getBoundingClientRect().width,
		card: document.querySelector('.viz-canvas').getBoundingClientRect().width
	}));
	expect(sizes.canvas).toBeLessThanOrEqual(sizes.card + 1);
	expect(problems).toEqual([]);
});

test.describe('phone', () => {
	test.use({ viewport: { width: 390, height: 844 } });

	test('the visualisation comes before the code', async ({ page }) => {
		const problems = await openPage(page, 'reverseALinkedList.html');
		const viz = await page.locator('.viz-col').boundingBox();
		const lesson = await page.locator('.lesson').boundingBox();
		expect(viz.y).toBeLessThan(lesson.y);
		expect(viz.width).toBeLessThanOrEqual(390);

		await runAllBlocks(page);
		expect(await valueOf(page, 'walk(prev)')).toBe('4>3>2>1');
		expect(problems).toEqual([]);
	});
});

test.describe('running a block again', () => {
	const setBlock = (page, i, code) => page.evaluate(([i, code]) => document.querySelectorAll('.CodeMirror')[i].CodeMirror.setValue(code), [i, code]);
	const drawn = page => page.evaluate(() => window.dsvState());

	test('running a block twice draws the list once', async ({ page }) => {
		const problems = await openPage(page, 'reverseALinkedList.html');
		await runBlock(page, 0);
		const once = await stepCounter(page);
		await runBlock(page, 0);

		expect((await drawn(page)).nodes).toEqual([1, 2, 3, 4]);
		expect(await stepCounter(page)).toEqual(once);
		expect(problems).toEqual([]);
	});

	test('running block 2 first runs block 1 too', async ({ page }) => {
		const problems = await openPage(page, 'reverseALinkedList.html');
		await runBlock(page, 1);
		expect(await valueOf(page, 'walk(prev)')).toBe('4>3>2>1');
		expect((await drawn(page)).nodes).toHaveLength(4);
		expect(problems).toEqual([]);
	});

	test('block 2 always starts from what block 1 produces', async ({ page }) => {
		const problems = await openPage(page, 'reverseALinkedList.html');
		await runBlock(page, 0);
		await runBlock(page, 1);
		const first = await stepCounter(page);
		await runBlock(page, 1); // the list is not reversed back

		expect(await valueOf(page, 'walk(prev)')).toBe('4>3>2>1');
		expect((await drawn(page)).nodes).toHaveLength(4);
		expect(await stepCounter(page)).toEqual(first);
		expect(problems).toEqual([]);
	});

	test('an edited block is used by the blocks below it', async ({ page }) => {
		const problems = await openPage(page, 'reverseALinkedList.html');
		await runBlock(page, 0);
		await runBlock(page, 1);
		await setBlock(page, 0, 'var x = new Node(7)\nvar y = new Node(8)\nx.next = y\n');
		await runBlock(page, 1);

		expect(await valueOf(page, 'walk(prev)')).toBe('8>7');
		expect((await drawn(page)).nodes.sort()).toEqual([7, 8]);
		expect(await valueOf(page, '[typeof z, typeof w]')).toEqual(['undefined', 'undefined']); // variables of the old run are gone
		expect(problems).toEqual([]);
	});

	test('an error in a block above stops and names the block', async ({ page }) => {
		const problems = await openPage(page, 'reverseALinkedList.html');
		await setBlock(page, 0, 'var x = \n');
		await runBlock(page, 1);
		await expect(page.locator('#output')).toHaveText(/^Blok 1 çalıştırılırken: Yazım hatası/);
		expect((await drawn(page)).nodes).toEqual([]);
		expect(problems).toEqual([]);
	});

	test('functions and the doubly linked look of an old run are gone', async ({ page }) => {
		const problems = await openPage(page, 'doublyLinkedList.html');
		await runBlock(page, 0);
		expect((await drawn(page)).doubly).toBe(true);

		await setBlock(page, 0, 'function f()\n{\n  return 1\n}\nvar a = new Node(1)\n');
		await runBlock(page, 0);
		expect((await drawn(page)).doubly).toBe(false);
		expect(await valueOf(page, 'typeof f')).toBe('function');

		await setBlock(page, 0, 'var a = new Node(1)\n');
		await runBlock(page, 0);
		expect(await valueOf(page, 'typeof f')).toBe('undefined');
		expect(problems).toEqual([]);
	});
});

test.describe('learning aids', () => {
	const state = page => page.evaluate(() => window.dsvState());
	const narration = page => page.locator('#narration');

	test('a list left drawn right to left reads left to right after the last step', async ({ page }) => {
		const problems = await openPage(page, 'reverseALinkedList.html');
		await runAllBlocks(page);
		expect((await state(page)).rows).toEqual([[4, 3, 2, 1]]);
		await page.locator('.dsv-player button[title="Geri adım"]').click(); // before the last step: only the arrows were flipped
		expect((await state(page)).rows).toEqual([[1, 2, 3, 4]]);
		expect(problems).toEqual([]);
	});

	test('a value copied from another node is drawn (p.data = p.next.data)', async ({ page }) => {
		const problems = await openPage(page, 'index.html');
		await runCode(page, 'var x = new Node(1)\nx.next = new Node(2)\nx.data = x.next.data\n');
		expect((await state(page)).rows).toEqual([[2, 2]]);
		await expect(page.locator('#narration')).toContainText('2');
		expect(problems).toEqual([]);
	});

	test('every step is narrated', async ({ page }) => {
		const problems = await openPage(page, 'reverseALinkedList.html');
		await runAllBlocks(page);
		await expect(narration(page)).toHaveText('Koşul curr != null yanlış: döngü bitti.');

		await player(page, 'Geri adım').click();
		await expect(narration(page)).toHaveText('curr artık null: hiçbir düğümü göstermiyor.');
		await player(page, 'Geri adım').click();
		await expect(narration(page)).toHaveText('prev artık [4] düğümünü gösteriyor.');
		await player(page, 'Geri adım').click();
		await expect(narration(page)).toHaveText("[4] düğümünün next'i artık [3] düğümünü gösteriyor.");
		expect(problems).toEqual([]);
	});

	test('calls and returns are narrated', async ({ page }) => {
		const problems = await openPage(page, 'recursion.html');
		await runBlock(page, 0);
		await runBlock(page, 1);
		await player(page, 'Geri adım').click(); // the last step is var n = count(x)
		await expect(narration(page)).toHaveText('count(düğüm(1)) döndürdü: 4.');
		expect(problems).toEqual([]);
	});

	test('the timeline and the keyboard move between steps', async ({ page }) => {
		const problems = await openPage(page, 'reverseALinkedList.html');
		await runAllBlocks(page);
		const { total } = await stepCounter(page);

		await page.locator('.dsv-timeline').evaluate((el, v) => { el.value = v; el.dispatchEvent(new Event('input')); }, 5);
		expect(await stepCounter(page)).toEqual({ current: 5, total });

		await page.locator('.lesson h1').click(); // keys work when no editor has the focus
		await page.keyboard.press('ArrowRight');
		await page.keyboard.press('ArrowRight');
		await page.keyboard.press('ArrowLeft');
		expect((await stepCounter(page)).current).toBe(6);

		await page.keyboard.press(' '); // space plays...
		await expect(player(page, 'Duraklat')).toBeVisible();
		await expect.poll(async () => (await stepCounter(page)).current).toBeGreaterThan(6);
		await page.keyboard.press(' '); // ... and pauses
		await expect(player(page, 'Oynat')).toBeVisible();
		expect(problems).toEqual([]);
	});

	test('a null link is drawn as null', async ({ page }) => {
		const problems = await openPage(page, 'reverseALinkedList.html');
		await runBlock(page, 0);
		expect((await state(page)).nullNext).toEqual([4]);
		await runBlock(page, 1);
		expect((await state(page)).nullNext).toEqual([1]);
		expect(problems).toEqual([]);
	});

	test('a node nothing reaches any more is marked lost', async ({ page }) => {
		const problems = await openPage(page, 'index.html');
		// node 2 is reached only through node 1: moving x loses both
		await runCode(page, 'var x = new Node(1)\nx.next = new Node(2)\nx = new Node(9)  // the old list is lost\n');
		expect((await state(page)).lost.sort()).toEqual([1, 2]);
		await expect(page.locator('#narration .narration-warning')).toHaveText('⚠ [1], [2] düğümlerine artık hiçbir değişkenden ya da bağdan ulaşılamıyor.');

		await runCode(page, 'var y = new Node(5)\nvar z = y\ny = null\n'); // z still reaches [5]: not lost
		expect((await state(page)).lost).not.toContain(5);

		await openPage(page, 'reverseALinkedList.html'); // a correct algorithm loses nothing
		await runAllBlocks(page);
		expect((await state(page)).lost).toEqual([]);
		expect(problems).toEqual([]);
	});

	test('the line of an error is marked in its editor', async ({ page }) => {
		const problems = await openPage(page, 'reverseALinkedList.html');
		const setBlock = (i, code) => page.evaluate(([i, code]) => document.querySelectorAll('.CodeMirror')[i].CodeMirror.setValue(code), [i, code]);
		const marked = i => page.locator('.CodeMirror').nth(i).locator('.dsv-error-line');

		await setBlock(1, 'var p = x\nwhile(p != null)\n  p = p.next.next.next\n');
		await runBlock(page, 1);
		await expect(marked(1)).toHaveCount(1);
		await expect(page.locator('.CodeMirror').nth(1).locator('.CodeMirror-line').nth(2)).toContainText('p = p.next.next.next');

		await setBlock(1, 'var p = x\nwhile(p != null)\n  p = p.next\n');
		await runBlock(page, 1);
		await expect(marked(1)).toHaveCount(0); // gone after a good run

		await setBlock(0, 'var x = new Node(1\n');
		await runBlock(page, 0);
		await expect(marked(0)).toHaveCount(1);
		expect(problems).toEqual([]);
	});

	test('changed code can be restored', async ({ page }) => {
		const problems = await openPage(page, 'reverseALinkedList.html');
		const editor = i => page.evaluate(i => document.querySelectorAll('.CodeMirror')[i].CodeMirror.getValue(), 0);
		const original = await editor(0);
		const restore = page.locator('.dsv-restore').first();

		await expect(restore).toBeHidden();
		await page.evaluate(() => document.querySelectorAll('.CodeMirror')[0].CodeMirror.setValue('var x = 5\n'));
		await expect(restore).toBeVisible();
		await restore.click();
		expect(await editor(0)).toBe(original);
		await expect(restore).toBeHidden();
		expect(problems).toEqual([]);
	});
});
