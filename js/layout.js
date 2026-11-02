/*
 * Builds the page chrome around the lesson content of every page: top bar, the drawer
 * with all examples, the visualisation card (canvas, variables, output, command prompt)
 * and the previous/next links. A page itself only contains <main class="lesson">.
 *
 * Must run before js/editorSettings.js and js/linkedlist.js: they look for #command,
 * #output and #myCanvas0.
 *
 * To add an example: create the page and add one line to EXAMPLES.
 */
(function(){

	var EXAMPLES = [
		{ group: 'Listeyi dolaşma', items: [
			['lengthOfALinkedList.html', 'Listenin uzunluğunu bulma'],
			['sumMaxAndSearchInALinkedList.html', 'Toplam, en büyük değer ve arama']
		]},
		{ group: 'Ekleme ve silme', items: [
			['insertAtTheHeadOfALinkedList.html', 'Başa düğüm ekleme'],
			['appendAnItemOnTheLinkedList.html', 'Sona düğüm ekleme'],
			['insertIntoASortedLinkedList.html', 'Sıralı listeye ekleme'],
			['deleteANodeFromALinkedList.html', 'Verilen değerdeki düğümü silme'],
			['removeDuplicatesOnAlinkedList.html', 'Tekrar eden düğümleri silme']
		]},
		{ group: 'Pointer teknikleri', items: [
			['reverseALinkedList.html', 'Listeyi ters çevirme'],
			['findTheMiddleOfALinkedList.html', 'Ortadaki düğümü bulma'],
			['kthNodeFromTheEnd.html', "Sondan k'ıncı düğümü bulma"],
			['detectACycleInALinkedList.html', 'Döngü tespiti (Floyd)']
		]},
		{ group: 'Çift yönlü liste', items: [
			['doublyLinkedList.html', 'İki yönde dolaşma'],
			['insertDeleteInADoublyLinkedList.html', 'Ekleme ve O(1) silme'],
			['reverseADoublyLinkedList.html', 'Çift yönlü listeyi ters çevirme']
		]},
		{ group: 'Yığın ve kuyruk', items: [
			['stack.html', 'Yığın (stack): push ve pop'],
			['queue.html', 'Kuyruk (queue): enqueue ve dequeue']
		]},
		{ group: 'Fonksiyonlar', items: [
			['functions.html', 'Fonksiyonlar: push ve pop'],
			['recursion.html', 'Özyineleme (recursion)']
		]},
		{ group: 'İki liste', items: [
			['checkIfTwoLinkedListAreEqual.html', 'İki liste eşit mi?'],
			['compareLinkedListCheckOneIsGreater.html', 'İlk liste daha mı büyük?'],
			['mergeTwoSortedLinkedLists.html', 'İki sıralı listeyi birleştirme']
		]}
	];

	var ICON = {
		menu: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 6h16M4 12h16M4 18h16"/></svg>',
		close: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',
		moon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>',
		sun: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>'
	};

	function el(tag, attrs, html){
		var e = document.createElement(tag);
		for(var k in attrs || {})
			e.setAttribute(k, attrs[k]);
		if(html !== undefined)
			e.innerHTML = html;
		return e;
	}

	var page = decodeURIComponent(location.pathname.split('/').pop()) || 'index.html';
	var flat = [];
	EXAMPLES.forEach(function(g){ g.items.forEach(function(it){ flat.push({file: it[0], title: it[1], group: g.group}); }); });
	var current = null;
	flat.forEach(function(e, i){ if(e.file === page) current = i; });

	var lesson = document.querySelector('main.lesson');
	if(!lesson)
		return;

	// ---------- top bar ----------
	var topbar = el('header', {'class': 'topbar'});
	var menuBtn = el('button', {'class': 'icon-btn menu-btn', 'aria-label': 'Örnekler', title: 'Örnekler'}, ICON.menu + '<span class="label">Örnekler</span>');
	topbar.appendChild(menuBtn);
	topbar.appendChild(el('a', {'class': 'brand', href: 'index.html'}, 'dsviz <span>·</span> Bağlı Listeler'));
	if(current !== null)
		topbar.appendChild(el('span', {'class': 'page-name'}, '/ ' + flat[current].title));
	topbar.appendChild(el('span', {'class': 'spacer'}));
	var themeBtn = el('button', {'class': 'icon-btn', title: 'Temayı değiştir', 'aria-label': 'Temayı değiştir'});
	topbar.appendChild(themeBtn);

	// ---------- drawer ----------
	var backdrop = el('div', {'class': 'drawer-backdrop'});
	var drawer = el('nav', {'class': 'drawer', 'aria-label': 'Örnekler'});
	var head = el('div', {'class': 'drawer-head'}, '<strong>Örnekler</strong>');
	var closeBtn = el('button', {'class': 'icon-btn', 'aria-label': 'Kapat', title: 'Kapat'}, ICON.close);
	head.appendChild(closeBtn);
	drawer.appendChild(head);
	drawer.appendChild(el('a', {href: 'index.html', 'class': page === 'index.html' ? 'active' : ''}, 'Ana sayfa ve deneme alanı'));
	EXAMPLES.forEach(function(g){
		drawer.appendChild(el('h6', {}, g.group));
		g.items.forEach(function(it){
			drawer.appendChild(el('a', {href: it[0], 'class': it[0] === page ? 'active' : ''}, it[1]));
		});
	});

	function setDrawer(open){ document.body.classList.toggle('drawer-open', open); }
	menuBtn.addEventListener('click', function(){ setDrawer(true); });
	closeBtn.addEventListener('click', function(){ setDrawer(false); });
	backdrop.addEventListener('click', function(){ setDrawer(false); });
	document.addEventListener('keydown', function(e){ if(e.key === 'Escape') setDrawer(false); });

	// ---------- theme ----------
	function updateThemeIcon(){
		themeBtn.innerHTML = document.documentElement.getAttribute('data-theme') === 'dark' ? ICON.sun : ICON.moon;
	}
	themeBtn.addEventListener('click', function(){
		var next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
		document.documentElement.setAttribute('data-theme', next);
		try { localStorage.setItem('dsv-theme', next); } catch(e) {}
		updateThemeIcon();
		if(window.dsvApplyTheme)
			window.dsvApplyTheme(); // redraw the canvas with the new colors
	});
	updateThemeIcon();

	// ---------- code blocks ----------
	var blocks = lesson.querySelectorAll('textarea.deneme');
	Array.prototype.forEach.call(blocks, function(ta, i){
		var card = el('div', {'class': 'code-card'});
		if(page !== 'index.html')
			card.appendChild(el('div', {'class': 'code-label'}, 'Blok ' + (i + 1)));
		ta.parentNode.insertBefore(card, ta);
		card.appendChild(ta);
	});

	// ---------- example list on the main page ----------
	var list = document.getElementById('example-list');
	if(list){
		list.className = 'example-groups';
		EXAMPLES.forEach(function(g){
			var box = el('div', {'class': 'card example-group'}, '<h3>' + g.group + '</h3>');
			var ul = el('ul');
			g.items.forEach(function(it){ ul.appendChild(el('li', {}, '<a href="' + it[0] + '">' + it[1] + '</a>')); });
			box.appendChild(ul);
			list.appendChild(box);
		});
	}

	// ---------- previous / next example ----------
	if(current !== null){
		var pager = el('nav', {'class': 'pager'});
		if(current > 0)
			pager.appendChild(el('a', {href: flat[current - 1].file}, '<small>← Önceki</small>' + flat[current - 1].title));
		if(current < flat.length - 1)
			pager.appendChild(el('a', {href: flat[current + 1].file, 'class': 'next'}, '<small>Sonraki →</small>' + flat[current + 1].title));
		lesson.appendChild(pager);
	}

	lesson.appendChild(el('footer', {'class': 'footer'},
		'Bu uygulama <a href="http://www.ceng.metu.edu.tr/~akifakkus/doku.php" target="_blank" rel="noopener">Mehmet Akif AKKUS</a> ' +
		'tarafından paper.js, peg.js ve CodeMirror kullanılarak geliştirilmiştir. Orta Doğu Teknik Üniversitesi, Bilgisayar Mühendisliği Bölümü.'));

	// ---------- visualisation card ----------
	var viz = el('div', {'class': 'card viz'},
		'<div class="viz-canvas"><canvas id="myCanvas0" width="800" height="260"></canvas></div>' +
		'<div class="viz-stack" hidden><div class="panel-title">Çağrı yığını</div><ol id="callstack"></ol><div id="callstack-note"></div></div>' +
		'<div class="viz-vars"><div class="panel-title">Değişkenler</div><ul id="variables"></ul></div>' +
		'<div class="tabs"><button class="tab active" data-tab="tab-output">Çıktı</button><button class="tab" data-tab="tab-command">Komut satırı</button><span id="resultSign"></span></div>' +
		'<div class="tab-body" id="tab-output"><pre id="output"></pre></div>' +
		'<div class="tab-body" id="tab-command" hidden><textarea id="command" class="commandPrompt"></textarea>' +
		'<div class="hint">Tek satırlık kod yazıp Enter\'a basın, ör. <code>x.next.data</code>. Yukarı/aşağı ok tuşları önceki komutları getirir.</div></div>');

	var vizCol = el('aside', {'class': 'viz-col'});
	vizCol.appendChild(viz);

	var layout = el('div', {'class': 'layout'});
	lesson.parentNode.insertBefore(layout, lesson);
	layout.appendChild(lesson);
	layout.appendChild(vizCol);

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

	window.dsvExamples = EXAMPLES;
})();
