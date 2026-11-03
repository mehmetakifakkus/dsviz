/*
 * Builds the page chrome around the lesson content of every page: top bar (examples menu,
 * settings), the drawer with all examples, the visualisation card (canvas, variables,
 * output, command prompt) and the previous/next links. A page itself only contains
 * <main class="lesson">.
 *
 * Languages: texts come from js/i18n.js (dsv.t). A page has its headings and explanations
 * in every language (elements with data-lang="tr|en|de"); only the chosen language is
 * kept. A code block can have a variant per language (comments, a few names):
 * <script type="text/plain" class="code-variant" data-for="text2" data-lang="en">.
 *
 * Must run before js/editorSettings.js and js/linkedlist.js: they look for #command,
 * #output and #myCanvas0.
 *
 * To add an example: create the page and add one line to EXAMPLES.
 */
(function(){

	var dsv = window.dsv;
	var t = dsv.t, lang = dsv.settings.lang;

	var EXAMPLES = [
		{ group: {tr: 'Başlarken', en: 'Getting started', de: 'Erste Schritte'}, items: [
			['language.html', {tr: 'Düğüm dili rehberi', en: 'Guide to the Düğüm language', de: 'Leitfaden zur Sprache Düğüm'}]
		]},
		{ group: {tr: 'Listeyi dolaşma', en: 'Traversal', de: 'Durchlaufen'}, items: [
			['lengthOfALinkedList.html', {tr: 'Listenin uzunluğunu bulma', en: 'Length of a list', de: 'Länge einer Liste'}],
			['sumMaxAndSearchInALinkedList.html', {tr: 'Toplam, en büyük değer ve arama', en: 'Sum, maximum and search', de: 'Summe, Maximum und Suche'}]
		]},
		{ group: {tr: 'Ekleme ve silme', en: 'Insert and delete', de: 'Einfügen und löschen'}, items: [
			['insertAtTheHeadOfALinkedList.html', {tr: 'Başa düğüm ekleme', en: 'Insert at the head', de: 'Am Anfang einfügen'}],
			['appendAnItemOnTheLinkedList.html', {tr: 'Sona düğüm ekleme', en: 'Append at the end', de: 'Am Ende anhängen'}],
			['insertIntoASortedLinkedList.html', {tr: 'Sıralı listeye ekleme', en: 'Insert into a sorted list', de: 'In eine sortierte Liste einfügen'}],
			['deleteANodeFromALinkedList.html', {tr: 'Verilen değerdeki düğümü silme', en: 'Delete a node by value', de: 'Einen Knoten nach Wert löschen'}],
			['removeDuplicatesOnAlinkedList.html', {tr: 'Tekrar eden düğümleri silme', en: 'Remove duplicates', de: 'Duplikate entfernen'}]
		]},
		{ group: {tr: 'Pointer teknikleri', en: 'Pointer techniques', de: 'Zeigertechniken'}, items: [
			['reverseALinkedList.html', {tr: 'Listeyi ters çevirme', en: 'Reverse a list', de: 'Eine Liste umkehren'}],
			['findTheMiddleOfALinkedList.html', {tr: 'Ortadaki düğümü bulma', en: 'Find the middle node', de: 'Den mittleren Knoten finden'}],
			['kthNodeFromTheEnd.html', {tr: "Sondan k'ıncı düğümü bulma", en: 'k-th node from the end', de: 'k-ter Knoten vom Ende'}],
			['detectACycleInALinkedList.html', {tr: 'Döngü tespiti (Floyd)', en: 'Detect a cycle (Floyd)', de: 'Zyklus erkennen (Floyd)'}]
		]},
		{ group: {tr: 'Çift yönlü liste', en: 'Doubly linked list', de: 'Doppelt verkettete Liste'}, items: [
			['doublyLinkedList.html', {tr: 'İki yönde dolaşma', en: 'Traverse both ways', de: 'In beide Richtungen durchlaufen'}],
			['insertDeleteInADoublyLinkedList.html', {tr: 'Ekleme ve O(1) silme', en: 'Insert and O(1) delete', de: 'Einfügen und Löschen in O(1)'}],
			['reverseADoublyLinkedList.html', {tr: 'Çift yönlü listeyi ters çevirme', en: 'Reverse a doubly linked list', de: 'Doppelt verkettete Liste umkehren'}]
		]},
		{ group: {tr: 'Dairesel liste', en: 'Circular list', de: 'Zirkuläre Liste'}, items: [
			['circularLinkedList.html', {tr: 'Dolaşma, ekleme ve silme', en: 'Traverse, insert and delete', de: 'Durchlaufen, einfügen und löschen'}],
			['josephus.html', {tr: 'Josephus problemi', en: 'The Josephus problem', de: 'Das Josephus-Problem'}]
		]},
		{ group: {tr: 'Yığın ve kuyruk', en: 'Stack and queue', de: 'Stapel und Warteschlange'}, items: [
			['stack.html', {tr: 'Yığın (stack): push ve pop', en: 'Stack: push and pop', de: 'Stapel (Stack): push und pop'}],
			['queue.html', {tr: 'Kuyruk (queue): enqueue ve dequeue', en: 'Queue: enqueue and dequeue', de: 'Warteschlange (Queue): enqueue und dequeue'}],
			['arrayStackQueue.html', {tr: 'Dizi ile yığın ve kuyruk', en: 'Stack and queue with an array', de: 'Stapel und Warteschlange mit einem Array'}]
		]},
		{ group: {tr: 'Fonksiyonlar', en: 'Functions', de: 'Funktionen'}, items: [
			['functions.html', {tr: 'Fonksiyonlar: push ve pop', en: 'Functions: push and pop', de: 'Funktionen: push und pop'}],
			['recursion.html', {tr: 'Özyineleme (recursion)', en: 'Recursion', de: 'Rekursion'}]
		]},
		{ group: {tr: 'İki liste', en: 'Two lists', de: 'Zwei Listen'}, items: [
			['checkIfTwoLinkedListAreEqual.html', {tr: 'İki liste eşit mi?', en: 'Are two lists equal?', de: 'Sind zwei Listen gleich?'}],
			['compareLinkedListCheckOneIsGreater.html', {tr: 'İlk liste daha mı büyük?', en: 'Is the first list greater?', de: 'Ist die erste Liste größer?'}],
			['mergeTwoSortedLinkedLists.html', {tr: 'İki sıralı listeyi birleştirme', en: 'Merge two sorted lists', de: 'Zwei sortierte Listen zusammenführen'}]
		]},
		{ group: {tr: 'Sıralama', en: 'Sorting', de: 'Sortieren'}, items: [
			['bubbleSort.html', {tr: 'Kabarcık sıralama (değerleri değiştirerek)', en: 'Bubble sort (swapping values)', de: 'Bubblesort (Werte tauschen)'}],
			['insertionSort.html', {tr: 'Eklemeli sıralama (bağları değiştirerek)', en: 'Insertion sort (relinking nodes)', de: 'Insertion Sort (Knoten umhängen)'}],
			['mergeSort.html', {tr: 'Birleştirmeli sıralama (merge sort)', en: 'Merge sort', de: 'Mergesort'}]
	]},
		{ group: {tr: 'Ağaçlar', en: 'Trees', de: 'Bäume'}, items: [
			['binarySearchTree.html', {tr: 'İkili arama ağacı: ekleme ve arama', en: 'Binary search tree: insert and search', de: 'Binärer Suchbaum: einfügen und suchen'}],
			['treeTraversal.html', {tr: 'Ağacı dolaşma ve yükseklik', en: 'Tree traversal and height', de: 'Baumdurchlauf und Höhe'}],
			['treeDelete.html', {tr: 'Ağaçta silme', en: 'Deleting from a tree', de: 'Löschen im Baum'}],
			['avlTree.html', {tr: 'AVL ağacı: döndürmelerle dengeleme', en: 'AVL tree: balancing with rotations', de: 'AVL-Baum: ausgleichen mit Rotationen'}]
	]},
		{ group: {tr: 'Hash tablosu', en: 'Hash table', de: 'Hashtabelle'}, items: [
			['hashTable.html', {tr: 'Zincirlemeli hash tablosu', en: 'Hash table with chaining', de: 'Hashtabelle mit Verkettung'}]
		]}
	];

	var ICON = {
		menu: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 6h16M4 12h16M4 18h16"/></svg>',
		close: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',
		gear: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>'
	};

	function el(tag, attrs, html){
		var e = document.createElement(tag);
		for(var k in attrs || {})
			e.setAttribute(k, attrs[k]);
		if(html !== undefined)
			e.innerHTML = html;
		return e;
	}
	function esc(text){ return String(text).replace(/[&<>"]/g, function(c){ return {'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]; }); }
	function pick(texts){ return texts[lang] || texts.tr; }

	var page = decodeURIComponent(location.pathname.split('/').pop()) || 'index.html';
	var flat = [];
	EXAMPLES.forEach(function(g){ g.items.forEach(function(it){ flat.push({file: it[0], title: pick(it[1])}); }); });
	var current = null;
	flat.forEach(function(e, i){ if(e.file === page) current = i; });

	var lesson = document.querySelector('main.lesson');
	if(!lesson)
		return;

	// ---------- the page's own content in the chosen language ----------
	var contentLang = lesson.querySelector('[data-lang="' + lang + '"]') ? lang : 'tr';
	Array.prototype.forEach.call(lesson.querySelectorAll('[data-lang]:not(script)'), function(e){
		if(e.getAttribute('data-lang') !== contentLang)
			e.parentNode.removeChild(e);
	});
	Array.prototype.forEach.call(lesson.querySelectorAll('script.code-variant'), function(s){
		if(s.getAttribute('data-lang') === contentLang){
			var block = document.getElementById(s.getAttribute('data-for'));
			if(block) block.value = s.textContent.replace(/^\r?\n/, '');
		}
		s.parentNode.removeChild(s);
	});
	Array.prototype.forEach.call(lesson.querySelectorAll('[data-i18n]'), function(e){
		e.textContent = t(e.getAttribute('data-i18n'));
	});
	// ---------- the code language: Düğüm, or C++ translated from it ----------
	var codeLangs = window.dsvCode ? window.dsvCode.langs : {};
	var codeLang = codeLangs[dsv.settings.codeLang] ? dsv.settings.codeLang : 'dugum';
	var linkLang = /(?:^#|&)c=(cpp|java|dugum)(?:&|$)/.exec(location.hash);  // a shared link keeps its language
	if(linkLang) codeLang = linkLang[1];
	else if(/(?:^#|&)b\d+=/.test(location.hash)) codeLang = 'dugum';
	if(page === 'language.html') codeLang = 'dugum'; // the guide is about Düğüm itself
	window.dsvCodeLang = codeLang;
	if(codeLangs[codeLang]){
		var areas = lesson.querySelectorAll('textarea.deneme');
		var translated = codeLangs[codeLang].to(Array.prototype.map.call(areas, function(a){ return a.value; }));
		Array.prototype.forEach.call(areas, function(a, i){ a.value = translated[i]; });
		// short pieces of code in the text too: p.next -> p->next, null -> nullptr
		Array.prototype.forEach.call(lesson.querySelectorAll('p code, li code, td code'), function(c){
			c.textContent = codeLangs[codeLang].display(c.textContent);
		});
	}

	var h1 = lesson.querySelector('h1');
	document.title = (h1 && page !== 'index.html' ? h1.textContent + ' | ' : '') + t('brand');

	// ---------- top bar ----------
	var topbar = el('header', {'class': 'topbar'});
	var menuBtn = el('button', {'class': 'icon-btn menu-btn', 'aria-label': t('examples'), title: t('examples')}, ICON.menu + '<span class="label">' + esc(t('examples')) + '</span>');
	topbar.appendChild(menuBtn);
	topbar.appendChild(el('a', {'class': 'brand', href: 'index.html'}, 'dsviz <span>·</span> ' + esc(t('brand'))));
	if(current !== null)
		topbar.appendChild(el('span', {'class': 'page-name'}, '/ ' + esc(flat[current].title)));
	topbar.appendChild(el('span', {'class': 'spacer'}));
	var settingsBtn = el('button', {'class': 'icon-btn settings-btn', title: t('settings'), 'aria-label': t('settings'),
	                                'aria-haspopup': 'dialog', 'aria-expanded': 'false', 'aria-controls': 'settings-panel'}, ICON.gear);
	topbar.appendChild(settingsBtn);

	// ---------- drawer ----------
	var backdrop = el('div', {'class': 'drawer-backdrop'});
	var drawer = el('nav', {'class': 'drawer', 'aria-label': t('examples')});
	var head = el('div', {'class': 'drawer-head'}, '<strong>' + esc(t('examples')) + '</strong>');
	var closeBtn = el('button', {'class': 'icon-btn', 'aria-label': t('close'), title: t('close')}, ICON.close);
	head.appendChild(closeBtn);
	drawer.appendChild(head);
	drawer.appendChild(el('a', {href: 'index.html', 'class': page === 'index.html' ? 'active' : ''}, esc(t('homeLink'))));
	EXAMPLES.forEach(function(g){
		drawer.appendChild(el('h6', {}, esc(pick(g.group))));
		g.items.forEach(function(it){
			drawer.appendChild(el('a', {href: it[0], 'class': it[0] === page ? 'active' : ''}, esc(pick(it[1]))));
		});
	});

	function setDrawer(open){ document.body.classList.toggle('drawer-open', open); }
	menuBtn.addEventListener('click', function(){ setDrawer(true); });
	closeBtn.addEventListener('click', function(){ setDrawer(false); });
	backdrop.addEventListener('click', function(){ setDrawer(false); });

	// ---------- settings ----------
	var s = dsv.settings;
	function options(values, labels, chosen){
		return values.map(function(v, i){ return '<option value="' + v + '"' + (String(v) === String(chosen) ? ' selected' : '') + '>' + esc(labels[i]) + '</option>'; }).join('');
	}
	function segmented(name, values, labels, chosen){
		return '<div class="segmented" role="radiogroup">' + values.map(function(v, i){
			return '<label><input type="radio" name="' + name + '" value="' + v + '"' + (v === chosen ? ' checked' : '') + '><span>' + esc(labels[i]) + '</span></label>';
		}).join('') + '</div>';
	}
	var sizes = t('fontSizes');
	var panel = el('div', {'class': 'settings-panel card', id: 'settings-panel', role: 'dialog', 'aria-label': t('settings'), hidden: ''},
		'<div class="settings-head"><strong>' + esc(t('settings')) + '</strong></div>' +
		'<label class="setting"><span>' + esc(t('language')) + '</span><select name="lang">' +
			options(dsv.LANGS, dsv.LANGS.map(function(l){ return dsv.LANG_NAMES[l]; }), s.lang) + '</select></label>' +
		'<div class="setting-note">' + esc(t('languageNote')) + '</div>' +
		'<label class="setting"><span>' + esc(t('codeLang')) + '</span><select name="codeLang">' +
			options(['dugum', 'cpp', 'java'], ['Düğüm', 'C++', 'Java'], s.codeLang) + '</select></label>' +
		'<div class="setting-note">' + esc(t('codeLangNote')) + '</div>' +
		'<div class="setting"><span>' + esc(t('theme')) + '</span>' +
			segmented('theme', ['system', 'light', 'dark'], [t('themeSystem'), t('themeLight'), t('themeDark')], s.theme) + '</div>' +
		'<label class="setting"><span>' + esc(t('defaultSpeed')) + '</span><select name="speed">' +
			options([0, 1, 2, 3, 4], t('speeds'), s.speed) + '</select></label>' +
		'<div class="setting"><span>' + esc(t('fontSize')) + '</span>' +
			segmented('fontSize', ['normal', 'large', 'xlarge'], [sizes.normal, sizes.large, sizes.xlarge], s.fontSize) + '</div>' +
		'<label class="setting switch"><span>' + esc(t('lessonModeSetting')) + '</span><input type="checkbox" name="lessonMode"' + (s.lessonMode ? ' checked' : '') + '></label>' +
		'<label class="setting switch"><span>' + esc(t('narrationSetting')) + '</span><input type="checkbox" name="narration"' + (s.narration ? ' checked' : '') + '></label>' +
		'<label class="setting switch"><span>' + esc(t('warningsSetting')) + '</span><input type="checkbox" name="warnings"' + (s.warnings ? ' checked' : '') + '></label>' +
		'<div class="setting-note">' + esc(t('shortcuts')) + '</div>' +
		'<button class="link-btn" name="reset">' + esc(t('resetSettings')) + '</button>');
	var panelClose = el('button', {'class': 'icon-btn', 'aria-label': t('close'), title: t('close')}, ICON.close);
	panel.querySelector('.settings-head').appendChild(panelClose);

	function setPanel(open){
		panel.hidden = !open;
		settingsBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
		if(open) panel.querySelector('select').focus();
	}
	settingsBtn.addEventListener('click', function(e){ e.stopPropagation(); setPanel(panel.hidden); });
	panelClose.addEventListener('click', function(){ setPanel(false); settingsBtn.focus(); });
	document.addEventListener('click', function(e){ if(!panel.hidden && !panel.contains(e.target)) setPanel(false); });
	document.addEventListener('keydown', function(e){
		if(e.key !== 'Escape') return;
		setDrawer(false);
		if(!panel.hidden){ setPanel(false); settingsBtn.focus(); }
	});

	panel.addEventListener('change', function(e){
		var input = e.target, name = input.name;
		if(name === 'lang'){ dsv.set('lang', input.value); location.reload(); return; } // the page's content is per language
		if(name === 'codeLang'){ dsv.set('codeLang', input.value); location.href = location.href.split('#')[0]; return; } // the code is translated on load
		if(name === 'speed') dsv.set('speed', Number(input.value));
		else if(input.type === 'checkbox') dsv.set(name, input.checked);
		else dsv.set(name, input.value);
		if(name === 'lessonMode' && window.dsvApplyLessonMode) window.dsvApplyLessonMode();
	});
	panel.querySelector('[name=reset]').addEventListener('click', function(){
		dsv.reset();
		panel.querySelector('[value="' + dsv.settings.theme + '"][name=theme]').checked = true;
		panel.querySelector('[value="' + dsv.settings.fontSize + '"][name=fontSize]').checked = true;
		panel.querySelector('[name=speed]').value = dsv.settings.speed;
		panel.querySelector('[name=narration]').checked = dsv.settings.narration;
		panel.querySelector('[name=warnings]').checked = dsv.settings.warnings;
		panel.querySelector('[name=lessonMode]').checked = dsv.settings.lessonMode;
		if(window.dsvApplyLessonMode) window.dsvApplyLessonMode();
	});

	// ---------- code blocks ----------
	var blocks = lesson.querySelectorAll('textarea.deneme');
	Array.prototype.forEach.call(blocks, function(ta, i){
		var card = el('div', {'class': 'code-card'});
		if(page !== 'index.html')
			card.appendChild(el('div', {'class': 'code-label'}, esc(t('block', {n: i + 1})) + (codeLangs[codeLang] ? ' · ' + codeLangs[codeLang].name : '')));
		ta.parentNode.insertBefore(card, ta);
		card.appendChild(ta);
	});

	// ---------- example list on the main page ----------
	var list = document.getElementById('example-list');
	if(list){
		list.className = 'example-groups';
		EXAMPLES.forEach(function(g){
			var box = el('div', {'class': 'card example-group'}, '<h3>' + esc(pick(g.group)) + '</h3>');
			var ul = el('ul');
			g.items.forEach(function(it){ ul.appendChild(el('li', {}, '<a href="' + it[0] + '">' + esc(pick(it[1])) + '</a>')); });
			box.appendChild(ul);
			list.appendChild(box);
		});
	}

	// ---------- previous / next example ----------
	if(current !== null){
		var pager = el('nav', {'class': 'pager'});
		if(current > 0)
			pager.appendChild(el('a', {href: flat[current - 1].file}, '<small>' + esc(t('previous')) + '</small>' + esc(flat[current - 1].title)));
		if(current < flat.length - 1)
			pager.appendChild(el('a', {href: flat[current + 1].file, 'class': 'next'}, '<small>' + esc(t('next')) + '</small>' + esc(flat[current + 1].title)));
		lesson.appendChild(pager);
	}

	lesson.appendChild(el('footer', {'class': 'footer'},
		t('footer', {author: '<a href="http://www.ceng.metu.edu.tr/~akifakkus/doku.php" target="_blank" rel="noopener">Mehmet Akif AKKUS</a>'})));

	// ---------- lesson mode ----------
	// The page shows one part at a time: the text before a code block and the block. Next and
	// Previous move between parts and run the block of the part (the blocks above it run again
	// at once, so the drawing is the same as when reading the whole page).
	var cards = Array.prototype.filter.call(lesson.children, function(e){ return e.classList.contains('code-card'); });
	if(page !== 'index.html' && cards.length >= 2){
		var parts = [], tail = [], partNow = [];
		Array.prototype.forEach.call(lesson.children, function(e){
			if(e.tagName === 'H1') return;
			if(e.tagName === 'FOOTER' || e.classList.contains('pager')){ tail.push(e); return; }
			partNow.push(e);
			if(e.classList.contains('code-card')){ parts.push(partNow); partNow = []; }
		});
		partNow.forEach(function(e){ parts[parts.length - 1].push(e); }); // text after the last block
		var partIndex = 0;

		var toggle = el('button', {'class': 'lesson-toggle', type: 'button'});
		lesson.querySelector('h1').insertAdjacentElement('afterend', toggle);
		var lessonNav = el('nav', {'class': 'lesson-nav', hidden: ''},
			'<button type="button" class="lesson-prev">' + esc(t('previous')) + '</button>' +
			'<span class="lesson-count"></span>' +
			'<button type="button" class="lesson-next">' + esc(t('next')) + '</button>');
		lesson.insertBefore(lessonNav, tail[0] || null);

		var refreshEditors = function(elems){
			elems.forEach(function(e){
				Array.prototype.forEach.call(e.querySelectorAll('.CodeMirror'), function(cm){ if(cm.CodeMirror) cm.CodeMirror.refresh(); });
			});
		};
		var showPart = function(k, run){
			partIndex = Math.max(0, Math.min(parts.length - 1, k));
			parts.forEach(function(list, i){ list.forEach(function(e){ e.classList.toggle('lesson-hidden', i !== partIndex); }); });
			tail.forEach(function(e){ e.classList.toggle('lesson-hidden', partIndex !== parts.length - 1); });
			lessonNav.querySelector('.lesson-count').textContent = t('lessonPart', {i: partIndex + 1, n: parts.length});
			lessonNav.querySelector('.lesson-prev').disabled = partIndex === 0;
			lessonNav.querySelector('.lesson-next').disabled = partIndex === parts.length - 1;
			refreshEditors(parts[partIndex]);
			if(run && window.dsvRunBlock)
				window.dsvRunBlock(partIndex); // each part holds exactly one block, in order
		};
		window.dsvApplyLessonMode = function(){
			var on = !!dsv.settings.lessonMode;
			document.documentElement.classList.toggle('lesson-mode', on);
			toggle.textContent = on ? t('lessonOff') : t('lessonOn');
			toggle.title = on ? '' : t('lessonOnTitle');
			toggle.setAttribute('aria-pressed', on ? 'true' : 'false');
			lessonNav.hidden = !on;
			if(on)
				showPart(partIndex, false);
			else {
				parts.concat([tail]).forEach(function(list){ list.forEach(function(e){ e.classList.remove('lesson-hidden'); }); });
				refreshEditors(parts.reduce(function(a, b){ return a.concat(b); }, []));
			}
		};
		toggle.addEventListener('click', function(){
			dsv.set('lessonMode', !dsv.settings.lessonMode);
			panel.querySelector('[name=lessonMode]').checked = dsv.settings.lessonMode;
			window.dsvApplyLessonMode();
		});
		var move = function(d){
			showPart(partIndex + d, true);
			var top = lesson.getBoundingClientRect().top + window.pageYOffset - 70;
			if(window.pageYOffset > top) window.scrollTo(0, top); // the part starts at the top
		};
		lessonNav.querySelector('.lesson-prev').addEventListener('click', function(){ move(-1); });
		lessonNav.querySelector('.lesson-next').addEventListener('click', function(){ move(1); });
		window.dsvApplyLessonMode();
	}

	// ---------- visualisation card ----------
	var viz = el('div', {'class': 'card viz'},
		'<div class="viz-canvas"><canvas id="myCanvas0" width="800" height="260"></canvas></div>' +
		// on a phone the panels below fold: one row of buttons opens one panel at a time
		'<div class="viz-folds">' +
			'<button class="fold-btn" data-fold="stack" aria-expanded="false" hidden>' + esc(t('callStack')) + '<span class="fold-count"></span></button>' +
			'<button class="fold-btn" data-fold="vars" aria-expanded="false">' + esc(t('variables')) + '<span class="fold-count"></span></button>' +
			'<button class="fold-btn" data-fold="out" aria-expanded="false">' + esc(t('output')) + '<span class="fold-count"></span></button>' +
		'</div>' +
		'<div class="viz-stack" hidden><div class="panel-title">' + esc(t('callStack')) + '</div><ol id="callstack"></ol><div id="callstack-note"></div></div>' +
		'<div class="viz-vars"><div class="panel-title">' + esc(t('variables')) + '</div><ul id="variables" data-empty="' + esc(t('noVariables')) + '"></ul></div>' +
		'<div class="viz-out"><div class="tabs"><button class="tab active" data-tab="tab-output">' + esc(t('output')) + '</button><button class="tab" data-tab="tab-command">' + esc(t('commandTab')) + '</button><span id="resultSign"></span></div>' +
		'<div class="tab-body" id="tab-output"><pre id="output" data-empty="' + esc(t('outputEmpty')) + '"></pre></div>' +
		'<div class="tab-body" id="tab-command" hidden><textarea id="command" class="commandPrompt"></textarea>' +
		'<div class="hint">' + t('commandHint') + '</div></div></div>');

	var vizCol = el('aside', {'class': 'viz-col'});
	vizCol.appendChild(viz);

	var layout = el('div', {'class': 'layout'});
	lesson.parentNode.insertBefore(layout, lesson);
	layout.appendChild(lesson);
	layout.appendChild(vizCol);

	document.body.insertBefore(panel, document.body.firstChild);
	document.body.insertBefore(drawer, document.body.firstChild);
	document.body.insertBefore(backdrop, document.body.firstChild);
	document.body.insertBefore(topbar, document.body.firstChild);

	Array.prototype.forEach.call(viz.querySelectorAll('.tab'), function(tab){
		tab.addEventListener('click', function(){
			Array.prototype.forEach.call(viz.querySelectorAll('.tab'), function(t){ t.classList.toggle('active', t === tab); });
			Array.prototype.forEach.call(viz.querySelectorAll('.tab-body'), function(b){ b.hidden = b.id !== tab.getAttribute('data-tab'); });
			if(tab.getAttribute('data-tab') === 'tab-command' && window.editor2){
				window.editor2.refresh(); // CodeMirror measures itself again once it is visible
				window.editor2.focus();
			}
		});
	});

	// ---------- folding panels (phones) ----------
	// The buttons show how much each panel holds; the open panel is remembered.
	var folds = viz.querySelector('.viz-folds');
	var foldBtn = function(name){ return folds.querySelector('[data-fold="' + name + '"]'); };
	var stackBox = viz.querySelector('.viz-stack'), varList = viz.querySelector('#variables');
	var callList = viz.querySelector('#callstack'), outBox = viz.querySelector('#output');
	var seenOutput = '';
	function openFold(name){
		viz.setAttribute('data-open', name || '');
		Array.prototype.forEach.call(folds.querySelectorAll('.fold-btn'), function(b){
			b.setAttribute('aria-expanded', b.getAttribute('data-fold') === name ? 'true' : 'false');
		});
		if(name === 'out'){
			seenOutput = outBox.textContent;
			if(window.editor2 && !viz.querySelector('#tab-command').hidden) window.editor2.refresh();
		}
		try { localStorage.setItem('dsv-fold', name || ''); } catch(e) {}
		updateFolds();
	}
	function setText(elem, text){ if(elem.textContent !== text) elem.textContent = text; } // no needless DOM writes
	function updateFolds(){
		if(foldBtn('stack').hidden !== stackBox.hidden) foldBtn('stack').hidden = stackBox.hidden;
		setText(foldBtn('stack').querySelector('.fold-count'), callList.children.length ? ' · ' + callList.children.length : '');
		setText(foldBtn('vars').querySelector('.fold-count'), varList.children.length ? ' · ' + varList.children.length : '');
		var fresh = !!outBox.textContent && outBox.textContent !== seenOutput && viz.getAttribute('data-open') !== 'out';
		if(foldBtn('out').classList.contains('has-news') !== fresh)
			foldBtn('out').classList.toggle('has-news', fresh); // new output while the panel is closed
	}
	folds.addEventListener('click', function(e){
		var b = e.target.closest('.fold-btn');
		if(b) openFold(viz.getAttribute('data-open') === b.getAttribute('data-fold') ? '' : b.getAttribute('data-fold'));
	});
	if(window.MutationObserver){ // only the panels' contents, not the buttons (they change in updateFolds)
		var watch = new MutationObserver(function(){
			if(viz.getAttribute('data-open') === 'out') seenOutput = outBox.textContent;
			updateFolds();
		});
		watch.observe(stackBox, {attributes: true, attributeFilter: ['hidden']});
		watch.observe(callList, {childList: true});
		watch.observe(varList, {childList: true});
		watch.observe(outBox, {childList: true, characterData: true, subtree: true});
	}
	var savedFold = '';
	try { savedFold = localStorage.getItem('dsv-fold') || ''; } catch(e) {}
	openFold(savedFold);

	// a theme that follows the system changes with it
	if(window.matchMedia)
		matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function(){
			if(dsv.settings.theme === 'system') dsv.set('theme', 'system');
		});

	window.dsvExamples = EXAMPLES;
})();
