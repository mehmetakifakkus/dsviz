/*
 * The classroom's data layer: window.dsvClassroom.
 *
 * Teachers (e-mail and password, a verified e-mail to open a class) open classes tied to a lesson plan;
 * students join with a nickname (an anonymous account) and their exercise checks are written under the class.
 *
 *   classes/{code}                               {name, ownerUid, plan, open, createdAt}
 *   classes/{code}/students/{uid}                {nick, joinedAt, updatedAt, progress: {file: {done, attempts}}}
 *   classes/{code}/students/{uid}/attempts/{id}  {file, t, lang, code, kind, error, results (JSON text)}
 *
 * Two backends behind the same functions: Firebase's REST endpoints (no SDK, nothing loaded from outside),
 * and, for the tests, a fake that keeps its data in localStorage and applies the permissions of
 * firestore.rules (window.dsvClassroomFake = true). Every asynchronous function returns a Promise that
 * rejects with {code, message}; code: denied, not-found, exists, auth, network, unverified, config.
 * Nothing here makes a request unless a teacher or a joined student calls it.
 */
(function(){
	var ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
	var TKEY = 'dsv-teacher', CKEY = 'dsv-class', QKEY = 'dsv-class-queue', FKEY = 'dsv-fake-firestore';
	var KEEP = 10, CODE_MAX = 5000;

	function fail(code, message){ return {code: code, message: message || code}; }
	function rejected(code, message){ return Promise.reject(fail(code, message)); }
	function load(key){ try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch(e) { return null; } }
	function save(key, value){
		try { if(value === null) localStorage.removeItem(key); else localStorage.setItem(key, JSON.stringify(value)); } catch(e) {}
	}
	function now(){ return new Date().toISOString(); }
	function newCode(){
		var s = '';
		for(var i = 0; i < 6; i++) s += ALPHABET.charAt(Math.floor(Math.random() * ALPHABET.length));
		return s;
	}
	function config(){ var c = window.dsvFirebaseConfig; return c && c.apiKey && c.projectId ? c : null; }
	function backend(){ return window.dsvClassroomFake === true ? fake : config() ? rest : null; }

	// ---------------------------------------------------------------- the REST backend
	var rest = (function(){
		function base(){ return 'https://firestore.googleapis.com/v1/projects/' + config().projectId + '/databases/(default)/documents'; }
		function authUrl(method){ return 'https://identitytoolkit.googleapis.com/v1/accounts:' + method + '?key=' + encodeURIComponent(config().apiKey); }

		function http(method, url, body, token, form){
			var headers = {};
			if(token) headers.Authorization = 'Bearer ' + token;
			if(body !== undefined) headers['Content-Type'] = form ? 'application/x-www-form-urlencoded' : 'application/json';
			return fetch(url, {method: method, headers: headers, body: body === undefined ? undefined : form ? body : JSON.stringify(body)})
				.then(function(res){
					return res.text().then(function(text){
						var data = null;
						try { data = text ? JSON.parse(text) : null; } catch(e) {}
						if(res.ok) return data;
						var status = data && data.error && (data.error.status || data.error.message) || '';
						if(res.status === 401 || status === 'UNAUTHENTICATED') throw fail('unauthenticated', status);
						if(res.status === 403 || status === 'PERMISSION_DENIED') throw fail('denied', status);
						if(res.status === 404 || status === 'NOT_FOUND') throw fail('not-found', status);
						if(res.status === 409 || status === 'ALREADY_EXISTS') throw fail('exists', status);
						if(status === 'FAILED_PRECONDITION') throw fail('not-found', status);
						throw fail('auth', status || String(res.status));
					});
				}, function(){ throw fail('network'); });
		}

		function asSession(r, email){
			return {uid: r.localId || r.user_id, email: r.email || email || null, idToken: r.idToken || r.id_token,
			        refreshToken: r.refreshToken || r.refresh_token, expires: Date.now() + 1000 * Number(r.expiresIn || r.expires_in || 3600)};
		}
		function refresh(s){
			return http('POST', 'https://securetoken.googleapis.com/v1/token?key=' + encodeURIComponent(config().apiKey),
			            'grant_type=refresh_token&refresh_token=' + encodeURIComponent(s.refreshToken), null, true)
				.then(function(r){ var n = asSession(r, s.email); n.uid = n.uid || s.uid; n.emailVerified = s.emailVerified; return n; });
		}
		// a call with a session; an expired token is refreshed once (the holder keeps the new one)
		function withToken(holder, run){
			var s = holder.get();
			if(!s) return rejected('auth', 'signed out');
			var fresh = s.expires > Date.now() + 60000 ? Promise.resolve(s) : refresh(s).then(function(n){ holder.set(n); return n; });
			return fresh.then(function(t){
				return run(t.idToken).catch(function(e){
					if(e.code !== 'unauthenticated') throw e;
					return refresh(t).then(function(n){ holder.set(n); return run(n.idToken); });
				});
			}).catch(function(e){ if(e.code === 'unauthenticated') throw fail('auth', 'session'); throw e; });
		}

		function toValue(v){
			if(v === null || v === undefined) return {nullValue: null};
			if(typeof v === 'boolean') return {booleanValue: v};
			if(typeof v === 'number') return v % 1 === 0 ? {integerValue: String(v)} : {doubleValue: v};
			if(typeof v === 'string') return {stringValue: v};
			if(Array.isArray(v)) return {arrayValue: {values: v.map(toValue)}};
			return {mapValue: {fields: toFields(v)}};
		}
		function toFields(obj){ var f = {}; Object.keys(obj).forEach(function(k){ f[k] = toValue(obj[k]); }); return f; }
		function fromValue(v){
			if('stringValue' in v) return v.stringValue;
			if('integerValue' in v) return Number(v.integerValue);
			if('doubleValue' in v) return Number(v.doubleValue);
			if('booleanValue' in v) return v.booleanValue;
			if('timestampValue' in v) return v.timestampValue;
			if('arrayValue' in v) return (v.arrayValue.values || []).map(fromValue);
			if('mapValue' in v) return fromFields(v.mapValue.fields || {});
			return null;
		}
		function fromFields(fields){ var o = {}; Object.keys(fields || {}).forEach(function(k){ o[k] = fromValue(fields[k]); }); return o; }
		function idOf(name){ return String(name).split('/').pop(); }

		return {
			signUpEmail: function(email, password){ return http('POST', authUrl('signUp'), {email: email, password: password, returnSecureToken: true}).then(function(r){ return asSession(r, email); }); },
			signInEmail: function(email, password){ return http('POST', authUrl('signInWithPassword'), {email: email, password: password, returnSecureToken: true}).then(function(r){ return asSession(r, email); }); },
			signUpAnon: function(){ return http('POST', authUrl('signUp'), {returnSecureToken: true}).then(function(r){ return asSession(r); }); },
			lookup: function(holder){ return withToken(holder, function(tok){ return http('POST', authUrl('lookup'), {idToken: tok}); }).then(function(r){ var u = (r && r.users || [])[0] || {}; return {email: u.email, emailVerified: u.emailVerified === true}; }); },
			forceRefresh: function(holder){ var s = holder.get(); return refresh(s).then(function(n){ holder.set(n); return n; }); },
			sendVerification: function(holder){ return withToken(holder, function(tok){ return http('POST', authUrl('sendOobCode'), {requestType: 'VERIFY_EMAIL', idToken: tok}); }); },
			resetPassword: function(email){ return http('POST', authUrl('sendOobCode'), {requestType: 'PASSWORD_RESET', email: email}); },
			get: function(holder, path){
				return withToken(holder, function(tok){ return http('GET', base() + '/' + path, undefined, tok); })
					.then(function(d){ return fromFields(d.fields); }, function(e){ if(e.code === 'not-found') return null; throw e; });
			},
			create: function(holder, parent, collection, id, data){
				var url = base() + (parent ? '/' + parent : '') + '/' + collection + (id ? '?documentId=' + encodeURIComponent(id) : '');
				return withToken(holder, function(tok){ return http('POST', url, {fields: toFields(data)}, tok); }).then(function(d){ return idOf(d && d.name || id); });
			},
			patch: function(holder, path, data){ // the document must exist
				var mask = Object.keys(data).map(function(k){ return 'updateMask.fieldPaths=' + encodeURIComponent(k); }).join('&');
				return withToken(holder, function(tok){ return http('PATCH', base() + '/' + path + '?' + mask + '&currentDocument.exists=true', {fields: toFields(data)}, tok); });
			},
			remove: function(holder, path){ return withToken(holder, function(tok){ return http('DELETE', base() + '/' + path, undefined, tok); }); },
			query: function(holder, parent, collection, where){
				var q = {from: [{collectionId: collection}]};
				if(where) q.where = {fieldFilter: {field: {fieldPath: where[0]}, op: 'EQUAL', value: toValue(where[1])}};
				return withToken(holder, function(tok){ return http('POST', base() + (parent ? '/' + parent : '') + ':runQuery', {structuredQuery: q}, tok); })
					.then(function(rows){ return (rows || []).filter(function(r){ return r && r.document; }).map(function(r){ return {id: idOf(r.document.name), data: fromFields(r.document.fields)}; }); });
			}
		};
	})();

	// ---------------------------------------------------------------- the fake backend (tests)
	var fake = (function(){
		var api = {offline: false, failAfterDeletes: null};
		var deletes = 0;
		function db(){ var d = load(FKEY); return d && d.docs ? d : {docs: {}, users: {}}; }
		function put(d){ save(FKEY, d); }
		function net(){ if(api.offline) throw fail('network'); }
		function who(holder){ var s = holder.get(); if(!s) throw fail('auth', 'signed out'); return s; }
		function parts(path){ return path.split('/'); }
		// the permissions of firestore.rules
		function owner(d, code, uid){ var c = d.docs['classes/' + code]; return !!c && c.ownerUid === uid; }
		function canRead(d, path, uid){
			var p = parts(path);
			if(p.length === 2) return true;
			return p[3] === uid || owner(d, p[1], uid);
		}
		function canWrite(d, op, path, data, s){
			var p = parts(path), users = d.users[s.uid] || {};
			if(p.length === 2){
				var c = d.docs[path];
				if(op === 'create') return users.verified === true && data.ownerUid === s.uid && typeof data.open === 'boolean';
				return !!c && c.ownerUid === s.uid && (op === 'delete' || data.ownerUid === undefined || data.ownerUid === s.uid);
			}
			var mine = p[3] === s.uid, cls = d.docs['classes/' + p[1]];
			if(p.length === 4){
				if(op === 'create') return mine && !!cls && cls.open === true && typeof data.nick === 'string' && data.nick.length >= 1 && data.nick.length <= 30;
				if(op === 'update') return mine;
				return mine || owner(d, p[1], s.uid);
			}
			if(op === 'create') return mine && !!d.docs[p.slice(0, 4).join('/')] && String(data.code || '').length <= CODE_MAX && /^(pass|fail|error)$/.test(data.kind);
			if(op === 'update') return false;
			return mine || owner(d, p[1], s.uid);
		}
		function session(uid, email){ return {uid: uid, email: email || null, idToken: 'fake-' + uid, refreshToken: 'fake', expires: Date.now() + 3600000}; }
		function go(work){ return new Promise(function(resolve){ resolve(work()); }); }
		var n = 0;
		function newId(){ n++; return 'id' + Date.now().toString(36) + n + Math.random().toString(36).slice(2, 6); }

		api.signUpEmail = function(email, password){ return go(function(){ net(); var d = db(); for(var k in d.users) if(d.users[k].email === email) throw fail('auth', 'EMAIL_EXISTS'); var uid = newId(); d.users[uid] = {email: email, password: password, verified: false}; put(d); return session(uid, email); }); };
		api.signInEmail = function(email, password){ return go(function(){ net(); var d = db(); for(var k in d.users) if(d.users[k].email === email && d.users[k].password === password) return session(k, email); throw fail('auth', 'INVALID_LOGIN_CREDENTIALS'); }); };
		api.signUpAnon = function(){ return go(function(){ net(); var d = db(), uid = newId(); d.users[uid] = {anonymous: true}; put(d); return session(uid); }); };
		api.lookup = function(holder){ return go(function(){ net(); var s = who(holder), u = db().users[s.uid] || {}; return {email: u.email, emailVerified: u.verified === true}; }); };
		api.forceRefresh = function(holder){ return go(function(){ var s = who(holder); var t = session(s.uid, s.email); t.emailVerified = s.emailVerified; holder.set(t); return t; }); };
		api.sendVerification = function(){ return go(function(){ net(); return null; }); };
		api.resetPassword = function(){ return go(function(){ net(); return null; }); };
		api.get = function(holder, path){ return go(function(){ net(); var s = who(holder), d = db(); if(!canRead(d, path, s.uid)) throw fail('denied'); var v = d.docs[path]; return v ? JSON.parse(JSON.stringify(v)) : null; }); };
		api.create = function(holder, parent, collection, id, data){
			return go(function(){
				net(); var s = who(holder), d = db(), key = (parent ? parent + '/' : '') + collection + '/' + (id || newId());
				if(d.docs[key]) throw fail('exists');
				if(!canWrite(d, 'create', key, data, s)) throw fail('denied');
				d.docs[key] = JSON.parse(JSON.stringify(data)); put(d); return key.split('/').pop();
			});
		};
		api.patch = function(holder, path, data){
			return go(function(){
				net(); var s = who(holder), d = db();
				if(!d.docs[path]) throw fail('not-found');
				if(!canWrite(d, 'update', path, data, s)) throw fail('denied');
				Object.keys(data).forEach(function(k){ d.docs[path][k] = JSON.parse(JSON.stringify(data[k])); }); put(d); return null;
			});
		};
		api.remove = function(holder, path){
			return go(function(){
				net(); var s = who(holder), d = db();
				if(api.failAfterDeletes !== null && deletes >= api.failAfterDeletes) throw fail('network');
				if(!d.docs[path]) return null;
				if(!canWrite(d, 'delete', path, {}, s)) throw fail('denied');
				deletes++;
				delete d.docs[path]; put(d); return null;
			});
		};
		api.query = function(holder, parent, collection, where){
			return go(function(){
				net(); var s = who(holder), d = db(), prefix = (parent ? parent + '/' : '') + collection + '/', out = [];
				if(parent && !canRead(d, parent + '/' + collection + '/x', s.uid)) throw fail('denied');
				Object.keys(d.docs).forEach(function(k){
					if(k.indexOf(prefix) !== 0 || k.slice(prefix.length).indexOf('/') >= 0) return;
					var v = d.docs[k];
					if(where && v[where[0]] !== where[1]) return;
					out.push({id: k.slice(prefix.length), data: JSON.parse(JSON.stringify(v))});
				});
				return out;
			});
		};
		// test hooks
		api.verify = function(email){ var d = db(); for(var k in d.users) if(d.users[k].email === email) d.users[k].verified = true; put(d); };
		api.dump = function(){ return db(); };
		api.uidOf = function(nick){ var d = db(); for(var k in d.docs) if(d.docs[k].nick === nick) return k.split('/')[3]; return null; };
		api.becomeStudent = function(code, uid){ var c = db().docs['classes/' + code] || {}; var m = session(uid); m.code = code; m.nick = (db().docs['classes/' + code + '/students/' + uid] || {}).nick; m.className = c.name; m.plan = c.plan; m.progress = {}; save(CKEY, m); };
		return api;
	})();

	// ---------------------------------------------------------------- the functions pages call
	var teacherHolder = {get: function(){ return load(TKEY); }, set: function(s){ var old = load(TKEY) || {}; s.emailVerified = s.emailVerified === undefined ? old.emailVerified : s.emailVerified; save(TKEY, s); }};
	var studentHolder = {get: function(){ return load(CKEY); }, set: function(s){ var m = load(CKEY); if(!m) return; ['idToken', 'refreshToken', 'expires'].forEach(function(k){ m[k] = s[k]; }); save(CKEY, m); }};
	function use(){ var b = backend(); if(!b) throw fail('config'); return b; }
	function run(work){ return new Promise(function(resolve){ resolve(work(use())); }); }
	function publicTeacher(s){ return s ? {uid: s.uid, email: s.email, emailVerified: s.emailVerified === true} : null; }

	var C = {
		enabled: function(){ return !!backend(); },
		teacher: function(){ return publicTeacher(load(TKEY)); },
		signUp: function(email, password){ return run(function(b){ return b.signUpEmail(email, password).then(function(s){ s.emailVerified = false; save(TKEY, s); return b.sendVerification(teacherHolder).then(function(){ return publicTeacher(s); }); }); }); },
		signIn: function(email, password){ return run(function(b){ return b.signInEmail(email, password).then(function(s){ save(TKEY, s); return C.refreshTeacher(); }); }); },
		signOut: function(){ save(TKEY, null); return Promise.resolve(null); },
		resetPassword: function(email){ return run(function(b){ return b.resetPassword(email).then(function(){ return null; }); }); },
		sendVerification: function(){ return run(function(b){ return b.sendVerification(teacherHolder).then(function(){ return null; }); }); },
		refreshTeacher: function(){ // reads emailVerified again; a new token carries it to the rules
			return run(function(b){
				return b.lookup(teacherHolder).then(function(info){
					return b.forceRefresh(teacherHolder).then(function(){ var s = load(TKEY); s.emailVerified = info.emailVerified; save(TKEY, s); return publicTeacher(s); });
				});
			});
		},
		createClass: function(name, plan){
			return run(function(b){
				var t = load(TKEY);
				if(!t) throw fail('auth', 'signed out');
				if(t.emailVerified !== true) throw fail('unverified');
				if(String(plan || '').length > 8000) throw fail('denied', 'plan too long');
				var tries = 0;
				function attempt(){
					var code = newCode();
					return b.create(teacherHolder, '', 'classes', code, {name: String(name).slice(0, 80), ownerUid: t.uid, plan: String(plan || ''), open: true, createdAt: now()})
						.then(function(){ return code; }, function(e){ if(e.code === 'exists' && ++tries < 6) return attempt(); throw e; });
				}
				return attempt();
			});
		},
		myClasses: function(){ return run(function(b){ var t = load(TKEY); if(!t) throw fail('auth'); return b.query(teacherHolder, '', 'classes', ['ownerUid', t.uid]).then(function(rows){ return rows.map(function(r){ return {code: r.id, name: r.data.name, open: r.data.open, plan: r.data.plan, createdAt: r.data.createdAt}; }).sort(function(a, x){ return String(x.createdAt).localeCompare(String(a.createdAt)); }); }); }); },
		setOpen: function(code, open){ return run(function(b){ return b.patch(teacherHolder, 'classes/' + code, {open: !!open}).then(function(){ return null; }); }); },
		getClass: function(code){ return run(function(b){ return b.get(teacherHolder.get() ? teacherHolder : studentHolder, 'classes/' + code).then(function(c){ return c ? {code: code, name: c.name, open: c.open, plan: c.plan} : null; }); }); },
		listStudents: function(code){ return run(function(b){ return b.query(teacherHolder, 'classes/' + code, 'students').then(function(rows){ return rows.map(function(r){ return {uid: r.id, nick: r.data.nick, progress: r.data.progress || {}, updatedAt: r.data.updatedAt}; }); }); }); },
		listAttempts: function(code, uid, file){ return run(function(b){ return attemptsOf(b, teacherHolder, code, uid, file).then(function(rows){ return rows.map(function(r){ return r.record; }); }); }); },
		deleteStudent: function(code, uid){ return run(function(b){ return removeStudent(b, teacherHolder, code, uid); }); },
		deleteClass: function(code){
			return run(function(b){
				return b.query(teacherHolder, 'classes/' + code, 'students').then(function(rows){
					return rows.reduce(function(p, r){ return p.then(function(){ return removeStudent(b, teacherHolder, code, r.id); }); }, Promise.resolve());
				}).then(function(){ return b.remove(teacherHolder, 'classes/' + code); }).then(function(){ return null; });
			});
		},

		membership: function(){ var m = load(CKEY); return m ? {code: m.code, uid: m.uid, nick: m.nick, className: m.className, plan: m.plan} : null; },
		join: function(code, nick){
			return run(function(b){
				nick = String(nick || '').trim().slice(0, 30);
				if(!nick) throw fail('denied', 'nickname');
				return b.signUpAnon().then(function(s){
					var holder = {get: function(){ return s; }, set: function(n){ s = n; }};
					return b.get(holder, 'classes/' + code).then(function(c){
						if(!c) throw fail('not-found');
						if(c.open !== true) throw fail('denied', 'closed');
						return b.create(holder, 'classes/' + code, 'students', s.uid, {nick: nick, joinedAt: now(), updatedAt: now(), progress: {}}).then(function(){
							var m = {code: code, uid: s.uid, nick: nick, className: c.name, plan: c.plan, progress: {}, idToken: s.idToken, refreshToken: s.refreshToken, expires: s.expires};
							save(CKEY, m);
							save(QKEY, null);
							return C.membership();
						});
					});
				});
			});
		},
		leave: function(deleteMine){
			var m = load(CKEY);
			function forget(){ save(CKEY, null); save(QKEY, null); return null; }
			if(!m || !deleteMine) return Promise.resolve(forget());
			return run(function(b){ return removeStudent(b, studentHolder, m.code, m.uid).then(forget, forget); });
		},
		send: function(file, record, progress){
			if(!load(CKEY)) return Promise.resolve({skipped: true});
			var q = load(QKEY) || [];
			q.push({file: file, record: record, progress: progress || {}});
			save(QKEY, q.slice(-50));
			return C.flush();
		},
		flush: function(){
			var b = backend();
			if(!b || !load(CKEY)) return Promise.resolve({skipped: true});
			function next(){
				var q = load(QKEY) || [], m = load(CKEY);
				if(!q.length || !m) return Promise.resolve({sent: true});
				var item = q[0], r = item.record || {};
				var base = 'classes/' + m.code + '/students/' + m.uid;
				Object.keys(item.progress || {}).forEach(function(k){ m.progress = m.progress || {}; m.progress[k] = item.progress[k]; });
				return b.create(studentHolder, base, 'attempts', null, {file: String(item.file).slice(0, 80), t: r.t || now(), lang: r.lang || 'dugum', code: String(r.code || '').slice(0, CODE_MAX),
				                                                       kind: /^(pass|fail|error)$/.test(r.kind) ? r.kind : 'fail', error: r.error ? String(r.error).slice(0, 4000) : null, results: resultsText(r.results)})
					.then(function(){ return b.patch(studentHolder, base, {progress: m.progress || {}, updatedAt: now()}); })
					.then(function(){ save(CKEY, Object.assign(load(CKEY) || {}, {progress: m.progress})); return prune(b, studentHolder, m.code, m.uid, item.file); })
					.then(function(){ var rest2 = load(QKEY) || []; rest2.shift(); save(QKEY, rest2); return next(); });
			}
			return next().catch(function(e){
				if(e.code === 'denied' || e.code === 'not-found'){ save(CKEY, null); save(QKEY, null); return {removed: true}; }
				return {queued: true};
			});
		},
		_fake: fake
	};

	// the limits of firestore.rules: results as JSON text of at most 60000 characters (a larger one is left out)
	function resultsText(results){ var text = JSON.stringify(results || []); return text.length <= 60000 ? text : '[]'; }

	function attemptsOf(b, holder, code, uid, file){
		return b.query(holder, 'classes/' + code + '/students/' + uid, 'attempts', file ? ['file', file] : null).then(function(rows){
			return rows.map(function(r){
				var rec = r.data, results;
				try { results = JSON.parse(rec.results || '[]'); } catch(e) { results = []; }
				return {id: r.id, record: {file: rec.file, t: rec.t, lang: rec.lang, code: rec.code, kind: rec.kind, error: rec.error, results: results}};
			}).sort(function(a, x){ return String(x.record.t).localeCompare(String(a.record.t)); });
		});
	}
	function prune(b, holder, code, uid, file){
		return attemptsOf(b, holder, code, uid, file).then(function(rows){
			return rows.slice(KEEP).reduce(function(p, r){ return p.then(function(){ return b.remove(holder, 'classes/' + code + '/students/' + uid + '/attempts/' + r.id); }); }, Promise.resolve());
		});
	}
	function removeStudent(b, holder, code, uid){
		return attemptsOf(b, holder, code, uid, null).then(function(rows){
			return rows.reduce(function(p, r){ return p.then(function(){ return b.remove(holder, 'classes/' + code + '/students/' + uid + '/attempts/' + r.id); }); }, Promise.resolve());
		}).then(function(){ return b.remove(holder, 'classes/' + code + '/students/' + uid); }).then(function(){ return null; });
	}

	window.dsvClassroom = C;
})();
