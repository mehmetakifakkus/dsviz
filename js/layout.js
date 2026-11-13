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
			['circularDoublyLinkedList.html', {tr: 'Dairesel çift yönlü liste', en: 'Circular doubly linked list', de: 'Zirkuläre doppelt verkettete Liste'}],
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
		{ group: {tr: 'Dizilerde arama ve sıralama', en: 'Searching and sorting arrays', de: 'Suchen und Sortieren in Arrays'}, items: [
			['binarySearch.html', {tr: 'Doğrusal ve ikili arama', en: 'Linear and binary search', de: 'Lineare und binäre Suche'}],
			['selectionSort.html', {tr: 'Seçmeli sıralama', en: 'Selection sort', de: 'Sortieren durch Auswahl'}],
			['arrayBubbleSort.html', {tr: 'Kabarcık sıralama (dizide)', en: 'Bubble sort (array)', de: 'Bubblesort (Array)'}],
			['arrayInsertionSort.html', {tr: 'Eklemeli sıralama (dizide)', en: 'Insertion sort (array)', de: 'Insertion Sort (Array)'}],
			['quickSort.html', {tr: 'Hızlı sıralama', en: 'Quick sort', de: 'Quicksort'}],
			['heapSort.html', {tr: 'Heap sort', en: 'Heap sort', de: 'Heapsort'}],
			['countingSort.html', {tr: 'Sayarak sıralama', en: 'Counting sort', de: 'Counting Sort'}],
			['sortComparison.html', {tr: 'Sıralama karşılaştırması', en: 'Comparing sorts', de: 'Sortierverfahren im Vergleich'}]
		]},
		{ group: {tr: '2B diziler ve dinamik programlama', en: 'Two-dimensional arrays and dynamic programming', de: 'Zweidimensionale Arrays und dynamische Programmierung'}, items: [
			['matrisGezme.html', {tr: 'Matris: satır ve sütun gezme', en: 'Matrix: walking rows and columns', de: 'Matrix: Zeilen und Spalten durchlaufen'}],
			['pascal.html', {tr: 'Pascal üçgeni', en: "Pascal's triangle", de: 'Pascalsches Dreieck'}],
			['gridPaths.html', {tr: 'Izgarada yol sayısı (DP)', en: 'Paths in a grid (DP)', de: 'Wege im Gitter (DP)'}],
			['lcs.html', {tr: 'En uzun ortak altdizi (LCS)', en: 'Longest common subsequence', de: 'Längste gemeinsame Teilfolge'}],
			['knapsack.html', {tr: 'Sırt çantası (0/1 knapsack)', en: '0/1 knapsack', de: '0/1-Rucksackproblem'}],
			['nQueens.html', {tr: 'N vezir (geri izleme)', en: 'N queens (backtracking)', de: 'N-Damen (Backtracking)'}]
		]},
		{ group: {tr: 'Ağaçlar', en: 'Trees', de: 'Bäume'}, items: [
			['binarySearchTree.html', {tr: 'İkili arama ağacı: ekleme ve arama', en: 'Binary search tree: insert and search', de: 'Binärer Suchbaum: einfügen und suchen'}],
			['treeTraversal.html', {tr: 'Ağacı dolaşma ve yükseklik', en: 'Tree traversal and height', de: 'Baumdurchlauf und Höhe'}],
			['treeDelete.html', {tr: 'Ağaçta silme', en: 'Deleting from a tree', de: 'Löschen im Baum'}],
			['avlTree.html', {tr: 'AVL ağacı: döndürmelerle dengeleme', en: 'AVL tree: balancing with rotations', de: 'AVL-Baum: ausgleichen mit Rotationen'}],
			['heap.html', {tr: 'Heap ve öncelik kuyruğu', en: 'Heap and priority queue', de: 'Heap und Prioritätswarteschlange'}]
	]},
		{ group: {tr: 'Hash tablosu', en: 'Hash table', de: 'Hashtabelle'}, items: [
			['hashTable.html', {tr: 'Zincirlemeli hash tablosu', en: 'Hash table with chaining', de: 'Hashtabelle mit Verkettung'}]
		]},
		{ group: {tr: 'Graflar', en: 'Graphs', de: 'Graphen'}, items: [
			['graph.html', {tr: 'Komşuluk listesi, BFS ve DFS', en: 'Adjacency lists, BFS and DFS', de: 'Adjazenzlisten, BFS und DFS'}],
			['dijkstra.html', {tr: 'Dijkstra: ağırlıklı kenarlar ve en kısa yol', en: 'Dijkstra: weighted edges and shortest paths', de: 'Dijkstra: gewichtete Kanten und kürzeste Wege'}],
			['bellmanFord.html', {tr: 'Bellman-Ford: negatif ağırlıklar', en: 'Bellman-Ford: negative weights', de: 'Bellman-Ford: negative Gewichte'}],
			['topologicalSort.html', {tr: 'Topolojik sıralama', en: 'Topological sort', de: 'Topologische Sortierung'}],
			['connectedComponents.html', {tr: 'Bağlı bileşenler', en: 'Connected components', de: 'Zusammenhangskomponenten'}],
			['unionFind.html', {tr: 'Birleşik küme (union-find)', en: 'Disjoint sets (union-find)', de: 'Disjunkte Mengen (Union-Find)'}],
			['kruskal.html', {tr: 'Kruskal: en küçük kapsayan ağaç', en: 'Kruskal: minimum spanning tree', de: 'Kruskal: minimaler Spannbaum'}],
			['prim.html', {tr: 'Prim: en küçük kapsayan ağaç', en: 'Prim: minimum spanning tree', de: 'Prim: minimaler Spannbaum'}]
		]},
		{ group: {tr: 'Alıştırmalar', en: 'Exercises', de: 'Übungen'}, items: [
			['exReverse.html', {tr: 'Listeyi ters çevir', en: 'Reverse a list', de: 'Eine Liste umkehren'}],
			['exMiddle.html', {tr: 'Listenin ortadaki düğümü', en: 'The middle node of a list', de: 'Der mittlere Knoten einer Liste'}],
			['exLength.html', {tr: 'Listenin uzunluğu', en: 'The length of a list', de: 'Die Länge einer Liste'}],
			['exAppend.html', {tr: 'Listenin sonuna ekle', en: 'Append to a list', de: 'An eine Liste anhängen'}],
			['exDedupe.html', {tr: 'Yinelenenleri sil', en: 'Remove duplicates', de: 'Duplikate entfernen'}],
			['exRowSum.html', {tr: 'Matriste satır toplamı', en: 'The sum of a matrix row', de: 'Die Summe einer Matrixzeile'}],
			['exPascal.html', {tr: 'Pascal üçgeni', en: "Pascal's triangle", de: 'Pascalsches Dreieck'}],
			['exGridPaths.html', {tr: 'Izgarada yol sayısı', en: 'Paths in a grid', de: 'Wege im Gitter'}],
			['exArrayMax.html', {tr: 'Dizide en büyük değer', en: 'The largest value of an array', de: 'Der größte Wert eines Arrays'}],
			['exBinarySearch.html', {tr: 'İkili arama', en: 'Binary search', de: 'Binäre Suche'}],
			['exBubbleSort.html', {tr: 'Kabarcık sıralama', en: 'Bubble sort', de: 'Bubblesort'}],
			['exTreeHeight.html', {tr: 'Ağacın yüksekliği', en: 'The height of a tree', de: 'Die Höhe eines Baums'}],
			['exTreeSum.html', {tr: 'Ağaçtaki değerlerin toplamı', en: 'The sum of the values in a tree', de: 'Die Summe der Werte eines Baums'}],
			['exStack.html', {tr: 'Bağlı listeyle yığın', en: 'A stack with a linked list', de: 'Ein Stapel mit einer verketteten Liste'}],
			['exIsSorted.html', {tr: 'Liste sıralı mı?', en: 'Is the list sorted?', de: 'Ist die Liste sortiert?'}],
			['exHasCycle.html', {tr: 'Listede döngü var mı?', en: 'Does the list have a cycle?', de: 'Hat die Liste einen Zyklus?'}]
		]}
	];

	var ICON = {
		menu: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 6h16M4 12h16M4 18h16"/></svg>',
		close: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',
		chevron: '<svg class="drawer-chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg>',
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

	// what the student did in the exercises: {file: {done, attempts}}, kept in this browser (see js/exercise.js)
	function exerciseProgress(){
		try {
			var all = JSON.parse(localStorage.getItem('dsv-exercises') || '{}');
			return all && typeof all === 'object' && !Array.isArray(all) ? all : {};
		} catch(e) { return {}; }
	}
	window.dsvExerciseProgress = exerciseProgress;
	var flat = [];
	EXAMPLES.forEach(function(g){ g.items.forEach(function(it){ flat.push({file: it[0], title: pick(it[1])}); }); });
	var current = null;
	flat.forEach(function(e, i){ if(e.file === page) current = i; });

	var lesson = document.querySelector('main.lesson');
	if(!lesson)
		return;
	var plain = lesson.hasAttribute('data-plain'); // a page with no code (the plan pages): no drawing, no examples, no tour

	// ---------- lesson plans: a teacher's list of pages, carried in the link ----------
	//
	// plan.html#plan=<base64url JSON>&i=<index>&c=<code language>. The plan holds a title, an
	// introduction, the pages (only pages of this site are kept) with a note each, the code language
	// and whether lesson mode is on. Nothing is stored on a server; what a student has done is kept in
	// the browser (localStorage), per plan.
	var PLAN = (function(){
		var known = {};
		flat.forEach(function(e){ known[e.file] = e; });
		function encodeText(text){ return btoa(unescape(encodeURIComponent(text))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }
		function decodeText(data){
			var b64 = data.replace(/-/g, '+').replace(/_/g, '/');
			while(b64.length % 4) b64 = b64 + '=';
			return decodeURIComponent(escape(atob(b64)));
		}
		function text(v, max){ return typeof v === 'string' ? v.replace(/\s+$/, '').slice(0, max) : ''; }
		var CODE_LANGS = ['dugum', 'turkce', 'cpp', 'java'];
		// a plan from its JSON text (null: not a plan); pages of other sites or unknown pages are dropped
		function parse(str){
			var raw, items = [], dropped = 0;
			try { raw = JSON.parse(decodeText(str)); } catch(e) { return null; }
			if(!raw || typeof raw !== 'object' || !(raw.i instanceof Array))
				return null;
			raw.i.slice(0, 80).forEach(function(it){
				var file = it instanceof Array ? it[0] : it;
				if(typeof file === 'string' && known[file] && !items.some(function(x){ return x.file === file; }))
					items.push({file: file, note: it instanceof Array ? text(it[1], 600) : ''});
				else
					dropped = dropped + 1;
			});
			return {t: text(raw.t, 120), d: text(raw.d, 1500), items: items, c: CODE_LANGS.indexOf(raw.c) >= 0 ? raw.c : '', m: raw.m ? 1 : 0, dropped: dropped};
		}
		function encode(plan){
			return encodeText(JSON.stringify({v: 1, t: plan.t || '', d: plan.d || '', i: plan.items.map(function(x){ return x.note ? [x.file, x.note] : [x.file]; }), c: plan.c || '', m: plan.m ? 1 : 0}));
		}
		function fromHash(hash){
			var m = /(?:^#|&)plan=([A-Za-z0-9_-]{1,24000})(?:&|$)/.exec(hash || '');
			if(!m) return null;
			var plan = parse(m[1]);
			if(!plan) return null;
			var i = /(?:^#|&)i=(\d+)(?:&|$)/.exec(hash);
			return {plan: plan, str: m[1], index: i ? Number(i[1]) : 0, id: idOf(m[1])};
		}
		function idOf(str){ // a short name for the plan, for what a student has done
			var h = 5381;
			for(var i = 0; i < str.length; i++) h = ((h * 33) ^ str.charCodeAt(i)) >>> 0;
			return h.toString(36);
		}
		function url(file, str, index, plan){
			return file + '#plan=' + str + '&i=' + index + (plan && plan.c ? '&c=' + plan.c : '');
		}
		function progress(){
			try { return JSON.parse(localStorage.getItem('dsv-plan-progress') || '{}') || {}; } catch(e) { return {}; }
		}
		function done(id){ return progress()[id] || {}; }
		function mark(id, file){
			var all = progress();
			all[id] = all[id] || {};
			if(all[id][file]) return;
			all[id][file] = 1;
			try { localStorage.setItem('dsv-plan-progress', JSON.stringify(all)); } catch(e) {}
		}
		return {encode: encode, parse: parse, fromHash: fromHash, url: url, done: done, mark: mark, idOf: idOf, known: known, flat: flat};
	})();
	window.dsvPlan = PLAN;

	// the plan this page is opened from (the page must be in it)
	var planCtx = null;
	if(!plain){
		var fromLink = PLAN.fromHash(location.hash);
		if(fromLink){
			var at = fromLink.plan.items[fromLink.index] && fromLink.plan.items[fromLink.index].file === page ? fromLink.index
			       : fromLink.plan.items.map(function(x){ return x.file; }).indexOf(page);
			if(at >= 0){ fromLink.index = at; planCtx = fromLink; }
		}
	}
	var planForcedLesson = planCtx && planCtx.plan.m ? true : null; // lesson mode the plan asks for; null: the student's setting

	// ---------- the page's own content in the chosen language ----------
	var contentLang = lesson.querySelector('[data-lang="' + lang + '"]') ? lang : 'tr';
	// ---------- the code language: Düğüm, Düğüm with Turkish words, C++ or Java ----------
	var codeLangs = window.dsvCode ? window.dsvCode.langs : {};
	var codeLang = codeLangs[dsv.settings.codeLang] ? dsv.settings.codeLang : 'dugum';
	var linkLang = /(?:^#|&)c=(turkce|cpp|java|dugum)(?:&|$)/.exec(location.hash);  // a shared link keeps its language
	if(linkLang) codeLang = linkLang[1];
	else if(/(?:^#|&)b\d+=/.test(location.hash)) codeLang = 'dugum';
	if(page === 'language.html') codeLang = 'dugum'; // the guide is about Düğüm itself
	window.dsvCodeLang = codeLang;
	var turkishCode = codeLang === 'turkce'; // keeps the Turkish comments of the examples, whatever the interface language
	Array.prototype.forEach.call(lesson.querySelectorAll('[data-lang]:not(script)'), function(e){
		if(e.getAttribute('data-lang') !== contentLang)
			e.parentNode.removeChild(e);
	});
	Array.prototype.forEach.call(lesson.querySelectorAll('script.code-variant'), function(s){
		if(s.getAttribute('data-lang') === contentLang && !turkishCode){
			var block = document.getElementById(s.getAttribute('data-for'));
			if(block) block.value = s.textContent.replace(/^\r?\n/, '');
		}
		s.parentNode.removeChild(s);
	});
	Array.prototype.forEach.call(lesson.querySelectorAll('[data-i18n]'), function(e){
		e.textContent = t(e.getAttribute('data-i18n'));
	});
	// the examples are written in Düğüm: translated to the chosen code language
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
	drawer.appendChild(el('a', {href: 'teacher.html', 'class': 'drawer-teacher' + (page === 'teacher.html' ? ' active' : '')}, esc(t('teacherLink'))));
	drawer.appendChild(el('a', {href: 'class.html', 'class': 'drawer-teacher drawer-class' + (page === 'class.html' ? ' active' : '')}, esc(t('classLink'))));
	// Each group folds: its title is a button with the number of pages, and only the group of
	// the current page is open at first. The groups the user opened stay open (localStorage).
	var openGroups = [];
	try { openGroups = JSON.parse(localStorage.getItem('dsv-menu-open') || '[]'); } catch(e) {}
	EXAMPLES.forEach(function(g, gi){
		var key = g.items[0][0]; // the group's first page names it, whatever the language
		var here = g.items.some(function(it){ return it[0] === page; });
		var open = here || openGroups.indexOf(key) >= 0;
		var box = el('div', {'class': 'drawer-group' + (open ? ' open' : '') + (here ? ' current' : '')});
		var btn = el('button', {'class': 'drawer-group-btn', type: 'button', 'aria-expanded': open ? 'true' : 'false', 'aria-controls': 'menu-group-' + gi},
			'<span>' + esc(pick(g.group)) + '</span><span class="drawer-count">' + g.items.length + '</span>' + ICON.chevron);
		var items = el('div', {'class': 'drawer-items', id: 'menu-group-' + gi});
		g.items.forEach(function(it){
			var finished = (exerciseProgress()[it[0]] || {}).done === true; // an exercise the student solved
			items.appendChild(el('a', {href: it[0], 'class': it[0] === page ? 'active' : ''}, esc(pick(it[1])) + (finished ? ' <span class="ex-mark" title="' + esc(t('exDone')) + '">✓</span>' : '')));
		});
		btn.addEventListener('click', function(){
			var now = !box.classList.contains('open');
			box.classList.toggle('open', now);
			btn.setAttribute('aria-expanded', now ? 'true' : 'false');
			openGroups = openGroups.filter(function(k){ return k !== key; });
			if(now) openGroups.push(key);
			try { localStorage.setItem('dsv-menu-open', JSON.stringify(openGroups)); } catch(e) {}
		});
		box.appendChild(btn);
		box.appendChild(items);
		drawer.appendChild(box);
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
			options(['dugum', 'turkce', 'cpp', 'java'], ['Düğüm', 'Düğüm (Türkçe)', 'C++', 'Java'], s.codeLang) + '</select></label>' +
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
		'<label class="setting switch"><span>' + esc(t('stepCompareSetting')) + '</span><input type="checkbox" name="stepCompare"' + (s.stepCompare ? ' checked' : '') + '></label>' +
		'<div class="setting-note">' + esc(t('shortcuts')) + '</div>' +
		'<button class="link-btn" name="tour">' + esc(t('tourRestart')) + '</button>' +
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
		if(name === 'lessonMode'){
			planForcedLesson = null; // the student's own choice wins over the plan's
			if(window.dsvApplyLessonMode) window.dsvApplyLessonMode();
		}
	});
	panel.querySelector('[name=reset]').addEventListener('click', function(){
		dsv.reset();
		panel.querySelector('[value="' + dsv.settings.theme + '"][name=theme]').checked = true;
		panel.querySelector('[value="' + dsv.settings.fontSize + '"][name=fontSize]').checked = true;
		panel.querySelector('[name=speed]').value = dsv.settings.speed;
		panel.querySelector('[name=narration]').checked = dsv.settings.narration;
		panel.querySelector('[name=warnings]').checked = dsv.settings.warnings;
		panel.querySelector('[name=stepCompare]').checked = dsv.settings.stepCompare;
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

	// an exercise page: a place under the student's block for its check (js/exercise.js fills it); lesson mode keeps it with the block
	var exerciseData = lesson.querySelector('script#exercise');
	if(exerciseData){
		var studentBlock = 1;
		try { studentBlock = JSON.parse(exerciseData.textContent).block || 1; } catch(e) {}
		var studentCard = lesson.querySelectorAll('.code-card')[studentBlock - 1];
		if(studentCard) studentCard.parentNode.insertBefore(el('div', {'class': 'exercise-slot'}), studentCard.nextSibling);
	}

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

	// ---------- the plan bar and the teacher's note ----------
	if(planCtx){
		var pl = planCtx.plan, n = pl.items.length, here = planCtx.index;
		var link = function(k){ return PLAN.url(pl.items[k].file, planCtx.str, k, pl); };
		var title = function(k){ return PLAN.known[pl.items[k].file].title; };
		var bar = el('nav', {'class': 'plan-bar plan-keep', 'aria-label': t('planBarLabel')});
		bar.appendChild(el('a', {'class': 'plan-name', href: 'plan.html#plan=' + planCtx.str + (pl.c ? '&c=' + pl.c : ''), title: t('planBack')}, esc(pl.t || t('planBarLabel'))));
		bar.appendChild(el('span', {'class': 'plan-count'}, esc(t('planOf', {i: here + 1, n: n}))));
		if(here > 0) bar.appendChild(el('a', {'class': 'plan-prev', href: link(here - 1)}, esc(t('previous'))));
		if(here < n - 1) bar.appendChild(el('a', {'class': 'plan-next', href: link(here + 1)}, esc(t('next'))));
		else bar.appendChild(el('a', {'class': 'plan-next', href: 'plan.html#plan=' + planCtx.str + (pl.c ? '&c=' + pl.c : '')}, esc(t('planFinish'))));
		lesson.insertBefore(bar, lesson.firstChild);
		var noteText = pl.items[here].note;
		if(noteText){
			var note = el('aside', {'class': 'plan-note plan-keep', role: 'note'});
			note.appendChild(el('strong', {}, esc(t('planNote'))));
			note.appendChild(document.createTextNode(' ' + noteText)); // the teacher's text is shown as text, never as HTML
			var heading = lesson.querySelector('h1');
			if(heading) heading.insertAdjacentElement('afterend', note);
		}
		var planPager = el('nav', {'class': 'pager'});
		if(here > 0) planPager.appendChild(el('a', {href: link(here - 1)}, '<small>' + esc(t('previous')) + '</small>' + esc(title(here - 1))));
		if(here < n - 1) planPager.appendChild(el('a', {href: link(here + 1), 'class': 'next'}, '<small>' + esc(t('next')) + '</small>' + esc(title(here + 1))));
		else planPager.appendChild(el('a', {href: 'plan.html#plan=' + planCtx.str + (pl.c ? '&c=' + pl.c : ''), 'class': 'next'}, '<small>' + esc(t('planFinish')) + '</small>' + esc(pl.t || t('planBarLabel'))));
		lesson.appendChild(planPager);
		// opening the page counts when the student runs a block (see runBlock)
		window.dsvPlanMark = function(){ PLAN.mark(planCtx.id, page); };
		window.dsvPlanDone = window.dsvPlanMark;   // exercises count when they are solved (below)
	}

	// an exercise page is done when it is solved, not when a block was run
	if(lesson.querySelector('script#exercise'))
		window.dsvPlanMark = function(){};

	// ---------- previous / next example ----------
	if(current !== null && !planCtx){
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
			if(e.tagName === 'H1' || e.classList.contains('plan-keep')) return;
			if(e.tagName === 'FOOTER' || e.classList.contains('pager')){ tail.push(e); return; }
			if(e.classList.contains('exercise-slot') && parts.length){ parts[parts.length - 1].push(e); return; } // the check goes with its block
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
			var on = planForcedLesson !== null ? planForcedLesson : !!dsv.settings.lessonMode; // a plan can ask for lesson mode
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
			if(planForcedLesson !== null)
				planForcedLesson = !planForcedLesson; // the plan's choice changes for this visit only
			else {
				dsv.set('lessonMode', !dsv.settings.lessonMode);
				panel.querySelector('[name=lessonMode]').checked = dsv.settings.lessonMode;
			}
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
	var viz = plain ? null : el('div', {'class': 'card viz'},
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

	var layout = el('div', {'class': 'layout' + (plain ? ' layout-plain' : '')});
	lesson.parentNode.insertBefore(layout, lesson);
	layout.appendChild(lesson);
	if(!plain){
		var vizCol = el('aside', {'class': 'viz-col'});
		vizCol.appendChild(viz);
		layout.appendChild(vizCol);
	}

	document.body.insertBefore(panel, document.body.firstChild);
	document.body.insertBefore(drawer, document.body.firstChild);
	document.body.insertBefore(backdrop, document.body.firstChild);
	document.body.insertBefore(topbar, document.body.firstChild);

	if(plain){ // no drawing here: the plan pages have no tabs, panels or tour
		var tourButton = panel.querySelector('[name=tour]');
		if(tourButton) tourButton.parentNode.removeChild(tourButton);
		window.dsvExamples = EXAMPLES;
		return;
	}

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

	// ---------- the tour: on the first visit, each part of the page explained in turn ----------
	//
	// One part is lit, the rest of the page is darkened (a box with a huge shadow over the
	// part) and a card next to it explains it; Next / Back move on, Skip or Escape ends it.
	// It shows once (localStorage); the settings panel can start it again.
	var TOUR_KEY = 'dsv-tour-done';
	function tourDone(){
		try { if(localStorage.getItem(TOUR_KEY)) return true; } catch(e) {}
		try { return !!sessionStorage.getItem(TOUR_KEY); } catch(e) { return true; } // no storage at all: do not show it every time
	}
	function markTourDone(){
		try { localStorage.setItem(TOUR_KEY, '1'); } catch(e) {}
		try { sessionStorage.setItem(TOUR_KEY, '1'); } catch(e) {}
	}
	function visible(sel){
		return Array.prototype.filter.call(document.querySelectorAll(sel), function(e){
			return !e.hidden && e.getClientRects().length > 0;
		})[0] || null;
	}
	// the parts, in order; a part missing from this page (or hidden on a phone) is left out
	var TOUR = [
		{target: null},                                                         // welcome
		{target: function(){ return visible('.code-card'); }},
		{target: function(){ return visible('.code-card .dsv-run'); }},
		{target: function(){ return visible('#myCanvas0'); }},                  // the drawing, without the player above it
		{target: function(){ return visible('.dsv-player'); }},
		{target: function(){ return visible('#narration'); }},
		{target: function(){ return visible('.viz-vars') || visible('.viz-folds'); }},
		{target: function(){ return visible('.lesson-toggle'); }},
		{target: function(){ var sel = panel.querySelector('select[name=codeLang]'); return sel && [sel.closest('.setting'), sel.closest('.setting').nextElementSibling]; }, // with its note
		 enter: function(){ setPanel(true); }, leave: function(){ setPanel(false); }}, // the code language: Düğüm, C++ or Java
		{target: function(){ return visible('.menu-btn'); }}
	];

	var tour = null;
	function startTour(){
		if(tour || !document.querySelector('.dsv-player'))
			return;
		setDrawer(false);
		setPanel(false);
		var texts = t('tourSteps');
		var steps = TOUR.map(function(step, i){ return {target: step.target, enter: step.enter, leave: step.leave, title: texts[i][0], text: texts[i][1]}; })
		                .filter(function(step){
			if(!step.target) return true;
			if(step.enter) step.enter();
			var here = !!step.target();
			if(step.leave) step.leave();
			return here;
		});

		var blocker = el('div', {'class': 'tour-block'});
		var spot = el('div', {'class': 'tour-spot'});
		var card = el('div', {'class': 'tour-card card', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'tour-title'},
			'<div class="tour-count"></div><h2 id="tour-title" class="tour-title"></h2><p class="tour-text"></p>' +
			'<div class="tour-actions"><button type="button" class="link-btn tour-skip">' + esc(t('tourSkip')) + '</button>' +
			'<span class="spacer"></span><button type="button" class="tour-back">' + esc(t('tourBack')) + '</button>' +
			'<button type="button" class="tour-next"></button></div>');
		document.body.appendChild(blocker);
		document.body.appendChild(spot);
		document.body.appendChild(card);
		document.documentElement.classList.add('tour-on');
		tour = {steps: steps, index: -1, card: card, spot: spot, blocker: blocker};

		card.addEventListener('click', function(e){
			e.stopPropagation(); // the settings panel closes on a click outside it
			if(e.target.closest('.tour-next')) go(tour.index + 1);
			else if(e.target.closest('.tour-back')) go(tour.index - 1);
			else if(e.target.closest('.tour-skip')) endTour();
		});
		blocker.addEventListener('click', function(e){ e.stopPropagation(); });
		document.addEventListener('keydown', tourKeys, true);
		window.addEventListener('resize', placeTour);
		window.addEventListener('scroll', placeTour, true);
		go(0);
	}
	function tourKeys(e){
		if(!tour) return;
		if(e.key === 'Escape'){ e.preventDefault(); e.stopPropagation(); endTour(); }
		else if(e.key === 'ArrowRight'){ e.preventDefault(); e.stopPropagation(); go(tour.index + 1); }
		else if(e.key === 'ArrowLeft'){ e.preventDefault(); e.stopPropagation(); go(tour.index - 1); }
		else if(e.key === ' ' && e.target === document.body){ e.preventDefault(); e.stopPropagation(); } // the player's shortcut waits
	}
	function go(index){
		var steps = tour.steps;
		if(index < 0) return;
		if(index >= steps.length){ endTour(); return; }
		var old = steps[tour.index];
		if(old && old.leave) old.leave();
		tour.index = index;
		var step = steps[index];
		if(step.enter) step.enter();
		var card = tour.card;
		card.querySelector('.tour-count').textContent = t('tourCount', {i: index + 1, n: steps.length});
		card.querySelector('.tour-title').textContent = step.title;
		card.querySelector('.tour-text').textContent = step.text;
		card.querySelector('.tour-back').hidden = index === 0;
		card.querySelector('.tour-next').textContent = index === steps.length - 1 ? t('tourDone') : t('tourNext');
		var target = step.target && step.target();
		var first = target && (target.length ? target[0] : target);
		if(first && first.scrollIntoView && !first.closest('.topbar, .settings-panel, .viz-col')){
			first.scrollIntoView({block: 'center', inline: 'nearest'});
			// what stays on top while scrolling (the top bar; on a phone also the drawing) must not cover it
			var cover = 0;
			Array.prototype.forEach.call(document.querySelectorAll('.topbar, .viz-col'), function(e){
				var pos = getComputedStyle(e).position;
				if(pos === 'sticky' || pos === 'fixed') cover = Math.max(cover, e.getBoundingClientRect().bottom);
			});
			var top = first.getBoundingClientRect().top;
			if(top < cover + 12) window.scrollBy(0, top - cover - 12);
		}
		placeTour();
		card.querySelector('.tour-next').focus({preventScroll: true});
	}
	// the lit box over the part, the card under it (or over it when there is no room below)
	function placeTour(){
		if(!tour) return;
		var step = tour.steps[tour.index], target = step.target && step.target();
		var spot = tour.spot, card = tour.card, pad = 6, gap = 12, margin = 12;
		var vw = document.documentElement.clientWidth, vh = window.innerHeight;
		card.style.maxWidth = Math.min(380, vw - 2 * margin) + 'px';
		if(!target){
			spot.className = 'tour-spot tour-spot-none';
			card.style.left = Math.max(margin, (vw - card.offsetWidth) / 2) + 'px';
			card.style.top = Math.max(margin, (vh - card.offsetHeight) / 2) + 'px';
			return;
		}
		spot.className = 'tour-spot';
		var r = [].concat(target.length ? Array.prototype.slice.call(target) : [target]).filter(Boolean).reduce(function(box, e){ // several elements: around all of them
			var b = e.getBoundingClientRect();
			return box ? {left: Math.min(box.left, b.left), top: Math.min(box.top, b.top), right: Math.max(box.right, b.right), bottom: Math.max(box.bottom, b.bottom)} : b;
		}, null);
		r = {left: r.left, top: r.top, bottom: r.bottom, width: r.right - r.left};
		var top = Math.max(r.top - pad, 4), bottom = Math.min(r.bottom + pad, vh - 4);
		spot.style.left = (r.left - pad) + 'px';
		spot.style.top = top + 'px';
		spot.style.width = (r.width + 2 * pad) + 'px';
		spot.style.height = Math.max(0, bottom - top) + 'px';
		var w = card.offsetWidth, h = card.offsetHeight;
		var y = bottom + gap;
		if(y + h > vh - margin) y = top - gap - h;             // no room below: above
		if(y < margin) y = Math.min(vh - h - margin, Math.max(margin, bottom - h)); // tall part: inside it, at its foot
		var x = Math.min(Math.max(margin, r.left), vw - w - margin);
		card.style.left = x + 'px';
		card.style.top = y + 'px';
	}
	function endTour(){
		if(!tour) return;
		var step = tour.steps[tour.index];
		if(step && step.leave) step.leave();
		[tour.card, tour.spot, tour.blocker].forEach(function(e){ e.parentNode.removeChild(e); });
		document.documentElement.classList.remove('tour-on');
		document.removeEventListener('keydown', tourKeys, true);
		window.removeEventListener('resize', placeTour);
		window.removeEventListener('scroll', placeTour, true);
		tour = null;
		markTourDone();
	}
	window.dsvStartTour = startTour;
	panel.querySelector('[name=tour]').addEventListener('click', function(e){ e.stopPropagation(); setPanel(false); startTour(); });

	// the first visit: once the page can run code (the editors and the player are there)
	if(!tourDone()){
		(function waitForPage(){
			if(window.dsvReady) setTimeout(startTour, 300);
			else setTimeout(waitForPage, 100);
		})();
	}

	window.dsvExamples = EXAMPLES;
})();
