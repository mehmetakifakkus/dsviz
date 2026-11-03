// Shared helpers for the browser tests.
const { expect } = require('@playwright/test');

// Opens a page, records page errors, console errors and requests that leave the site,
// and waits until the engine has compiled the grammar.
async function openPage(page, file) {
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

	await page.goto('/' + file);
	await page.waitForFunction(() => window.dsvReady === true);
	return problems;
}

const skipButton = page => page.locator('.dsv-player button[title="Sona atla"]');

// Plays the animation to the end (the button is disabled when there is nothing left).
async function skipToEnd(page) {
	if (await skipButton(page).isEnabled())
		await skipButton(page).click();
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
	const m = (await page.locator('.dsv-counter').textContent()).match(/Adım (\d+) \/ (\d+)/);
	return { current: +m[1], total: +m[2] };
};

module.exports = { expect, openPage, skipToEnd, runBlock, runAllBlocks, runCode, valueOf, outputText, stepCounter };
