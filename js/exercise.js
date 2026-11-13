/*
 * Exercise pages: the student writes code in one block and presses "Kontrol et" (Check).
 *
 * The page holds the machine part as <script type="application/json" id="exercise">:
 *   {"block": 2,                    1-based number of the student's block
 *    "test": "<Düğüm>",             hidden code that runs after the student's block (builds data, calls functions)
 *    "expect": [[expression, expectedJSON, labelTr, labelEn, labelDe], ...]}
 * the example solution as <script type="text/plain" id="ex-solution"> (Düğüm) and the hints as
 * <ol class="ex-hints" data-lang="tr|en|de"><li>...</li></ol>.
 * An expression is JavaScript over the program's variables; walk(h), back(h) and output() are helpers.
 *
 * Checking: the student's block runs the normal way (animated, errors in the output panel); then the test and
 * the expressions run quietly (see dsvRunQuiet / dsvEvalQuiet in js/linkedlist.js), so the student's drawing
 * stays as it was. What the student did is kept in localStorage 'dsv-exercises': {file: {done, attempts}}.
 */
(function(){
	var KEY = 'dsv-exercises';

	function start(){
		var spec, lesson = document.querySelector('main.lesson'), node = document.getElementById('exercise');
		if(!lesson || !node || !window.dsv)
			return;
		try { spec = JSON.parse(node.textContent); } catch(e) { return; }
		var t = window.dsv.t, file = decodeURIComponent(location.pathname.split('/').pop()) || 'index.html';
		var langIndex = {tr: 2, en: 3, de: 4}[window.dsv.settings.lang] || 2;
		var card = document.querySelectorAll('.code-card')[(spec.block || 1) - 1];
		if(!card || !window.dsvRunBlock)
			return;

		function read(){
			try { var all = JSON.parse(localStorage.getItem(KEY) || '{}'); return all && typeof all === 'object' && !Array.isArray(all) ? all : {}; }
			catch(e) { return {}; }
		}
		// what the student did: loaded from the browser's storage once, kept here, written back after every check
		// (a browser that will not store anything still gets its hints and solution)
		var record = (function(){ var r = read()[file]; return r && typeof r === 'object' ? {done: r.done === true, attempts: Number(r.attempts) || 0} : {done: false, attempts: 0}; })();
		function mine(){ return {done: record.done, attempts: record.attempts}; }
		function save(rec){
			record = {done: rec.done, attempts: rec.attempts};
			var all = read();
			all[file] = record;
			try { localStorage.setItem(KEY, JSON.stringify(all)); } catch(e) {}
		}

		function mk(tag, cls, text){
			var e = document.createElement(tag);
			if(cls) e.className = cls;
			if(text !== undefined) e.textContent = text;
			return e;
		}
		var panel = mk('div', 'exercise-panel');
		var bar = mk('div', 'ex-bar');
		var check = mk('button', 'ex-check', t('exCheck'));
		check.type = 'button';
		var status = mk('span', 'ex-status'), attemptsText = mk('span', 'ex-attempts');
		bar.appendChild(check); bar.appendChild(status); bar.appendChild(attemptsText);
		var result = mk('div', 'ex-result');
		result.setAttribute('role', 'status');
		result.setAttribute('aria-live', 'polite');
		result.hidden = true;
		var actions = mk('div', 'ex-actions');
		var hintBtn = mk('button', 'ex-hint-btn'), solutionBtn = mk('button', 'ex-solution-btn', t('exSolution'));
		hintBtn.type = solutionBtn.type = 'button';
		var hintNote = mk('span', 'ex-hint-note', t('exHintLocked'));
		actions.appendChild(hintBtn); actions.appendChild(hintNote); actions.appendChild(solutionBtn);
		var hintList = mk('ol', 'ex-hint-list');
		var solution = mk('details', 'ex-solution');
		solution.hidden = true;
		solution.appendChild(mk('summary', '', t('exSolutionTitle')));
		var solutionCode = mk('pre');
		solution.appendChild(solutionCode);
		[bar, result, actions, hintList, solution].forEach(function(e){ panel.appendChild(e); });
		var slot = document.querySelector('.exercise-slot'); // made by layout.js: a part of lesson mode with the block
		if(slot) slot.appendChild(panel);
		else card.parentNode.insertBefore(panel, card.nextSibling);   // under the card: its buttons are placed over the card's bottom edge

		var hints = [].map.call(document.querySelectorAll('.ex-hints li'), function(li){ return li.textContent; });
		var shown = 0;

		function refresh(){
			var rec = mine();
			status.textContent = rec.done ? t('exDone') : '';
			attemptsText.textContent = rec.attempts ? (rec.attempts === 1 ? t('exAttemptOne') : t('exAttempts', {n: rec.attempts})) : '';
			var unlocked = Math.min(hints.length, rec.done ? hints.length : rec.attempts);
			hintBtn.hidden = hints.length === 0;
			hintBtn.textContent = t('exHint', {i: Math.min(shown + 1, hints.length), n: hints.length});
			hintBtn.disabled = shown >= unlocked;
			hintNote.hidden = !(hintBtn.disabled && shown < hints.length);   // say why the button waits (a tooltip does not reach touch or screen readers)
			solutionBtn.hidden = !(rec.attempts >= 2 || rec.done) || !solutionText();
		}

		function solutionText(){
			var src = document.getElementById('ex-solution');
			if(!src) return '';
			var code = src.textContent.replace(/^\n/, '');
			var lang = window.dsvCode && window.dsvCode.langs && window.dsvCode.langs[window.dsvCodeLang];
			try { return lang ? lang.to([code])[0] : code; } catch(e) { return code; }
		}

		hintBtn.addEventListener('click', function(){
			if(shown < hints.length){
				hintList.appendChild(mk('li', '', hints[shown]));
				shown++;
			}
			refresh();
		});
		solutionBtn.addEventListener('click', function(){
			solutionCode.textContent = solutionText();
			solution.hidden = false;
			solution.open = true;
		});

		var sawNonList = false, nonListValue; // walk() was given something that is not a list: the drawing shows that value
		function walk(h, field){
			if(h !== null && h !== undefined && typeof h !== 'object'){ sawNonList = true; nonListValue = h; return String(h); }   // a number, a string, true...: not a list, say what it is
			var out = [];
			for(var n = h; n && out.length < 50; n = n[field || 'next']) out.push(n.data);
			return out.join('>');
		}
		// a value as JSON data for the drawing and the history: something that is not JSON (a function, a node with
		// a cycle) or very large comes back as its text
		function asData(v){
			var p = plain(v);
			if(p === undefined) return String(v);
			if(p.length > 2000) return p.slice(0, 2000) + '…';
			try { return JSON.parse(p); } catch(e) { return p; }
		}
		function plain(v){
			try { return JSON.stringify(v === undefined ? null : v, function(k, x){ return x === undefined ? null : x; }); }
			catch(e) { return String(v); }
		}
		function show(ok, text, lines){
			result.hidden = false;
			result.className = 'ex-result ' + (ok ? 'ok' : 'bad');
			result.textContent = text;
			if(lines && lines.length){
				var ul = mk('ul');
				lines.forEach(function(l){
					var li = mk('li', '', typeof l === 'string' ? l : l.text);
					var drawing = typeof l === 'string' ? null : drawingOf(l.result);
					if(drawing) li.appendChild(drawing);
					ul.appendChild(li);
				});
				result.appendChild(ul);
			}
		}

		// a failing expectation, as drawn and kept in the history: {i, label, expected, actual, shape, nonList}
		function drawingOf(r){
			if(!r || !window.dsvCompare || r.failed) return null;   // no value: the expression itself failed
			return window.dsvCompare.draw(r.shape, r.expected, r.actual, r.nonList);
		}

		// ---- the attempt history: every check, kept in this browser ('dsv-attempts': {file: [record...]}, newest first)
		var HKEY = 'dsv-attempts', HMAX = 10, CODE_MAX = 5000;
		var LANG_NAMES = {dugum: 'Düğüm', turkce: 'Düğüm (Türkçe)', cpp: 'C++', java: 'Java'};
		function readHistory(){
			try { var all = JSON.parse(localStorage.getItem(HKEY) || '{}'); return all && typeof all === 'object' && !Array.isArray(all) ? all : {}; }
			catch(e) { return {}; }
		}
		// a saved entry that is not what this page writes (edited by hand, an older format) is left out
		function cleanEntry(h){
			if(!h || typeof h !== 'object' || Array.isArray(h)) return null;
			var results = Array.isArray(h.results) ? h.results.filter(function(r){ return r && typeof r === 'object' && !Array.isArray(r); }) : [];
			return {t: String(h.t || ''), lang: String(h.lang || 'dugum'), code: String(h.code || ''), kind: h.kind === 'pass' || h.kind === 'error' ? h.kind : 'fail',
			        error: h.error ? String(h.error) : null, results: results};
		}
		var history = (function(){ var h = readHistory()[file]; return Array.isArray(h) ? h.map(cleanEntry).filter(Boolean).slice(0, HMAX) : []; })(); // kept here too: a browser that stores nothing still shows the visit's attempts
		function editorOf(){ var cm = card.querySelector('.CodeMirror'); return cm && cm.CodeMirror; }
		function remember(kind, error, results){
			var ed = editorOf();
			history.unshift({t: new Date().toISOString(), lang: window.dsvCodeLang || 'dugum', code: (ed ? ed.getValue() : '').slice(0, CODE_MAX),
			                 kind: kind, error: error || null, results: results || []});
			history = history.slice(0, HMAX);
			var made = history[0];
			var all = readHistory();
			all[file] = history;
			try { localStorage.setItem(HKEY, JSON.stringify(all)); } catch(e) {}
			renderHistory();
			toClass(made);
		}

		// ---- the class: a student who joined one (plan.html#…&class=CODE) sends the checks of the class plan's
		// exercises to the teacher (js/classroom.js). Without a membership nothing is requested.
		var C = window.dsvClassroom;
		var member = C && C.enabled() ? C.membership() : null;
		if(member){
			var inPlan = window.dsvPlan && window.dsvPlan.fromHash('#' + (member.plan || ''));
			if(!inPlan || inPlan.plan.items.map(function(x){ return x.file; }).indexOf(file) < 0) member = null;
		}
		var classLine = null, classStatus = null;
		if(member){
			classLine = mk('div', 'ex-class');
			classLine.appendChild(mk('span', 'ex-class-who', t('exClassSending', {nick: member.nick})));
			var change = mk('a', 'ex-class-change', t('exClassChange'));
			change.href = 'plan.html#' + member.plan + '&class=' + member.code;
			classLine.appendChild(change);
			classStatus = mk('span', 'ex-class-status');
			classStatus.setAttribute('role', 'status');
			classLine.appendChild(classStatus);
			panel.appendChild(classLine);
		}
		function classResult(r){
			if(!classStatus || !r) return;
			if(r.removed){ classStatus.textContent = t('exClassRemoved'); classLine.querySelector('.ex-class-who').hidden = true; classLine.querySelector('.ex-class-change').hidden = true; member = null; }
			else if(r.queued) classStatus.textContent = t('exClassQueued');
			else if(r.sent) classStatus.textContent = t('exClassSent');
		}
		function toClass(h){
			if(!member || !h) return;
			C.send(file, h).then(classResult);   // the class counts the checks made since joining (not this browser's earlier work)
		}
		if(member && (function(){ try { return (JSON.parse(localStorage.getItem('dsv-class-queue') || '[]') || []).length > 0; } catch(e) { return false; } })())
			C.flush().then(classResult);   // what could not be sent last time

		function labelOf(r){ var e = (spec.expect || [])[r.i]; return (e && (e[langIndex] || e[2])) || r.label; } // in today's language
		function firstIssue(h){
			if(h.results && h.results.length) return labelOf(h.results[0]);
			if(h.error) return String(h.error).split('\n')[0];
			return t(h.kind === 'pass' ? 'exHistPass' : h.kind === 'error' ? 'exHistError' : 'exHistFail');
		}
		function when(iso){
			var d = new Date(iso);
			if(isNaN(d.getTime())) return '';
			try { return d.toLocaleString(window.dsv.settings.lang || 'tr', {day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'}); }
			catch(e) { return d.toISOString().slice(0, 16).replace('T', ' '); }
		}
		var historyBox = mk('details', 'ex-history');
		var historySummary = mk('summary');
		historyBox.appendChild(historySummary);
		var historyList = mk('div', 'ex-hist-list');
		historyBox.appendChild(historyList);
		var clearBtn = mk('button', 'ex-hist-clear', t('exHistClear'));
		clearBtn.type = 'button';
		historyBox.appendChild(clearBtn);
		panel.parentNode.insertBefore(historyBox, panel.nextSibling);
		clearBtn.addEventListener('click', function(){
			history = [];
			var all = readHistory();
			delete all[file];
			try { localStorage.setItem(HKEY, JSON.stringify(all)); } catch(e) {}
			renderHistory();
		});
		function renderHistory(){
			historyBox.hidden = history.length === 0;
			historySummary.textContent = t('exHistory', {n: history.length});
			historyList.textContent = '';
			history.forEach(function(h){
				var same = h.lang === (window.dsvCodeLang || 'dugum');
				var item = window.dsvAttemptView(h, {label: labelOf, issue: firstIssue, when: when,
					load: same ? function(x){ var ed = editorOf(); if(ed){ ed.setValue(x.code); ed.focus(); } } : null,
					note: same ? null : t('exHistOtherLang', {lang: LANG_NAMES[h.lang] || h.lang})});
				historyList.appendChild(item);
			});
		}
		renderHistory();

		check.addEventListener('click', function(){
			var rec = mine();
			if(!window.dsvRunBlock((spec.block || 1) - 1)){ // the student's own error: explained in the output panel, not an attempt
				var out = document.getElementById('output');
				remember('error', out ? out.textContent.trim() : '');
				show(false, t('exRunError'));
				return;
			}
			var typed = window.dsvPrintedText();      // what the student's run printed (the output panel fills only while it is animated)
			var failures = [];
			var ran = spec.test ? window.dsvRunQuiet(spec.test) : {ok: true, error: ''};
			var testError = ran.ok ? null : ran.error;
			if(!ran.ok)
				failures.push(t('exTestError', {error: ran.error}));
			else
				(spec.expect || []).forEach(function(e, i){
					sawNonList = false;
					var got = window.dsvEvalQuiet(e[0], {walk: walk, back: function(h){ return walk(h, 'prev'); }, output: function(){ return typed; }});
					var actual = got.ok ? plain(got.value) : got.error;
					if(!got.ok || actual !== plain(e[1])){
						var label = e[langIndex] || e[2] || e[0];
						var shape = window.dsvCompare ? window.dsvCompare.shape(e[0], e[1]) : 'value';
						var raw = sawNonList && shape === 'list' ? nonListValue : got.value;   // a list check that got a number shows the number
						var res = {i: i, label: label, expected: e[1], actual: got.ok ? asData(raw) : null, shape: shape, nonList: sawNonList};
						if(!got.ok){ res.failed = true; res.error = got.error; }   // its own explained error (a real null result is drawn)
						failures.push({text: t('exExpected', {label: label, expected: plain(e[1]), actual: actual}), result: res});
					}
				});
			rec.attempts += 1;
			if(!failures.length){
				rec.done = true;
				save(rec);
				remember('pass');
				show(true, t('exOk'));
				var link = document.querySelector('.drawer a[href="' + file + '"]');          // the menu shows it now, not at the next load
				if(link && !link.querySelector('.ex-mark')){
					var mark = mk('span', 'ex-mark', ' ✓');
					mark.title = t('exDone');
					link.appendChild(mark);
				}
				if(window.dsvPlanDone) window.dsvPlanDone();
			}
			else {
				save(rec);
				var kept = failures.map(function(f){ return f.result; }).filter(Boolean);
				var firstError = testError || (kept.filter(function(r){ return r.error; })[0] || {}).error || null;
				remember('fail', firstError, kept);
				show(false, t('exBad'), failures);
			}
			refresh();
		});

		refresh();
	}

	function wait(){ if(window.dsvReady === true) start(); else setTimeout(wait, 50); }
	wait();
})();
