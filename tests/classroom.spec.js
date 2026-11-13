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
