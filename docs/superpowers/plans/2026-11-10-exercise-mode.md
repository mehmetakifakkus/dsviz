# Exercise Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Exercise pages where a student writes code and presses "Kontrol et": hidden code and expectations decide pass/fail; hints, solution and progress included; usable in lesson plans; eight first exercises.

**Architecture:** An exercise page is a normal lesson page (same shell) whose block 1 is given code and block 2 the student's starter, plus a JSON block with the machine part. Checking reuses the existing run pipeline for the student's block (animated, errors in `#output`), then runs the hidden test code and the `expect` expressions in a *quiet* mode (no drawing, no steps) and compares results. UI and progress live in a new `js/exercise.js`; `js/layout.js` only learns about exercise pages (menu group, ✓ marks, plan marking on pass).

**Tech Stack:** PaperScript engine (`js/linkedlist.js`, ES5, no postfix `++` in expressions), `js/layout.js`, Playwright tests (`npx playwright test`).

**Spec:** `docs/superpowers/specs/2026-11-10-2d-arrays-and-exercises-design.md` (Bölüm 2). One change to the spec made while planning: exercises work in every code language (the site already translates C++/Java/Türkçe back to Düğüm before running), so there is no fallback to Düğüm.

## Global Constraints

- No server, no accounts: progress is `localStorage['dsv-exercises'] = {"<file>": {done: bool, attempts: number}}`, every access in try/catch.
- Hidden code (`setup`, `test`, `expect`) is Düğüm and never shown to the student; failure messages show expected vs actual values only, never the hidden test code.
- A run error (explained error in `#output`) is not a failed attempt: `attempts` does not grow.
- "Çözümü göster" appears only after 2 failed attempts; the solution is shown in a separate collapsible block and never replaces the editor's code. The next hint unlocks after each failed attempt.
- Student-visible text in tr/en/de; page content uses `data-lang` blocks like the other pages; new UI strings are keys in `js/i18n.js` (tr/en/de).
- Exercise file names are `ex<Name>.html`; they are excluded from `tests/pages.spec.js` PAGES (their final state depends on the student) and listed in the menu group "Alıştırmalar" / "Exercises" / "Übungen".
- Engine file is ES5: no arrows, `let`, template strings, postfix `++` in expressions.
- Commit footer: `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>` and `Claude-Session: https://claude.ai/code/session_01GDn6v6g78qdnQxjMjZB9vR`; no model identifier anywhere else.

## Review Focus

- A student whose code throws (null pointer, missing function) gets the explained error and an unchanged attempt count; the page stays usable.
- A student who prints, or leaves the answer in a variable the test also uses, must not have the hidden test's output or globals corrupt the check (the student's `output()` is captured before the test runs).
- An infinite loop in student code must not hang the check beyond the engine's existing loop guard (error shown, not a frozen page).
- Reload keeps `done` and `attempts`; corrupted or unavailable `localStorage` must not break the page.
- In a lesson plan, opening the page or pressing Çalıştır does not mark it done; only a pass does (and only when a plan context exists).
- Quiet mode must leave the displayed animation intact: after Kontrol et the player still shows the student's own run at its last step, and Çalıştır afterwards starts from a clean state.

---

### Task 1: Engine hooks — quiet runs

**Files:**
- Modify: `js/linkedlist.js` (`runBlock` ~3071, new `window.dsvRunQuiet`, `window.dsvEvalQuiet` next to `window.dsvRunBlock` ~3069)
- Test: `tests/ui.spec.js` (new `test.describe('quiet runs')`)

**Interfaces:**
- Produces: `runBlock(k)` now returns `true` when the block (and every block above it) ran without an error, `false` otherwise; `window.dsvRunBlock(k)` returns the same.
- Produces: `window.dsvRunQuiet(code: string): {ok: boolean, error: string}` — runs Düğüm code through `parse` with `window.activeEditor = null`, with `player.add` and `player.play` replaced by no-ops for the duration (so no steps are added and nothing is drawn), restores them and the `#output` text afterwards; `error` is the explained message when `ok` is false (else `''`). The program state (globals, functions, nodes) stays.
- Produces: `window.dsvEvalQuiet(expression: string, helpers: object): {ok: boolean, value: any, error: string}` — evaluates with the same no-op player, as `new Function('__h', 'with(window){ with(__h){ return (' + expression + '\n); } }')(helpers)` so helpers win over user globals; thrown errors are explained like `parse` does (`explainError`).

- [ ] **Step 1: Write failing tests**: `dsvRunBlock(1)` on a page with a runnable block 2 returns `true`; with a syntax error in block 2 returns `false`. After a normal run, `dsvState()` and the step counter are the same before and after `dsvRunQuiet('var q = new Node(9)\nq.next = null\n')` (counter `Adım n / n` unchanged, `nodes` unchanged) while `valueOf(page, 'q.data')` is 9. `dsvRunQuiet('var z = nothing\n')` returns `{ok: false}` with a non-empty `error` and `#output` text is unchanged afterwards. `dsvEvalQuiet('walk(x)', {walk})` returns the list text and a student global named `walk` does not shadow the helper.
- [ ] **Step 2: Run** `npx playwright test tests/ui.spec.js -g "quiet runs"` → FAIL.
- [ ] **Step 3: Implement** the three signatures above in `js/linkedlist.js`.
- [ ] **Step 4: Run** the same command, then `npx playwright test tests/ui.spec.js tests/language.spec.js` → PASS (no regression in `runBlock` callers).
- [ ] **Step 5: Commit** `git commit -m "Engine: quiet runs and a result from runBlock, for exercise checks"`.

### Task 2: Exercise UI — js/exercise.js, layout hooks, strings

**Files:**
- Create: `js/exercise.js`
- Modify: `js/layout.js` (menu group item marks ✓ in the drawer ~line 285; `window.dsvPlanMark` suppressed on exercise pages and `window.dsvPlanDone` added ~434; the group itself in the `EXAMPLES` array), `js/i18n.js` (strings below), `css/app.css` (`.exercise-panel`, `.ex-result.ok/.bad`, `.ex-hint`, `.ex-solution`)
- Test: `tests/exercise.spec.js` (new), using a tiny fixture page `exTest.html`? No: use the real first page from Task 3 in Task 3's tests; this task's tests use `exReverse.html` created by Task 3, so Task 2 and 3 share their test file and are committed separately only if the page exists — see ruling: implement Task 2's code first, test it in Task 3.

**Interfaces:**
- Page contract (read by `exercise.js`): `<script type="application/json" id="exercise">{"block": 2, "setup": "", "test": "<Düğüm>", "expect": [["<expression>", <expected JSON value>, "<tr label>", "<en label>", "<de label>"], ...]}</script>`; `block` is the 1-based index of the student's block; the hints are `<ol class="ex-hints" data-lang="tr|en|de"><li>…</li></ol>` (only the active language's element exists after `layout.js`); the solution is `<script type="text/plain" id="ex-solution">` Düğüm code.
- Helpers available inside `expect` expressions: `walk(h)` (list forwards `"1>2>3"`, max 50 nodes), `back(h)` (via `prev`), `output()` (the student run's `#output` lines joined by `,`, captured before the test ran).
- `window.dsvExerciseProgress(): {[file]: {done: boolean, attempts: number}}` (safe read) is defined in `js/layout.js` (the menu needs it) and used by `exercise.js`.
- UI strings (tr/en/de) keys: `exCheck` (Kontrol et), `exOk` (Doğru!), `exBad` (Henüz değil), `exExpected` ({label}: beklenen {expected}, senin sonucun {actual}), `exHint` (İpucu {i} / {n}), `exSolution` (Çözümü göster), `exDone` (Yapıldı ✓), `exAttempts` ({n} deneme), `exRunError` (Kodunda bir hata var; önce onu düzelt.), `exHidden` (gizli kontrol).

- [ ] **Step 1: Implement `exercise.js`**: on load, find `#exercise`, build `.exercise-panel` after the student block's run button; **Kontrol et**: `ok = dsvRunBlock(block - 1)`; if false → show `exRunError`, no attempt counted; else capture `#output` text, `dsvRunQuiet(test)`, evaluate every `expect` with `dsvEvalQuiet`, compare with `JSON.stringify` (undefined → null); all equal → `exOk`, `done = true`, `attempts += 1`, call `window.dsvPlanDone && window.dsvPlanDone()`; else list each failing label with `exExpected` (hidden test code never shown), `attempts += 1`, unlock the next hint, and the solution button after the 2nd failure.
- [ ] **Step 2: Implement the layout hooks**: exercise pages set `window.dsvPlanMark = function(){}`, and with a plan context define `window.dsvPlanDone = function(){ PLAN.mark(planCtx.id, page); }`; the drawer shows `✓` after the title of exercises whose progress is `done`; add the group to `EXAMPLES` (items added in Task 3).
- [ ] **Step 3: Add the CSS** (reuse the `--` tokens; works at phone width).
- [ ] **Step 4: Commit** `git commit -m "Exercise mode: panel, checks, hints, progress"` (tests come with Task 3's pages; run `npx playwright test tests/ui.spec.js -g "quiet runs"` to check nothing broke).

### Task 3: Eight exercises, their tests, docs

**Files:**
- Create: `exReverse.html`, `exMiddle.html`, `exLength.html`, `exAppend.html`, `exDedupe.html`, `exRowSum.html`, `exPascal.html`, `exGridPaths.html` (generated by a scratchpad script in the style of `gen15.py`: tr/en/de text and code comments; block 1 given, block 2 starter)
- Modify: `js/layout.js` (the eight items in the new group), `tests/pages.spec.js` (PAGES excludes `/^ex[A-Z]/`; "the examples menu lists every page" compares against PAGES plus the exercise files; EXPECTED untouched), `README.md`, `todo.md`, `language.html` only if a language fact changed (it did not)
- Create: `tests/exercise.spec.js`

**Interfaces:** each page's JSON `expect` values (the hidden `test` builds lists with `function build(n)` that returns the list 1…n, built with `new Node(i, h)`):
- exReverse: student writes `function reverse(head)`; `walk(reverse(build(4)))` = `"4>3>2>1"`, `walk(reverse(build(1)))` = `"1"`, `reverse(null)` = `null`.
- exMiddle: `function middle(head)` returns the middle node (second of two for even lengths): `middle(build(5)).data` = 3, `middle(build(4)).data` = 3, `middle(build(1)).data` = 1.
- exLength: `function listLength(head)`: `listLength(build(5))` = 5, `listLength(null)` = 0.
- exAppend: `function append(head, v)` returns the head: `walk(append(build(3), 9))` = `"1>2>3>9"`, `walk(append(null, 5))` = `"5"`.
- exDedupe: `function dedupe(head)` removes consecutive duplicates of a sorted list; the test builds `d1 = 1,1,2,2,3` and `d2 = 7,7` with nested `new Node(v, next)`: `walk(dedupe(d1))` = `"1>2>3"`, `walk(dedupe(d2))` = `"7"`.
- exRowSum: block 1 builds `g = new Array(3, 4)` holding 1…12; student writes `function rowSum(r)`; the test sets `g[1][1] = 100`; `rowSum(0)` = 10, `rowSum(2)` = 42, `rowSum(1)` = 120.
- exPascal: block 1 has `n = 6` and `p = new Array(6, 6)`; the student fills it; `Array.from(p[5])` = `[1,5,10,10,5,1]`, `p[2][1]` = 2, `p[3][3]` = 1.
- exGridPaths: block 1 has `dp = new Array(5, 5)`; the student fills it; `dp[2][3]` = 10, `dp[4][4]` = 70.
- Hints: two to three per page, from nudge to near-answer; `solution`: a correct Düğüm solution per page.

- [ ] **Step 1: Write failing tests** in `tests/exercise.spec.js`: (a) for each of the eight files the starter fails Kontrol et with `.ex-bad` and attempts become 1; (b) putting the page's solution into the student block (`setValue`) passes with `.ex-ok`, progress `{done: true}` and the drawer shows `✓`; (c) after 2 failures the solution button appears and the 2nd hint unlocks; (d) a run error (`var q = nothing` as student code) shows `exRunError` and leaves `attempts` at 0; (e) reload keeps `done`; broken `localStorage` JSON does not throw; (f) in C++ and Java code language `exReverse` passes with the solution shown/typed in that language (use `dsvCode.langs[lang].to([solution])`); (g) in a lesson plan (`plan.html#plan=…` with the exercise page) pressing Çalıştır does not mark the page done, a pass does; (h) an infinite loop in student code ends with the explained loop error, not a hang (Review Focus); (i) student `print`ed output is available to `output()` expectations — not needed by the eight pages, so test it with `window.dsvRunQuiet`-level unit in Task 1 instead.
- [ ] **Step 2: Run** `npx playwright test tests/exercise.spec.js` → FAIL (pages missing).
- [ ] **Step 3: Create the eight pages** with the generator; add the group and items to `EXAMPLES` in `layout.js`; adapt `tests/pages.spec.js` as above.
- [ ] **Step 4: Run** `npx playwright test tests/exercise.spec.js tests/pages.spec.js -g "exercise|menu lists|every page has"` → PASS; then a screenshot check of one exercise (desktop and 390 px, after a failed and a passed check).
- [ ] **Step 5: Docs** (README bullet, todo test count), full suite `npx playwright test` → all pass.
- [ ] **Step 6: Commit and push**; open the PR with the repo's PR body style (summary, test plan, footer lines from the system reminder).
