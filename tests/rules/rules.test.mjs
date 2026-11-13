// firestore.rules on the Firestore emulator: npm run test:rules
// (firebase emulators:exec starts the emulator, runs this file with node:test, and stops it)
import { test, before, after, beforeEach } from 'node:test';
import { readFileSync } from 'node:fs';
import { initializeTestEnvironment, assertSucceeds, assertFails } from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, updateDoc, deleteDoc, collection, getDocs, addDoc, query, where } from 'firebase/firestore';

let env;
before(async () => {
	env = await initializeTestEnvironment({ projectId: 'demo-dsviz', firestore: { rules: readFileSync('firestore.rules', 'utf8'), host: '127.0.0.1', port: 8080 } });
});
after(async () => { await env.cleanup(); });
beforeEach(async () => { await env.clearFirestore(); });

const teacher = () => env.authenticatedContext('T1', { email: 't@okul.tr', email_verified: true }).firestore();
const otherTeacher = () => env.authenticatedContext('T2', { email: 'x@okul.tr', email_verified: true }).firestore();
const unverified = () => env.authenticatedContext('T3', { email: 'u@okul.tr', email_verified: false }).firestore();
const student = uid => env.authenticatedContext(uid, { firebase: { sign_in_provider: 'anonymous' } }).firestore();
const nobody = () => env.unauthenticatedContext().firestore();
const CLASS = { name: 'Sınıf A', ownerUid: 'T1', plan: 'PLAN', open: true, createdAt: '2026-11-13T10:00:00Z' };
const ATTEMPT = { file: 'exReverse.html', t: '2026-11-13T10:00:00Z', lang: 'dugum', code: 'print 1', kind: 'fail', error: null, results: '[]' };

async function seedClass(extra = {}) {
	await env.withSecurityRulesDisabled(async ctx => { await setDoc(doc(ctx.firestore(), 'classes/ABC234'), Object.assign({}, CLASS, extra)); });
}
async function seedStudent(uid = 'S1') {
	await env.withSecurityRulesDisabled(async ctx => { await setDoc(doc(ctx.firestore(), `classes/ABC234/students/${uid}`), { nick: 'Ayşe', joinedAt: 'x', updatedAt: 'x', progress: {} }); });
}

test('a verified teacher opens a class as its owner; others cannot', async () => {
	await assertSucceeds(setDoc(doc(teacher(), 'classes/ABC234'), CLASS));
	await assertFails(setDoc(doc(unverified(), 'classes/ABC235'), Object.assign({}, CLASS, { ownerUid: 'T3' })));
	await assertFails(setDoc(doc(teacher(), 'classes/ABC236'), Object.assign({}, CLASS, { ownerUid: 'T2' })));
	await assertFails(setDoc(doc(student('S1'), 'classes/ABC237'), Object.assign({}, CLASS, { ownerUid: 'S1' })));
	await assertFails(setDoc(doc(teacher(), 'classes/ABC238'), Object.assign({}, CLASS, { extra: 1 })));
	await assertFails(setDoc(doc(teacher(), 'classes/ABC239'), Object.assign({}, CLASS, { open: 'yes' })));
});

test('anyone signed in reads a class; only its owner changes or deletes it', async () => {
	await seedClass();
	await assertSucceeds(getDoc(doc(student('S1'), 'classes/ABC234')));
	await assertFails(getDoc(doc(nobody(), 'classes/ABC234')));
	await assertSucceeds(getDocs(query(collection(teacher(), 'classes'), where('ownerUid', '==', 'T1'))));
	await assertSucceeds(updateDoc(doc(teacher(), 'classes/ABC234'), { open: false }));
	await assertFails(updateDoc(doc(teacher(), 'classes/ABC234'), { ownerUid: 'T2' }));
	await assertFails(updateDoc(doc(otherTeacher(), 'classes/ABC234'), { open: true }));
	await assertFails(deleteDoc(doc(otherTeacher(), 'classes/ABC234')));
	await assertSucceeds(deleteDoc(doc(teacher(), 'classes/ABC234')));
});

test('a student joins only an open class, as themself, with a nickname of 1 to 30 characters', async () => {
	await seedClass();
	const me = { nick: 'Ayşe', joinedAt: 'x', updatedAt: 'x', progress: {} };
	await assertSucceeds(setDoc(doc(student('S1'), 'classes/ABC234/students/S1'), me));
	await assertFails(setDoc(doc(student('S1'), 'classes/ABC234/students/S2'), me));
	await assertFails(setDoc(doc(student('S3'), 'classes/ABC234/students/S3'), Object.assign({}, me, { nick: '' })));
	await assertFails(setDoc(doc(student('S3'), 'classes/ABC234/students/S3'), Object.assign({}, me, { nick: 'x'.repeat(31) })));
	await assertFails(setDoc(doc(student('S4'), 'classes/NOPE22/students/S4'), me));
	await env.withSecurityRulesDisabled(async ctx => { await updateDoc(doc(ctx.firestore(), 'classes/ABC234'), { open: false }); });
	await assertFails(setDoc(doc(student('S5'), 'classes/ABC234/students/S5'), me));
});

test('attempts: only the student writes them, only while their record exists, never changed afterwards', async () => {
	await seedClass();
	await seedStudent('S1');
	const mine = collection(student('S1'), 'classes/ABC234/students/S1/attempts');
	const ref = await assertSucceeds(addDoc(mine, ATTEMPT));
	await assertFails(addDoc(collection(student('S2'), 'classes/ABC234/students/S1/attempts'), ATTEMPT));
	await assertFails(addDoc(mine, Object.assign({}, ATTEMPT, { code: 'x'.repeat(5001) })));
	await assertFails(addDoc(mine, Object.assign({}, ATTEMPT, { kind: 'cheat' })));
	await assertFails(updateDoc(doc(student('S1'), ref.path), { kind: 'pass' }));
	await assertSucceeds(updateDoc(doc(student('S1'), 'classes/ABC234/students/S1'), { progress: { 'exReverse.html': { done: true, attempts: 2 } }, updatedAt: 'y' }));
	await assertFails(updateDoc(doc(student('S1'), 'classes/ABC234/students/S1'), { nick: 'x'.repeat(31) }));
});

test('reading: the student and the owner; not another student, not another teacher', async () => {
	await seedClass();
	await seedStudent('S1');
	await assertSucceeds(getDoc(doc(student('S1'), 'classes/ABC234/students/S1')));
	await assertSucceeds(getDoc(doc(teacher(), 'classes/ABC234/students/S1')));
	await assertSucceeds(getDocs(collection(teacher(), 'classes/ABC234/students')));
	await assertSucceeds(getDocs(collection(teacher(), 'classes/ABC234/students/S1/attempts')));
	await assertFails(getDoc(doc(student('S2'), 'classes/ABC234/students/S1')));
	await assertFails(getDocs(collection(student('S2'), 'classes/ABC234/students')));
	await assertFails(getDocs(collection(student('S2'), 'classes/ABC234/students/S1/attempts')));
	await assertFails(getDoc(doc(otherTeacher(), 'classes/ABC234/students/S1')));
});

test('deleting: the owner or the student; once the owner removed the student, the student cannot write again', async () => {
	await seedClass();
	await seedStudent('S1');
	await seedStudent('S2');
	await assertFails(deleteDoc(doc(student('S2'), 'classes/ABC234/students/S1')));
	await assertSucceeds(deleteDoc(doc(student('S2'), 'classes/ABC234/students/S2')));
	await assertSucceeds(deleteDoc(doc(teacher(), 'classes/ABC234/students/S1')));
	await assertFails(addDoc(collection(student('S1'), 'classes/ABC234/students/S1/attempts'), ATTEMPT));
	await assertFails(updateDoc(doc(student('S1'), 'classes/ABC234/students/S1'), { updatedAt: 'z' }));
});

test("the class list: only one's own classes; a class is read one at a time by code", async () => {
	await seedClass();
	await assertFails(getDocs(collection(student('S9'), 'classes')));                                   // nobody lists every class
	await assertFails(getDocs(query(collection(otherTeacher(), 'classes'), where('ownerUid', '==', 'T1'))));
	await assertSucceeds(getDocs(query(collection(teacher(), 'classes'), where('ownerUid', '==', 'T1'))));
	await assertSucceeds(getDoc(doc(student('S9'), 'classes/ABC234')));
});

test('a deleted class takes no more attempts; fields are typed and bounded', async () => {
	await seedClass();
	await seedStudent('S1');
	const mine = collection(student('S1'), 'classes/ABC234/students/S1/attempts');
	await assertFails(addDoc(mine, Object.assign({}, ATTEMPT, { lang: 'x'.repeat(900) })));
	await assertFails(addDoc(mine, Object.assign({}, ATTEMPT, { t: 'x'.repeat(41) })));
	await assertFails(addDoc(mine, Object.assign({}, ATTEMPT, { results: '{"not":"array"}' })));
	await assertFails(updateDoc(doc(student('S1'), 'classes/ABC234/students/S1'), { updatedAt: 'x'.repeat(41) }));
	await assertSucceeds(addDoc(mine, ATTEMPT));
	await env.withSecurityRulesDisabled(async ctx => { await deleteDoc(doc(ctx.firestore(), 'classes/ABC234')); });
	await assertFails(addDoc(mine, ATTEMPT));                                                           // the student record is still there, the class is not
	await assertFails(updateDoc(doc(student('S1'), 'classes/ABC234/students/S1'), { updatedAt: 'y' }));
});
