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

test('theme switch is applied and remembered', async ({ page }) => {
	const problems = await openPage(page, 'stack.html');
	const theme = () => page.evaluate(() => document.documentElement.getAttribute('data-theme'));
	const before = await theme();

	await page.locator('.topbar button[title="Temayı değiştir"]').click();
	const after = await theme();
	expect(after).not.toBe(before);

	await page.reload();
	await page.waitForFunction(() => window.dsvReady === true);
	expect(await theme()).toBe(after);
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
