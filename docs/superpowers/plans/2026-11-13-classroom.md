# Classroom Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Teachers (verified e-mail) open classes tied to a lesson plan; students join with a nickname from the class link; their exercise checks go to Firestore; the teacher sees a students × exercises table, opens attempts, closes joining and deletes data.

**Architecture:** One data layer `window.dsvClassroom` (`js/classroom.js`) with two backends behind the same API: a REST backend (Firebase Auth + Firestore REST, no SDK) and a fake backend (localStorage, selected by `window.dsvClassroomFake = true`) that the browser tests use. The fake enforces the same permission rules as `firestore.rules`, which are tested separately against the Firestore emulator. UI: new `class.html` + `js/class-page.js` (teacher), join box in `js/plan.js`, sending in `js/exercise.js`.

**Tech Stack:** browser JS (ES5 style, Promises allowed), Firebase Auth REST (identitytoolkit / securetoken), Firestore REST v1, `firestore.rules`; tests: Playwright (browser), `firebase emulators:exec` + `@firebase/rules-unit-testing` (rules, Node).

**Spec:** `docs/superpowers/specs/2026-11-13-classroom-design.md`

## Global Constraints

- No page makes an outside request unless the user is a teacher on `class.html`, is on the join box of `plan.html`, or has joined a class (exercise checks). `tests/pages.spec.js` stays green unchanged.
- No Firebase SDK and no outside script: REST via `fetch` only. Config in `js/firebase-config.js` (`window.dsvFirebaseConfig = {apiKey, projectId}` or `null` → the feature says it is not set up).
- Only Firestore-legal data: no nested arrays → attempt `results` stored as a JSON string field `results`.
- Students: anonymous auth + nickname (1–30 chars). Pre-join local data is never uploaded. One class per browser (`localStorage['dsv-class']`). Only exercises that are in the class's plan are sent.
- Cloud keeps the last 10 attempts per student per exercise (the student's client deletes older ones after writing). Code ≤ 5000 chars.
- Teachers: e-mail/password; creating a class requires `email_verified`.
- Strings tr/en/de in `js/i18n.js`; 390 px and dark theme; ES5 style in browser code.
- Commit footer: `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` and `Claude-Session: https://claude.ai/code/session_01GDn6v6g78qdnQxjMjZB9vR`.

## Review Focus

- A student removed by the teacher (or whose class was deleted) checks again: the write is refused, `dsv-class` and the queue are cleared, the student sees the removal message, local exercise work keeps working (test in Task 4).
- Offline or Firebase unreachable during a check: the check result and local history are unaffected, the record waits in `dsv-class-queue` and is sent at the next page load (test in Task 4).
- An expired id token (1 hour): the REST backend refreshes with the refresh token once and retries; a failed refresh signs the teacher out with a message (test in Task 1).
- Two different students on one browser: "Değiştir" leaves the class and the next nickname gets a new anonymous account and a new row (test in Task 4).
- Deleting a class with many students/attempts: everything under it is gone, and a half-finished delete can be re-run to finish (test in Task 3; rules side in Task 2).

---

### Task 1: The data layer (`js/classroom.js`) with REST and fake backends

**Files:**
- Create: `js/firebase-config.js` (`window.dsvFirebaseConfig = null;` with a comment showing the shape), `js/classroom.js`
- Test: `tests/classroom.spec.js` (describe `'data layer'`)

**Interfaces (all asynchronous methods return Promises; errors reject with `{code: 'denied'|'not-found'|'exists'|'auth'|'network'|'unverified'|'config', message}`):**
- `dsvClassroom.enabled() -> boolean` (config present or fake)
- Teacher: `signUp(email, password)`, `signIn(email, password)` → `{uid, email, emailVerified}`; `signOut()`; `resetPassword(email)`; `sendVerification()`; `refreshTeacher()` → same object (re-reads `emailVerified` via `accounts:lookup` and refreshes the token so the claim updates); `teacher()` → the stored teacher or `null` (sync).
- Classes (teacher): `createClass(name, plan)` → `code` (6 chars from `ABCDEFGHJKMNPQRSTUVWXYZ23456789`, retried on `exists`; rejects `unverified` when the e-mail is not verified); `myClasses()` → `[{code, name, open, plan, createdAt}]`; `setOpen(code, open)`; `getClass(code)` → `{code, name, open, plan}` or `null`; `deleteClass(code)` (deletes attempts, then students, then the class; idempotent).
- Teacher view: `listStudents(code)` → `[{uid, nick, progress, updatedAt}]`; `listAttempts(code, uid, file)` → records newest first (`{file, t, lang, code, kind, error, results}` with `results` parsed back); `deleteStudent(code, uid)` (attempts then the student doc).
- Student: `membership()` → `{code, uid, nick, className, plan}` or `null` (sync, from `dsv-class`); `join(code, nick)` → membership (anonymous sign-up, creates `classes/{code}/students/{uid}`; rejects `denied` when closed, `not-found` when no class); `leave(deleteMine)`; `send(file, record, progress)` → resolves `{sent: true}`, `{queued: true}` (network error), or `{removed: true}` (permission denied: clears `dsv-class` and `dsv-class-queue`); `flush()` → same result for the queue; after a successful attempt write it deletes that student's attempts for `file` beyond the newest 10.
- REST details: Auth `https://identitytoolkit.googleapis.com/v1/accounts:{signUp|signInWithPassword|sendOobCode|lookup}?key=`, token refresh `https://securetoken.googleapis.com/v1/token?key=`; Firestore `https://firestore.googleapis.com/v1/projects/{projectId}/databases/(default)/documents/...` with `Authorization: Bearer`; create with `?documentId=`, queries via `:runQuery`, typed values (`stringValue`, `integerValue` as string, `booleanValue`, `nullValue`, `mapValue`, `timestampValue`). A 401 or an `UNAUTHENTICATED` status refreshes the token once and retries.
- Storage: teacher session `localStorage['dsv-teacher']` `{uid, email, idToken, refreshToken, expires}`; student `dsv-class` `{code, uid, nick, className, plan, idToken, refreshToken, expires}`; queue `dsv-class-queue` `[{file, record, progress}]`.
- Fake backend: data in `localStorage['dsv-fake-firestore']`; applies the same permissions as `firestore.rules` (owner-only reads of students/attempts, `open` for joining, student doc must exist for attempt writes, `email_verified` for class creation; a test hook `dsvClassroom._fake.verify(email)` marks an e-mail verified and `_fake.offline = true` simulates network errors).

- [ ] **Step 1: Write failing tests** in `tests/classroom.spec.js`:
  - fake: sign up → `createClass` rejects `unverified`; after `_fake.verify` and `refreshTeacher`, `createClass('Sınıf A', '<plan>')` returns a 6-char code from the alphabet; `myClasses()` lists it.
  - fake: a student `join(code, 'Ayşe')` → membership; `send('exReverse.html', record, progress)` → `{sent: true}`; the teacher (signed in again) sees `listStudents` with `nick: 'Ayşe'` and `listAttempts` returns the record with `results` parsed; 12 sends keep 10 attempts.
  - fake: `setOpen(code, false)` → a second student's `join` rejects `denied`; `deleteStudent` → the first student's next `send` gives `{removed: true}` and `membership()` is `null`.
  - fake: with `_fake.offline = true`, `send` → `{queued: true}` and the queue has the record; back online, `flush()` → `{sent: true}` and the queue is empty.
  - REST (with `dsvFirebaseConfig = {apiKey: 'k', projectId: 'p'}` and `page.route` on the three hosts): `signIn` posts `{email, password, returnSecureToken: true}` to `accounts:signInWithPassword?key=k`; `createClass` POSTs to `.../documents/classes?documentId=XXXXXX` with typed fields `name.stringValue`, `ownerUid.stringValue`, `open.booleanValue: true`; a 401 response is followed by one call to `securetoken.googleapis.com/v1/token?key=k` and a retry with the new token; `send` writes `results` as a `stringValue`.
  - with `dsvFirebaseConfig = null` and no fake: `enabled()` is false and no request is made.
- [ ] **Step 2: Run** `npx playwright test tests/classroom.spec.js` → FAIL.
- [ ] **Step 3: Implement** `js/firebase-config.js` and `js/classroom.js` (both backends, shared interface; the REST backend's document encoding/decoding as two small functions `toFields(obj)` / `fromFields(fields)`).
- [ ] **Step 4: Run** the same → PASS.
- [ ] **Step 5: Commit** `git commit -m "Classroom: data layer (Firebase REST and a fake for tests)"`.

### Task 2: Firestore security rules, tested on the emulator

**Files:**
- Create: `firestore.rules`, `firebase.json` (`{"firestore": {"rules": "firestore.rules"}, "emulators": {"firestore": {"port": 8080}, "singleProjectMode": true}}`), `tests/rules/rules.test.mjs`
- Modify: `package.json` (devDependencies `firebase-tools`, `@firebase/rules-unit-testing`, `firebase`; script `"test:rules": "firebase emulators:exec --project demo-dsviz --only firestore \"node tests/rules/rules.test.mjs\""`), `.github/workflows/tests.yml` (a `rules` job: setup-java 21, `npm ci`, `npm run test:rules`)

**Interfaces:**
- Consumes: the data model of Task 1 (paths, fields, `results` as string).
- Produces: `firestore.rules` as the spec describes; the fake backend's permissions match it.

- [ ] **Step 1: Write failing rule tests** (`node:test` + `@firebase/rules-unit-testing`): verified teacher can create a class with `ownerUid == uid`; unverified cannot; a teacher cannot create with another `ownerUid`; anyone signed in reads a class; only the owner updates `open`/`name` or deletes; a student creates `students/{own uid}` only when the class exists and `open == true`, nick 1–30 chars; cannot create another uid's doc; attempt create only when the own student doc exists, `code` ≤ 5000, `kind` in pass/fail/error; attempts cannot be updated; another student cannot read a student doc or its attempts, the owner can, another teacher cannot; owner and the student can delete; after the owner deletes the student doc, the student's attempt create is denied.
- [ ] **Step 2: Run** `npm run test:rules` → FAIL (no rules file / rules deny everything).
- [ ] **Step 3: Write `firestore.rules`.**
- [ ] **Step 4: Run** `npm run test:rules` → PASS. If the emulator cannot run here, ledger a Ruling and keep the test file for CI.
- [ ] **Step 5: Commit** `git commit -m "Classroom: Firestore rules and their emulator tests"`.

### Task 3: The teacher page (`class.html`)

**Files:**
- Create: `class.html` (plain page like `teacher.html`: `main.lesson[data-plain]` with `#class-app`), `js/class-page.js`
- Modify: `js/layout.js` (drawer link `class.html` after the teacher link, class `drawer-class`), `js/plan.js` (teacher builder: a "Bu planla sınıf aç" link to `class.html#plan=<str>`), `js/i18n.js` (strings: sign up/in/out, reset, verify notice + resend, my classes, new class, class link, refresh, close/open joining, delete student, delete class with code confirmation, not set up), `css/app.css`
- Test: `tests/classroom.spec.js` (describe `'teacher page'`, fake backend)

**Interfaces:**
- Consumes: `dsvClassroom` (Task 1), `dsvCompare.draw` and the history item look from `js/exercise.js` (extract the attempt item renderer into `window.dsvAttemptView(record, labelOf) -> HTMLElement` in `js/exercise-compare.js` so both pages share it).
- Produces: student link format `plan.html#plan=<str>&class=<CODE>` (plus `&c=<lang>` when the plan has one).

- [ ] **Step 1: Write failing tests:** not set up (no config, no fake) → `.class-setup-note`; sign up → verify notice, "create" disabled; after `_fake.verify` + "Yeniden kontrol et" the form works; creating with a plan coming from `class.html#plan=…` shows the student link containing `&class=`; with a joined student who sent attempts, the table has the student row and a ✓ / attempt count in the exercise column; clicking a cell shows the attempt with `.ex-compare`; "Katılımı kapat" sets `open: false`; "Öğrenciyi sil" removes the row; "Sınıfı sil" needs the code typed and removes the class from "Sınıflarım"; a re-run of `deleteClass` after a simulated failure halfway finishes the job.
- [ ] **Step 2: Run** `-g "teacher page"` → FAIL.
- [ ] **Step 3: Implement** the page, the shared attempt view, the links.
- [ ] **Step 4: Run** → PASS; `tests/plan.spec.js` and `tests/ui.spec.js` still pass (drawer count rule: `examples + 3` links).
- [ ] **Step 5: Commit** `git commit -m "Classroom: the teacher page"`.

### Task 4: Students join and send

**Files:**
- Modify: `js/plan.js` (plan page: when `class=` is in the hash and the browser is not a member of that class: class name, nickname box, what is sent, "Katıl"; a member sees "Ayşe olarak katıldın · Değiştir · Sınıftan ayrıl"; joining another class asks to confirm), `js/exercise.js` (after `remember()`: if a membership exists and the file is in the class plan → `dsvClassroom.send`; status line in the panel "Öğretmenine gönderildi" / "Gönderilemedi, sonra denenecek" / removal message; "Ayşe olarak gönderiliyor · Değiştir" line; `flush()` on load), the script tags of `plan.html` and `ex*.html` (`js/firebase-config.js`, `js/classroom.js` before `js/plan.js` / `js/exercise.js`; also the generators in the scratchpad), `js/i18n.js`, `css/app.css`
- Test: `tests/classroom.spec.js` (describe `'students'`)

**Interfaces:**
- Consumes: `dsvClassroom.membership/join/leave/send/flush` (Task 1), the plan parsing of `js/layout.js` (`dsvPlan.fromHash`).

- [ ] **Step 1: Write failing tests:** a student opening `plan.html#plan=…&class=CODE` sees the join box with the class name; joining shows "Ayşe olarak katıldın"; local progress from before joining is not in the cloud (`listStudents` progress empty); on `exReverse.html` (in the plan) a check sends (status text) and the teacher sees it; an exercise not in the plan sends nothing; offline → "sonra denenecek", next load sends; the teacher deletes the student → the next check shows the removal message and `dsv-class` is gone, the exercise still works locally; "Değiştir" then a new nickname → a second row for the teacher; joining a closed class shows the closed message; joining a second class asks for confirmation; a page without membership makes no outside request (route spy on the Firebase hosts with the REST config set).
- [ ] **Step 2: Run** `-g "students"` → FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** `npx playwright test tests/classroom.spec.js tests/exercise.spec.js tests/plan.spec.js` → PASS.
- [ ] **Step 5: Commit** `git commit -m "Classroom: students join with a nickname and their checks reach the teacher"`.

### Task 5: Setup guide, full check, review, PR

- [ ] **Step 1:** README: "Sınıf (öğretmenler)" bullet and a setup section (create the Firebase project; enable Email/Password and Anonymous sign-in; create Firestore in a European location; publish `firestore.rules`; add a web app and copy `apiKey`/`projectId` into `js/firebase-config.js`; add the GitHub Pages domain to Authorized domains); todo test count.
- [ ] **Step 2:** Screenshots of `class.html` (light 1200 px, dark 390 px) and the plan join box; fix overflow.
- [ ] **Step 3:** Full suite `npx playwright test` and `npm run test:rules` → pass.
- [ ] **Step 4:** Whole-branch review, fixes, commit, push, PR.
