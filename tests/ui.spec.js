// The user interface: player, panels, command prompt, theme, menu and layout.
const { test } = require('@playwright/test');
const { expect, openPage, skipToEnd, runBlock, runAllBlocks, runCode, valueOf, outputText, stepCounter } = require('./helpers');

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

test('player: play is off with no steps and starts again from the beginning at the end', async ({ page }) => {
	const problems = await openPage(page, 'reverseALinkedList.html');
	await expect(page.locator('.dsv-counter').first()).toHaveText('Adım 0 / 0');
	await expect(page.locator('.dsv-play')).toBeDisabled();
	await expect(player(page, 'Geri adım')).toBeDisabled();
	await expect(player(page, 'Sona atla')).toBeDisabled();
	await page.locator('.lesson h1').click();
	await page.keyboard.press(' '); // space does nothing either
	await expect(page.locator('.dsv-counter').first()).toHaveText('Adım 0 / 0');

	await runBlock(page, 0);
	await skipToEnd(page);
	const { total } = await stepCounter(page);
	await expect(page.locator('.dsv-play')).toBeEnabled();
	await expect(page.locator('.dsv-play')).toHaveAttribute('title', 'Baştan oynat');
	await page.locator('.dsv-play').click(); // from the start again
	await expect(page.locator('.dsv-play')).toHaveAttribute('title', 'Duraklat');
	await page.locator('.dsv-play').click();
	expect((await stepCounter(page)).current).toBeLessThan(total);
	expect(problems).toEqual([]);
});

test('the play button keeps its look in every language', async ({ page }) => {
	const problems = await openPage(page, 'index.html', { lang: 'en' });
	await expect(page.locator('.dsv-play')).toHaveAttribute('title', 'Play');
	await runBlock(page, 0);
	await skipToEnd(page);
	const bg = await page.locator('.dsv-play').evaluate(el => getComputedStyle(el).backgroundColor);
	const back = await page.locator('.dsv-player button').first().evaluate(el => getComputedStyle(el).backgroundColor);
	expect(bg).not.toBe(back); // the accent colour, not the plain button
	expect(problems).toEqual([]);
});

test('command prompt: an empty line runs nothing and stays out of the history', async ({ page }) => {
	const problems = await openPage(page, 'index.html');
	await page.locator('.tab[data-tab="tab-command"]').click();
	await page.keyboard.press('Enter');
	await page.keyboard.type('   ');
	await page.keyboard.press('Enter');
	await expect(page.locator('#output')).toHaveText('');
	expect(await page.evaluate(() => window.commandHist.length)).toBe(0);

	await page.keyboard.type('1 + 2');
	await page.keyboard.press('Enter');
	await page.keyboard.type('1 + 2');
	await page.keyboard.press('Enter');
	await expect(page.locator('#output')).toHaveText('3');
	expect(await page.evaluate(() => window.commandHist)).toEqual(['1 + 2']);
	await page.keyboard.press('ArrowUp');
	expect(await page.evaluate(() => window.editor2.getValue())).toBe('1 + 2');
	await page.keyboard.press('ArrowDown'); // past the newest: an empty line again
	expect(await page.evaluate(() => window.editor2.getValue())).toBe('');
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

test('code is shared as a link, opened without running, and can be put back', async ({ page, context }) => {
	await context.grantPermissions(['clipboard-read', 'clipboard-write']);
	const problems = await openPage(page, 'reverseALinkedList.html');
	const code = i => page.evaluate(i => document.querySelectorAll('.CodeMirror')[i].CodeMirror.getValue(), i);
	const original = await code(0);
	await page.evaluate(() => {
		const cm = document.querySelectorAll('.CodeMirror')[0].CodeMirror;
		cm.setValue(cm.getValue().replace('new Node(4)', 'new Node(40)') + '// ğüşıöç\n');
	});
	const changed = await code(0);

	await page.locator('.dsv-share').nth(1).click(); // any block's button shares the whole page
	await expect(page.locator('#dsv-toast')).toHaveText('Bağlantı kopyalandı: değiştirdiğiniz bloklar bağlantının içinde.');
	const url = await page.evaluate(() => navigator.clipboard.readText());
	expect(url).toMatch(/\/reverseALinkedList\.html#b1=[A-Za-z0-9_-]+$/); // only the changed block
	expect(await page.evaluate(() => location.href)).toBe(url);

	await page.goto('/index.html');
	await page.goto(url);
	await page.waitForFunction(() => window.dsvReady === true);
	expect(await code(0)).toBe(changed);
	await expect(page.locator('.share-banner')).toContainText('1 blokta paylaşılan kod var');
	await expect(page.locator('.dsv-restore').first()).toBeVisible();
	expect((await stepCounter(page)).total).toBe(0); // shared code is not run by itself
	await runAllBlocks(page);
	expect(await valueOf(page, 'walk(prev)')).toBe('40>3>2>1');

	await page.locator('.share-banner button').click();
	expect(await code(0)).toBe(original);
	await expect(page.locator('.share-banner')).toHaveCount(0);
	expect(await page.evaluate(() => location.hash)).toBe('');
	expect(problems).toEqual([]);
});

test('a broken shared link is ignored', async ({ page }) => {
	const problems = await openPage(page, 'index.html#b1=%%%&b9=abc&x=1');
	await expect(page.locator('.share-banner')).toHaveCount(0);
	expect(problems).toEqual([]);
});

test('lesson mode shows one part at a time and runs its block', async ({ page }) => {
	const problems = await openPage(page, 'stack.html');
	const visibleCards = () => page.locator('.code-card:visible');
	await expect(page.locator('.lesson-nav')).toBeHidden();
	expect(await visibleCards().count()).toBe(3);

	await page.locator('.lesson-toggle').click();
	await expect(page.locator('.lesson-toggle')).toHaveText('Tüm sayfayı göster');
	await expect(page.locator('.lesson-count')).toHaveText('Bölüm 1 / 3');
	await expect(visibleCards()).toHaveCount(1);
	await expect(visibleCards().locator('.code-label')).toHaveText('Blok 1');
	await expect(page.locator('.lesson-prev')).toBeDisabled();
	await expect(page.locator('.pager')).toBeHidden(); // only on the last part

	await page.locator('.lesson-next').click(); // part 2: its block runs (block 1 again at once)
	await expect(page.locator('.lesson-count')).toHaveText('Bölüm 2 / 3');
	await expect(visibleCards().locator('.code-label')).toHaveText('Blok 2');
	await skipToEnd(page);
	expect(await valueOf(page, '[walk(tepe), value]')).toEqual(['2>1', 3]);

	await page.locator('.lesson-next').click();
	await expect(page.locator('.lesson-next')).toBeDisabled();
	await expect(page.locator('.pager')).toBeVisible();
	await page.locator('.lesson-prev').click();
	await expect(page.locator('.lesson-count')).toHaveText('Bölüm 2 / 3');

	// remembered, also in the settings panel; turning it off shows the whole page
	await page.reload();
	await page.waitForFunction(() => window.dsvReady === true);
	await expect(page.locator('.lesson-count')).toHaveText('Bölüm 1 / 3');
	await page.locator('.topbar .settings-btn').click();
	await expect(page.locator('#settings-panel [name=lessonMode]')).toBeChecked();
	await page.locator('#settings-panel [name=lessonMode]').uncheck();
	await page.keyboard.press('Escape');
	await expect(page.locator('.lesson-nav')).toBeHidden();
	expect(await visibleCards().count()).toBe(3);
	expect(problems).toEqual([]);
});

test('lesson mode is offered only on pages with two or more blocks', async ({ page }) => {
	const problems = await openPage(page, 'index.html');
	await expect(page.locator('.lesson-toggle')).toHaveCount(0);
	await page.goto('/insertIntoASortedLinkedList.html');
	await page.waitForFunction(() => window.dsvReady === true);
	const blocks = await page.locator('.code-card').count();
	await expect(page.locator('.lesson-toggle')).toHaveCount(blocks >= 2 ? 1 : 0);
	expect(problems).toEqual([]);
});

test('the code language is chosen in the settings; a shared C++ link stays C++', async ({ page, context }) => {
	await context.grantPermissions(['clipboard-read', 'clipboard-write']);
	const problems = await openPage(page, 'stack.html');
	const code = i => page.evaluate(i => document.querySelectorAll('.CodeMirror')[i].CodeMirror.getValue(), i);
	expect(await code(0)).toMatch(/^var tepe = null$/m);

	await page.locator('.topbar .settings-btn').click();
	await Promise.all([page.waitForEvent('load'), page.locator('#settings-panel select[name=codeLang]').selectOption('cpp')]);
	await page.waitForFunction(() => window.dsvReady === true);
	await expect(page.locator('.code-label').first()).toHaveText('Blok 1 · C++');
	expect(await code(0)).toMatch(/^Node\* tepe = nullptr;$/m);
	expect(await code(1)).toContain('tepe = tepe->next;');
	await runBlock(page, 1);
	expect(await valueOf(page, '[walk(tepe), value]')).toEqual(['2>1', 3]);
	await expect(page.locator('#narration')).toHaveText('[3] düğümü silindi.');

	// a link to changed C++ code says so, and opens as C++ even where Düğüm is chosen
	await page.evaluate(() => { const cm = document.querySelectorAll('.CodeMirror')[2].CodeMirror; cm.setValue(cm.getValue() + 'cout << 99 << endl;\n'); });
	await page.locator('.dsv-share').first().click();
	const url = await page.evaluate(() => navigator.clipboard.readText());
	expect(url).toMatch(/#c=cpp&b3=/);
	await page.evaluate(() => localStorage.setItem('dsv-settings', JSON.stringify({ codeLang: 'dugum' })));
	await page.goto('/index.html');
	await page.goto(url);
	await page.waitForFunction(() => window.dsvReady === true);
	expect(await code(0)).toMatch(/^Node\* tepe = nullptr;$/m);
	await runBlock(page, 2);
	expect(await outputText(page)).toBe('2\n1\n99\n');
	expect(problems).toEqual([]);
});

test('examples menu opens, marks the page and closes', async ({ page }) => {
	const problems = await openPage(page, 'queue.html');
	await page.locator('.menu-btn').click();
	await expect(page.locator('body')).toHaveClass(/drawer-open/);

	const examples = await page.evaluate(() => window.dsvExamples.reduce((n, g) => n + g.items.length, 0));
	await expect(page.locator('.drawer a')).toHaveCount(examples + 3); // + the main page, the teachers' plan page and the classes page
	await expect(page.locator('.drawer a.active')).toHaveAttribute('href', 'queue.html');
	await expect(page.locator('.drawer a.active')).toBeVisible();

	// the groups fold: only the current page's group is open, the others open on a click
	const groups = page.locator('.drawer-group');
	await expect(groups).toHaveCount(await page.evaluate(() => window.dsvExamples.length));
	await expect(page.locator('.drawer-group.open')).toHaveCount(1);
	const trees = groups.filter({ hasText: 'Ağaçlar' });
	await expect(trees.locator('.drawer-count')).toHaveText('5');
	await expect(trees.locator('a').first()).toBeHidden();
	await trees.locator('.drawer-group-btn').click();
	await expect(trees.locator('a').first()).toBeVisible();
	await expect(trees.locator('.drawer-group-btn')).toHaveAttribute('aria-expanded', 'true');
	await page.reload(); // an opened group stays open
	await page.waitForFunction(() => window.dsvReady === true);
	await page.locator('.menu-btn').click();
	await expect(page.locator('.drawer-group.open')).toHaveCount(2);

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

	test('the panels under the canvas fold: one button row, one open panel, remembered', async ({ page }) => {
		const problems = await openPage(page, 'recursion.html');
		const btn = name => page.locator(`.fold-btn[data-fold="${name}"]`);
		await expect(page.locator('.viz-folds')).toBeVisible();
		await expect(page.locator('#variables')).toBeHidden();
		await expect(page.locator('#output')).toBeHidden();
		await expect(btn('stack')).toBeHidden(); // no call yet

		await runBlock(page, 2); // printReverse prints the list backwards
		await expect(page.locator('#output')).toHaveText('4\n3\n2\n1\n');
		await expect(btn('vars')).toHaveText(/^Değişkenler · \d+$/);
		await expect(btn('out')).toHaveClass(/has-news/);

		await btn('out').click();
		await expect(page.locator('#output')).toBeVisible();
		await expect(btn('out')).toHaveAttribute('aria-expanded', 'true');
		await expect(btn('out')).not.toHaveClass(/has-news/);
		await btn('vars').click(); // one panel at a time
		await expect(page.locator('#variables')).toBeVisible();
		await expect(page.locator('#output')).toBeHidden();

		await page.reload();
		await page.waitForFunction(() => window.dsvReady === true);
		await expect(page.locator('#variables')).toBeVisible(); // the open panel is remembered
		await btn('vars').click();
		await expect(page.locator('#variables')).toBeHidden();

		// during a call the call stack button appears with the number of calls
		await page.locator('button.dsv-run').nth(2).click();
		await page.evaluate(() => { const t = document.querySelector('.dsv-timeline'); t.value = Math.round(t.max * 0.6); t.dispatchEvent(new Event('input', { bubbles: true })); });
		await expect(btn('stack')).toBeVisible();
		await expect(btn('stack')).toHaveText(/^Çağrı yığını · \d+$/);
		expect(problems).toEqual([]);
	});
});

test('on a wide screen the panels do not fold', async ({ page }) => {
	const problems = await openPage(page, 'index.html');
	await expect(page.locator('.viz-folds')).toBeHidden();
	await expect(page.locator('#variables')).toBeVisible();
	await expect(page.locator('#output')).toBeVisible();
	expect(problems).toEqual([]);
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
		await expect(page.locator('#narration')).toHaveText('[1] düğümünün değeri 2 oldu.'); // named by its value before the change
		expect(problems).toEqual([]);
	});

	test('a binary tree is drawn by depth, sorted from left to right', async ({ page }) => {
		const problems = await openPage(page, 'treeTraversal.html');
		await runBlock(page, 0);
		const drawn = await state(page);
		expect(drawn.tree).toBe(true);
		expect(drawn.rows).toEqual([[8], [3, 10], [1, 6, 14], [4, 7]]);

		await runBlock(page, 1);
		expect(await outputText(page)).toBe('1\n3\n4\n6\n7\n8\n10\n14\n');
		await runBlock(page, 2);
		expect(await outputText(page)).toBe('8\n3\n1\n6\n4\n7\n10\n14\n1\n4\n7\n6\n3\n14\n10\n8\n');

		await page.locator('.tab[data-tab="tab-command"]').click();
		await page.keyboard.type('root.left');
		await page.keyboard.press('Enter');
		expect(JSON.parse(await outputText(page))).toMatchObject({ data: 3, left: { data: 1, left: null, right: null }, right: { data: 6 } });
		expect(problems).toEqual([]);
	});

	test('deleting a leaf, a node with one child and one with two children', async ({ page }) => {
		const problems = await openPage(page, 'treeDelete.html');
		await runBlock(page, 2);
		expect((await state(page)).rows).toEqual([[8], [3, 10], [1, 6, 14], [7]]);
		await runBlock(page, 3);
		expect((await state(page)).rows).toEqual([[8], [3, 14], [1, 6], [7]]);
		await runBlock(page, 4);
		const drawn = await state(page);
		expect(drawn.rows).toEqual([[8], [6, 14], [1, 7]]);
		expect(drawn.lost).toEqual([]);

		await runCode(page, 'root = remove(root, 8)\n'); // the root: its successor 14 takes its value
		expect((await state(page)).rows).toEqual([[14], [6], [1, 7]]);
		expect(await valueOf(page, 'root.data')).toBe(14);
		expect(problems).toEqual([]);
	});

	test('an AVL rotation relinks three nodes and the heights are drawn', async ({ page }) => {
		const problems = await openPage(page, 'avlTree.html');
		await runBlock(page, 1);
		const drawn = await state(page);
		expect(drawn.rows).toEqual([[2], [1, 3]]);
		expect(drawn.heights.sort((a, b) => a[0] - b[0])).toEqual([[1, 1], [2, 2], [3, 1]]);
		await runCode(page, 'root.height = 5\n');
		await expect(page.locator('#narration')).toHaveText('[2] düğümünün height alanı 5 oldu.');

		await runBlock(page, 3); // 4, 5, 6, 7 in order: still balanced
		expect((await state(page)).rows).toEqual([[4], [2, 6], [1, 3, 5, 7]]);
		expect(problems).toEqual([]);
	});

	test('an array is drawn as buckets, each chain on its row', async ({ page }) => {
		const problems = await openPage(page, 'hashTable.html');
		await runBlock(page, 1);
		const drawn = await state(page);
		expect(drawn.rows).toEqual([[15], [17, 22, 7, 12], [8, 3]]); // buckets 0, 2, 3 (rows of empty buckets have no nodes)
		expect(drawn.lost).toEqual([]);

		await runCode(page, 'table[4] = new Node(9)\n');
		await expect(page.locator('#narration')).toHaveText('table[4] yeni bir düğümü gösteriyor: [9].');
		await runCode(page, 'table[2] = null\n'); // the chain of bucket 2 is lost
		expect((await state(page)).lost.sort((a, b) => a - b)).toEqual([7, 12, 17, 22]);

		await page.locator('.tab[data-tab="tab-command"]').click();
		await page.keyboard.type('table');
		await page.keyboard.press('Enter');
		expect(JSON.parse(await outputText(page))).toEqual([{ data: 15, next: null }, null, null, { data: 8, next: { data: 3, next: null } }, { data: 9, next: null }]);
		expect(problems).toEqual([]);
	});

	test('two bucket tables stand side by side, each chain on its row', async ({ page }) => {
		const problems = await openPage(page, 'hashTable.html');
		await runBlock(page, 4); // rehash into a table of 10
		const drawn = await state(page);
		expect(drawn.arrays.map(a => [a.name, a.kind])).toEqual([['table', 'buckets'], ['big', 'buckets']]);
		expect(drawn.rows).toEqual([[12, 22], [3], [15], [17], [8]]);
		expect(drawn.lost).toEqual([]);
		// big starts to the right of table's longest chain; its chains to the right of big
		const x = await page.evaluate(() => {
			const col = n => window.big[n] && window.big[n].position ? window.big[n].position.x : null;
			return {chain: col(2)};
		});
		expect(x.chain).toBeGreaterThan(200);
		expect(problems).toEqual([]);
	});

	test('array errors are explained', async ({ page }) => {
		const problems = await openPage(page, 'index.html');
		await runCode(page, 'var t = new Array(3)\nt[3] = 1\n');
		await expect(page.locator('#output')).toContainText('t[3]: dizinin 3 hücresi var, geçerli indisler 0 ile 2 arası.');
		await runCode(page, 'var u = new Array(0)\n');
		await expect(page.locator('#output')).toContainText('Dizi boyutu 1 ile 50 arasında bir tam sayı olmalı (0 verildi).');
		await runCode(page, 'var w = 5\nw[0] = 1\n');
		await expect(page.locator('#output')).toContainText('"w" bir dizi değil');
		expect(problems).toEqual([]);
	});

	test('an array of numbers is a row with index markers; an array of nodes stays buckets', async ({ page }) => {
		const problems = await openPage(page, 'arrayStackQueue.html');
		await runBlock(page, 0);
		expect((await state(page)).arrays).toEqual([{ name: 's', kind: 'row', cells: [10, 20, null, null, null], markers: { size: 2 }, bars: false, reads: [], forest: null, heap: null, graph: null }]); // no heap formulas: no tree; s is no array to sort: no bars
		await page.locator('.dsv-player button[title="Geri adım"]').click(); // before pop() finished: 30 still there
		await runBlock(page, 1);
		const both = (await state(page)).arrays;
		expect(both.map(a => a.name)).toEqual(['s', 'q']);
		expect(both[1]).toEqual({ name: 'q', kind: 'row', cells: [6, null, 3, 4, 5], markers: { rear: 1, front: 2 }, bars: false, reads: [], forest: null, heap: null, graph: null });

		await runCode(page, 'push(1)\npush(2)\npush(3)\npush(4)\n'); // the sixth value does not fit
		await expect(page.locator('#output')).toContainText('s[5]: dizinin 5 hücresi var');

		await page.goto('/hashTable.html');
		await page.waitForFunction(() => window.dsvReady === true);
		await runBlock(page, 1);
		expect((await state(page)).arrays[0]).toMatchObject({ name: 'table', kind: 'buckets' });
		expect(problems).toEqual([]);
	});

	test('a heap in an array is also drawn as its tree, with the index markers of the running call', async ({ page }) => {
		const problems = await openPage(page, 'heap.html');
		await runBlock(page, 0);
		let h = (await state(page)).arrays[0];
		expect(h.cells).toEqual([1, 3, 2, 5, 9, 8, null, null, null, null]);
		expect(h.heap).toEqual([1, 3, 2, 5, 9, 8]);
		expect(h.markers).toEqual({ n: 6 });

		for (let k = 0; k < 9; k++) // inside swap(5, 2) of insert(2): its i and j mark the two cells
			await page.locator('.dsv-player button[title="Geri adım"]').click();
		h = (await state(page)).arrays[0];
		expect(h.markers).toEqual({ n: 6, i: 5, j: 2 });
		expect(h.heap).toEqual([1, 3, 8, 5, 9, 2]);

		await runBlock(page, 1); // two pops: the tree shrinks with n
		h = (await state(page)).arrays[0];
		expect(h.heap).toEqual([3, 5, 8, 9]);

		await openPage(page, 'heap.html', { codeLang: 'cpp' }); // in C++ an emptied cell holds 0: the tree stops at n
		await expect(page.locator('.CodeMirror').first()).toContainText('int p = (i - 1) / 2;');
		await runBlock(page, 1);
		h = (await state(page)).arrays[0];
		expect(h.cells.slice(0, 6)).toEqual([3, 5, 8, 9, 0, 0]);
		expect(h.heap).toEqual([3, 5, 8, 9]);
		expect(problems).toEqual([]);
	});

	test('an adjacency list named adj is also drawn as its graph; visited vertices are coloured', async ({ page }) => {
		const problems = await openPage(page, 'graph.html');
		await runBlock(page, 0);
		const graph = async () => (await state(page)).arrays.find(a => a.name === 'adj').graph;
		expect(await graph()).toMatchObject({ edges: ['0-1', '0-5', '1-2', '1-4', '2-3', '3-4', '4-5'], visited: [], weights: {}, tree: [] });

		let oneWay = false; // stepping back into addEdge(4, 5): a moment when only 4 -> 5 is there (an arrow)
		for (let k = 0; k < 6 && !oneWay; k++) {
			await page.locator('.dsv-player button[title="Geri adım"]').click();
			oneWay = (await graph()).edges.includes('4>5');
		}
		expect(oneWay).toBe(true);

		await runBlock(page, 1);
		expect(await graph()).toMatchObject({ visited: [0, 1, 2, 3, 4, 5] });
		await page.locator('.dsv-timeline').evaluate(el => { el.value = Math.round(el.max * 0.55); el.dispatchEvent(new Event('input')); }); // the middle of BFS
		const middle = (await graph()).visited;
		expect(middle.length).toBeGreaterThan(0);
		expect(middle.length).toBeLessThan(6);
		expect(middle).toContain(0);

		await runCode(page, 'var big = new Array(3)\nbig[0] = new Node(7)\n'); // not named adj: buckets only
		expect((await state(page)).arrays.find(a => a.name === 'big').graph).toBeNull();
		await runCode(page, 'var graph = new Array(3)\ngraph[0] = new Node(1)\ngraph[1] = new Node(9)\n'); // 9 is no vertex
		expect((await state(page)).arrays.find(a => a.name === 'graph').graph).toBeNull();

		await page.goto('/hashTable.html'); // a hash table is no graph
		await page.waitForFunction(() => window.dsvReady === true);
		await runBlock(page, 1);
		expect((await state(page)).arrays[0].graph).toBeNull();
		expect(problems).toEqual([]);
	});

	test('a weighted graph: weights on the edges, distances at the vertices, the tree of shortest paths', async ({ page }) => {
		const problems = await openPage(page, 'dijkstra.html');
		await runBlock(page, 0);
		const graph = async () => (await state(page)).arrays.find(a => a.name === 'adj').graph;
		expect((await graph()).weights).toEqual({ '0-1': 4, '0-2': 1, '0-4': 10, '1-2': 2, '2-3': 5, '3-4': 3 });
		expect((await graph()).dist).toEqual([null, null, null, null, null]);

		await runBlock(page, 1);
		expect(await graph()).toMatchObject({ dist: ['0', '3', '1', '6', '9'], tree: ['0-2', '1-2', '2-3', '3-4'], visited: [0, 1, 2, 3, 4] });
		await page.locator('.dsv-timeline').evaluate(el => { el.value = Math.round(el.max * 0.3); el.dispatchEvent(new Event('input')); });
		expect((await graph()).dist).toContain('∞'); // INF is drawn as infinity until a vertex is reached

		await openPage(page, 'dijkstra.html', { codeLang: 'turkce' }); // the field in Turkish code
		await expect(page.locator('.CodeMirror').first()).toContainText('e.ağırlık = w');
		await runBlock(page, 1);
		expect((await graph()).dist).toEqual(['0', '3', '1', '6', '9']);
		expect(problems).toEqual([]);
	});

	test('step comparison: what the last step changed is kept, faded, from before', async ({ page }) => {
		const problems = await openPage(page, 'reverseALinkedList.html');
		await runAllBlocks(page);
		const at = async step => { // the state at one step of the run
			await page.locator('.dsv-timeline').evaluate((el, v) => { el.value = v; el.dispatchEvent(new Event('input')); }, step);
			return (await state(page));
		};
		let s = await at(14); // curr moved from [1] to [2]
		expect(s.narration).toBe('curr artık [2] düğümünü gösteriyor.');
		expect(s.ghosts).toMatchObject({ links: [], pointers: ['curr:1>2'], drawn: true });

		s = await at(17); // [2].next was [3], now [1]
		expect(s.narration).toBe('[2] düğümünün next bağı artık [1] düğümünü gösteriyor.');
		expect(s.ghosts).toMatchObject({ links: ['2>3 next'], pointers: [], drawn: true });

		s = await at(20); // a step that changes nothing has nothing to compare
		expect(s.ghosts).toMatchObject({ links: [], pointers: [], values: [], drawn: false });

		// the same step again after going back and forth: the same comparison
		await at(16); s = await at(17);
		expect(s.ghosts.links).toEqual(['2>3 next']);

		// the setting switches the drawing off; the step still knows what changed
		await page.evaluate(() => window.dsv.set('stepCompare', false));
		expect((await state(page)).ghosts).toMatchObject({ links: ['2>3 next'], drawn: false });
		await page.evaluate(() => window.dsv.set('stepCompare', true));
		expect((await state(page)).ghosts.drawn).toBe(true);
		expect(problems).toEqual([]);
	});

	test('step comparison: a changed value and a new node for a pointer', async ({ page }) => {
		const problems = await openPage(page, 'index.html');
		await runCode(page, 'var x = new Node(1)\nvar y = new Node(5)\nx.next = y\nx.data = 8\nx = new Node(9)\n');
		await skipToEnd(page);
		expect((await state(page)).ghosts.pointers).toEqual(['x:8>9']); // x = new Node(9): x came from [8]
		await page.locator('.dsv-player button[title="Geri adım"]').click();
		expect((await state(page)).ghosts.values).toEqual(['8<-1']);   // x.data = 8 replaced 1
		await page.locator('.dsv-player button[title="Geri adım"]').click();
		await page.locator('.dsv-player button[title="Geri adım"]').click();
		expect((await state(page)).nodes).toEqual([1, 5]);            // going back: a node shows the value it had then, not the final one

		await runCode(page, 'var a = new Array(3)\na[0] = 5\na[1] = 7\na[0] = 9\n');
		await skipToEnd(page);
		expect((await state(page)).ghosts.cells).toEqual(['a[0]:5']);
		expect(problems).toEqual([]);
	});

	test('arrays: the cells a condition read are framed, an array to sort is drawn as bars, counters count per block', async ({ page }) => {
		const problems = await openPage(page, 'index.html');
		const arrays = async () => (await state(page)).arrays;
		await runCode(page, 'var a = new Array(5)\nvar n = 5\na[0] = 3\na[1] = 9\na[2] = 5\na[3] = 1\na[4] = 7\nvar k = 2\nvar v = a[k]\nif(a[0] < a[1])\n  print 1\n');
		await skipToEnd(page);
		await page.locator('.dsv-player button[title="Geri adım"]').click(); // the condition: both cells it read
		let s = await state(page);
		expect(s.narration).toContain('a[0] < a[1]');
		expect(s.arrays[0].reads).toEqual([0, 1]);
		expect(s.arrays[0].bars).toBe(true);                       // named a, five numbers: bars over the cells
		expect(s.arrays[0].markers).toEqual({ k: 2 });             // k was read as a[k]: marked, though it was never written
		expect(s.stats).toEqual({ compare: 1, write: 5 });         // the condition is a comparison; five cells were written
		await expect(page.locator('.dsv-stats')).toHaveText('Karşılaştırma 1 · Yazma 5');

		await runCode(page, 'var q = new Array(5)\nq[0] = 4\nq[1] = 2\nq[2] = 8\nq[3] = 1\n');
		await skipToEnd(page);
		expect((await arrays()).find(x => x.name === 'q').bars).toBe(false);   // another name: plain cells only

		await runCode(page, 'var nums = new Array(5)\nnums[0] = 4\nnums[1] = 0 - 3\nnums[2] = 8\nnums[3] = 1\n');
		await skipToEnd(page);
		expect((await arrays()).find(x => x.name === 'nums').bars).toBe(false); // a negative number: no bars
		expect(problems).toEqual([]);
	});

	test('searching and sorting pages: comparisons are counted, each block from zero', async ({ page }) => {
		const problems = await openPage(page, 'binarySearch.html');
		await runBlock(page, 1); // linear search: 9 comparisons
		expect((await state(page)).stats).toEqual({ compare: 9, write: 0 });
		await runBlock(page, 2); // binary search: 3, though the block above ran again before it
		expect((await state(page)).stats).toEqual({ compare: 3, write: 0 });
		await page.locator('.dsv-timeline').evaluate(el => { el.value = Math.round(el.max * 0.9); el.dispatchEvent(new Event('input')); });
		const markers = (await state(page)).arrays[0].markers; // inside binarySearch: low, mid and high mark the cells
		expect(Object.keys(markers).sort()).toEqual(expect.arrayContaining(['high', 'low', 'mid']));

		await openPage(page, 'countingSort.html');
		await runBlock(page, 1);
		expect((await state(page)).stats.compare).toBe(0);         // counting sort never compares two values

		await openPage(page, 'selectionSort.html');
		await runBlock(page, 1);
		expect((await state(page)).stats.compare).toBe(28);        // n(n-1)/2 for eight values
		expect(problems).toEqual([]);
	});

	test('heap sort: the tree shrinks with the global size, the sorted cells leave it', async ({ page }) => {
		const problems = await openPage(page, 'heapSort.html');
		await runBlock(page, 1);
		const heap = async () => (await state(page)).arrays[0].heap;
		expect((await state(page)).arrays[0].cells).toEqual([3, 7, 12, 19, 25, 28, 34, 41]);
		expect(await heap()).toEqual([3]);                         // size is 1: only the root is left in the heap
		await page.locator('.dsv-timeline').evaluate(el => { el.value = Math.round(el.max * 0.5); el.dispatchEvent(new Event('input')); });
		expect((await heap()).length).toBeGreaterThan(1);
		expect((await heap()).length).toBeLessThanOrEqual(8);
		expect(problems).toEqual([]);
	});

	test('graphs: components coloured, in-degrees in the vertices, chosen edges thick, a union-find array drawn as a forest', async ({ page }) => {
		const problems = await openPage(page, 'connectedComponents.html');
		await runBlock(page, 1);
		const graph = async name => (await state(page)).arrays.find(a => a.name === name).graph;
		expect((await graph('adj')).comps).toEqual([1, 1, 1, 2, 2, 2, 3, 3]);   // the same number, the same colour

		await openPage(page, 'topologicalSort.html');
		await runBlock(page, 1);
		expect((await graph('adj')).dist).toEqual(['0', '0', '0', '0', '0', '0']); // indeg: every in-degree has fallen to 0
		expect((await graph('adj')).edges).toEqual(['2>3', '3>1', '4>0', '4>1', '5>0', '5>2']); // directed: arrows, not lines

		await openPage(page, 'kruskal.html');
		await runBlock(page, 2);
		expect((await graph('adj')).chosen).toEqual(['0-2', '1-2', '1-3', '3-4', '3-5']); // the edges of the tree
		expect((await state(page)).arrays.find(a => a.name === 'leader').forest).toEqual([4, 4, 4, 4, 5, 5]);

		await runCode(page, 'var uf = new Array(3)\nuf[0] = 1\nuf[1] = 0\nuf[2] = 2\n'); // a cycle of parents is no forest
		expect((await state(page)).arrays.find(a => a.name === 'uf').forest).toBeNull();
		expect(problems).toEqual([]);
	});

	test('a circular doubly linked list: both rings drawn, read backwards, appended in O(1)', async ({ page }) => {
		const problems = await openPage(page, 'circularDoublyLinkedList.html');
		await runBlock(page, 1);
		expect(await outputText(page)).toBe('4\n3\n2\n1\n');
		await runBlock(page, 2);
		const drawn = await state(page);
		expect(drawn.doubly).toBe(true);
		expect(drawn.rows).toEqual([[1, 2, 3, 4, 5]]);
		expect(drawn.lost).toEqual([]);
		expect(problems).toEqual([]);
	});

	test('a lost subtree is marked, and running a list page after a tree draws a list again', async ({ page }) => {
		const problems = await openPage(page, 'binarySearchTree.html');
		await runBlock(page, 0);
		await runCode(page, 'root.left = null\n');
		expect((await state(page)).lost.sort((a, b) => a - b)).toEqual([1, 3, 4, 6, 7]);
		await page.goto('/reverseALinkedList.html');
		await page.waitForFunction(() => window.dsvReady === true);
		await runBlock(page, 0);
		expect((await state(page)).tree).toBe(false);
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
		await expect(narration(page)).toHaveText('[4] düğümünün next bağı artık [3] düğümünü gösteriyor.');
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

	test('a list being reversed: links to the neighbour on the other side are short hooks, the end is laid out again', async ({ page }) => {
		const problems = await openPage(page, 'reverseADoublyLinkedList.html');
		await runAllBlocks(page);
		let drawn = await state(page);
		expect(drawn.rows).toEqual([[4, 3, 2, 1]]); // the last step lays the list out from its new head
		expect(drawn.arrows).toEqual({ straight: 6, hook: 0, other: 0 });

		await page.locator('.dsv-player button[title="Geri adım"]').click(); // before that: the nodes still stand where they were
		drawn = await state(page);
		expect(drawn.rows).toEqual([[1, 2, 3, 4]]);
		expect(drawn.arrows).toEqual({ straight: 0, hook: 6, other: 0 });

		await openPage(page, 'reverseALinkedList.html'); // a singly linked list too
		await runAllBlocks(page);
		await page.locator('.dsv-player button[title="Geri adım"]').click();
		expect((await state(page)).arrows.other).toBe(0);
		expect((await state(page)).arrows.hook).toBeGreaterThan(0);
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

test('the first visit: a tour lights each part in turn, shows the code language setting, and comes only once', async ({ page }) => {
	const problems = await openPage(page, 'reverseALinkedList.html', { tour: true });
	const card = page.locator('.tour-card');
	await expect(card).toBeVisible();
	await expect(card.locator('.tour-title')).toHaveText('Hoş geldiniz');
	await expect(card.locator('.tour-back')).toBeHidden();
	await expect(card.locator('.tour-count')).toHaveText('1 / 10');

	// the page under it does not take clicks while the tour is on
	await page.locator('.tour-block').click({ position: { x: 5, y: 300 } });
	await expect(card).toBeVisible();

	await card.locator('.tour-next').click();
	await expect(card.locator('.tour-title')).toHaveText('Kod blokları');
	const spot = await page.locator('.tour-spot').boundingBox();
	const block = await page.locator('.code-card').first().boundingBox();
	expect(Math.abs(spot.x - (block.x - 6))).toBeLessThan(2); // the lit box is over the first code block
	expect(Math.abs(spot.width - (block.width + 12))).toBeLessThan(2);

	await page.keyboard.press('ArrowRight'); // the arrow keys move the tour, not the player
	await expect(card.locator('.tour-title')).toHaveText('Çalıştır');
	await page.keyboard.press('ArrowLeft');
	await expect(card.locator('.tour-title')).toHaveText('Kod blokları');

	for (let i = 0; i < 7; i++) await card.locator('.tour-next').click();
	await expect(card.locator('.tour-title')).toHaveText('Kod dili: Düğüm, C++ ya da Java');
	await expect(page.locator('#settings-panel')).toBeVisible(); // the panel opens on the code language
	await expect(page.locator('#settings-panel select[name=codeLang]')).toHaveValue('dugum'); // the site opens in Düğüm
	await card.locator('.tour-next').click();
	await expect(page.locator('#settings-panel')).toBeHidden();
	await expect(card.locator('.tour-next')).toHaveText('Başlayalım');
	await card.locator('.tour-next').click();
	await expect(card).toHaveCount(0);
	await expect(page.locator('.tour-spot, .tour-block')).toHaveCount(0);

	// only once; the settings panel starts it again, and Escape ends it
	await page.reload();
	await page.waitForFunction(() => window.dsvReady === true);
	await page.waitForTimeout(500);
	await expect(card).toHaveCount(0);
	await page.locator('.topbar .settings-btn').click();
	await page.locator('#settings-panel [name=tour]').click();
	await expect(card.locator('.tour-title')).toHaveText('Hoş geldiniz');
	await page.keyboard.press('Escape');
	await expect(card).toHaveCount(0);
	await runBlock(page, 0); // the page works as before
	expect(await valueOf(page, 'walk(x)')).toBe('1>2>3>4');
	expect(problems).toEqual([]);
});

test.describe('matrices', () => {
	const state = page => page.evaluate(() => window.dsvState());
	const back = page => page.locator('.dsv-player button[title="Geri adım"]').click();

	test('new Array(r, c): cells are written, read and replayed by row and column', async ({ page }) => {
		const problems = await openPage(page, 'index.html');
		await runCode(page, 'var g = new Array(2, 3)\ng[1][2] = 7\ng[0][0] = g[1][2] + 1\n');
		let s = await state(page);
		expect(s.grids).toEqual([{ name: 'g', rows: 2, cols: 3, cells: [[8, null, null], [null, null, 7]], reads: [[1, 2]], focus: [0, 0], markers: { row: {}, col: {} } }]);
		expect(s.arrays).toEqual([]);                                  // a matrix is not a row array
		expect(s.stats).toEqual({ compare: 0, write: 2 });
		expect(s.narration).toContain('g[0][0]');

		await back(page);                                              // g[1][2] = 7
		s = await state(page);
		expect(s.grids[0].cells).toEqual([[null, null, null], [null, null, 7]]);
		expect(s.grids[0].focus).toEqual([1, 2]);
		await back(page);                                              // right after new Array(2, 3)
		expect((await state(page)).grids[0].cells).toEqual([[null, null, null], [null, null, null]]);

		await runCode(page, 'g[0][0] = 9\n');                          // overwriting keeps the old value as a ghost
		await skipToEnd(page);
		s = await state(page);
		expect(s.ghosts.cells).toEqual(['g[0][0]:8']);
		expect(problems).toEqual([]);
	});

	test('a condition that reads matrix cells is a comparison and frames them', async ({ page }) => {
		const problems = await openPage(page, 'index.html');
		await runCode(page, 'var g = new Array(2, 2)\ng[0][1] = 3\ng[1][0] = 5\nif(g[0][1] < g[1][0])\n  print 1\n');
		await back(page);                                              // the print is the last step; one back is the condition
		const s = await state(page);
		expect(s.grids[0].reads).toEqual([[0, 1], [1, 0]]);
		expect(s.stats.compare).toBe(1);
		expect(problems).toEqual([]);
	});

	test('matrix errors are explained', async ({ page }) => {
		const problems = await openPage(page, 'index.html');
		const out = page.locator('#output');
		await runCode(page, 'var g = new Array(2, 3)\ng[2][0] = 1\n');
		await expect(out).toContainText('g[2]: matrisin 2 satırı var, geçerli satır indisleri 0 ile 1 arası.');
		await runCode(page, 'g[0][3] = 1\n');
		await expect(out).toContainText('g[0][3]: matrisin 3 sütunu var, geçerli sütun indisleri 0 ile 2 arası.');
		await runCode(page, 'g[0 - 1][0] = 1\n');
		await expect(out).toContainText('g[-1]: matrisin 2 satırı var');
		await runCode(page, 'var v = g[5][0]\n');                      // reading is as strict as writing
		await expect(out).toContainText('g[5]: matrisin 2 satırı var');
		await runCode(page, 'var w = g[1][9]\n');
		await expect(out).toContainText('g[1][9]: matrisin 3 sütunu var');
		await runCode(page, 'g[0.5][0] = 1\n');
		await expect(out).toContainText('g[0.5]: matrisin 2 satırı var');
		await runCode(page, 'var big = new Array(13, 2)\n');
		await expect(out).toContainText('Matris boyutu: satır ve sütun sayısı 1 ile 12 arasında tam sayı olmalı (13 × 2 verildi).');
		await runCode(page, 'var zero = new Array(0, 2)\n');
		await expect(out).toContainText('(0 × 2 verildi)');
		await runCode(page, 'var h = 5\nh[0][0] = 1\n');
		await expect(out).toContainText('"h" bir matris değil');
		await runCode(page, 'var a1 = new Array(3)\na1[0][0] = 1\n');
		await expect(out).toContainText('"a1" bir matris değil');
		await runCode(page, 'g[0] = 1\n');
		await expect(out).toContainText('"g" bir matris: iki indis gerekir');
		expect(problems).toEqual([]);                                  // none of these is a JavaScript error
	});

	test('a row on its own can be read without breaking the drawing', async ({ page }) => {
		const problems = await openPage(page, 'index.html');
		await runCode(page, 'var g = new Array(2, 2)\ng[0][0] = 1\nvar r = g[1]\nvar x = g[0][0]\n');
		const s = await state(page);
		expect(s.grids[0].cells).toEqual([[1, null], [null, null]]);
		expect(problems).toEqual([]);
	});
	test('the grid: index variables are marked on their row and column, bands do not overlap, odd values draw', async ({ page }) => {
		const problems = await openPage(page, 'index.html');
		await runCode(page, 'var g = new Array(3, 4)\nvar i = 1\nvar j = 2\ng[i][j] = 1\n');
		let s = await state(page);
		expect(s.grids[0].markers).toEqual({ row: { i: 1 }, col: { j: 2 } });

		await runCode(page, 'var a = new Array(6)\na[0] = 4\nvar h = new Array(2, 2)\nh[0][0] = true\nh[1][1] = 12345\n');
		s = await state(page);
		expect(s.bands.map(b => b[0])).toEqual(['g', 'a', 'h']);       // the order the arrays were made in
		for (let k = 1; k < s.bands.length; k++)
			expect(s.bands[k][1]).toBeGreaterThanOrEqual(s.bands[k - 1][1] + s.bands[k - 1][2]);
		expect(s.bands[0][2]).toBeGreaterThanOrEqual(3 * 30);          // the first one holds three rows of cells
		expect(s.grids.find(x => x.name === 'h').cells).toEqual([[true, null], [null, 12345]]);
		await expect(page.locator('canvas').first()).toBeVisible();
		expect(problems).toEqual([]);
	});
	test('an index that is not a number is explained too (undefined, NaN, null)', async ({ page }) => {
		const problems = await openPage(page, 'index.html');
		const out = page.locator('#output');
		await runCode(page, 'var g = new Array(2, 2)\nvar a1 = g[0 / 0][0]\n');
		await expect(out).toContainText('g[NaN]: matrisin 2 satırı var');
		await runCode(page, 'var a2 = g[0][0 / 0]\n');
		await expect(out).toContainText('g[0][NaN]: matrisin 2 sütunu var');
		await runCode(page, 'var a3 = g[null][0]\n');
		await expect(out).toContainText('g[null]: matrisin 2 satırı var');
		await runCode(page, 'function f(i)\n{\n  return g[i][0]\n}\nvar a4 = f()\n');       // a missing argument is null
		await expect(out).toContainText('g[null]: matrisin 2 satırı var');
		await runCode(page, 'function h(i, j)\n{\n  return g[i][j]\n}\nvar a5 = h(1)\n');
		await expect(out).toContainText('g[1][null]: matrisin 2 sütunu var');
		expect(problems).toEqual([]);
	});

	for (const [lang, hint] of [['cpp', 'int g[3][4]'], ['java', 'int[][] g = new int[3][4]']])
		test(`in ${lang} the hint of a missing matrix is written in that language`, async ({ page }) => {
			const problems = await openPage(page, 'index.html', { codeLang: lang });
			await runCode(page, 'var h = 5\nh[0][0] = 1\n');
			await expect(page.locator('#output')).toContainText('"h" bir matris değil');
			await expect(page.locator('#output')).toContainText(hint);
			expect(problems).toEqual([]);
		});
});

test.describe('quiet runs', () => {
	const setBlock = (page, i, code) => page.evaluate(([i, code]) => document.querySelectorAll('.CodeMirror')[i].CodeMirror.setValue(code), [i, code]);
	const state = page => page.evaluate(() => window.dsvState());

	test('dsvRunBlock tells whether the block ran without an error', async ({ page }) => {
		const problems = await openPage(page, 'index.html');
		await setBlock(page, 0, 'var x = new Node(1)\n');
		expect(await page.evaluate(() => window.dsvRunBlock(0))).toBe(true);
		await setBlock(page, 0, 'var x = \n');
		expect(await page.evaluate(() => window.dsvRunBlock(0))).toBe(false);
		await setBlock(page, 0, 'var p = null\np.next = p\n');
		expect(await page.evaluate(() => window.dsvRunBlock(0))).toBe(false);   // a run-time error counts too
		expect(problems).toEqual([]);
	});

	test('a quiet run changes the program but neither the drawing nor the steps nor the output', async ({ page }) => {
		const problems = await openPage(page, 'index.html');
		await setBlock(page, 0, 'var x = new Node(1)\nx.next = new Node(2)\nprint 5\n');
		await page.evaluate(() => window.dsvRunBlock(0));
		await skipToEnd(page);
		const before = { state: await state(page), counter: await stepCounter(page), output: await outputText(page) };
		expect(before.output).toContain('5');

		const result = await page.evaluate(() => window.dsvRunQuiet('var q = new Node(9)\nq.next = null\nprint 7\n'));
		expect(result).toEqual({ ok: true, error: '' });
		expect(await valueOf(page, 'q.data')).toBe(9);                      // the program has it
		expect(await state(page)).toEqual(before.state);                     // the drawing has not
		expect(await stepCounter(page)).toEqual(before.counter);
		expect(await outputText(page)).toBe(before.output);                  // and the student's output is back

		const bad = await page.evaluate(() => window.dsvRunQuiet('var z = nothing\n'));
		expect(bad.ok).toBe(false);
		expect(bad.error).toContain('nothing');
		expect(await outputText(page)).toBe(before.output);
		expect(await stepCounter(page)).toEqual(before.counter);

		await page.evaluate(() => window.dsvRunBlock(0));                    // a normal run afterwards starts clean
		await skipToEnd(page);
		expect(await state(page)).toEqual(before.state);
		expect(await valueOf(page, 'typeof q')).toBe('undefined');
		expect(problems).toEqual([]);
	});

	test('expressions are evaluated quietly, helpers win over user globals, errors are explained', async ({ page }) => {
		const problems = await openPage(page, 'index.html');
		await setBlock(page, 0, 'var x = new Node(1)\nx.next = new Node(2)\nfunction twice(v)\n{\n  var k = v * 2\n  return k\n}\nfunction walk(h)\n{\n  return 0\n}\n');
		await page.evaluate(() => window.dsvRunBlock(0));
		await skipToEnd(page);
		const counter = await stepCounter(page);
		const out = await page.evaluate(() => {
			const walk = h => { const r = []; for (let n = h; n; n = n.next) r.push(n.data); return r.join('>'); };
			return [window.dsvEvalQuiet('walk(x)', { walk }), window.dsvEvalQuiet('twice(21)', {}), window.dsvEvalQuiet('x.next.next.data', {})];
		});
		expect(out[0]).toEqual({ ok: true, value: '1>2', error: '' });       // the helper, not the student's walk
		expect(out[1]).toEqual({ ok: true, value: 42, error: '' });          // a student function runs without drawing
		expect(out[2].ok).toBe(false);
		expect(out[2].error).not.toBe('');
		expect(await stepCounter(page)).toEqual(counter);
		expect(problems).toEqual([]);
	});
	test('what the student printed is available after a run (for output() checks)', async ({ page }) => {
		const problems = await openPage(page, 'index.html');
		await setBlock(page, 0, 'print 42\nprint 7\n');
		await page.evaluate(() => window.dsvRunBlock(0));
		expect(await page.evaluate(() => window.dsvPrintedText())).toBe('42,7');   // before any animation step has played
		await page.evaluate(() => window.dsvRunQuiet('print 1\n'));                   // a later run replaces it: exercise.js reads it right after the student's run
		expect(await page.evaluate(() => window.dsvPrintedText())).toBe('1');
		expect(problems).toEqual([]);
	});

	test('hidden code is Düğüm in every code language: it is not translated back from C++', async ({ page }) => {
		const problems = await openPage(page, 'index.html', { codeLang: 'cpp' });
		const wrong = await page.evaluate(() => window.dsvRunQuiet('int q = 5\n'));    // C++, not Düğüm: a syntax error here
		expect(wrong.ok).toBe(false);
		const right = await page.evaluate(() => window.dsvRunQuiet('var q = 5\n'));
		expect(right).toEqual({ ok: true, error: '' });
		expect(problems).toEqual([]);
	});
	test('a quiet run leaves the drawing mode and the index markers of the student\'s program alone', async ({ page }) => {
		const problems = await openPage(page, 'index.html');
		await page.evaluate(() => window.dsvRunQuiet('var d = new Node(1)\nvar e = new Node(2)\nd.prev = e\nvar t = new Array(3)\nvar k = 1\nt[k] = 5\n'));
		await page.evaluate(() => { window.activeEditor = null; window.parse('var x = new Node(1)\n'); });
		await skipToEnd(page);
		expect((await state(page)).doubly).toBe(false);                      // the hidden code used .prev: it must not turn this program doubly linked
		expect((await state(page)).arrays).toEqual([]);                      // nor draw its own arrays
		expect(problems).toEqual([]);
	});
});
