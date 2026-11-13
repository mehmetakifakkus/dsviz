# Exercise Mistakes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** After a failed check the student sees "expected" and "your result" drawn side by side with the differences marked, and every check is kept in a local attempt history the student can reopen and load back into the editor.

**Architecture:** A small, page-independent renderer (`js/exercise-compare.js`, `window.dsvCompare`) turns a value pair into HTML boxes (list, array, grid or single value) with diff marks. `js/exercise.js` calls it under each failing expectation, records every check in `localStorage['dsv-attempts']` and shows the history under the exercise panel. No engine change, no network.

**Tech Stack:** browser JavaScript in the ES5 style of `js/exercise.js`, CSS tokens of `css/app.css`, strings in `js/i18n.js`, Playwright tests (`npx playwright test`).

**Spec:** `docs/superpowers/specs/2026-11-13-exercise-mistakes-design.md`

## Global Constraints

- No request leaves the site; history lives only in `localStorage['dsv-attempts']` (separate from `dsv-exercises`); storage that throws or holds broken JSON falls back to memory, the page never breaks.
- Never show or store hidden test code, hidden inputs or expectation expressions: only the label (by its index `i`), the expected value and the student's value.
- Pass/fail decisions stay exactly as today (`walk()` keeps returning `String(h)` for non-nodes); only drawing uses the extra "not a list" note.
- History: newest first, at most 10 records per exercise, code cut at 5000 characters; a run error is recorded (kind `error`) but does not change `attempts`.
- Drawing limits: lists and arrays up to 50 items, grids up to 12 × 12; beyond that, no drawing (the text line stays).
- Every visible string is a key in `js/i18n.js` with tr, en and de; readable at 390 px width and in the dark theme.
- Commit footer: `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` and `Claude-Session: https://claude.ai/code/session_01GDn6v6g78qdnQxjMjZB9vR`.

## Review Focus

- A record saved in another code language: the load button is replaced by a note, the code is still shown read-only (test in Task 3).
- A hidden-test error (the student's function crashes only on hidden inputs): the record is kind `fail` with the explained error text and no drawing, nothing hidden leaks (test in Task 3).
- Very long student code (over 5000 characters) and an eleventh attempt: the code is cut, the oldest record goes (test in Task 3).
- Values of different length or size (a shorter list, a missing grid row): extra and missing items are marked on the right side, nothing overflows the page at 390 px (tests in Task 1; screenshot in Task 4).
- An empty list (`""`) expected or produced: drawn as "empty", not as one empty node (test in Task 1).

---

### Task 1: The comparison renderer

**Files:**
- Create: `js/exercise-compare.js`
- Modify: every `ex*.html` (add `<script src="js/exercise-compare.js"></script>` right before `<script src="js/exercise.js"></script>`), the scratchpad generators `gen16.py`/`gen17.py` `post2` (same line, for future pages), `js/i18n.js` (`exCmpExpected`: Beklenen / Expected / Erwartet; `exCmpActual`: Senin sonucun / Your result / Dein Ergebnis; `exCmpEmpty`: boş / empty / leer), `css/app.css` (`.ex-compare`, `.ex-cmp-side`, `.ex-cmp-item` with `.diff`, `.extra`, `.missing`, `.ex-cmp-value`, `.ex-cmp-grid`; side by side on wide screens, stacked under 600 px, horizontal scroll inside, never the page)
- Test: `tests/exercise.spec.js` (new `test.describe('comparison drawing')`)

**Interfaces:**
- Produces: `window.dsvCompare.shape(expression: string, expected: any) -> 'list'|'grid'|'array'|'value'` — `list` when the expression starts with `walk(` or `back(`; `grid` when `expected` is an array of arrays; `array` when it is an array; else `value`.
- Produces: `window.dsvCompare.draw(shape: string, expected: any, actual: any, nonList: boolean) -> HTMLElement|null` — returns a `div.ex-compare` with two `div.ex-cmp-side` (`data-side="expected"` / `"actual"`), each with a caption and its items (`.ex-cmp-item`, list items joined by arrows). Returns `null` when `actual === undefined` (no value: the expression failed) or a limit is exceeded. With `shape === 'list' && nonList`, or when `actual` does not fit the shape (array expected, a number came), both sides are a single `.ex-cmp-value` box. Diff marks by position: different value at the same position → `.diff` on both sides; only in actual → `.extra`; only in expected → `.missing` on the expected item and a dashed placeholder `.ex-cmp-item.missing` on the actual side. Grids compare cell by cell, row and column counts may differ. A list value `""` is drawn as one `.ex-cmp-empty` text, not an item.

- [ ] **Step 1: Write failing tests** (they call the renderer inside `exReverse.html` with `page.evaluate`):
  - `shape('walk(reverse(build(4)))', '4>3>2>1')` = `'list'`; `shape('Array.from(a)', [1,2])` = `'array'`; `shape('Array.from(p).map(...)', [[1],[2]])` = `'grid'`; `shape('search(7)', -1)` = `'value'`.
  - `draw('list', '4>3>2>1', '1>2>3>4', false)`: 4 items per side, all 8 `.diff`.
  - `draw('list', '1>2>3', '1>2', false)`: expected side 1 `.missing`, actual side 1 placeholder `.missing`; `draw('list', '1>2', '1>2>3', false)`: actual side 1 `.extra`.
  - `draw('list', '', '1', false)`: expected side shows `.ex-cmp-empty` ("boş") and no item.
  - `draw('list', '4>3>2>1', '5', true)`: one `.ex-cmp-value` per side, texts `"4>3>2>1"` and `5`.
  - `draw('grid', [[1,null],[1,1]], [[1,0],[1,1]], false)`: one `.diff` per side (cell 0,1); `draw('grid', [[1],[2]], [[1]], false)`: one `.missing`.
  - `draw('array', [1,2], 7, false)` → value boxes; `draw('list', '1', undefined, false)` → `null`; a 51-item list → `null`.
- [ ] **Step 2: Run** `npx playwright test tests/exercise.spec.js -g "comparison drawing"` → FAIL (`dsvCompare` undefined).
- [ ] **Step 3: Implement** `js/exercise-compare.js`, the script tags, strings and CSS. Item text: numbers and strings as they are, `null` as the code word (`window.dsv` code language is not needed: show `null`), `true`/`false` as they are.
- [ ] **Step 4: Run** the same command → PASS; `npx playwright test tests/exercise.spec.js` → PASS.
- [ ] **Step 5: Commit** `git commit -m "Exercises: a renderer that draws expected and actual values with their differences"`.

### Task 2: Drawings under the failed expectations

**Files:**
- Modify: `js/exercise.js` (the check handler and `walk`), `css/app.css` if spacing needs it
- Test: `tests/exercise.spec.js` (describe `'comparison drawing'`)

**Interfaces:**
- Consumes: `dsvCompare.shape`, `dsvCompare.draw` (Task 1).
- Produces (inside the check, used by Task 3): for each failing expectation a result object `{i: number, label: string, expected: any, actual: any|null, shape: string, nonList: boolean}` (`actual` is the raw evaluated value, `null` when evaluation failed; `nonList` true when `walk`/`back` received a non-node non-null value during that expectation's evaluation). The failure `<li>` gets the drawing appended after its text.

- [ ] **Step 1: Write failing tests:**
  - exReverse with `function reverse(head)\n{\n  return head\n}\n`: the first failure `<li>` contains `.ex-compare` with 4 `.diff` items on each side and the text line is still there.
  - exReverse with `return 5`: `.ex-compare .ex-cmp-value` shows `5` on the actual side.
  - exBubbleSort with an empty `sortArray()` body: the sample expectation draws an array whose differing cells are `.diff`.
  - exPascal with only the solution's first row (`p[0][0] = 1`): a grid drawing with `.missing` or `.diff` cells, and no `.ex-compare` text contains `Array.from`, `build` or `load` (nothing hidden).
  - exMiddle whose function crashes only in the hidden test: no `.ex-compare` (no value), the error text remains.
- [ ] **Step 2: Run** `-g "comparison drawing"` → the new tests FAIL.
- [ ] **Step 3: Implement**: per expectation reset a `sawNonList` flag, let `walk` set it when its argument is neither `null`/`undefined` nor an object, keep its return value unchanged; build the result objects; append `dsvCompare.draw(...)` (when not `null`) to each failure `<li>`.
- [ ] **Step 4: Run** `npx playwright test tests/exercise.spec.js` → PASS.
- [ ] **Step 5: Commit** `git commit -m "Exercises: failed expectations are drawn, expected next to the student's result"`.

### Task 3: Attempt history

**Files:**
- Modify: `js/exercise.js`, `js/i18n.js` (`exHistory`: Önceki denemelerim ({n}) / My previous attempts ({n}) / Meine bisherigen Versuche ({n}); `exHistLoad`: Bu kodu editöre yükle / Load this code into the editor / Diesen Code in den Editor laden; `exHistOtherLang`: Bu deneme başka bir kod dilinde yazılmış ({lang}). / This attempt was written in another code language ({lang}). / Dieser Versuch ist in einer anderen Codesprache geschrieben ({lang}).; `exHistClear`: Geçmişi temizle / Clear the history / Verlauf löschen; `exHistPass` / `exHistFail` / `exHistError` for the row's first-issue text when there is nothing more specific: Geçti / Passed / Bestanden, Kaldı / Failed / Nicht bestanden, Kod çalışmadı / The code did not run / Der Code lief nicht), `css/app.css` (`.ex-history`, `.ex-hist-item`, `.ex-hist-load`, `.ex-hist-clear`)
- Test: `tests/exercise.spec.js` (new `test.describe('attempt history')`)

**Interfaces:**
- Consumes: the result objects of Task 2 and `dsvCompare.draw`.
- Produces: storage `localStorage['dsv-attempts'] = {"<file>": [record, ...]}` with `record = {t: ISO string, lang: window.dsvCodeLang, code: string (≤ 5000 chars), kind: 'pass'|'fail'|'error', error: string|null, results: [result, ...]}`; UI: `details.ex-history` after `.exercise-panel` (hidden with 0 records), `summary` text `exHistory`, one `div.ex-hist-item[data-kind]` per record (time, ✓/✗/⚠, first issue: the label of `results[0]` by `i` in the current language, else the first line of `error`, else `exHistPass/Fail/Error`); opening an item shows `pre.ex-hist-code`, the drawings of its `results` and the error text; `button.ex-hist-load` only when `record.lang === window.dsvCodeLang`, otherwise `p.ex-hist-lang`; `button.ex-hist-clear` removes this exercise's records only.

- [ ] **Step 1: Write failing tests:**
  - a failed check, a run error and a pass give three items, newest first, `data-kind` `pass`, `error`, `fail`; `exercises` progress `attempts` is 2 (the error did not count).
  - the failed item, opened, shows the student's code in `pre.ex-hist-code` and a `.ex-compare`; its first-issue text is the expectation label (`Dört düğümlü listeyi ters çevirince`); switching the interface to English and reloading shows `Reversing a list of four nodes`.
  - `.ex-hist-load` puts the record's code back into block 2 (`CodeMirror.getValue()` equals it).
  - after a reload the items are still there; with `codeLang: 'cpp'` a record saved in `dugum` shows `p.ex-hist-lang` and no load button.
  - 11 checks keep 10 items; a 6000-character student code is stored as 5000 characters.
  - `.ex-hist-clear` empties the list while `.ex-status` still says `Yapıldı ✓` after a pass.
  - storage blocked for `dsv-attempts` (getItem/setItem throw): items still appear during the visit, no page error.
  - a hidden-test error (exMiddle crash case) is `data-kind="fail"` with the error text, and nothing in `.ex-history` matches `/build|walk\(|load\d/`.
- [ ] **Step 2: Run** `-g "attempt history"` → FAIL.
- [ ] **Step 3: Implement** the record on every check (also in the `exRunError` branch, with `kind: 'error'` and the output panel's text as `error`), the storage with memory fallback (same pattern as the progress record), and the UI.
- [ ] **Step 4: Run** `npx playwright test tests/exercise.spec.js` → PASS.
- [ ] **Step 5: Commit** `git commit -m "Exercises: an attempt history the student can reopen and load back"`.

### Task 4: Check, docs, PR

- [ ] **Step 1:** Screenshots (light and dark theme, 1200 px and 390 px) of exReverse after a failed check with the history open; fix overlaps or page overflow.
- [ ] **Step 2:** README bullet under "Alıştırma modu" (drawing and history, local only); todo test count.
- [ ] **Step 3:** Full suite `npx playwright test` → all pass.
- [ ] **Step 4:** Commit, push, open the PR (summary, test plan, footer lines from the system reminder).
