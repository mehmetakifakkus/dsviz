// Shared helpers for the browser tests.
const { expect } = require('@playwright/test');

// Opens a page, records page errors, console errors and requests that leave the site,
// and waits until the engine has compiled the grammar. settings (e.g. {lang: 'en'}) are
// stored before the page loads, as if the user had chosen them in the settings panel.
async function openPage(page, file, settings) {
	const problems = [];
	page.on('pageerror', e => problems.push('page error: ' + e.message));
	page.on('console', m => {
		// paper.js measures text with getImageData; Chrome prints a performance hint for it
		if (m.type() === 'error' && !/willReadFrequently/.test(m.text()))
			problems.push('console: ' + m.text());
	});
	page.on('response', r => { if (r.status() >= 400) problems.push(r.status() + ' ' + r.url()); });
	await page.route(url => !/^https?:\/\/localhost[:/]/.test(url.href), route => {
		problems.push('external request: ' + route.request().url()); // the site must work offline
		return route.abort();
	});

	// the introduction tour of a first visit would cover the page: the tests are not first visits
	// (except the tour's own test, which passes {tour: true})
	const tour = settings && settings.tour;
	if (settings) settings = Object.fromEntries(Object.entries(settings).filter(([k]) => k !== 'tour'));
	if (!tour)
		await page.addInitScript(() => localStorage.setItem('dsv-tour-done', '1'));
	if (settings && Object.keys(settings).length)
		await page.addInitScript(s => {
			if (!sessionStorage.getItem('dsv-test-settings')) { // only once: a reload keeps what the page saved
				sessionStorage.setItem('dsv-test-settings', '1');
				localStorage.setItem('dsv-settings', JSON.stringify(s));
			}
		}, settings);
	await page.goto('/' + file);
	await page.waitForFunction(() => window.dsvReady === true);
	return problems;
}

// Plays the animation to the end. The check and the click happen in one go inside the
// page: a short animation can finish (and disable the button) between two separate calls.
async function skipToEnd(page) {
	await page.evaluate(() => {
		const button = document.querySelector('.dsv-player button[title="' + window.dsv.t('toEnd') + '"]');
		if (button && !button.disabled)
			button.click();
	});
}

// Runs code block i with its Çalıştır button and skips the animation.
async function runBlock(page, i) {
	await page.locator('button.dsv-run').nth(i).click();
	await skipToEnd(page);
}

async function runAllBlocks(page) {
	const n = await page.locator('button.dsv-run').count();
	for (let i = 0; i < n; i++)
		await runBlock(page, i);
	return n;
}

// Runs code without an editor (like the command prompt does) and skips the animation.
async function runCode(page, blocks) {
	await page.evaluate(list => {
		for (const code of list) {
			window.activeEditor = null;
			window.parse(code);
		}
	}, [].concat(blocks));
	await skipToEnd(page);
}

// Evaluates an expression in the page; walk(head) lists a list forwards ("1>2>3"),
// back(tail) backwards through prev. Returns the value as plain JSON.
function valueOf(page, expression) {
	return page.evaluate(expr => {
		const walk = (h, field) => { const out = []; for (let n = h; n && out.length < 50; n = n[field || 'next']) out.push(n.data); return out.join('>'); };
		const back = h => walk(h, 'prev');
		const output = () => document.getElementById('output').textContent.trim().split('\n').filter(Boolean).join(',');
		void walk; void back; void output;
		return JSON.parse(JSON.stringify(eval(expr), (k, v) => v === undefined ? null : v));
	}, expression);
}

const outputText = page => page.evaluate(() => document.getElementById('output').textContent);
const stepCounter = async page => {
	const m = (await page.locator('.dsv-counter').textContent()).match(/(\d+) \/ (\d+)/);
	return { current: +m[1], total: +m[2] };
};

module.exports = { expect, openPage, skipToEnd, runBlock, runAllBlocks, runCode, valueOf, outputText, stepCounter };
