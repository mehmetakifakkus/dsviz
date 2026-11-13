// The classroom: teachers open classes, students join with a nickname and their exercise checks reach
// the teacher. The browser tests use the fake backend of js/classroom.js (window.dsvClassroomFake = true),
// which keeps its data in localStorage and applies the same permissions as firestore.rules (those rules are
// tested on the Firestore emulator: npm run test:rules). The REST backend's requests are checked with
// page.route, without a real Firebase.
const { test } = require('@playwright/test');
const { expect } = require('./helpers');

const RECORD = { t: '2026-11-13T10:00:00.000Z', lang: 'dugum', code: 'function reverse(head)\n{\n  return head\n}\n', kind: 'fail', error: null,
	results: [{ i: 0, label: 'Dört düğümlü listeyi ters çevirince', expected: '4>3>2>1', actual: '1>2>3>4', shape: 'list', nonList: false }] };

// a page with the data layer only (plan.html is a plain page: no drawing engine)
async function layer(page, { fake = true, config = null } = {}) {
	const problems = [];
	page.on('pageerror', e => problems.push('page error: ' + e.message));
	await page.addInitScript(([fake, config]) => {
		localStorage.setItem('dsv-tour-done', '1');
		if (fake) window.dsvClassroomFake = true;
		window.__testConfig = config;
	}, [fake, config]);
	await page.goto('/plan.html');
	await page.waitForSelector('#plan-app > *', { state: 'attached' });
	await page.addScriptTag({ path: 'js/firebase-config.js' });
	await page.evaluate(() => { if (window.__testConfig) window.dsvFirebaseConfig = window.__testConfig; });
	await page.addScriptTag({ path: 'js/classroom.js' });
	return problems;
}
const call = (page, fn, ...args) => page.evaluate(([fn, args]) => window.dsvClassroom[fn](...args).then(r => ({ ok: r === undefined ? null : r }), e => ({ error: e && e.code })), [fn, args]);

test.describe('data layer', () => {
	test('a teacher needs a verified e-mail to open a class; the class gets a 6-character code', async ({ page }) => {
		const problems = await layer(page);
		expect((await call(page, 'signUp', 'ogretmen@okul.tr', 'gizli123')).ok).toMatchObject({ email: 'ogretmen@okul.tr', emailVerified: false });
		expect(await call(page, 'createClass', 'Sınıf A', 'PLAN')).toEqual({ error: 'unverified' });
		await page.evaluate(() => window.dsvClassroom._fake.verify('ogretmen@okul.tr'));
		expect((await call(page, 'refreshTeacher')).ok.emailVerified).toBe(true);
		const code = (await call(page, 'createClass', 'Sınıf A', 'PLAN')).ok;
		expect(code).toMatch(/^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{6}$/);
		expect((await call(page, 'myClasses')).ok).toEqual([expect.objectContaining({ code, name: 'Sınıf A', open: true, plan: 'PLAN' })]);
		expect(problems).toEqual([]);
	});

	async function classWithTeacher(page) {
		await call(page, 'signUp', 'ogretmen@okul.tr', 'gizli123');
		await page.evaluate(() => window.dsvClassroom._fake.verify('ogretmen@okul.tr'));
		await call(page, 'refreshTeacher');
		return (await call(page, 'createClass', 'Sınıf A', 'PLAN')).ok;
	}

	test('a student joins, sends attempts; the teacher sees them; the cloud keeps the last 10 per exercise', async ({ page }) => {
		const problems = await layer(page);
		const code = await classWithTeacher(page);
		const m = (await call(page, 'join', code, 'Ayşe')).ok;
		expect(m).toMatchObject({ code, nick: 'Ayşe', className: 'Sınıf A', plan: 'PLAN' });
		expect(await page.evaluate(() => window.dsvClassroom.membership().nick)).toBe('Ayşe');
		expect((await call(page, 'send', 'exReverse.html', RECORD, { 'exReverse.html': { done: false, attempts: 1 } })).ok).toEqual({ sent: true });
		const students = (await call(page, 'listStudents', code)).ok;
		expect(students).toEqual([expect.objectContaining({ uid: m.uid, nick: 'Ayşe', progress: { 'exReverse.html': { done: false, attempts: 1 } } })]);
		const attempts = (await call(page, 'listAttempts', code, m.uid, 'exReverse.html')).ok;
		expect(attempts[0]).toMatchObject({ file: 'exReverse.html', kind: 'fail', results: RECORD.results });
		for (let k = 0; k < 11; k++)
			await call(page, 'send', 'exReverse.html', Object.assign({}, RECORD, { t: '2026-11-13T10:' + String(10 + k) + ':00.000Z' }), {});
		expect((await call(page, 'listAttempts', code, m.uid, 'exReverse.html')).ok).toHaveLength(10);
		expect(problems).toEqual([]);
	});

	test('closing a class stops joining; a removed student is told so and forgets the class', async ({ page }) => {
		const problems = await layer(page);
		const code = await classWithTeacher(page);
		const ayse = (await call(page, 'join', code, 'Ayşe')).ok;
		await call(page, 'setOpen', code, false);
		await call(page, 'leave', false);
		expect(await call(page, 'join', code, 'Mehmet')).toEqual({ error: 'denied' });
		expect(await call(page, 'join', 'ZZZZZZ', 'Mehmet')).toEqual({ error: 'not-found' });

		await call(page, 'setOpen', code, true);
		await page.evaluate(([code]) => window.dsvClassroom._fake.becomeStudent(code, window.dsvClassroom._fake.uidOf('Ayşe')), [code]);
		await call(page, 'deleteStudent', code, ayse.uid);
		expect((await call(page, 'send', 'exReverse.html', RECORD, {})).ok).toEqual({ removed: true });
		expect(await page.evaluate(() => window.dsvClassroom.membership())).toBeNull();
		expect(problems).toEqual([]);
	});

	test('without the network an attempt waits in the queue and goes later', async ({ page }) => {
		const problems = await layer(page);
		const code = await classWithTeacher(page);
		await call(page, 'join', code, 'Ayşe');
		await page.evaluate(() => { window.dsvClassroom._fake.offline = true; });
		expect((await call(page, 'send', 'exReverse.html', RECORD, {})).ok).toEqual({ queued: true });
		expect(await page.evaluate(() => JSON.parse(localStorage.getItem('dsv-class-queue')).length)).toBe(1);
		await page.evaluate(() => { window.dsvClassroom._fake.offline = false; });
		expect((await call(page, 'flush')).ok).toEqual({ sent: true });
		expect(await page.evaluate(() => JSON.parse(localStorage.getItem('dsv-class-queue') || '[]').length)).toBe(0);
		expect(problems).toEqual([]);
	});

	test('deleting a class removes everything under it and can be run again', async ({ page }) => {
		const problems = await layer(page);
		const code = await classWithTeacher(page);
		const m = (await call(page, 'join', code, 'Ayşe')).ok;
		await call(page, 'send', 'exReverse.html', RECORD, {});
		await page.evaluate(() => { window.dsvClassroom._fake.failAfterDeletes = 1; });  // stops halfway
		expect((await call(page, 'deleteClass', code)).error).toBe('network');
		await page.evaluate(() => { window.dsvClassroom._fake.failAfterDeletes = null; });
		expect((await call(page, 'deleteClass', code)).ok).toBeNull();
		expect((await call(page, 'myClasses')).ok).toEqual([]);
		expect(await page.evaluate(([code, uid]) => JSON.stringify(window.dsvClassroom._fake.dump()).includes(code), [code, m.uid])).toBe(false);
		expect(problems).toEqual([]);
	});

	test('without a configuration the feature is off and nothing is requested', async ({ page }) => {
		const requests = [];
		page.on('request', r => { if (!/localhost/.test(r.url())) requests.push(r.url()); });
		const problems = await layer(page, { fake: false });
		expect(await page.evaluate(() => window.dsvClassroom.enabled())).toBe(false);
		expect(await call(page, 'signIn', 'a@b.c', 'x')).toEqual({ error: 'config' });
		expect(requests).toEqual([]);
		expect(problems).toEqual([]);
	});

	test('the REST backend: sign-in, class creation with typed fields, one token refresh on 401, results as a string', async ({ page }) => {
		const seen = [];
		let firstCreate = true;
		await page.route(/https:\/\/(identitytoolkit|securetoken|firestore)\.googleapis\.com\/.*/, async route => {
			const req = route.request(), url = req.url();
			const body = req.postData() || '';
			seen.push({ method: req.method(), url, body, auth: req.headers()['authorization'] || '' });
			const json = obj => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(obj) });
			if (url.includes('accounts:signInWithPassword')) return json({ idToken: 'T1', refreshToken: 'R1', expiresIn: '3600', localId: 'U1', email: 'a@b.c' });
			if (url.includes('accounts:lookup')) return json({ users: [{ localId: 'U1', email: 'a@b.c', emailVerified: true }] });
			if (url.includes('securetoken.googleapis.com')) return json({ id_token: 'T2', refresh_token: 'R2', expires_in: '3600', user_id: 'U1' });
			if (url.includes('accounts:signUp')) return json({ idToken: 'S1', refreshToken: 'SR1', expiresIn: '3600', localId: 'STU' });
			if (url.includes('/documents/classes?documentId=')) {
				if (firstCreate) { firstCreate = false; return route.fulfill({ status: 401, contentType: 'application/json', body: '{"error":{"code":401,"status":"UNAUTHENTICATED"}}' }); }
				const id = /documentId=([A-Z0-9]+)/.exec(url)[1];
				return json({ name: 'projects/p/databases/(default)/documents/classes/' + id, fields: JSON.parse(body).fields });
			}
			if (/documents\/classes\/[A-Z0-9]+$/.test(url) && req.method() === 'GET')
				return json({ name: url, fields: { name: { stringValue: 'Sınıf A' }, open: { booleanValue: true }, plan: { stringValue: 'PLAN' }, ownerUid: { stringValue: 'U1' } } });
			if (url.includes('/students?documentId=') || url.includes('/attempts')) return json({ name: 'x', fields: {} });
			if (url.includes(':runQuery')) return json([]);
			return json({});
		});
		const problems = await layer(page, { fake: false, config: { apiKey: 'k', projectId: 'p' } });
		expect((await call(page, 'signIn', 'a@b.c', 'pw')).ok).toMatchObject({ uid: 'U1', email: 'a@b.c' });
		const signIn = seen.find(s => s.url.includes('accounts:signInWithPassword'));
		expect(signIn.url).toContain('key=k');
		expect(JSON.parse(signIn.body)).toEqual({ email: 'a@b.c', password: 'pw', returnSecureToken: true });

		await call(page, 'refreshTeacher');
		const code = (await call(page, 'createClass', 'Sınıf A', 'PLAN')).ok;
		expect(code).toMatch(/^[A-Z0-9]{6}$/);
		const creates = seen.filter(s => s.url.includes('/documents/classes?documentId='));
		expect(creates.length).toBe(2);                                       // refused once, then sent again
		expect(creates[1].auth).toBe('Bearer T2');                            // with the refreshed token
		expect(seen.some(s => s.url.startsWith('https://securetoken.googleapis.com/v1/token?key=k'))).toBe(true);
		const fields = JSON.parse(creates[1].body).fields;
		expect(fields).toMatchObject({ name: { stringValue: 'Sınıf A' }, ownerUid: { stringValue: 'U1' }, open: { booleanValue: true }, plan: { stringValue: 'PLAN' } });
		expect(creates[1].url).toContain('https://firestore.googleapis.com/v1/projects/p/databases/(default)/documents/classes?documentId=' + code);

		await call(page, 'join', code, 'Ayşe');
		await call(page, 'send', 'exReverse.html', RECORD, {});
		const attempt = seen.find(s => s.url.includes('/attempts') && s.method === 'POST');
		expect(JSON.parse(attempt.body).fields.results).toEqual({ stringValue: JSON.stringify(RECORD.results) });
		expect(problems).toEqual([]);
	});
});

// ---------------------------------------------------------------- the teacher page
const PLAN = { v: 1, t: 'Hafta 5', d: '', i: [['exReverse.html'], ['stack.html'], ['exMiddle.html']], c: 'dugum', m: 0 };
const planStr = plan => Buffer.from(JSON.stringify(plan)).toString('base64url');

async function classPage(page, hash = '', { fake = true } = {}) {
	const problems = [];
	page.on('pageerror', e => problems.push('page error: ' + e.message));
	page.on('dialog', d => d.accept());
	await page.addInitScript(fake => {
		localStorage.setItem('dsv-tour-done', '1');
		localStorage.setItem('dsv-settings', JSON.stringify({ lang: 'tr' }));
		if (fake) window.dsvClassroomFake = true;
	}, fake);
	await page.goto('/class.html' + hash);
	await page.waitForSelector('#class-app > *', { state: 'attached' });
	return problems;
}
async function signedUpTeacher(page) {
	await page.fill('#cl-email', 'ogretmen@okul.tr');
	await page.fill('#cl-password', 'gizli123');
	await page.click('#cl-signup');
	await expect(page.locator('#cl-verify')).toBeVisible();
	await page.evaluate(() => window.dsvClassroom._fake.verify('ogretmen@okul.tr'));
	await page.click('#cl-recheck');
	await expect(page.locator('#cl-verify')).toBeHidden();
}

test.describe('teacher page', () => {
	test('without a configuration the page says so and asks nothing from outside', async ({ page }) => {
		const outside = [];
		page.on('request', r => { if (!/localhost/.test(r.url())) outside.push(r.url()); });
		const problems = await classPage(page, '', { fake: false });
		await expect(page.locator('.class-setup-note')).toBeVisible();
		expect(outside).toEqual([]);
		expect(problems).toEqual([]);
	});

	test('a new teacher verifies the e-mail before opening a class; the class link carries the plan and the class', async ({ page }) => {
		const problems = await classPage(page, '#plan=' + planStr(PLAN) + '&c=dugum');
		await page.fill('#cl-email', 'ogretmen@okul.tr');
		await page.fill('#cl-password', 'gizli123');
		await page.click('#cl-signup');
		await expect(page.locator('#cl-verify')).toBeVisible();
		await expect(page.locator('#cl-create')).toBeDisabled();
		await page.evaluate(() => window.dsvClassroom._fake.verify('ogretmen@okul.tr'));
		await page.click('#cl-recheck');
		await expect(page.locator('#cl-create')).toBeEnabled();
		await expect(page.locator('#cl-plan')).toHaveValue(/^plan=/);           // came from the teacher's plan page
		await page.fill('#cl-name', '10-A Veri Yapıları');
		await page.click('#cl-create');
		const link = await page.locator('#cl-view .cl-link').inputValue();
		expect(link).toMatch(/\/plan\.html#plan=[A-Za-z0-9_-]+&c=dugum&class=[A-Z0-9]{6}$/);
		await expect(page.locator('#cl-view h2')).toContainText('10-A Veri Yapıları');
		expect(problems).toEqual([]);
	});

	test('the table shows each student\'s exercises; a cell opens the attempts with their drawings', async ({ page }) => {
		const problems = await classPage(page, '#plan=' + planStr(PLAN) + '&c=dugum');
		await signedUpTeacher(page);
		await page.fill('#cl-name', 'Sınıf A');
		await page.click('#cl-create');
		const code = (await page.locator('#cl-view .cl-link').inputValue()).slice(-6);
		await page.evaluate(([code, rec]) => window.dsvClassroom.join(code, 'Ayşe').then(() => window.dsvClassroom.send('exReverse.html', rec, { 'exReverse.html': { done: false, attempts: 1 } })), [code, RECORD]);
		await page.click('#cl-refresh');
		const row = page.locator('.cl-table tbody tr').first();
		await expect(row.locator('th')).toContainText('Ayşe');
		await expect(page.locator('.cl-table thead th')).toHaveCount(3);             // the student, then the plan's two exercises (stack.html is not one)
		await expect(row.locator('td.cl-cell[data-file="exReverse.html"]')).toContainText('1');
		await expect(row.locator('td.cl-cell[data-file="exMiddle.html"]')).toHaveText('—');
		await row.locator('td.cl-cell[data-file="exReverse.html"]').click();
		const item = page.locator('#cl-attempts .ex-hist-item').first();
		await item.locator('summary').click();
		await expect(item.locator('.ex-compare')).toHaveCount(1);
		await expect(item.locator('pre.ex-hist-code')).toContainText('return head');
		expect(problems).toEqual([]);
	});

	test('closing joining, deleting a student, deleting the class (also after it stopped halfway)', async ({ page }) => {
		const problems = await classPage(page, '#plan=' + planStr(PLAN) + '&c=dugum');
		await signedUpTeacher(page);
		await page.fill('#cl-name', 'Sınıf A');
		await page.click('#cl-create');
		const code = (await page.locator('#cl-view .cl-link').inputValue()).slice(-6);
		await page.evaluate(([code, rec]) => window.dsvClassroom.join(code, 'Ayşe').then(() => window.dsvClassroom.send('exReverse.html', rec, {})), [code, RECORD]);
		await page.click('#cl-refresh');

		await page.click('#cl-toggle-open');
		await expect(page.locator('#cl-view .cl-closed')).toBeVisible();
		expect((await page.evaluate(() => window.dsvClassroom.myClasses()))[0].open).toBe(false);

		await page.locator('.cl-table tbody tr').first().locator('.cl-del-student').click();   // confirm() is accepted
		await expect(page.locator('.cl-table tbody tr')).toHaveCount(0);

		await page.evaluate(([code, rec]) => window.dsvClassroom._fake.becomeStudent(code, 'none'), [code, RECORD]);
		await page.click('#cl-delete-class');
		await expect(page.locator('#cl-confirm-delete')).toBeDisabled();
		await page.fill('#cl-confirm-code', code);
		await page.evaluate(() => { window.dsvClassroom._fake.failAfterDeletes = 0; });
		await page.click('#cl-confirm-delete');
		await expect(page.locator('#cl-msg')).toContainText('bağlan');                // could not finish: says so
		await page.evaluate(() => { window.dsvClassroom._fake.failAfterDeletes = null; });
		await page.click('#cl-confirm-delete');
		await expect(page.locator('#cl-classes .cl-class')).toHaveCount(0);
		expect(problems).toEqual([]);
	});
});
