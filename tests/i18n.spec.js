// Languages (Turkish, English, German) and the settings panel.
const { test } = require('@playwright/test');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { expect, openPage, runBlock, runCode, skipToEnd, valueOf } = require('./helpers');

const ROOT = path.resolve(__dirname, '..');
const PAGES = fs.readdirSync(ROOT).filter(f => f.endsWith('.html')).sort();

// js/i18n.js runs in a bare sandbox with just enough of a browser around it.
function loadCatalog() {
	const store = {};
	const sandbox = {
		navigator: { languages: ['tr'], language: 'tr' },
		localStorage: { getItem: k => store[k] || null, setItem: (k, v) => { store[k] = v; }, removeItem: k => { delete store[k]; } },
		document: { documentElement: { setAttribute() {}, removeAttribute() {} } },
		matchMedia: () => ({ matches: false })
	};
	sandbox.window = sandbox;
	vm.runInNewContext(fs.readFileSync(path.join(ROOT, 'js/i18n.js'), 'utf8'), sandbox);
	return sandbox.dsv;
}

test('every text exists in every language, with the same placeholders', () => {
	const dsv = loadCatalog();
	expect(dsv.LANGS).toEqual(['tr', 'en', 'de']);
	const placeholders = text => JSON.stringify(text).match(/\{\w+\}/g)?.sort() || [];
	const problems = [];
	for (const [key, entry] of Object.entries(dsv.TEXT)) {
		for (const lang of dsv.LANGS) {
			const text = entry[lang];
			if (text === undefined || text === '' || (Array.isArray(text) && text.length !== entry.tr.length))
				problems.push(`${key}.${lang} is missing`);
			else if (JSON.stringify(placeholders(text)) !== JSON.stringify(placeholders(entry.tr)))
				problems.push(`${key}.${lang} has other placeholders than ${key}.tr`);
		}
	}
	expect(problems).toEqual([]);
});

test('every page has its content in English and German', () => {
	const problems = [];
	for (const file of PAGES) {
		const html = fs.readFileSync(path.join(ROOT, file), 'utf8');
		const main = html.slice(html.indexOf('<main'), html.indexOf('</main>'));
		const count = lang => (main.match(new RegExp(`<(?!script)\\w+[^>]*data-lang="${lang}"`, 'g')) || []).length;
		const tr = count('tr');
		if (tr === 0) problems.push(`${file}: no data-lang="tr" content`);
		for (const lang of ['en', 'de'])
			if (count(lang) !== tr) problems.push(`${file}: ${count(lang)} ${lang} elements for ${tr} tr elements`);
		// code variants: one per language, only for blocks that exist
		const variants = [...main.matchAll(/class="code-variant" data-for="(\w+)" data-lang="(\w+)"/g)];
		for (const [, block, lang] of variants)
			if (!main.includes(`id="${block}"`)) problems.push(`${file}: ${lang} variant for a missing block ${block}`);
		const per = lang => variants.filter(v => v[2] === lang).map(v => v[1]).sort().join();
		if (per('en') !== per('de')) problems.push(`${file}: en and de code variants differ (${per('en')} / ${per('de')})`);
	}
	expect(problems).toEqual([]);
});

test('the browser language is used when nothing is saved', async ({ browser }) => {
	for (const [locale, lang, run] of [['de-DE', 'de', 'Ausführen'], ['en-US', 'en', 'Run'], ['fr-FR', 'en', 'Run'], ['tr-TR', 'tr', 'Çalıştır']]) {
		const context = await browser.newContext({ locale });
		const page = await context.newPage();
		const problems = await openPage(page, 'reverseALinkedList.html');
		expect(await page.evaluate(() => document.documentElement.lang)).toBe(lang);
		await expect(page.locator('button.dsv-run').first()).toHaveText(run);
		expect(problems).toEqual([]);
		await context.close();
	}
});

test('choosing a language in the settings panel reloads the page in that language', async ({ page }) => {
	const problems = await openPage(page, 'stack.html');
	await expect(page.locator('main.lesson h1')).toHaveText('Yığın (stack)');

	await page.locator('.topbar .settings-btn').click();
	await Promise.all([page.waitForEvent('load'), page.locator('#settings-panel select[name=lang]').selectOption('en')]);
	await page.waitForFunction(() => window.dsvReady === true);

	await expect(page.locator('main.lesson h1')).toHaveText('Stack');
	await expect(page.locator('main.lesson p.lead')).toHaveText(/^Run the blocks in order\./);
	await expect(page.locator('main.lesson [data-lang]')).toHaveCount(4); // h1 and three paragraphs, Turkish and German removed
	await expect(page.locator('.topbar .menu-btn')).toHaveText('Examples');
	expect(await page.title()).toBe('Stack | Linked Lists');

	// the code blocks show the English variant, and it runs
	await runBlock(page, 0);
	expect(await valueOf(page, 'walk(topNode)')).toBe('3>2>1');
	await expect(page.locator('#narration')).toHaveText('Condition i <= 3 is false: the loop ends.');

	// the choice is remembered
	await page.goto('/queue.html');
	await page.waitForFunction(() => window.dsvReady === true);
	await expect(page.locator('button.dsv-run').first()).toHaveText('Run');
	expect(problems).toEqual([]);
});

test('German interface, narration and error messages', async ({ page }) => {
	const problems = await openPage(page, 'index.html', { lang: 'de' });
	await expect(page.locator('main.lesson h1')).toHaveText('Verkettete Listen');
	await expect(page.locator('.dsv-player button').first()).toHaveAttribute('title', 'Schritt zurück');

	await runCode(page, 'var x = new Node(1)\nx.next = new Node(2)\nx = new Node(9)\n');
	await expect(page.locator('#narration .narration-warning')).toContainText('mehr erreichbar');

	await runCode(page, 'var p = null\np.next = x\n');
	await expect(page.locator('#output')).toContainText('null');
	await expect(page.locator('#output')).not.toContainText('Satır');
	expect(problems).toEqual([]);
});

test('settings: narration and warnings can be switched off, speed and font size apply', async ({ page }) => {
	const problems = await openPage(page, 'index.html');
	await page.locator('.topbar .settings-btn').click();
	const panel = page.locator('#settings-panel');

	await panel.locator('[name=narration]').uncheck();
	await panel.locator('[name=warnings]').uncheck();
	await panel.locator('[name=speed]').selectOption('4');
	await panel.getByText('Çok büyük', { exact: true }).click();
	await page.keyboard.press('Escape');

	await runCode(page, 'var x = new Node(1)\nx = new Node(9)\n');
	await expect(page.locator('#narration')).toHaveText('');
	expect(await page.locator('.dsv-speed input').first().inputValue()).toBe('4');
	expect(await page.evaluate(() => document.documentElement.getAttribute('data-font'))).toBe('xlarge');
	expect(await page.evaluate(() => getComputedStyle(document.querySelector('.CodeMirror')).fontSize)).toBe('18px');

	// remembered after a reload, and "reset" brings the defaults back but keeps the language
	await page.reload();
	await page.waitForFunction(() => window.dsvReady === true);
	expect(await page.evaluate(() => window.dsv.settings)).toMatchObject({ narration: false, warnings: false, speed: 4, fontSize: 'xlarge' });
	await page.locator('.topbar .settings-btn').click();
	await panel.locator('[name=reset]').click();
	expect(await page.evaluate(() => window.dsv.settings)).toMatchObject({ lang: 'tr', narration: true, warnings: true, fontSize: 'normal' });
	await expect(panel.locator('[name=narration]')).toBeChecked();

	await runCode(page, 'var y = new Node(2)\n');
	await skipToEnd(page);
	await expect(page.locator('#narration')).not.toHaveText('');
	expect(problems).toEqual([]);
});
