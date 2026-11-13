// Exercise pages (ex*.html): the starter fails, the example solution passes, attempts and hints behave,
// progress is kept, errors are not attempts, plans count a solved exercise only.
const { test } = require('@playwright/test');
const fs = require('fs');
const path = require('path');
const { expect, openPage, skipToEnd } = require('./helpers');

const ROOT = path.resolve(__dirname, '..');
const FILES = fs.readdirSync(ROOT).filter(f => /^ex[A-Z].*\.html$/.test(f)).sort();
const solutionOf = file => /<script type="text\/plain" id="ex-solution">\n([\s\S]*?)<\/script>/.exec(fs.readFileSync(path.join(ROOT, file), 'utf8'))[1];
const setStudent = (page, code) => page.evaluate(code => document.querySelectorAll('.CodeMirror')[1].CodeMirror.setValue(code), code);
const progress = page => page.evaluate(() => JSON.parse(localStorage.getItem('dsv-exercises') || '{}'));
const check = page => page.locator('.ex-check').click();
const planLink = (plan, file, i) => '/' + file + '#plan=' + Buffer.from(JSON.stringify(plan)).toString('base64url') + '&i=' + i;

test('there are sixteen exercises and the menu lists them', () => {
	expect(FILES).toEqual(['exAppend.html', 'exArrayMax.html', 'exBinarySearch.html', 'exBubbleSort.html', 'exDedupe.html', 'exGridPaths.html', 'exHasCycle.html', 'exIsSorted.html',
		'exLength.html', 'exMiddle.html', 'exPascal.html', 'exReverse.html', 'exRowSum.html', 'exStack.html', 'exTreeHeight.html', 'exTreeSum.html']);
});

for (const file of FILES) {
	test(`${file}: the starter does not pass, the example solution does and is remembered`, async ({ page }) => {
		const problems = await openPage(page, file);
		await check(page);
		await expect(page.locator('.ex-result.bad')).toBeVisible();
		expect((await progress(page))[file]).toEqual({ done: false, attempts: 1 });

		await setStudent(page, solutionOf(file));
		await check(page);
		await expect(page.locator('.ex-result.ok')).toHaveText('Doğru! Alıştırma tamam.');
		await expect(page.locator('.ex-status')).toHaveText('Yapıldı ✓');
		expect((await progress(page))[file]).toEqual({ done: true, attempts: 2 });
		await page.reload();                                                  // the menu shows what was solved the next time it is built
		await page.waitForFunction(() => window.dsvReady === true);
		await expect(page.locator('.ex-status')).toHaveText('Yapıldı ✓');
		await expect(page.locator(`.drawer a[href="${file}"] .ex-mark`)).toHaveCount(1);
		expect(problems).toEqual([]);
	});
}

test('a failing check says what was expected, not what the hidden test is', async ({ page }) => {
	const problems = await openPage(page, 'exReverse.html');
	await setStudent(page, 'function reverse(head)\n{\n  return head\n}\n');
	await check(page);
	const text = await page.locator('.ex-result').textContent();
	expect(text).toContain('Henüz değil.');
	expect(text).toContain('beklenen "4>3>2>1", senin sonucun "1>2>3>4"');
	expect(text).not.toMatch(/build|new Node/);
	expect(problems).toEqual([]);
});

test('hints open one by one after attempts, the solution after two failed attempts', async ({ page }) => {
	const problems = await openPage(page, 'exReverse.html');
	await expect(page.locator('.ex-hint-btn')).toBeDisabled();       // nothing tried yet
	await expect(page.locator('.ex-solution-btn')).toBeHidden();
	await check(page);
	await expect(page.locator('.ex-hint-btn')).toBeEnabled();
	await page.locator('.ex-hint-btn').click();
	await expect(page.locator('.ex-hint-list li')).toHaveCount(1);
	await expect(page.locator('.ex-hint-btn')).toBeDisabled();       // the next one needs another attempt
	await expect(page.locator('.ex-solution-btn')).toBeHidden();
	await check(page);
	await expect(page.locator('.ex-hint-btn')).toBeEnabled();
	await expect(page.locator('.ex-solution-btn')).toBeVisible();
	await page.locator('.ex-solution-btn').click();
	await expect(page.locator('.ex-solution pre')).toContainText('function reverse(head)');
	expect(await page.evaluate(() => document.querySelectorAll('.CodeMirror')[1].CodeMirror.getValue())).not.toContain('var prev'); // the editor is left alone
	expect(problems).toEqual([]);
});

test('an error in the student\'s code is explained and is not an attempt', async ({ page }) => {
	const problems = await openPage(page, 'exReverse.html');
	await setStudent(page, 'var q = nothing\n');
	await check(page);
	await expect(page.locator('.ex-result.bad')).toContainText('Kodunda bir hata var');
	await expect(page.locator('#output')).toContainText('nothing');
	expect((await progress(page))['exReverse.html']).toBeUndefined();
	await setStudent(page, 'var i = 0\nwhile(i < 5)\n{\n}\n');           // an endless loop ends with the engine's own error
	await check(page);
	await expect(page.locator('.ex-result.bad')).toContainText('Kodunda bir hata var');
	expect((await progress(page))['exReverse.html']).toBeUndefined();
	expect(problems).toEqual([]);
});

test('a student function that fails only in the hidden test is a failed attempt with the explained error', async ({ page }) => {
	const problems = await openPage(page, 'exMiddle.html');
	await setStudent(page, 'function middle(head)\n{\n  return head.next.next.next.next.next\n}\n');   // fine for the 5-node sample, null pointer for short lists
	await check(page);
	await expect(page.locator('.ex-result.bad')).toBeVisible();
	expect((await progress(page))['exMiddle.html'].attempts).toBe(1);
	await expect(page.locator('.dsv-error-line')).toHaveCount(0);       // the hidden test's failure does not mark the student's line
	expect(problems).toEqual([]);
});

test('hints and the solution open even when the browser will not store anything', async ({ page }) => {
	await page.addInitScript(() => {
		const get = Storage.prototype.getItem, set = Storage.prototype.setItem;
		Storage.prototype.getItem = function(k){ if (k === 'dsv-exercises') throw new Error('blocked'); return get.call(this, k); };
		Storage.prototype.setItem = function(k, v){ if (k === 'dsv-exercises') throw new Error('quota'); return set.call(this, k, v); };
	});
	const problems = await openPage(page, 'exReverse.html');
	await check(page);
	await expect(page.locator('.ex-hint-btn')).toBeEnabled();
	await check(page);
	await expect(page.locator('.ex-solution-btn')).toBeVisible();
	await expect(page.locator('.ex-attempts')).toHaveText('2 deneme');
	await setStudent(page, solutionOf('exReverse.html'));
	await check(page);
	await expect(page.locator('.ex-status')).toHaveText('Yapıldı ✓');
	expect(problems).toEqual([]);
});

test('in lesson mode the check belongs to the student\'s block and shows only with it', async ({ page }) => {
	const problems = await openPage(page, 'exReverse.html', { lessonMode: true });
	await expect(page.locator('.exercise-panel')).toBeHidden();         // the first part: the given list
	await page.locator('.lesson-next').click();
	await expect(page.locator('.exercise-panel')).toBeVisible();        // the second part: the student's block and its check
	await expect(page.locator('.ex-check')).toBeVisible();
	await page.locator('.lesson-prev').click();
	await expect(page.locator('.exercise-panel')).toBeHidden();
	expect(problems).toEqual([]);
});

test('a misnamed function is explained without a line number of the hidden test', async ({ page }) => {
	const problems = await openPage(page, 'exMiddle.html');
	await setStudent(page, 'function mid(head)\n{\n  return head\n}\n');
	await check(page);
	const text = await page.locator('.ex-result').textContent();
	expect(text).toContain('"middle" tanımlı değil');
	expect(text).not.toMatch(/Satır \d+: "middle"/);
	expect(problems).toEqual([]);
});

test('Pascal and grid paths cannot be passed by writing only the checked cells', async ({ page }) => {
	let problems = await openPage(page, 'exGridPaths.html');
	await setStudent(page, 'dp[2][3] = 10\ndp[4][4] = 70\ndp[1][1] = 2\n');
	await check(page);
	await expect(page.locator('.ex-result.bad')).toBeVisible();
	expect(problems).toEqual([]);
	problems = await openPage(page, 'exPascal.html');
	await setStudent(page, 'p[5][0] = 1\np[5][1] = 5\np[5][2] = 10\np[5][3] = 10\np[5][4] = 5\np[5][5] = 1\np[2][1] = 2\np[3][3] = 1\n');
	await check(page);
	await expect(page.locator('.ex-result.bad')).toBeVisible();
	expect(problems).toEqual([]);
});

test('Pascal: filling the cells beyond the triangle is wrong too', async ({ page }) => {
	const problems = await openPage(page, 'exPascal.html');
	await setStudent(page, solutionOf('exPascal.html') + 'p[0][5] = 0\n');
	await check(page);
	await expect(page.locator('.ex-result.bad')).toBeVisible();
	expect(problems).toEqual([]);
});

test('small things: "1 deneme", the locked-hint reason is written next to the button, the menu mark is live, walk of a number', async ({ page }) => {
	const problems = await openPage(page, 'exReverse.html');
	await expect(page.locator('.ex-hint-note')).toHaveText('Bir sonraki ipucu bir denemeden sonra açılır.');
	await setStudent(page, 'function reverse(head)\n{\n  return 5\n}\n');
	await check(page);
	await expect(page.locator('.ex-attempts')).toHaveText('1 deneme');
	await expect(page.locator('.ex-result')).toContainText('senin sonucun "5"');   // not an empty text
	await expect(page.locator('.ex-hint-note')).toBeHidden();
	await expect(page.locator('.drawer a[href="exReverse.html"] .ex-mark')).toHaveCount(0);
	await setStudent(page, solutionOf('exReverse.html'));
	await check(page);
	await expect(page.locator('.drawer a[href="exReverse.html"] .ex-mark')).toHaveCount(1);   // without a reload
	expect(problems).toEqual([]);
});

test('broken saved progress does not break the page', async ({ page }) => {
	await page.addInitScript(() => localStorage.setItem('dsv-exercises', '{{{'));
	const problems = await openPage(page, 'exLength.html');
	await setStudent(page, solutionOf('exLength.html'));
	await check(page);
	await expect(page.locator('.ex-result.ok')).toBeVisible();
	expect(problems).toEqual([]);
});

test('the check leaves the student\'s own animation drawn', async ({ page }) => {
	const problems = await openPage(page, 'exReverse.html');
	const solution = solutionOf('exReverse.html');
	await setStudent(page, solution);
	await page.locator('button.dsv-run').nth(1).click();
	await skipToEnd(page);
	const plain = await page.evaluate(() => window.dsvState());
	await check(page);
	await skipToEnd(page);
	await expect(page.locator('.ex-result.ok')).toBeVisible();
	expect(await page.evaluate(() => window.dsvState())).toEqual(plain);
	await page.locator('button.dsv-run').nth(1).click();               // running again starts clean
	await skipToEnd(page);
	expect(await page.evaluate(() => window.dsvState())).toEqual(plain);
	expect(problems).toEqual([]);
});

for (const lang of ['turkce', 'cpp', 'java'])
	for (const file of FILES)
		test(`${file} is solved in ${lang} code too`, async ({ page }) => {
			const problems = await openPage(page, file, { codeLang: lang });
			const w = solutionOf(file);
			const shown = await page.evaluate(([code, id]) => window.dsvCode.langs[id].to([code])[0], [w, lang]);
			await setStudent(page, shown);
			await check(page);
			await expect(page.locator('.ex-result.ok')).toBeVisible();
			await page.locator('.ex-solution-btn').click();
			const text = await page.locator('.ex-solution pre').textContent();
			if (lang !== 'turkce') expect(text).not.toMatch(/\bvar\b/);
			expect(problems).toEqual([]);
		});

test('in a lesson plan an exercise counts when it is solved, not when it is run', async ({ page }) => {
	const plan = { v: 1, t: 'Deneme', d: '', i: [['exReverse.html'], ['stack.html']], c: 'dugum', m: 0 };
	await page.addInitScript(() => localStorage.setItem('dsv-tour-done', '1'));
	const problems = [];
	page.on('pageerror', e => problems.push(e.message));
	await page.goto(planLink(plan, 'exReverse.html', 0));
	await page.waitForFunction(() => window.dsvReady === true);
	await page.locator('button.dsv-run').nth(1).click();               // only run
	await skipToEnd(page);
	expect(await page.evaluate(() => localStorage.getItem('dsv-plan-progress'))).toBeNull();
	await check(page);                                                  // the starter fails
	expect(await page.evaluate(() => localStorage.getItem('dsv-plan-progress'))).toBeNull();
	await setStudent(page, solutionOf('exReverse.html'));
	await check(page);
	await expect(page.locator('.ex-result.ok')).toBeVisible();
	expect(await page.evaluate(() => localStorage.getItem('dsv-plan-progress'))).toContain('exReverse.html');
	expect(problems).toEqual([]);
});

test.describe('comparison drawing', () => {
	const draw = (page, args) => page.evaluate(a => {
		const el = window.dsvCompare.draw(...a);
		if (!el) return null;
		const side = s => {
			const box = el.querySelector(`.ex-cmp-side[data-side="${s}"]`);
			return {
				items: box.querySelectorAll('.ex-cmp-item').length,
				diff: box.querySelectorAll('.ex-cmp-item.diff').length,
				extra: box.querySelectorAll('.ex-cmp-item.extra').length,
				missing: box.querySelectorAll('.ex-cmp-item.missing').length,
				values: [...box.querySelectorAll('.ex-cmp-value')].map(v => v.textContent),
				empty: box.querySelectorAll('.ex-cmp-empty').length
			};
		};
		return { expected: side('expected'), actual: side('actual') };
	}, args);

	test('the shape of an expectation comes from the expression and the expected value', async ({ page }) => {
		const problems = await openPage(page, 'exReverse.html');
		expect(await page.evaluate(() => [
			window.dsvCompare.shape('walk(reverse(build(4)))', '4>3>2>1'),
			window.dsvCompare.shape('back(t)', '1'),
			window.dsvCompare.shape('Array.from(a)', [1, 2]),
			window.dsvCompare.shape('Array.from(p).map(function(r){ return Array.from(r); })', [[1], [2]]),
			window.dsvCompare.shape('search(7)', -1)
		])).toEqual(['list', 'list', 'array', 'grid', 'value']);
		expect(problems).toEqual([]);
	});

	test('lists: different, missing and extra nodes are marked; an empty list is "empty"', async ({ page }) => {
		const problems = await openPage(page, 'exReverse.html');
		let d = await draw(page, ['list', '4>3>2>1', '1>2>3>4', false]);
		expect(d.expected).toMatchObject({ items: 4, diff: 4 });
		expect(d.actual).toMatchObject({ items: 4, diff: 4 });
		d = await draw(page, ['list', '1>2>3', '1>2', false]);
		expect(d.expected).toMatchObject({ items: 3, missing: 1, diff: 0 });
		expect(d.actual).toMatchObject({ missing: 1 });
		d = await draw(page, ['list', '1>2', '1>2>3', false]);
		expect(d.actual).toMatchObject({ items: 3, extra: 1, diff: 0 });
		d = await draw(page, ['list', '', '1', false]);
		expect(d.expected).toMatchObject({ items: 0, empty: 1 });
		expect(d.actual).toMatchObject({ items: 1, extra: 1 });
		d = await draw(page, ['list', '1', '', false]);                           // the student's list is empty: said so
		expect(d.actual).toMatchObject({ empty: 1, missing: 1 });
		d = await draw(page, ['list', '4>3>2>1', 5, true]);                       // not a list: one value per side
		expect(d.expected.values).toEqual(['"4>3>2>1"']);
		expect(d.actual.values).toEqual(['5']);
		expect(problems).toEqual([]);
	});

	test('grids, arrays, values and the limits', async ({ page }) => {
		const problems = await openPage(page, 'exReverse.html');
		let d = await draw(page, ['grid', [[1, null], [1, 1]], [[1, 0], [1, 1]], false]);
		expect(d.expected).toMatchObject({ items: 4, diff: 1 });
		expect(d.actual).toMatchObject({ items: 4, diff: 1 });
		d = await draw(page, ['grid', [[1], [2]], [[1]], false]);
		expect(d.expected).toMatchObject({ missing: 1 });
		d = await draw(page, ['array', [3, 7, 12], [7, 3, 12], false]);
		expect(d.expected).toMatchObject({ items: 3, diff: 2 });
		d = await draw(page, ['array', [1, 2], 7, false]);                         // an array was expected, a number came
		expect(d.actual.values).toEqual(['7']);
		d = await draw(page, ['value', 9, 8, false]);
		expect(d.expected.values).toEqual(['9']);
		expect(d.actual.values).toEqual(['8']);
		expect(await draw(page, ['list', '1', undefined, false])).toBeNull();      // no value: nothing to draw
		expect(await draw(page, ['list', Array.from({ length: 51 }, (_, i) => i).join('>'), '1', false])).toBeNull();
		expect(await draw(page, ['grid', Array.from({ length: 13 }, () => [1]), [[1]], false])).toBeNull();
		expect(problems).toEqual([]);
	});
	test('a failed check draws each failing expectation under its text', async ({ page }) => {
		const problems = await openPage(page, 'exReverse.html');
		await setStudent(page, 'function reverse(head)\n{\n  return head\n}\n');
		await check(page);
		const first = page.locator('.ex-result li').first();
		await expect(first).toContainText('beklenen "4>3>2>1", senin sonucun "1>2>3>4"');   // the text stays
		await expect(first.locator('.ex-cmp-side[data-side="expected"] .ex-cmp-item.diff')).toHaveCount(4);
		await expect(first.locator('.ex-cmp-side[data-side="actual"] .ex-cmp-item.diff')).toHaveCount(4);

		await setStudent(page, 'function reverse(head)\n{\n  return 5\n}\n');                // not a list: values
		await check(page);
		await expect(page.locator('.ex-result li').first().locator('.ex-cmp-side[data-side="actual"] .ex-cmp-value')).toHaveText('5');
		expect(problems).toEqual([]);
	});

	test('arrays and grids are drawn too, and nothing hidden shows', async ({ page }) => {
		let problems = await openPage(page, 'exBubbleSort.html');
		await setStudent(page, 'function sortArray()\n{\n}\n');
		await check(page);
		const sample = page.locator('.ex-result li').first();
		await expect(sample.locator('.ex-cmp-shape-array')).toHaveCount(1);
		expect(await sample.locator('.ex-cmp-side[data-side="actual"] .ex-cmp-item.diff').count()).toBeGreaterThan(0);
		expect(problems).toEqual([]);

		problems = await openPage(page, 'exPascal.html');
		await setStudent(page, 'p[0][0] = 1\n');
		await check(page);
		await expect(page.locator('.ex-result .ex-cmp-grid')).toHaveCount(2);
		expect(await page.locator('.ex-result .ex-cmp-item.missing, .ex-result .ex-cmp-item.diff').count()).toBeGreaterThan(0);
		expect(await page.locator('.ex-result').textContent()).not.toMatch(/Array\.from|build|load\d/);
		expect(problems).toEqual([]);
	});

	test('no drawing when the student\'s function has no value to show', async ({ page }) => {
		const problems = await openPage(page, 'exMiddle.html');
		await setStudent(page, 'function middle(head)\n{\n  return head.next.next.next.next.next\n}\n');
		await check(page);
		await expect(page.locator('.ex-result.bad')).toBeVisible();
		await expect(page.locator('.ex-result .ex-compare')).toHaveCount(0);
		expect(problems).toEqual([]);
	});
});

test.describe('attempt history', () => {
	const items = page => page.locator('.ex-history .ex-hist-item');
	const kinds = page => items(page).evaluateAll(els => els.map(e => e.getAttribute('data-kind')));
	const setSetting = (page, key, value) => page.evaluate(([k, v]) => {
		const s = JSON.parse(localStorage.getItem('dsv-settings') || '{}'); s[k] = v; localStorage.setItem('dsv-settings', JSON.stringify(s));
	}, [key, value]);
	const reload = async page => { await page.reload(); await page.waitForFunction(() => window.dsvReady === true); };

	test('every check is kept, newest first; a code that does not run is kept but is not an attempt', async ({ page }) => {
		const problems = await openPage(page, 'exReverse.html');
		await expect(page.locator('.ex-history')).toBeHidden();             // nothing yet
		await check(page);                                                  // the starter fails
		await setStudent(page, 'var q = nothing\n');
		await check(page);                                                  // does not run
		await setStudent(page, solutionOf('exReverse.html'));
		await check(page);                                                  // passes
		await expect(page.locator('.ex-history summary').first()).toHaveText('Önceki denemelerim (3)');
		expect(await kinds(page)).toEqual(['pass', 'error', 'fail']);
		expect((await progress(page))['exReverse.html'].attempts).toBe(2);
		expect(problems).toEqual([]);
	});

	test('an attempt shows its code, its drawing and its first issue in the current language; its code can be loaded back', async ({ page }) => {
		const problems = await openPage(page, 'exReverse.html');
		const wrong = 'function reverse(head)\n{\n  return head\n}\n';
		await setStudent(page, wrong);
		await check(page);
		await page.locator('.ex-history > summary').click();
		const item = items(page).first();
		await expect(item.locator('summary')).toContainText('Dört düğümlü listeyi ters çevirince');
		await item.locator('summary').click();
		await expect(item.locator('pre.ex-hist-code')).toHaveText(wrong);
		await expect(item.locator('.ex-compare')).toHaveCount(1);

		await setStudent(page, 'something else\n');
		await item.locator('.ex-hist-load').click();
		expect(await page.evaluate(() => document.querySelectorAll('.CodeMirror')[1].CodeMirror.getValue())).toBe(wrong);

		await setSetting(page, 'lang', 'en');
		await reload(page);
		await expect(items(page)).toHaveCount(1);                            // kept after a reload
		await expect(items(page).first().locator('summary')).toContainText('Reversing a list of four nodes');
		expect(problems).toEqual([]);
	});

	test('an attempt written in another code language cannot be loaded, but its code is shown', async ({ page }) => {
		const problems = await openPage(page, 'exReverse.html');
		await check(page);
		await setSetting(page, 'codeLang', 'cpp');
		await reload(page);
		const item = items(page).first();
		await page.locator('.ex-history > summary').click();
		await item.locator('summary').click();
		await expect(item.locator('.ex-hist-load')).toHaveCount(0);
		await expect(item.locator('.ex-hist-lang')).toContainText('Düğüm');
		await expect(item.locator('pre.ex-hist-code')).toContainText('function reverse(head)');
		expect(problems).toEqual([]);
	});

	test('ten attempts are kept, long code is cut, the history can be cleared without touching progress', async ({ page }) => {
		const problems = await openPage(page, 'exLength.html');
		for (let k = 0; k < 11; k++) await check(page);
		await expect(items(page)).toHaveCount(10);
		await setStudent(page, solutionOf('exLength.html') + '// ' + 'x'.repeat(6000) + '\n');
		await check(page);
		const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('dsv-attempts'))['exLength.html'][0].code.length);
		expect(saved).toBe(5000);
		await page.locator('.ex-history > summary').click();
		await page.locator('.ex-hist-clear').click();
		await expect(page.locator('.ex-history')).toBeHidden();
		await expect(page.locator('.ex-status')).toHaveText('Yapıldı ✓');
		expect((await progress(page))['exLength.html'].done).toBe(true);
		expect(problems).toEqual([]);
	});

	test('a crash only on hidden inputs is a failed attempt with its error, and nothing hidden is kept', async ({ page }) => {
		const problems = await openPage(page, 'exMiddle.html');
		await setStudent(page, 'function middle(head)\n{\n  return head.next.next.next.next.next\n}\n');
		await check(page);
		expect(await kinds(page)).toEqual(['fail']);
		const stored = await page.evaluate(() => localStorage.getItem('dsv-attempts'));
		expect(stored).toContain('null');                                  // the explained null-pointer message
		expect(stored).not.toMatch(/build|walk\(|load\d/);
		expect(await page.locator('.ex-history').textContent()).not.toMatch(/build|walk\(|load\d/);
		expect(problems).toEqual([]);
	});

	test('with storage blocked the history still works during the visit', async ({ page }) => {
		await page.addInitScript(() => {
			const get = Storage.prototype.getItem, set = Storage.prototype.setItem;
			Storage.prototype.getItem = function(k){ if (k === 'dsv-attempts') throw new Error('blocked'); return get.call(this, k); };
			Storage.prototype.setItem = function(k, v){ if (k === 'dsv-attempts') throw new Error('quota'); return set.call(this, k, v); };
		});
		const problems = await openPage(page, 'exReverse.html');
		await check(page);
		await check(page);
		await expect(items(page)).toHaveCount(2);
		expect(problems).toEqual([]);
	});
});

test.describe('mistakes: review fixes', () => {
	test('a value that cannot be written as JSON (a function, a node with a cycle) still gives a result and a history entry', async ({ page }) => {
		const problems = await openPage(page, 'exReverse.html');
		await setStudent(page, 'function reverse(head)\n{\n  return reverse\n}\n');
		await check(page);
		await expect(page.locator('.ex-result.bad')).toBeVisible();
		await expect(page.locator('.ex-history .ex-hist-item')).toHaveCount(1);
		expect(problems).toEqual([]);
	});

	test('an error in a checked call keeps its explained message in the history', async ({ page }) => {
		const problems = await openPage(page, 'exMiddle.html');
		await setStudent(page, 'function middle(head)\n{\n  return head.next.next.next.next.next\n}\n');
		await check(page);
		const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('dsv-attempts'))['exMiddle.html'][0]);
		expect(JSON.stringify(stored)).toContain('pointer');                  // the explained null-pointer message
		await page.locator('.ex-history > summary').click();
		await page.locator('.ex-hist-item summary').first().click();
		await expect(page.locator('.ex-hist-item').first()).toContainText('pointer');
		expect(problems).toEqual([]);
	});

	test('a null result is drawn like any other value', async ({ page }) => {
		const problems = await openPage(page, 'exStack.html');
		await check(page);                                                  // the starter's pop() returns null
		const first = page.locator('.ex-result li').first();
		await expect(first.locator('.ex-cmp-side[data-side="expected"] .ex-cmp-value')).toHaveText('3');
		await expect(first.locator('.ex-cmp-side[data-side="actual"] .ex-cmp-value')).toHaveText('null');
		expect(problems).toEqual([]);
	});

	test('broken history entries do not stop the exercise', async ({ page }) => {
		await page.addInitScript(() => localStorage.setItem('dsv-attempts', JSON.stringify({ 'exLength.html': [null, { results: 'x' }, { results: [null], kind: 'fail', code: 'a' }, 5,
			{ t: '2026-11-13T10:00:00Z', lang: 'dugum', code: 'print 1\n', kind: 'fail', error: null, results: [] }] })));
		const problems = await openPage(page, 'exLength.html');
		await check(page);
		await expect(page.locator('.ex-result.bad')).toBeVisible();
		expect(await page.locator('.ex-history .ex-hist-item').count()).toBeGreaterThan(1);
		expect(problems).toEqual([]);
	});

	test('on a phone long values and long result lines stay inside the page', async ({ page }) => {
		await page.setViewportSize({ width: 390, height: 900 });
		const problems = await openPage(page, 'exReverse.html');
		await setStudent(page, 'function reverse(head)\n{\n  var p = head\n  while(p.next != null)\n  {\n    p = p.next\n  }\n  p.next = head\n  return head\n}\n');   // a cycle: a 50-node text
		await check(page);
		expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
		const box = await page.evaluate(() => {
			const el = window.dsvCompare.draw('value', 3, { data: 1, next: { data: 2, next: { data: 3, next: null } }, note: 'x'.repeat(80) }, false).querySelector('[data-side="actual"] .ex-cmp-value');
			document.querySelector('.exercise-panel').appendChild(el);
			return { scroll: el.scrollHeight, client: el.clientHeight };
		});
		expect(box.scroll).toBeLessThanOrEqual(box.client + 1);               // the text fits its box
		expect(problems).toEqual([]);
	});
});
