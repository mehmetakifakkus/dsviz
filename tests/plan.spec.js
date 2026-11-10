// Lesson plans: the teacher's builder (teacher.html), the student's plan page (plan.html) and the
// plan bar on the pages. The plan lives in the link.
const { test } = require('@playwright/test');
const { expect, runBlock } = require('./helpers');

// the pages of a plan have no code: they never set dsvReady, so they are opened and waited for here
async function openPlain(page, url) {
	const problems = [];
	page.on('pageerror', e => problems.push('page error: ' + e.message));
	page.on('console', m => { if (m.type() === 'error' && !/willReadFrequently/.test(m.text())) problems.push('console: ' + m.text()); });
	await page.addInitScript(() => localStorage.setItem('dsv-tour-done', '1'));
	await page.goto(url);
	await page.waitForSelector('#plan-app > *', { state: 'attached' });
	return problems;
}
async function openLesson(page, url) {
	const problems = [];
	page.on('pageerror', e => problems.push('page error: ' + e.message));
	page.on('console', m => { if (m.type() === 'error' && !/willReadFrequently/.test(m.text())) problems.push('console: ' + m.text()); });
	await page.addInitScript(() => localStorage.setItem('dsv-tour-done', '1'));
	await page.goto(url);
	await page.waitForFunction(() => window.dsvReady === true);
	return problems;
}
const planLink = (plan, extra = '') => '/plan.html#plan=' + Buffer.from(JSON.stringify(plan)).toString('base64url') + extra;

test('the builder: pages added, moved, noted and removed; the link carries the plan', async ({ page }) => {
	const problems = await openPlain(page, '/teacher.html');
	await expect(page.locator('#tp-copy')).toBeDisabled();             // an empty plan has no link
	await expect(page.locator('.tp-empty')).toBeVisible();

	await page.locator('#tp-catalog details').filter({ hasText: 'Yığın ve kuyruk' }).locator('summary').click();
	await page.locator('[data-add="stack.html"]').click();
	await page.locator('[data-add="queue.html"]').click();
	await expect(page.locator('[data-add="stack.html"]')).toBeDisabled(); // a page is added once
	await expect(page.locator('.tp-item')).toHaveCount(2);

	await page.locator('[data-down="0"]').click();                      // queue first
	await expect(page.locator('.tp-item .tp-name').first()).toHaveText('Kuyruk (queue): enqueue ve dequeue');
	await page.locator('.tp-note[data-note="0"]').fill('Önce kuyruğa bakın.');
	await page.fill('[data-field=title]', 'Hafta 3');
	await page.selectOption('[data-field=code]', 'java');
	await page.check('[data-field=lesson]');

	const state = await page.evaluate(() => window.dsvTeacherState());
	expect(state).toEqual({ t: 'Hafta 3', d: '', items: [{ file: 'queue.html', note: 'Önce kuyruğa bakın.' }, { file: 'stack.html', note: '' }], c: 'java', m: 1 });
	const link = await page.inputValue('#tp-link');
	expect(link).toMatch(/\/plan\.html#plan=[A-Za-z0-9_-]+&c=java$/);

	await page.locator('[data-remove="1"]').click();
	await expect(page.locator('.tp-item')).toHaveCount(1);
	await expect(page.locator('[data-add="stack.html"]')).toBeEnabled();

	// a ready-made plan fills the list, the title and the introduction
	await page.fill('[data-field=title]', '');
	await page.locator('.tp-chip').filter({ hasText: 'Graflar' }).click();
	await expect(page.locator('.tp-item')).toHaveCount(8);
	await expect(page.locator('[data-field=title]')).toHaveValue('Graflar');

	// the draft is kept; the link opens the plan again for editing
	await page.reload();
	await page.waitForSelector('.tp-item');
	await expect(page.locator('.tp-item')).toHaveCount(8);
	await page.goto(link);
	await page.goto(link.replace('/plan.html', '/teacher.html'));
	await expect(page.locator('.tp-loaded')).toBeVisible();
	await expect(page.locator('[data-field=title]')).toHaveValue('Hafta 3');
	expect(problems).toEqual([]);
});

test('the plan page lists the pages with notes, marks what was done and goes on where the student stopped', async ({ page }) => {
	const plan = { v: 1, t: 'Hafta 3', d: 'Bu hafta yığın ve kuyruk.', i: [['stack.html', 'Önce yığın.'], ['queue.html'], ['recursion.html', 'Son olarak özyineleme.']], c: 'cpp', m: 0 };
	const problems = await openPlain(page, planLink(plan, '&c=cpp'));
	await expect(page.locator('main.lesson h1')).toHaveText('Hafta 3');
	await expect(page.locator('#pp-intro')).toHaveText('Bu hafta yığın ve kuyruk.');
	await expect(page.locator('.pp-item')).toHaveCount(3);
	await expect(page.locator('.pp-item').first().locator('.pp-note')).toHaveText('Önce yığın.');
	await expect(page.locator('#pp-progress')).toHaveText('0 / 3 ders yapıldı');
	await expect(page.locator('#pp-start')).toHaveText('Başla');

	// the first page: plan bar, the teacher's note, the plan's code language, the next page of the plan
	await page.click('#pp-start');
	await page.waitForFunction(() => window.dsvReady === true);
	await expect(page).toHaveURL(/\/stack\.html#plan=/);
	await expect(page.locator('.plan-bar .plan-count')).toHaveText('1 / 3');
	await expect(page.locator('.plan-note')).toContainText('Önce yığın.');
	await expect(page.locator('.code-label').first()).toHaveText('Blok 1 · C++');
	await expect(page.locator('.pager a')).toHaveCount(1);               // the plan's own "next", not the site's previous / next

	await runBlock(page, 0);                                             // running a block counts the page as done
	await page.click('.plan-bar .plan-next');
	await page.waitForFunction(() => window.dsvReady === true);
	await expect(page).toHaveURL(/\/queue\.html#plan=/);
	await expect(page.locator('.plan-bar .plan-count')).toHaveText('2 / 3');
	await expect(page.locator('.plan-note')).toHaveCount(0);             // no note for this page

	await page.click('.plan-bar .plan-name');                            // back to the plan
	await page.waitForSelector('.pp-item');
	await expect(page.locator('#pp-progress')).toHaveText('1 / 3 ders yapıldı');
	await expect(page.locator('.pp-item').first()).toHaveClass(/done/);
	await expect(page.locator('#pp-start')).toHaveText('Devam et');
	await expect(page.locator('#pp-start')).toHaveAttribute('href', /^queue\.html#plan=/); // the first one not done yet
	expect(problems).toEqual([]);
});

test('a plan can open the pages in lesson mode, and the last page leads back to the plan', async ({ page }) => {
	const plan = { v: 1, t: 'Kısa', d: '', i: [['stack.html'], ['queue.html']], c: '', m: 1 };
	const problems = await openLesson(page, planLink(plan).replace('/plan.html', '/stack.html') + '&i=0');
	await expect(page.locator('html')).toHaveClass(/lesson-mode/);       // the plan asked for it, the student's setting is untouched
	expect(await page.evaluate(() => window.dsv.settings.lessonMode)).toBe(false);
	await expect(page.locator('.plan-bar')).toBeVisible();               // the bar stays while the parts change
	await page.locator('.lesson-next').click();
	await expect(page.locator('.plan-bar')).toBeVisible();

	await page.goto(planLink(plan).replace('/plan.html', '/queue.html') + '&i=1');
	await page.waitForFunction(() => window.dsvReady === true);
	await expect(page.locator('.plan-bar .plan-next')).toHaveText('Planı bitir');
	await expect(page.locator('.plan-bar .plan-next')).toHaveAttribute('href', /^plan\.html#plan=/);
	expect(problems).toEqual([]);
});

test('the teacher\'s texts are only text; unknown pages are dropped; a broken link says so', async ({ page }) => {
	const evil = '<img src=x onerror="window.pwned=1"><b>kalın</b>';
	const plan = { v: 1, t: evil, d: evil, i: [['stack.html', evil], ['https://evil.example/x.html', 'x'], ['nope.html'], ['../index.html']], c: 'java', m: 0 };
	const problems = await openPlain(page, planLink(plan));
	await expect(page.locator('main.lesson h1')).toHaveText(evil);       // shown as it is, not as HTML
	await expect(page.locator('.pp-item')).toHaveCount(1);               // only the page of this site stays
	await expect(page.locator('.pp-note')).toHaveText(evil);
	await expect(page.locator('.pp-meta.tp-warn')).toContainText('3 sayfa');
	expect(await page.evaluate(() => window.pwned)).toBeUndefined();
	expect(await page.locator('#plan-app img, main.lesson img').count()).toBe(0);

	for (const bad of ['/plan.html', '/plan.html#plan=!!!', '/plan.html#plan=' + Buffer.from('not json').toString('base64url'), '/plan.html#plan=' + Buffer.from('{"i":5}').toString('base64url')]) {
		await page.goto(bad);
		await page.waitForSelector('#pp-empty');
		await expect(page.locator('main.lesson h1')).toHaveText('Ders planı bulunamadı');
	}
	expect(problems).toEqual([]);
});

test('sharing code from a plan page keeps the plan; the other languages have the texts too', async ({ page, context }) => {
	await context.grantPermissions(['clipboard-read', 'clipboard-write']);
	const plan = { v: 1, t: 'Plan', d: '', i: [['stack.html'], ['queue.html']], c: '', m: 0 };
	const problems = await openLesson(page, planLink(plan).replace('/plan.html', '/stack.html') + '&i=0');
	await page.evaluate(() => { const cm = document.querySelectorAll('.CodeMirror')[2].CodeMirror; cm.setValue(cm.getValue() + 'print 99\n'); });
	await page.locator('.dsv-share').first().click();
	const url = await page.evaluate(() => navigator.clipboard.readText());
	expect(url).toMatch(/#plan=[A-Za-z0-9_-]+&i=0&b3=/);                  // the plan, then the changed block
	await page.goto('/queue.html');                                       // another page first: a link that differs only in its # does not reload
	await page.goto(url);
	await page.waitForFunction(() => window.dsvReady === true);
	await expect(page.locator('.plan-bar .plan-count')).toHaveText('1 / 2');
	await expect(page.locator('.share-banner')).toBeVisible();
	await page.locator('.share-banner .link-btn').click();               // restoring the page's code keeps the plan in the address
	expect(page.url()).toMatch(/#plan=[A-Za-z0-9_-]+&i=0/);
	expect(page.url()).not.toMatch(/b3=/);

	// English and German: the interface of both plan pages
	for (const [lang, h1] of [['en', 'Make a lesson plan'], ['de', 'Unterrichtsplan erstellen']]) {
		await page.evaluate(l => localStorage.setItem('dsv-settings', JSON.stringify({ lang: l })), lang);
		await page.goto('/teacher.html');
		await page.waitForSelector('.tp-chip');
		await expect(page.locator('main.lesson h1')).toHaveText(h1);
	}
	expect(problems).toEqual([]);
});
