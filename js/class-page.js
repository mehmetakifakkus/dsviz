/*
 * The teacher's class page (class.html): sign in, open classes with a lesson plan, see the students'
 * exercise results, open their attempts, close joining, delete students and classes.
 * Data: window.dsvClassroom (js/classroom.js). Everything the page shows from the data is put in as text.
 *
 *   class.html                     sign-in or my classes
 *   class.html#plan=<str>&c=<lang> the new-class form, filled with that plan (from the teacher's plan page)
 *   class.html#class=<CODE>        one class
 */
(function(){
	var dsv = window.dsv, t = dsv.t, lang = dsv.settings.lang, C = window.dsvClassroom, PLAN = window.dsvPlan;
	var root = document.getElementById('class-app');
	if(!root || !C || !PLAN) return;

	function el(tag, attrs, text){
		var e = document.createElement(tag);
		Object.keys(attrs || {}).forEach(function(k){ if(k === 'class') e.className = attrs[k]; else e.setAttribute(k, attrs[k]); });
		if(text !== undefined) e.textContent = text;
		return e;
	}
	function button(id, text, cls){ var b = el('button', {type: 'button', 'class': 'tp-btn' + (cls ? ' ' + cls : ''), id: id}, text); return b; }
	function pick(texts){ return texts[lang] || texts.tr; }
	function titleOf(file){
		var found = file;
		(window.dsvExamples || []).forEach(function(g){ g.items.forEach(function(it){ if(it[0] === file) found = pick(it[1]); }); });
		return found;
	}
	function when(iso){
		var d = new Date(iso);
		if(isNaN(d.getTime())) return '';
		try { return d.toLocaleString(lang, {day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'}); } catch(e) { return d.toISOString().slice(0, 16).replace('T', ' '); }
	}
	function errorText(e){
		var code = e && e.code;
		return code === 'auth' ? t('clErrAuth') : code === 'network' ? t('clErrNetwork') : code === 'unverified' ? t('clErrUnverified') : t('clErrDenied');
	}
	var msg = el('p', {'class': 'cl-msg', id: 'cl-msg', role: 'status', 'aria-live': 'polite'});
	function say(text){ msg.textContent = text || ''; }
	function hashParam(name){ var m = new RegExp('(?:^#|&)' + name + '=([^&]*)').exec(location.hash); return m ? decodeURIComponent(m[1]) : null; }
	// the part of a plan link after '#', without what is not the plan's (i=, class=)
	function planFragment(text){
		var s = String(text || '');
		var hash = s.indexOf('#') >= 0 ? s.slice(s.indexOf('#') + 1) : s;
		var keep = hash.split('&').filter(function(p){ return /^(plan|c)=/.test(p); }).join('&');
		return PLAN.fromHash('#' + keep) ? keep : null;
	}
	function exercisesOf(fragment){
		var p = PLAN.fromHash('#' + (fragment || ''));
		return p ? p.plan.items.map(function(x){ return x.file; }).filter(function(f){ return /^ex[A-Z]/.test(f); }) : [];
	}
	function studentLink(fragment, code){
		var dir = location.href.replace(/[#?].*$/, '').replace(/[^/]*$/, '');
		return dir + 'plan.html#' + fragment + '&class=' + code;
	}

	function render(){
		root.textContent = '';
		say('');
		if(!C.enabled()){
			root.appendChild(el('p', {'class': 'class-setup-note tp-box'}, t('clNotSetUp')));
			return;
		}
		var who = C.teacher();
		if(!who) return renderSignIn();
		var bar = el('div', {'class': 'cl-who'});
		bar.appendChild(el('span', {id: 'cl-who'}, t('clSignedInAs', {email: who.email || ''})));
		var out = button('cl-signout', t('clSignOut'));
		out.addEventListener('click', function(){ C.signOut().then(function(){ location.hash = ''; render(); }); });
		bar.appendChild(out);
		root.appendChild(bar);
		root.appendChild(msg);
		var code = hashParam('class');
		if(code) renderClass(code);
		else renderHome(who);
	}

	function renderSignIn(){
		root.appendChild(el('p', {'class': 'lead'}, t('clIntro')));
		var box = el('form', {'class': 'tp-box cl-auth', id: 'cl-auth'});
		box.addEventListener('submit', function(e){ e.preventDefault(); });
		var email = el('input', {type: 'email', id: 'cl-email', autocomplete: 'username', placeholder: t('clEmail'), 'aria-label': t('clEmail')});
		var pass = el('input', {type: 'password', id: 'cl-password', autocomplete: 'current-password', placeholder: t('clPassword'), 'aria-label': t('clPassword')});
		var row = el('div', {'class': 'tp-row'});
		var signIn = button('cl-signin', t('clSignIn'), 'primary'), signUp = button('cl-signup', t('clSignUp')), reset = button('cl-reset', t('clReset'));
		[signIn, signUp, reset].forEach(function(b){ row.appendChild(b); });
		[email, pass, row].forEach(function(x){ box.appendChild(x); });
		root.appendChild(box);
		root.appendChild(msg);
		signIn.addEventListener('click', function(){ C.signIn(email.value.trim(), pass.value).then(render, function(e){ say(errorText(e)); }); });
		signUp.addEventListener('click', function(){ C.signUp(email.value.trim(), pass.value).then(render, function(e){ say(errorText(e)); }); });
		reset.addEventListener('click', function(){ C.resetPassword(email.value.trim()).then(function(){ say(t('clResetSent')); }, function(e){ say(errorText(e)); }); });
	}

	function renderHome(who){
		var verify = el('div', {'class': 'tp-box cl-verify', id: 'cl-verify'});
		verify.appendChild(el('p', {}, t('clVerifyNote')));
		var vrow = el('div', {'class': 'tp-row'});
		var recheck = button('cl-recheck', t('clRecheck'), 'primary'), resend = button('cl-resend', t('clResend'));
		vrow.appendChild(recheck); vrow.appendChild(resend);
		verify.appendChild(vrow);
		verify.hidden = who.emailVerified;
		root.appendChild(verify);
		recheck.addEventListener('click', function(){ C.refreshTeacher().then(render, function(e){ say(errorText(e)); }); });
		resend.addEventListener('click', function(){ C.sendVerification().then(function(){ say(t('clVerifySent')); }, function(e){ say(errorText(e)); }); });

		// a new class
		var form = el('div', {'class': 'tp-box cl-new', id: 'cl-new'});
		form.appendChild(el('h2', {}, t('clNewClass')));
		var name = el('input', {type: 'text', id: 'cl-name', maxlength: '80', placeholder: t('clName'), 'aria-label': t('clName')});
		var plan = el('input', {type: 'text', id: 'cl-plan', placeholder: t('clPlanLink'), 'aria-label': t('clPlanLink')});
		plan.value = planFragment(location.hash.slice(1)) || '';
		var create = button('cl-create', t('clCreate'), 'primary');
		create.disabled = !who.emailVerified;
		[name, plan, el('p', {'class': 'tp-hint'}, t('clPlanHint')), create].forEach(function(x){ form.appendChild(x); });
		root.appendChild(form);
		create.addEventListener('click', function(){
			var fragment = planFragment(plan.value);
			if(!name.value.trim()) return say(t('clErrName'));
			if(!fragment) return say(t('clErrPlan'));
			C.createClass(name.value.trim(), fragment).then(function(code){ location.hash = 'class=' + code; }, function(e){ say(errorText(e)); });
		});

		// my classes
		var mine = el('div', {'class': 'tp-box', id: 'cl-classes'});
		mine.appendChild(el('h2', {}, t('clMyClasses')));
		var list = el('div', {'class': 'cl-list'}, t('clLoading'));
		mine.appendChild(list);
		root.appendChild(mine);
		C.myClasses().then(function(classes){
			list.textContent = classes.length ? '' : t('clNoClasses');
			classes.forEach(function(c){
				var row = el('div', {'class': 'cl-class'});
				row.appendChild(el('strong', {}, c.name));
				row.appendChild(el('code', {}, c.code));
				if(!c.open) row.appendChild(el('span', {'class': 'cl-closed'}, t('clClosed')));
				var open = el('a', {'class': 'tp-btn', href: '#class=' + c.code}, t('clOpenClass'));
				row.appendChild(open);
				list.appendChild(row);
			});
		}, function(e){ list.textContent = errorText(e); });
	}

	function renderClass(code){
		var view = el('div', {'class': 'cl-view', id: 'cl-view'});
		view.appendChild(el('a', {'class': 'cl-back', href: '#'}, t('clBack')));
		var title = el('h2', {}, code);
		view.appendChild(title);
		root.appendChild(view);
		var info = null;
		C.myClasses().then(function(classes){
			info = classes.filter(function(c){ return c.code === code; })[0];
			if(!info){ title.textContent = code; say(t('clErrDenied')); return; }
			title.textContent = info.name + ' · ' + code;
			if(!info.open) title.appendChild(el('span', {'class': 'cl-closed'}, t('clClosed')));

			var linkBox = el('div', {'class': 'tp-box'});
			linkBox.appendChild(el('h3', {}, t('clStudentLink')));
			var link = el('input', {type: 'text', readonly: '', 'class': 'cl-link', 'aria-label': t('clStudentLink')});
			link.value = studentLink(info.plan, code);
			var copy = button('cl-copy', t('clCopy'));
			copy.addEventListener('click', function(){ link.select(); try { navigator.clipboard.writeText(link.value); } catch(e) { try { document.execCommand('copy'); } catch(x) {} } });
			linkBox.appendChild(link);
			linkBox.appendChild(copy);
			view.appendChild(linkBox);

			var tools = el('div', {'class': 'tp-row cl-tools'});
			var refresh = button('cl-refresh', t('clRefresh'), 'primary');
			var toggle = button('cl-toggle-open', info.open ? t('clCloseJoin') : t('clOpenJoin'));
			var del = button('cl-delete-class', t('clDeleteClass'), 'danger');
			[refresh, toggle, del].forEach(function(b){ tools.appendChild(b); });
			view.appendChild(tools);
			var confirmBox = el('div', {'class': 'tp-box cl-confirm', hidden: ''});
			confirmBox.appendChild(el('p', {}, t('clDeleteHint', {code: code})));
			var confirmCode = el('input', {type: 'text', id: 'cl-confirm-code', autocomplete: 'off', 'aria-label': t('clDeleteHint', {code: code})});
			var confirmBtn = button('cl-confirm-delete', t('clConfirmDelete'), 'danger');
			confirmBtn.disabled = true;
			confirmBox.appendChild(confirmCode);
			confirmBox.appendChild(confirmBtn);
			view.appendChild(confirmBox);

			var tableBox = el('div', {'class': 'cl-table-box'});
			view.appendChild(tableBox);
			var attempts = el('div', {'class': 'tp-box cl-attempts', id: 'cl-attempts', hidden: ''});
			view.appendChild(attempts);

			refresh.addEventListener('click', function(){ loadTable(); });
			toggle.addEventListener('click', function(){
				C.setOpen(code, !info.open).then(function(){ info.open = !info.open; render(); }, function(e){ say(errorText(e)); });
			});
			del.addEventListener('click', function(){ confirmBox.hidden = false; confirmCode.focus(); });
			confirmCode.addEventListener('input', function(){ confirmBtn.disabled = confirmCode.value.trim().toUpperCase() !== code; });
			confirmBtn.addEventListener('click', function(){
				say(t('clLoading'));
				C.deleteClass(code).then(function(){ location.hash = ''; render(); }, function(e){ say(errorText(e)); });
			});

			function loadTable(){
				var files = exercisesOf(info.plan);
				tableBox.textContent = t('clLoading');
				C.listStudents(code).then(function(students){
					tableBox.textContent = '';
					if(!files.length) tableBox.appendChild(el('p', {}, t('clNoExercises')));
					if(!students.length){ tableBox.appendChild(el('p', {}, t('clNoStudents'))); return; }
					var table = el('table', {'class': 'cl-table'});
					var head = el('tr');
					head.appendChild(el('th', {}, t('clStudent')));
					files.forEach(function(f){ head.appendChild(el('th', {}, titleOf(f))); });
					var thead = el('thead'); thead.appendChild(head); table.appendChild(thead);
					var body = el('tbody');
					students.sort(function(a, b){ return String(a.nick).localeCompare(String(b.nick), lang); }).forEach(function(s){
						var tr = el('tr', {'data-uid': s.uid});
						var th = el('th', {}, s.nick);
						var rm = el('button', {type: 'button', 'class': 'cl-del-student', title: t('clDeleteStudent')}, '✕');
						rm.addEventListener('click', function(){
							if(!window.confirm(t('clDeleteStudentQ', {nick: s.nick}))) return;
							C.deleteStudent(code, s.uid).then(loadTable, function(e){ say(errorText(e)); });
						});
						th.appendChild(rm);
						tr.appendChild(th);
						files.forEach(function(f){
							var p = (s.progress || {})[f];
							var td = el('td', {'class': 'cl-cell' + (p && p.done ? ' done' : p ? ' tried' : ''), 'data-file': f, tabindex: '0'},
							            p ? (p.done ? '✓ ' : '') + (p.attempts || 0) : '—');
							td.addEventListener('click', function(){ openAttempts(s, f); });
							td.addEventListener('keydown', function(e){ if(e.key === 'Enter') openAttempts(s, f); });
							tr.appendChild(td);
						});
						body.appendChild(tr);
					});
					table.appendChild(body);
					tableBox.appendChild(table);
				}, function(e){ tableBox.textContent = errorText(e); });
			}
			function openAttempts(s, file){
				attempts.hidden = false;
				attempts.textContent = '';
				attempts.appendChild(el('h3', {}, t('clAttemptsOf', {nick: s.nick, exercise: titleOf(file)})));
				var box = el('div', {'class': 'ex-hist-list'}, t('clLoading'));
				attempts.appendChild(box);
				C.listAttempts(code, s.uid, file).then(function(list){
					box.textContent = list.length ? '' : t('clNoAttempts');
					list.forEach(function(h){
						box.appendChild(window.dsvAttemptView(h, {
							label: function(r){ return r.label || ''; },
							issue: function(x){ return x.results && x.results[0] ? x.results[0].label : x.error ? String(x.error).split('\n')[0] : t(x.kind === 'pass' ? 'exHistPass' : x.kind === 'error' ? 'exHistError' : 'exHistFail'); },
							when: when, load: null, note: null}));
					});
					attempts.scrollIntoView({block: 'nearest'});
				}, function(e){ box.textContent = errorText(e); });
			}
			loadTable();
		}, function(e){ say(errorText(e)); });
	}

	window.addEventListener('hashchange', render);
	render();
})();
