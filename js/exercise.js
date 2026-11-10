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
		actions.appendChild(hintBtn); actions.appendChild(solutionBtn);
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
			attemptsText.textContent = rec.attempts ? t('exAttempts', {n: rec.attempts}) : '';
			var unlocked = Math.min(hints.length, rec.done ? hints.length : rec.attempts);
			hintBtn.hidden = hints.length === 0;
			hintBtn.textContent = t('exHint', {i: Math.min(shown + 1, hints.length), n: hints.length});
			hintBtn.disabled = shown >= unlocked;
			hintBtn.title = shown >= unlocked && shown < hints.length ? t('exHintLocked') : '';
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

		function walk(h, field){
			var out = [];
			for(var n = h; n && out.length < 50; n = n[field || 'next']) out.push(n.data);
			return out.join('>');
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
				lines.forEach(function(l){ ul.appendChild(mk('li', '', l)); });
				result.appendChild(ul);
			}
		}

		check.addEventListener('click', function(){
			var rec = mine();
			if(!window.dsvRunBlock((spec.block || 1) - 1)){ // the student's own error: explained in the output panel, not an attempt
				show(false, t('exRunError'));
				return;
			}
			var typed = window.dsvPrintedText();      // what the student's run printed (the output panel fills only while it is animated)
			var failures = [];
			var ran = spec.test ? window.dsvRunQuiet(spec.test) : {ok: true, error: ''};
			if(!ran.ok)
				failures.push(t('exTestError', {error: ran.error}));
			else
				(spec.expect || []).forEach(function(e){
					var got = window.dsvEvalQuiet(e[0], {walk: walk, back: function(h){ return walk(h, 'prev'); }, output: function(){ return typed; }});
					var actual = got.ok ? plain(got.value) : got.error;
					if(!got.ok || actual !== plain(e[1]))
						failures.push(t('exExpected', {label: e[langIndex] || e[2] || e[0], expected: plain(e[1]), actual: actual}));
				});
			rec.attempts += 1;
			if(!failures.length){
				rec.done = true;
				save(rec);
				show(true, t('exOk'));
				if(window.dsvPlanDone) window.dsvPlanDone();
			}
			else {
				save(rec);
				show(false, t('exBad'), failures);
			}
			refresh();
		});

		refresh();
	}

	function wait(){ if(window.dsvReady === true) start(); else setTimeout(wait, 50); }
	wait();
})();
