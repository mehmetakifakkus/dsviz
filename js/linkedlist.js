/*
 * Linked list visualisation engine (PaperScript, runs on canvas "myCanvas0").
 *
 * How it works
 * ------------
 * 1. parse() turns the code of an editor into a list of statements (grammer.pegjs, compiled
 *    ahead of time into js/grammar.js).
 * 2. processOneItem() EXECUTES every statement immediately (evalExpr) and hands a
 *    snapshot of everything the drawing needs to drawGraphics().
 * 3. drawGraphics() does not draw: it pushes a "step" into the player queue. The player
 *    runs the steps one by one (play / pause / step forward / step back / speed).
 *
 * Because the program runs ahead of the animation, the drawing never reads the program
 * state (node.next, variables). It keeps its own visual state instead: node.shown,
 * node.visualNext, node.shownData and the pointers. Step back = reset that visual state
 * and replay the first k-1 steps instantly.
 *
 * The code is ES5 on purpose: PaperScript in paper.js 0.9.25 does not accept ES6.
 */

var t = window.dsv ? window.dsv.t : function(key){ return key; }; // texts in the chosen language (js/i18n.js)

var allNodes = [];   // every Node ever created (only the shown ones are drawn)
var pointers = [];   // every Pointer (a named arrow that points to a node)

//////////////////////////////////////////  Helpers  //////////////////////////////////////

function isNode(v){
	return v !== null && typeof v === 'object' && v.constructor && v.constructor.name === 'Node';
}

function safeEval(code){
	if(code === undefined || code === null || typeof code !== 'string')
		return code;
	try { return evalExpr(code); }
	catch(e) { return undefined; }
}

//////////////////////////////////  Variables and frames  ///////////////////////////////
//
// Global user variables live on window. Every call of a user function gets a frame
// (frame.vars) for its parameters and its "var" variables. evalExpr() evaluates an
// expression inside the current frame: a name is looked up in frame.vars first and on
// window after that (a "with" statement in a compiled function does exactly this).

var frames = [];          // the calls that are running, innermost last
var frameCounter = 0;
var NO_FRAME = Object.create(null);
var compiledExpressions = {};

function currentFrame(){
	return frames.length ? frames[frames.length - 1] : null;
}

function evalExpr(code){
	code = String(code);
	var compiled = compiledExpressions[code];
	if(!compiled) // the newline keeps a trailing // comment from swallowing the ')'
		compiled = compiledExpressions[code] = new Function('__frame', 'with(__frame){ return (' + code + '\n); }');
	var frame = currentFrame();
	return compiled(frame ? frame.vars : NO_FRAME);
}

// var x = ... (declare) creates a local inside a function; x = ... changes the local if
// there is one, the global otherwise
function setVar(name, value, declare){
	var frame = currentFrame();
	if(frame && (declare || Object.prototype.hasOwnProperty.call(frame.vars, name)))
		frame.vars[name] = value;
	else
		assignGlobal(name, value);
}

// for drawing: which call does the variable `name` belong to (null: a global)
function scopeOf(name){
	var frame = currentFrame();
	if(!frame || !name || typeof name !== 'string' || !Object.prototype.hasOwnProperty.call(frame.vars, name))
		return null;
	return {id: frame.id, fn: frame.fn, depth: frame.sameDepth};
}

function propertyPath(property){ // [[".","next"],[".","next"]] -> ".next.next"
	var str = '';
	for(var i=0; i < property.length; i++)
		str += property[i].join('');
	return str;
}

function rhsCode(rhs){ // rhs may be a name (string), an Integer object or a node object
	if(rhs === null || rhs === undefined) return 'null';
	if(typeof rhs === 'string') return rhs;
	return rhs.text;
}

////////////////////////////////////////// Linked List Node //////////////////////////////

var NODE_H = 25;

// colors come from the --viz-* tokens in css/app.css, so the canvas follows the theme
var PAL = palette();
function palette(){
	var cs = window.getComputedStyle(document.documentElement);
	function token(name, fallback){ return (cs.getPropertyValue(name) || '').trim() || fallback; }
	return {
		node: token('--viz-node', '#ffffff'),
		stroke: token('--viz-stroke', '#1f2937'),
		text: token('--viz-text', '#111827'),
		named: token('--viz-named', '#2563eb'),
		pointer: token('--viz-pointer', '#dc2626'),
		local: token('--viz-local', '#7c3aed'),
		changed: token('--viz-changed', '#f59e0b')
	};
}

// called by js/i18n.js when a setting changed (the language reloads the page instead)
window.dsvApplySettings = function(key){
	if(key === 'speed' || key === 'all'){
		player.speed = window.dsv.settings.speed;
		if(player.ui) player.ui.speed.value = player.speed;
	}
	if(key === 'narration' || key === 'warnings' || key === 'all')
		showNarration(settingOn('narration') ? lastNarration : '', settingOn('warnings') ? lastWarning : '');
	if(key === 'stepCompare' || key === 'all')
		redrawPointers();
	if(key === 'fontSize' || key === 'all') // CodeMirror measures its lines again
		Array.prototype.forEach.call(document.querySelectorAll('.CodeMirror'), function(e){ e.CodeMirror.refresh(); });
	if(key === 'theme' || key === 'all')
		window.dsvApplyTheme();
	fitCanvas();
};

// redraws the canvas with the colors of the current theme
window.dsvApplyTheme = function(){
	PAL = palette();
	allNodes.forEach(function(n){ if(n.shown && n.position) n.render(); });
	redrawArrows();
	redrawPointers();
};

// A page switches to doubly linked nodes [prev | data | next] the first time its code
// uses ".prev". The switch happens inside a step, so stepping back undoes it too.
var doublyMode = false;      // drawn state
var doublyRequested = false; // program state: some code on this page used .prev
var treeMode = false;        // drawn state: nodes have left and right links (a binary tree)
var treeRequested = false;   // program state: some code on this page used .left / .right

function geometry(){
	if(treeMode)
		return {width: 66, dataX: 18, nextX: 48, nextY: 12, prevY: 12}; // [left 18 | data 30 | right 18]
	return doublyMode
		? {width: 70, dataX: 20, nextX: 50, nextY: 8,  prevY: 17}  // [prev 20 | data 30 | next 20]
		: {width: 50, dataX: 0,  nextX: 30, nextY: 12, prevY: 12}; // [data 30 | next 20]
	// nextY / prevY: height of the dots, so next and prev arrows run as two parallel lines
}

function Node(content, next){

	Node.counter = (Node.counter || 0) + 1;
	this.id = Node.counter; // newly created node will have a different id

	this.data = (content === undefined || content === null) ? '' : content;
	this.next = next || null;
	this.firstNext = this.next; // new Node(0, head): the link it was made with, drawn when it appears
	this.prev = null;
	this.left = null;  // a tree node's children
	this.right = null;

	// visual state (see the comment at the top of the file)
	this.shown = false;
	this.visualNext = null;
	this.visualPrev = null;
	this.visualLeft = null;
	this.visualRight = null;
	this.firstData = this.data; // the value it was made with: a replay starts from it (the program has run to its end by then)
	this.shownData = this.data;
	this.cell = null;      // {row, col} on the layout grid
	this.position = null;  // top left corner of the box
	this.boxDraw = null;
	this.arrowDraw = null;
	this.prevArrowDraw = null;

	var self = this;

	this.render = function(){
		if(self.boxDraw)
			self.boxDraw.remove();

		var p = self.position, g = geometry();
		var items = [new Path.Rectangle({ point: [p.x, p.y],  size: [g.width, NODE_H],  strokeColor: PAL.stroke, strokeWidth: 2, fillColor: PAL.node})];

		// the dot (or the null slash) of a link cell is drawn with the link, see redrawArrows
		items.push(new Path.Line({from: [p.x + g.nextX, p.y], to: [p.x + g.nextX, p.y + NODE_H], strokeColor: PAL.stroke, strokeWidth: 2}));

		if(doublyMode || treeMode)
			items.push(new Path.Line({from: [p.x + g.dataX, p.y], to: [p.x + g.dataX, p.y + NODE_H], strokeColor: PAL.stroke, strokeWidth: 2}));

		items.push(new PointText({ point: [p.x + g.dataX + 15, p.y + 19], justification: 'center', fontSize: 18+'px', fillColor: PAL.text, content:''+ self.shownData}));

		if(treeMode && self.shownHeight !== undefined && self.shownHeight !== null) // t.height in an AVL tree
			items.push(new PointText({ point: [p.x + g.width + 4, p.y - 2], fontSize: 12+'px', fillColor: PAL.stroke, opacity: 0.65, content: 'h=' + self.shownHeight}));
		if(self.shownWeight !== undefined && self.shownWeight !== null) // e.weight of an edge in a graph
			items.push(new PointText({ point: [p.x + g.dataX + 15, p.y - 5], justification: 'center', fontSize: 12+'px', fillColor: PAL.stroke, opacity: 0.75, content: 'w=' + self.shownWeight}));

		if(self.lost){ // no variable and no link reaches this node any more
			items[0].dashArray = [5, 4];
			items.push(new PointText({ point: [p.x + g.width / 2, p.y + NODE_H + 18], justification: 'center', fontSize: 12+'px', fillColor: PAL.pointer, content: t(lostText('unreachable'))}));
		}

		self.boxDraw = new Group(items);
		if(self.lost)
			self.boxDraw.opacity = LOST_OPACITY;
	}

	this.moveTo = function(p){
		if(self.boxDraw && self.position)
			self.boxDraw.translate(p - self.position);
		self.position = p;
	}

	this.hide = function(){
		self.shown = false;
		self.cell = null;
		self.position = null;
		self.everLinked = false;
		self.lost = false;
		[self.boxDraw, self.arrowDraw, self.prevArrowDraw, self.leftArrowDraw, self.rightArrowDraw].forEach(function(item){ if(item) item.remove(); });
		self.boxDraw = self.arrowDraw = self.prevArrowDraw = self.leftArrowDraw = self.rightArrowDraw = null;
	}

	this.setName = function(name){
		self.name = name;
	}

	allNodes.push(this);
}

window.Node = Node;

// new Node(value) or new Node(value, next) from the grammar's node object
function makeNode(rhs, nested){
	var next = !rhs.next ? null
		: typeof rhs.next === 'object' ? makeNode(rhs.next, true) // new Node(1, new Node(2))
		: evalExpr(rhs.next);
	if(next === undefined)
		next = null;
	if(next !== null && !isNode(next))
		throw ownError(currentLine, 'eNodeNext', {value: formatValue(next)});
	var node = new Node(evalExpr(rhs.data), next);
	node.nested = !!nested; // made inside another new Node(...): appears together with it
	return node;
}

// a new node appears with the link it was made with (and the nodes made inside it)
function showNewNode(n){
	n.shown = true;
	n.visualNext = n.firstNext;
	if(n.firstNext && n.firstNext.nested && !n.firstNext.shown)
		showNewNode(n.firstNext);
}

function enableTreeMode(){
	treeMode = true;
	allNodes.forEach(function(n){ if(n.shown && n.position) n.render(); });
	layout();
}

function enableDoublyMode(){
	if(doublyMode)
		return;
	doublyMode = true;
	allNodes.forEach(function(n){ if(n.shown && n.position) n.render(); });
	layout(); // wider nodes need wider columns
}

//////////////////////////////////////////  Arrays  //////////////////////////////////////
//
// new Array(5) makes a JavaScript array of 5 nulls; the program reads and writes it directly.
// Its drawn state is kept on it in .visual (like a node's visualNext). The first drawn array
// is a column of cells at the left, and the chain each cell leads to is laid out on that
// cell's row: the buckets of a hash table with chaining.

var allArrays = [];

function isArray(v){ return !!(v && v.dsvArray); }

function makeArray(n){
	n = Number(n);
	if(!(n >= 1 && n <= 50 && n % 1 === 0))
		throw ownError(currentLine, 'eArraySize', {n: n});
	var a = [];
	for(var i = 0; i < n; i = i + 1)
		a.push(null);
	a.dsvArray = true;
	a.visual = {id: 'a' + (allArrays.length + 1), shown: false, name: '', cells: a.slice()};
	allArrays.push(a);
	// the program reads cells through this proxy: the cells a step read are the ones it compared
	return window.Proxy ? new Proxy(a, {get: function(target, prop){
		if(typeof prop === 'string' && prop.charCodeAt(0) >= 48 && prop.charCodeAt(0) <= 57)
			cellReads.push({visual: target.visual, index: Number(prop)});
		return target[prop];
	}}) : a;
}

// the cells of arrays the statement being evaluated has read (see drawGraphics)
var cellReads = [];

// A matrix, new Array(rows, cols): an array of row arrays. Its drawing state is one flat, row-major list
// (visual.cells, cell (r, c) at r * cols + c: the same flat index the one-dimensional machinery uses for
// cell focus, reads and ghosts); the values the program holds are in m.raw[r][c]. Reading a row or a
// cell through the proxies checks the index and records the cell as read.
var MATRIX_MAX = 12;
function isMatrix(v){ return isArray(v) && v.visual.kind === 'grid'; }
function nullCells(n){ var cells = []; for(var i = 0; i < n; i = i + 1) cells.push(null); return cells; }
// a property name that stands for an index: a number, or what a bad index value (undefined, NaN, null...) turns into
// when it is used as a name; the latter come back as the word itself so that the error can say it
function matrixIndex(prop){
	if(typeof prop !== 'string') return null;
	if(/^-?\d+(\.\d+)?$/.test(prop)) return Number(prop);
	return /^(undefined|NaN|null|Infinity|-Infinity|true|false)$/.test(prop) ? prop : null;
}
function validIndex(i, n){ return i >= 0 && i < n && i % 1 === 0; }

function makeMatrix(rows, cols){
	rows = Number(rows);
	cols = Number(cols);
	if(!(validIndex(rows - 1, MATRIX_MAX) && validIndex(cols - 1, MATRIX_MAX)))
		throw ownError(currentLine, 'eMatrixSize', {r: formatValue(rows), c: formatValue(cols)});
	var m = [], r;
	m.dsvArray = true;
	m.raw = [];
	m.visual = {id: 'a' + (allArrays.length + 1), shown: false, name: '', kind: 'grid', rows: rows, cols: cols, cells: nullCells(rows * cols)};
	allArrays.push(m);
	for(r = 0; r < rows; r = r + 1){
		m.raw.push(nullCells(cols));
		m.push(matrixRow(m, r));
	}
	return window.Proxy ? new Proxy(m, {get: function(target, prop){
		var i = matrixIndex(prop);
		if(i !== null && !validIndex(i, rows))
			throw ownError(currentLine, 'eMatrixRow', {name: target.dsvName || '', i: formatValue(i), n: rows, last: rows - 1});
		return target[prop];
	}}) : m;
}

function matrixRow(m, r){
	var row = m.raw[r], cols = m.visual.cols;
	row.dsvRow = true;
	return window.Proxy ? new Proxy(row, {get: function(target, prop){
		var j = matrixIndex(prop);
		if(j !== null){
			if(!validIndex(j, cols))
				throw ownError(currentLine, 'eMatrixCol', {name: m.dsvName || '', i: r, j: formatValue(j), n: cols, last: cols - 1});
			cellReads.push({visual: m.visual, index: r * cols + j});
		}
		return target[prop];
	}}) : row;
}

// An array holding nodes is drawn as a column of buckets (a hash table); an array of
// numbers (or still empty) as a row of cells over the drawing. Which one is decided by the
// first value the program puts in it (visual.kind).

// the arrays drawn as buckets (not in a tree drawing), side by side in the order they were made
function bucketTables(){
	if(treeMode)
		return [];
	return allArrays.filter(function(a){ return a.visual.shown && a.visual.kind === 'buckets'; });
}

// the first of them (null: none), for what depends on buckets being drawn at all
function drawnTable(){ return bucketTables()[0] || null; }

// the arrays drawn as rows at the top, in the order they were made
function rowArrays(){
	return allArrays.filter(function(a){ return a.visual.shown && a.visual.kind !== 'buckets' && a.visual.kind !== 'grid'; });
}

var ROW_BAND = 120, ROW_CELL_W = 40, ROW_TOP = 40; // height of one row array with its labels

// the arrays drawn over everything else, in the order they were made: rows of cells, and matrices as grids
function layoutArrays(){
	return allArrays.filter(function(a){ return a.visual.shown && a.visual.kind !== 'buckets'; });
}
function isGridArray(a){ return a.visual.kind === 'grid'; }
var GRID_CELL_H = 30, GRID_HEAD = 26, GRID_ROWNUM_W = 26, GRID_LABEL_W = 60; // a grid: a row of its cell, the column numbers over it, the row numbers and row markers beside it

// A heap kept in an array: once the code uses the index formulas of one (the children of i
// at 2 * i + 1 and 2 * i + 2, its parent at (i - 1) / 2), arrays of numbers are also drawn as
// the tree they stand for, under their row: cell 0 is the root, cell i's children are cells
// 2i+1 and 2i+2. The tree holds the cells up to the first empty one, and not those from the
// global index variable of the array on (its size n in h[n] = v).
var HEAP_FORMULA = /\b2\s*\*\s*[A-Za-z_]\w*\s*\+\s*[12]\b|\(\s*[A-Za-z_]\w*\s*-\s*1\s*\)\s*\/\s*2\b|tamBöl\(\s*[A-Za-z_]\w*\s*-\s*1\s*,\s*2\s*\)/;
var heapRequested = false; // program state: some code on this page used those formulas
var HEAP_LEVEL_H = 58, HEAP_R = 15, HEAP_TOP = 112; // a level of the tree, a node's radius, the tree's top under its row
function heapLevels(a){ return heapRequested && a.visual.kind !== 'buckets' && a.visual.kind !== 'grid' ? Math.floor(Math.log(a.length) / Math.LN2) + 1 : 0; }
function heapWidth(a){ if(isGridArray(a)) return GRID_ROWNUM_W + a.visual.cols * ROW_CELL_W + GRID_LABEL_W; return Math.max(a.length * ROW_CELL_W, heapLevels(a) ? Math.pow(2, heapLevels(a) - 1) * 44 : 0, forestWidth(a)); }
function rowBand(a){ if(isGridArray(a)) return GRID_HEAD + a.visual.rows * GRID_CELL_H + 72; var l = heapLevels(a) || forestLevels(a); return (l ? HEAP_TOP + l * HEAP_LEVEL_H : ROW_BAND) + (barsOn(a) ? BAR_BAND : 0); }

// A disjoint-set forest kept in an array (named leader, lider, temsilci, uf, dsu): cell i holds the parent of i
// (a cell with its own number, or an empty one, is a root). It is drawn under its row as the trees it stands for:
// the roots on top, every element under its parent, so that unite and path compression can be seen.
var FOREST_NAMES = /^(leader|lider|temsilci|uf|dsu)$/i;
function forestOf(a){
	var v = a.visual, n = v.cells.length, parent = [], numbers = 0, i, x, steps;
	if(v.kind === 'buckets' || !FOREST_NAMES.test(v.name || '') || n < 2)
		return null;
	for(i = 0; i < n; i = i + 1){
		var c = v.cells[i];
		if(c === null || c === undefined){ parent.push(i); continue; }
		if(typeof c !== 'number' || c % 1 !== 0 || c < 0 || c >= n)
			return null;
		parent.push(c);
		numbers = numbers + 1;
	}
	if(!numbers)
		return null;
	var depth = [], levels = 0, children = [], roots = [];
	for(i = 0; i < n; i = i + 1){
		children.push([]);
		for(x = i, steps = 0; parent[x] !== x && steps <= n; x = parent[x], steps = steps + 1);
		if(steps > n)
			return null;                         // a cycle: not a forest
		depth.push(steps);
		levels = Math.max(levels, steps + 1);
	}
	for(i = 0; i < n; i = i + 1){
		if(parent[i] === i) roots.push(i);
		else children[parent[i]].push(i);
	}
	var slot = [], next = 0;                      // a leaf takes the next free slot, a parent stands over its children
	function place(u){
		if(!children[u].length){ slot[u] = next; next = next + 1; return; }
		children[u].forEach(place);
		slot[u] = (slot[children[u][0]] + slot[children[u][children[u].length - 1]]) / 2;
	}
	roots.forEach(place);
	return {parent: parent, depth: depth, levels: levels, slot: slot, slots: next, roots: roots};
}
function forestLevels(a){ if(isGridArray(a)) return 0; var f = forestOf(a); return f ? f.levels : 0; }
function forestWidth(a){ if(isGridArray(a)) return 0; var f = forestOf(a); return f ? f.slots * 44 : 0; }

// An array of numbers that holds data to search or sort (named a, arr, dizi, nums...) is also drawn as bars over
// its cells: the height of a bar is its value, so "sorted" and "in the wrong place" can be seen at a glance.
var BAR_BAND = 76, BAR_MAX = 60;
var BAR_NAMES = /^(a|arr|array|dizi|sayılar|sayilar|nums|numbers|veri|data|input|items|list|liste)$/i;
function barsOn(a){
	var v = a.visual, numbers = 0;
	if(a.visual.kind === 'buckets' || a.visual.kind === 'grid' || !BAR_NAMES.test(v.name || '') || v.cells.length < 4 || v.cells.length > 24)
		return false;
	for(var i = 0; i < v.cells.length; i = i + 1){
		var c = v.cells[i];
		if(c === null || c === undefined)
			continue;
		if(typeof c !== 'number' || c < 0)
			return false;
		numbers = numbers + 1;
	}
	return numbers > 0;
}
function topOffset(){ return layoutArrays().reduce(function(sum, a){ return sum + rowBand(a); }, 0); }

// the value of an index variable for the markers: a local of the running call, else a global
function markerValue(name){
	var frame = visualFrames[visualFrames.length - 1];
	if(frame && frame.vars[name])
		return frame.vars[name].isNull || frame.vars[name].isPointer ? undefined : Number(frame.vars[name].text);
	return shownNumbers[name];
}

// numbers as the variables panel shows them (the step's values), for the index markers
var shownNumbers = {};

// the variables a program uses as the index of an array, by array name (a[mid] -> indexUses.a.mid), and
// the names of variables that bound a search or a sort (low, high, left, right...): they get a marker too
var indexUses = {};
var NAME_RE = '[A-Za-z_şğçöüıŞĞÇÖÜİ][A-Za-z0-9_şğçöüıŞĞÇÖÜİ]*';
var BOUND_NAMES = ['low', 'high', 'mid', 'lo', 'hi', 'left', 'right', 'size', 'alt', 'üst', 'orta', 'sol', 'sağ'];

// the markers to draw under array v: [name...] by cell index
function markersOf(v){
	var at = {}, names = {};
	Object.keys(v.indexVars || {}).forEach(function(n){ names[n] = true; });        // written: a[size] = x
	Object.keys(indexUses[v.name] || {}).forEach(function(n){ names[n] = true; }); // read: a[mid]
	if(BAR_NAMES.test(v.name || '')) // an array of data to search or sort: its bounds (low, high, size...) are marked too
		BOUND_NAMES.forEach(function(n){ names[n] = true; });
	Object.keys(names).forEach(function(name){
		var k = markerValue(name);
		if(typeof k === 'number' && k % 1 === 0 && k >= 0 && k <= v.cells.length)
			(at[k] = at[k] || []).push(name);
	});
	return at;
}

var rowArraysDraw = null;
function drawRowArrays(){
	if(rowArraysDraw){
		rowArraysDraw.remove();
		rowArraysDraw = null;
	}
	var items = [], bandTop = 0;
	layoutArrays().forEach(function(a){
		var v = a.visual, x0 = COL_X0, top0 = ROW_TOP + bandTop, bars = barsOn(a), y = top0 + (bars ? BAR_BAND : 0), maxValue = 1;
		bandTop = bandTop + rowBand(a);
		if(isGridArray(a))
			return drawGrid(v, x0, top0, items);
		v.cells.forEach(function(c){ if(typeof c === 'number') maxValue = Math.max(maxValue, c); });
		items.push(new PointText({ point: [x0, top0 - 10], fontSize: 18+'px', fillColor: PAL.named, content: v.name }));
		for(var i = 0; i < v.cells.length; i = i + 1){
			var x = x0 + i * ROW_CELL_W, cell = v.cells[i];
			var focused = isFocusedEdge(v, 'cell' + i), read = isFocusedEdge(v, 'read' + i); // written / read (compared) by the step
			if(bars && typeof cell === 'number'){
				var barHeight = Math.max(3, Math.round(cell / maxValue * BAR_MAX));
				items.push(new Path.Rectangle({ point: [x + 7, y - 4 - barHeight], size: [ROW_CELL_W - 14, barHeight], fillColor: focused ? PAL.changed : PAL.named,
				                                strokeColor: focused ? PAL.changed : PAL.named, strokeWidth: 1.5, opacity: focused || read ? 0.9 : 0.35 }));
			}
			items.push(new Path.Rectangle({ point: [x, y], size: [ROW_CELL_W, NODE_H], strokeColor: focused ? PAL.changed : read ? PAL.named : PAL.stroke, strokeWidth: focused || read ? 3 : 2, fillColor: PAL.node }));
			items.push(new PointText({ point: [x + ROW_CELL_W / 2, y + NODE_H + 15], justification: 'center', fontSize: 12+'px', fillColor: PAL.stroke, opacity: 0.6, content: '' + i }));
			if(cell === null || cell === undefined)
				items.push(new Path.Line({ from: [x + 13, y + NODE_H - 5], to: [x + ROW_CELL_W - 13, y + 5], strokeColor: PAL.stroke, strokeWidth: 1.5, opacity: 0.6 }));
			else if(isNode(cell)){
				if(cell.shown && cell.position){
					var start = new Point(x + ROW_CELL_W / 2, y + NODE_H / 2), end = cell.position + [geometry().width / 2, 0];
					items.push(new Path.Line({ from: start, to: end, strokeColor: PAL.stroke, strokeWidth: 2 }));
					items.push(arrowTip(end, (end - start).angle));
					items.push(new Path.Circle({ radius: 4, fillColor: PAL.stroke, center: start }));
				}
			}
			else {
				var text = cell === true || cell === false ? codeWord(String(cell)) : '' + cell; // doğru in Turkish code
				items.push(new PointText({ point: [x + ROW_CELL_W / 2, y + 18], justification: 'center', fontSize: (text.length > 4 ? 11 : 15)+'px', fillColor: PAL.text, content: text }));
			}
			ghosts.cells.forEach(function(g){ // step comparison: the value the cell had before, small and struck through
				if(g.visual === v && g.index === i && settingOn('stepCompare'))
					items.push(struckText(g.old === true || g.old === false ? codeWord(String(g.old)) : '' + g.old, [x + ROW_CELL_W - 5, y + 10], 'right', 10, PAL.stroke));
			});
		}
		// index markers: s[size] = v marks "size" under the cell it names
		var at = markersOf(v);
		Object.keys(at).forEach(function(k){
			var cx = x0 + Number(k) * ROW_CELL_W + ROW_CELL_W / 2, top = y + NODE_H + 22;
			items.push(new Path.Line({ from: [cx, top + 22], to: [cx, top], strokeColor: PAL.pointer, strokeWidth: 2 }));
			items.push(arrowTip(new Point(cx, top), -90, PAL.pointer));
			items.push(new PointText({ point: [cx, top + 40], justification: 'center', fontSize: 16+'px', fillColor: PAL.pointer, content: at[k].join(', ') }));
		});
		if(heapLevels(a))
			drawHeapTree(a, x0, y + HEAP_TOP, at, items);
		else if(forestLevels(a))
			drawForest(a, x0, y + HEAP_TOP, at, items);
	});
	if(items.length)
		rowArraysDraw = new Group(items);
}

// the index variables of a matrix: the names used as the first subscript (g[i]) stand on their row, those used as
// the second (g[i][j]) under their column, wherever the variable's number is in range
var gridColUses = {};
function gridMarkers(v){
	var out = {row: {}, col: {}};
	Object.keys(indexUses[v.name] || {}).forEach(function(n){
		var k = markerValue(n);
		if(typeof k === 'number' && k % 1 === 0 && k >= 0 && k < v.rows) out.row[n] = k;
	});
	Object.keys(gridColUses[v.name] || {}).forEach(function(n){
		var k = markerValue(n);
		if(typeof k === 'number' && k % 1 === 0 && k >= 0 && k < v.cols) out.col[n] = k;
	});
	return out;
}

// a matrix: column numbers over its cells, row numbers beside them, read cells framed, the written one lit,
// the value a cell had before small and struck through; row markers to the right, column markers below
function drawGrid(v, x0, top0, items){
	var cx0 = x0 + GRID_ROWNUM_W, y0 = top0 + GRID_HEAD, mk = gridMarkers(v), r, c;
	items.push(new PointText({ point: [x0, top0 - 10], fontSize: 18+'px', fillColor: PAL.named, content: v.name }));
	for(c = 0; c < v.cols; c = c + 1)
		items.push(new PointText({ point: [cx0 + c * ROW_CELL_W + ROW_CELL_W / 2, y0 - 8], justification: 'center', fontSize: 12+'px', fillColor: PAL.stroke, opacity: 0.6, content: '' + c }));
	for(r = 0; r < v.rows; r = r + 1){
		items.push(new PointText({ point: [cx0 - 7, y0 + r * GRID_CELL_H + GRID_CELL_H / 2 + 4], justification: 'right', fontSize: 12+'px', fillColor: PAL.stroke, opacity: 0.6, content: '' + r }));
		for(c = 0; c < v.cols; c = c + 1){
			var i = r * v.cols + c, x = cx0 + c * ROW_CELL_W, y = y0 + r * GRID_CELL_H, cell = v.cells[i];
			var focused = isFocusedEdge(v, 'cell' + i), read = isFocusedEdge(v, 'read' + i);
			items.push(new Path.Rectangle({ point: [x, y], size: [ROW_CELL_W, GRID_CELL_H], strokeColor: focused ? PAL.changed : read ? PAL.named : PAL.stroke, strokeWidth: focused || read ? 3 : 2, fillColor: PAL.node }));
			if(cell === null || cell === undefined)
				items.push(new Path.Line({ from: [x + 13, y + GRID_CELL_H - 7], to: [x + ROW_CELL_W - 13, y + 7], strokeColor: PAL.stroke, strokeWidth: 1.5, opacity: 0.6 }));
			else {
				var text = isNode(cell) ? '→' + cell.shownData : cell === true || cell === false ? codeWord(String(cell)) : '' + cell;
				items.push(new PointText({ point: [x + ROW_CELL_W / 2, y + GRID_CELL_H / 2 + 5], justification: 'center', fontSize: (text.length > 4 ? 11 : 15)+'px', fillColor: PAL.text, content: text }));
			}
			ghosts.cells.forEach(function(g){
				if(g.visual === v && g.index === i && settingOn('stepCompare'))
					items.push(struckText(g.old === true || g.old === false ? codeWord(String(g.old)) : '' + g.old, [x + ROW_CELL_W - 5, y + 10], 'right', 10, PAL.stroke));
			});
		}
	}
	var byRow = {}, byCol = {};
	Object.keys(mk.row).forEach(function(n){ (byRow[mk.row[n]] = byRow[mk.row[n]] || []).push(n); });
	Object.keys(mk.col).forEach(function(n){ (byCol[mk.col[n]] = byCol[mk.col[n]] || []).push(n); });
	Object.keys(byRow).forEach(function(k){
		items.push(new PointText({ point: [cx0 + v.cols * ROW_CELL_W + 8, y0 + Number(k) * GRID_CELL_H + GRID_CELL_H / 2 + 5], fontSize: 16+'px', fillColor: PAL.pointer, content: '← ' + byRow[k].join(', ') }));
	});
	Object.keys(byCol).forEach(function(k){
		var cx = cx0 + Number(k) * ROW_CELL_W + ROW_CELL_W / 2, top = y0 + v.rows * GRID_CELL_H + 6;
		items.push(new Path.Line({ from: [cx, top + 20], to: [cx, top], strokeColor: PAL.pointer, strokeWidth: 2 }));
		items.push(arrowTip(new Point(cx, top), -90, PAL.pointer));
		items.push(new PointText({ point: [cx, top + 38], justification: 'center', fontSize: 16+'px', fillColor: PAL.pointer, content: byCol[k].join(', ') }));
	});
}

// the cells of a heap array as a tree: level d holds cells 2^d - 1 ... 2^(d+1) - 2, spread
// evenly over the tree's width; the index markers stand under their nodes
// how many cells (from 0) the tree of a heap array holds
function heapUsed(a){
	var v = a.visual, used = 0;
	while(used < v.cells.length && v.cells[used] !== null && v.cells[used] !== undefined && !isNode(v.cells[used]))
		used = used + 1;
	Object.keys(v.indexVars || {}).concat(['size']).forEach(function(name){ // h[n] = v with a global n (or a global size): the heap's size,
		var size = shownNumbers[name];                      // so cells from n on are not in it (in C++ and
		if(typeof size === 'number' && size >= 0 && size % 1 === 0) // Java an emptied cell holds 0, not null)
			used = Math.min(used, size);
	});
	return used;
}

function drawHeapTree(a, x0, top, at, items){
	var v = a.visual, width = heapWidth(a), used = heapUsed(a);
	function center(i){
		var d = Math.floor(Math.log(i + 1) / Math.LN2), k = i + 1 - Math.pow(2, d);
		return new Point(x0 + width * (k + 0.5) / Math.pow(2, d), top + HEAP_R + d * HEAP_LEVEL_H);
	}
	var i;
	for(i = 1; i < used; i = i + 1){ // the links first, under the nodes
		var from = center(Math.floor((i - 1) / 2)), to = center(i), dir = (to - from).normalize(HEAP_R);
		items.push(new Path.Line({ from: from + dir, to: to - dir, strokeColor: PAL.stroke, strokeWidth: 2 }));
	}
	for(i = 0; i < used; i = i + 1){
		var c = center(i), focused = isFocusedEdge(v, 'cell' + i);
		items.push(new Path.Circle({ center: c, radius: HEAP_R, strokeColor: focused ? PAL.changed : PAL.stroke, strokeWidth: focused ? 3 : 2, fillColor: PAL.node }));
		items.push(new PointText({ point: c + [0, 5], justification: 'center', fontSize: 14+'px', fillColor: PAL.text, content: '' + v.cells[i] }));
		items.push(new PointText({ point: c + [-HEAP_R - 4, 4], justification: 'right', fontSize: 11+'px', fillColor: PAL.stroke, opacity: 0.6, content: '' + i }));
		if(at[i])
			items.push(new PointText({ point: c + [0, HEAP_R + 15], justification: 'center', fontSize: 14+'px', fillColor: PAL.pointer, content: at[i].join(', ') }));
	}
}

function drawForest(a, x0, top, at, items){
	var v = a.visual, f = forestOf(a), i;
	function center(i){ return new Point(x0 + (f.slot[i] + 0.5) * 44, top + HEAP_R + f.depth[i] * HEAP_LEVEL_H); }
	for(i = 0; i < f.parent.length; i = i + 1)
		if(f.parent[i] !== i){
			var from = center(f.parent[i]), to = center(i), dir = (to - from).normalize(HEAP_R);
			items.push(new Path.Line({ from: from + dir, to: to - dir, strokeColor: PAL.stroke, strokeWidth: 2 }));
		}
	for(i = 0; i < f.parent.length; i = i + 1){
		var c = center(i), focused = isFocusedEdge(v, 'cell' + i), read = isFocusedEdge(v, 'read' + i), root = f.parent[i] === i;
		items.push(new Path.Circle({ center: c, radius: HEAP_R, strokeColor: focused ? PAL.changed : read ? PAL.named : root ? PAL.named : PAL.stroke,
		                              strokeWidth: focused || read || root ? 3 : 2, fillColor: PAL.node }));
		items.push(new PointText({ point: c + [0, 5], justification: 'center', fontSize: 14+'px', fillColor: PAL.text, content: '' + i }));
		if(at[i])
			items.push(new PointText({ point: c + [0, HEAP_R + 15], justification: 'center', fontSize: 14+'px', fillColor: PAL.pointer, content: at[i].join(', ') }));
	}
}

var TABLE_W = 34; // width of an array cell
var tableDraw = null;
function drawTable(){
	if(tableDraw){
		tableDraw.remove();
		tableDraw = null;
	}
	var items = [];
	bucketTables().forEach(function(table){ drawBuckets(table, items); });
	if(items.length)
		tableDraw = new Group(items);
}

// one table: a column of cells at its own column (visual.col0, see hashCells)
// A graph as adjacency lists: an array of node chains named adj (or graph, graf, komşu,
// komşular) whose values are all vertex numbers (0 ... n-1) is also drawn as the graph it
// stands for, right of its chains: the vertices on a circle, an edge for every value in a
// chain (one plain line when both directions are there, an arrow when only one is).
// Vertices whose cell is filled (not null, 0 or false) in an array of the same size named
// visited (or seen, marked, ziyaret, görüldü) are coloured; the index markers of the graph and
// of those arrays stand at the vertices.
var GRAPH_NAMES = /^(adj|graph|graf|komşu|komşular|komsu|komsular)$/i;
var VISITED_NAMES = /^(visited|seen|marked|ziyaret|görüldü|goruldu|işaretli|isaretli)$/i;
// Dijkstra and the like: the values of an array named dist (mesafe, uzaklık) stand beside the
// vertices (the value of a variable named INF / SONSUZ as ∞), and the edges parent[v] - v of an
// array named parent (pred, ebeveyn) are drawn thick: the tree of shortest paths.
var DIST_NAMES = /^(dist|distance|mesafe|uzaklık|uzaklik|key|anahtar|indeg|indegree|girdi)$/i, PARENT_NAMES = /^(parent|pred|ebeveyn)$/i;
// the numbers of an array named comp (renk, color...) colour the vertices: the same number, the same colour (0 or empty: none)
var COMP_NAMES = /^(comp|component|components|bileşen|bilesen|renk|color|colour|group|grup)$/i;
var COMP_COLORS = ['#2f5bea', '#e8590c', '#2f9e44', '#ae3ec9', '#d6336c', '#0c8599'];
function compOf(n, i){
	var found = 0;
	graphArrays(n, COMP_NAMES).forEach(function(a){
		var c = a.visual.cells[i];
		if(typeof c === 'number' && c > 0) found = c;
	});
	return found;
}
function graphArrays(n, names){ return rowArrays().filter(function(a){ return a.length === n && names.test(a.visual.name || ''); }); }
function treeEdges(n){
	var tree = {};
	graphArrays(n, PARENT_NAMES).forEach(function(a){
		a.visual.cells.forEach(function(u, v){ if(typeof u === 'number' && u >= 0 && u < n && u !== v) tree[u + ',' + v] = tree[v + ',' + u] = true; });
	});
	return tree;
}
function infinity(){
	var inf = ['INF', 'SONSUZ', 'inf', 'sonsuz'].map(function(name){ return shownNumbers[name]; }).filter(function(v){ return typeof v === 'number'; });
	return inf.length ? inf[0] : undefined;
}
function graphEdges(table){
	var cells = table.visual.cells, n = cells.length, edges = [], seen = {};
	for(var i = 0; i < n; i = i + 1)
		for(var p = cells[i], steps = 0; isNode(p) && p.shown && steps < 60; p = p.visualNext, steps = steps + 1){
			var j = p.shownData;
			if(typeof j !== 'number' || j % 1 !== 0 || j < 0 || j >= n)
				return null;                                  // not a vertex number: not a graph
			if(!seen[i + ',' + j]){ seen[i + ',' + j] = true; edges.push({from: i, to: j, first: p === cells[i], weight: p.shownWeight, chosen: !!p.shownChosen}); }
		}
	return edges;
}
function isGraph(table){ return GRAPH_NAMES.test(table.visual.name || '') && !!graphEdges(table); }
function graphRadius(table){ return Math.max(70, Math.min(150, table.visual.cells.length * 17)); }
function GRAPH_COLS(table){ return Math.ceil((2 * graphRadius(table) + 90) / 75); } // the columns kept free for it

function drawGraph(table, items){
	var v = table.visual, n = v.cells.length, r = graphRadius(table), VR = 16;
	var cx = COL_X0 + v.graphCol * colWidth + r + 30, cy = ROW_Y0 + topOffset() + r + 14;
	var at = [], i;
	for(i = 0; i < n; i = i + 1){
		var angle = (-90 + 360 * i / n) * Math.PI / 180;
		at.push(new Point(cx + r * Math.cos(angle), cy + r * Math.sin(angle)));
	}
	var edges = graphEdges(table), has = {}, tree = treeEdges(n);
	edges.forEach(function(e){ has[e.from + ',' + e.to] = true; });
	edges.forEach(function(e){
		if(e.from === e.to) return;
		var both = has[e.to + ',' + e.from];
		if(both && e.from > e.to) return;                   // one line for the two directions
		var focused = (isFocusedEdge(v, 'cell' + e.from) && e.first) || (both && isFocusedEdge(v, 'cell' + e.to) && edges.some(function(f){ return f.from === e.to && f.to === e.from && f.first; }));
		var inTree = tree[e.from + ',' + e.to] || e.chosen;
		var color = focused ? PAL.changed : inTree ? PAL.named : PAL.stroke;
		var dir = (at[e.to] - at[e.from]).normalize(VR + 2);
		var start = at[e.from] + dir, end = at[e.to] - dir;
		items.push(new Path.Line({ from: start, to: end, strokeColor: color, strokeWidth: focused ? 3 : inTree ? 4 : 2 }));
		if(!both) items.push(arrowTip(end, (end - start).angle, color));
		if(e.weight !== undefined && e.weight !== null){ // the weight in the middle of the edge
			var mid = (start + end) / 2, label = '' + e.weight;
			items.push(new Path.Rectangle({ point: mid - [4 + label.length * 4, 9], size: [8 + label.length * 8, 17], radius: 4, fillColor: PAL.node, strokeColor: PAL.stroke, strokeWidth: 1, opacity: 0.95 }));
			items.push(new PointText({ point: mid + [0, 4], justification: 'center', fontSize: 12+'px', fillColor: PAL.text, content: label }));
		}
	});
	// the visited arrays of the same size: filled cells colour their vertex
	var same = rowArrays().filter(function(a){ return a.length === n && VISITED_NAMES.test(a.visual.name || ''); });
	var markers = {};
	[table].concat(rowArrays().filter(function(a){ return a.length === n; })).forEach(function(a){ // the index variables of arrays with one cell per vertex
		var at = markersOf(a.visual);
		Object.keys(at).forEach(function(k){
			if(Number(k) < n) at[k].forEach(function(name){ if((markers[k] = markers[k] || []).indexOf(name) < 0) markers[k].push(name); });
		});
	});
	for(i = 0; i < n; i = i + 1){
		var filled = same.some(function(a){ var c = a.visual.cells[i]; return c !== null && c !== undefined && c !== 0 && c !== false; });
		var comp = compOf(n, i), tint = comp ? COMP_COLORS[(comp - 1) % COMP_COLORS.length] : PAL.named;
		var ring = isFocusedEdge(v, 'cell' + i) ? PAL.changed : (filled || comp) ? tint : PAL.stroke;
		items.push(new Path.Circle({ center: at[i], radius: VR, strokeColor: ring, strokeWidth: ring !== PAL.stroke ? 3 : 2, fillColor: PAL.node }));
		if(filled || comp)
			items.push(new Path.Circle({ center: at[i], radius: VR - 3, fillColor: tint, opacity: comp ? 0.45 : 0.22 }));
		items.push(new PointText({ point: at[i] + [0, 5], justification: 'center', fontSize: 14+'px', fillColor: PAL.text, content: '' + i }));
		var outward = (at[i] - new Point(cx, cy)).normalize(1);
		if(markers[i])
			items.push(new PointText({ point: at[i] + outward * (VR + 16) + [0, 5], justification: 'center', fontSize: 14+'px', fillColor: PAL.pointer, content: markers[i].join(', ') }));
		var d = distOf(n, i);
		if(d !== null) // its distance, on the inner side
			items.push(new PointText({ point: at[i] - outward * (VR + 15) + [0, 5], justification: 'center', fontSize: 13+'px', fontWeight: 'bold', fillColor: PAL.named, content: d }));
	}
}
// the distance of vertex i as text (∞ for INF), or null when no dist array has it
function distOf(n, i){
	var shown = null, inf = infinity();
	graphArrays(n, DIST_NAMES).forEach(function(a){
		var c = a.visual.cells[i];
		if(typeof c === 'number') shown = c === inf ? '∞' : '' + c;
	});
	return shown;
}

// for the tests: the drawn graph as edges ("0-1" for both directions, "0>1" for one) and coloured vertices
function graphState(table){
	var edges = graphEdges(table) || [], has = {}, out = [];
	edges.forEach(function(e){ has[e.from + ',' + e.to] = true; });
	edges.forEach(function(e){
		if(has[e.to + ',' + e.from]){ if(e.from < e.to) out.push(e.from + '-' + e.to); }
		else out.push(e.from + '>' + e.to);
	});
	var n = table.visual.cells.length;
	var same = rowArrays().filter(function(a){ return a.length === n && VISITED_NAMES.test(a.visual.name || ''); });
	var coloured = [];
	for(var i = 0; i < n; i = i + 1)
		if(same.some(function(a){ var c = a.visual.cells[i]; return c !== null && c !== undefined && c !== 0 && c !== false; }))
			coloured.push(i);
	var weights = {}, dist = [], tree = treeEdges(n);
	edges.forEach(function(e){ if(e.weight !== undefined && e.weight !== null) weights[Math.min(e.from, e.to) + '-' + Math.max(e.from, e.to)] = e.weight; });
	for(i = 0; i < n; i = i + 1) dist.push(distOf(n, i));
	var comps = [];
	for(i = 0; i < n; i = i + 1) comps.push(compOf(n, i));
	var chosen = edges.filter(function(e){ return e.chosen && e.from < e.to; }).map(function(e){ return e.from + '-' + e.to; }).sort();
	return {edges: out.sort(), visited: coloured, weights: weights, dist: dist, comps: comps, chosen: chosen, tree: Object.keys(tree).filter(function(k){ var a = k.split(','); return Number(a[0]) < Number(a[1]); }).map(function(k){ return k.replace(',', '-'); }).sort()};
}

function drawBuckets(table, items){
	var v = table.visual, x = COL_X0 + (v.col0 || 0) * colWidth;
	var y0 = ROW_Y0 + topOffset();
	items.push(new PointText({ point: [x + TABLE_W / 2, y0 - 16], justification: 'center', fontSize: 20+'px', fillColor: PAL.named, content: v.name }));
	for(var i = 0; i < v.cells.length; i = i + 1){
		var y = y0 + i * rowH(), cell = v.cells[i];
		var color = isFocusedEdge(v, 'cell' + i) ? PAL.changed : PAL.stroke;
		items.push(new Path.Rectangle({ point: [x, y], size: [TABLE_W, NODE_H], strokeColor: PAL.stroke, strokeWidth: 2, fillColor: PAL.node }));
		items.push(new PointText({ point: [x - 8, y + 17], justification: 'right', fontSize: 13+'px', fillColor: PAL.stroke, opacity: 0.6, content: '' + i }));
		if(isNode(cell) && cell.shown && cell.position){
			var start = new Point(x + TABLE_W / 2, y + NODE_H / 2), end = cell.position + [0, NODE_H / 2];
			items.push(new Path.Line({ from: start, to: end, strokeColor: color, strokeWidth: color !== PAL.stroke ? 3 : 2 }));
			items.push(arrowTip(end, (end - start).angle, color));
			items.push(new Path.Circle({ radius: 4, fillColor: color, center: start }));
		}
		else if(cell === null || isNode(cell))   // empty (or its node was deleted): a slash
			items.push(new Path.Line({ from: [x + 9, y + NODE_H - 5], to: [x + TABLE_W - 9, y + 5], strokeColor: color, strokeWidth: color !== PAL.stroke ? 3 : 1.5 }));
		else                                     // a plain value
			items.push(new PointText({ point: [x + TABLE_W / 2, y + 18], justification: 'center', fontSize: 15+'px', fillColor: PAL.text, content: '' + cell }));
	}
	if(v.graphCol !== undefined)
		drawGraph(table, items);
}

// The bucket rows of the drawn tables: cell i's chain on row i, right of its table. The
// tables stand side by side: each one starts a column after the longest chain of the one
// before (visual.col0). Nodes in no bucket chain go to the rows under the tables.
function hashCells(shown, tables){
	var visited = {}, i, n, col0 = 0, rows = 0;
	tables.forEach(function(table){
		var cells = table.visual.cells, longest = 1;
		table.visual.col0 = col0;
		for(i = 0; i < cells.length; i = i + 1){
			var col = col0 + 1;
			for(n = cells[i]; isNode(n) && n.shown && !visited[n.id]; n = n.visualNext){
				visited[n.id] = true;
				n.cell = {row: i, col: col};
				col = col + 1;
			}
			longest = Math.max(longest, col - col0 - 1);
		}
		rows = Math.max(rows, cells.length);
		col0 = col0 + 1 + longest + 1; // the table, its longest chain and a free column
		table.visual.graphCol = undefined;
		if(isGraph(table)){            // and its graph, right of the chains
			table.visual.graphCol = col0;
			col0 = col0 + GRAPH_COLS(table);
		}
	});
	var row = rows;
	var rest = shown.filter(function(m){ return !visited[m.id]; }).sort(function(a, b){ return a.id - b.id; });
	rest.forEach(function(start){
		if(visited[start.id])
			return;
		var col = 1;
		for(n = start; n && n.shown && !visited[n.id]; n = n.visualNext){
			visited[n.id] = true;
			n.cell = {row: row, col: col};
			col = col + 1;
		}
		row = row + 1;
	});
}

//////////////////////////////////////////  Arrows  //////////////////////////////////////

function arrowTip(end, angle, color){
	var tip = new Path({segments: [end + [-9, -5], end, end + [-9, 5]], strokeColor: color || PAL.stroke, strokeWidth: 2});
	tip.rotate(angle, end);
	return tip;
}

// the "next" (kind = 'next') or "prev" (kind = 'prev') arrow of a node.
// next leaves the right cell and goes over the row, prev leaves the left cell and goes under it,
// so the two arrows between neighbours never lie on top of each other.
function nodeArrow(from, to, kind, color){
	color = color || PAL.stroke;
	var a = from.position, b = to.position, g = geometry();
	var isNext = kind !== 'prev';
	var start = a + (isNext ? [g.nextX + 10, g.nextY] : [10, g.prevY]);
	var line, angle, end;

	var sameRow = Math.abs(a.y - b.y) < 1;
	var dx = b.x - a.x;
	var near = sameRow && Math.abs(dx) <= colWidth + 1;
	var neighbour = near && (isNext ? dx > 0 : dx < 0);
	var flipped = near && (isNext ? dx < 0 : dx > 0);   // to the neighbour on the "wrong" side (a list being reversed)

	if(neighbour) {                                       // straight to the neighbour
		end = isNext ? b + [0, g.nextY] : b + [g.width, g.prevY];
		line = new Path.Line({from: start, to: end, strokeColor: color, strokeWidth: 2});
		angle = (end - start).angle;
	}
	else if(flipped) {                                    // a short hook into the facing side of the neighbour
		var h = flippedHook(a, b, start, isNext);
		line = h.line; end = h.end; angle = h.angle;
		line.strokeColor = color; line.strokeWidth = 2;
	}
	else if(sameRow && isNext && dx < -colWidth - 1) {    // back past other nodes (a circle): a loop over the pointers
		var r = returnLoop(from, to, start);
		line = r.line; end = r.end; angle = r.angle;
		line.strokeColor = color; line.strokeWidth = 2;
	}
	else if(sameRow && !isNext && dx > colWidth + 1) {    // prev from the head to the tail (a circle): a loop under the row
		var rb = returnLoopBelow(from, to, start);
		line = rb.line; end = rb.end; angle = rb.angle;
		line.strokeColor = color; line.strokeWidth = 2;
	}
	else if(sameRow) {                                    // to the left neighbour (a reversed list) or skipping forwards: an arc
		end = b + [g.width / 2, isNext ? 0 : NODE_H];
		var bulge = 18 + Math.abs(dx) * 0.1;
		var through = new Point((start.x + end.x) / 2, isNext ? a.y - bulge : a.y + NODE_H + bulge);
		line = new Path({segments: [start], strokeColor: color, strokeWidth: 2});
		line.arcTo(through, end);
		angle = line.getTangentAt(line.length).angle;
	}
	else {                                                // another row: straight to the top or bottom edge
		end = b + [g.width / 2, b.y > a.y ? 0 : NODE_H];
		line = new Path.Line({from: start, to: end, strokeColor: color, strokeWidth: 2});
		angle = (end - start).angle;
	}

	if(color !== PAL.stroke)
		line.strokeWidth = 3;
	var dot = new Path.Circle({radius: 4, fillColor: color, center: start});
	var group = new Group([line, arrowTip(end, angle, color), dot]);
	group.data = {arrow: flipped ? 'hook' : neighbour ? 'straight' : 'other'};
	return group;
}

// A link to the neighbour on the other side, as while a list is being reversed: next from the
// right cell up just over its own node, down in the gap and into the right side of the left
// neighbour; prev the mirror of it under the row. Each hook stays over its own node and its own
// gap, so the hooks of a half-reversed list never cross one another (next ends higher in the gap
// than prev starts, and the two run on opposite sides of the gap's middle).
var HOOK_RISE = 10;
function flippedHook(a, b, start, isNext){
	var g = geometry();
	var left = Math.min(a.x, b.x) + g.width, gap = Math.max(a.x, b.x) - left; // the free space between the two nodes
	var x = left + gap * (isNext ? 0.58 : 0.42);
	var lane = isNext ? a.y - HOOK_RISE : a.y + NODE_H + HOOK_RISE;
	var end = isNext ? b + [g.width, g.nextY] : b + [0, g.prevY];
	var points = [start, new Point(start.x, lane), new Point(x, lane), new Point(x, end.y), end];
	return {line: roundedPath(points, 6), end: end, angle: isNext ? 180 : 0};
}

// a path through the points with rounded corners
function roundedPath(points, radius){
	var path = new Path({segments: [points[0]]});
	for(var i = 1; i < points.length - 1; i++){
		var corner = points[i];
		var r = Math.min(radius, (points[i - 1] - corner).length / 2, (points[i + 1] - corner).length / 2);
		var p1 = corner + (points[i - 1] - corner).normalize(r);
		var p2 = corner + (points[i + 1] - corner).normalize(r);
		var center = p1 + (p2 - corner);
		path.lineTo(p1);
		path.arcTo(center + (corner - center).normalize(r), p2);
	}
	path.lineTo(points[points.length - 1]);
	return path;
}

// The link from the end of a row back to an earlier node, as in a circular list: up past the
// right of the last node, along over the row, and down into the top of the target's next
// cell (pointers aim at the data cell, and the names of pointers stay to the left of it).
var LOOP_RISE = 74, LOOP_RISE_LOW = 24; // over the names of pointers drawn above the row / just over the nodes
function returnLoop(from, to, start){
	var a = from.position, b = to.position, g = geometry();
	// stay low unless a pointer drawn above the row lies under the loop
	var left = b.x - 50, rightEdge = a.x + g.width + 20;
	var crowded = pointers.some(function(p){
		var n = p.active && p.direction === 'up' && p.points;
		return n && n.shown && n.position && Math.abs(n.position.y - a.y) < 1 && n.position.x >= left && n.position.x <= rightEdge;
	});
	var top = a.y - (crowded ? LOOP_RISE : LOOP_RISE_LOW);
	var right = a.x + g.width + 14;
	var end = b + [g.nextX + 10, 0];
	var points = [start, new Point(right, start.y), new Point(right, top), new Point(end.x, top), end];
	return {line: roundedPath(points, 10), end: end, angle: 90};
}

// The mirror of returnLoop for prev in a circular doubly linked list: from the head's prev cell
// left, down under the row (under the pointer names drawn below it, if any), along to the
// tail and up into the bottom of its prev cell.
var LOOP_SINK = 86, LOOP_SINK_LOW = 22; // the drawing keeps room for it (extent: NODE_H + 100)
function returnLoopBelow(from, to, start){
	var a = from.position, b = to.position, g = geometry();
	var left = a.x - 20, rightEdge = b.x + g.width + 50;
	var crowded = pointers.some(function(p){
		var n = p.active && p.direction !== 'up' && p.points;
		return n && n.shown && n.position && Math.abs(n.position.y - a.y) < 1 && n.position.x >= left && n.position.x <= rightEdge;
	});
	var bottom = a.y + NODE_H + (crowded ? LOOP_SINK : LOOP_SINK_LOW);
	var outside = a.x - 14;
	var end = b + [10, NODE_H];
	var points = [start, new Point(outside, start.y), new Point(outside, bottom), new Point(end.x, bottom), end];
	return {line: roundedPath(points, 10), end: end, angle: -90};
}

// n.next = n: a small loop from the next cell back into the node's top
function selfLoop(n, color){
	color = color || PAL.stroke;
	var g = geometry(), p = n.position;
	var start = p + [g.nextX + 10, g.nextY], end = p + [g.dataX + 15, 0];
	var line = new Path({segments: [start], strokeColor: color, strokeWidth: color !== PAL.stroke ? 3 : 2});
	line.arcTo(new Point((start.x + end.x) / 2 + 14, p.y - 26), end);
	var tip = arrowTip(end, line.getTangentAt(line.length).angle, color);
	return new Group([line, tip, new Path.Circle({radius: 4, fillColor: color, center: start})]);
}

// a link cell whose link is null: a slash across the cell instead of a dot
function nullMark(n, kind, color){
	var g = geometry(), p = n.position;
	var x = p.x + (kind === 'next' || kind === 'right' ? g.nextX : 0);
	return new Path.Line({from: [x + 4, p.y + NODE_H - 4], to: [x + 16, p.y + 4], strokeColor: color || PAL.stroke,
	                      strokeWidth: color && color !== PAL.stroke ? 3 : 1.5});
}

// the link fields of a node and where the drawing keeps them
var VISUAL_FIELD = {'.next': 'visualNext', '.prev': 'visualPrev', '.left': 'visualLeft', '.right': 'visualRight'};

// a tree link: from the middle of the left or right cell straight to the top of the child
function treeArrow(from, to, side, color){
	color = color || PAL.stroke;
	var g = geometry();
	var start = from.position + [side === 'left' ? 9 : g.nextX + 9, NODE_H / 2];
	var end = to.position + [g.width / 2, 0];
	var line = new Path.Line({from: start, to: end, strokeColor: color, strokeWidth: color !== PAL.stroke ? 3 : 2});
	return new Group([line, arrowTip(end, (end - start).angle, color), new Path.Circle({radius: 4, fillColor: color, center: start})]);
}

function redrawTreeArrows(n){
	['left', 'right'].forEach(function(side){
		var key = side + 'ArrowDraw', child = n[side === 'left' ? 'visualLeft' : 'visualRight'];
		var color = isFocusedEdge(n, side) ? PAL.changed : PAL.stroke;
		n[key] = child && child.shown && child !== n ? treeArrow(n, child, side, color) : nullMark(n, side, color);
		if(n.lost)
			n[key].opacity = LOST_OPACITY;
	});
}

function redrawArrows(){
	drawTable();
	drawRowArrays();
	for(var i=0; i < allNodes.length; i++){
		var n = allNodes[i];

		if(n.arrowDraw)
			n.arrowDraw.remove();
		if(n.prevArrowDraw)
			n.prevArrowDraw.remove();
		if(n.leftArrowDraw)
			n.leftArrowDraw.remove();
		if(n.rightArrowDraw)
			n.rightArrowDraw.remove();
		n.arrowDraw = n.prevArrowDraw = n.leftArrowDraw = n.rightArrowDraw = null;

		if(!n.shown || !n.position)
			continue;

		if(treeMode){ // a tree node has no next cell: its links are left and right
			redrawTreeArrows(n);
			continue;
		}

		var nextColor = isFocusedEdge(n, 'next') ? PAL.changed : PAL.stroke;
		n.arrowDraw = n.visualNext === n ? selfLoop(n, nextColor)
			: n.visualNext && n.visualNext.shown ? nodeArrow(n, n.visualNext, 'next', nextColor)
			: nullMark(n, 'next', nextColor);

		if(doublyMode){
			var prevColor = isFocusedEdge(n, 'prev') ? PAL.changed : PAL.stroke;
			n.prevArrowDraw = n.visualPrev && n.visualPrev.shown && n.visualPrev !== n
				? nodeArrow(n, n.visualPrev, 'prev', prevColor)
				: nullMark(n, 'prev', prevColor);
		}

		if(n.lost){
			n.arrowDraw.opacity = LOST_OPACITY;
			if(n.prevArrowDraw)
				n.prevArrowDraw.opacity = LOST_OPACITY;
		}
	}
}

//////////////////////////////////////////  Layout  //////////////////////////////////////
//
// Nodes live on a grid. A chain (head -> ... -> tail, following visualNext) is drawn on
// one row. The layout is stable: the longest part of a chain that is already drawn in
// order (left to right OR right to left) keeps its cells and the other nodes of the chain
// are placed around it. So reversing a list only flips arrows, inserting at the head
// shifts the list right, and a node that is cut out of a list drops to the next row.

var ROW_Y0 = 80, ROW_H = 150, COL_X0 = 50;
var colWidth = 100;

function maxColWidth(){ return treeMode ? 90 : doublyMode ? 125 : 100; }
function rowH(){ return treeMode ? 110 : drawnTable() ? 72 : ROW_H; }

// A tree: a node's row is its depth and its column its place in an in-order walk (left
// subtree, node, right subtree), so a binary search tree reads sorted from left to right
// and no two nodes share a column. Separate trees (and lone nodes) stand side by side.
function treeCells(shown){
	var isChild = {}, visited = {}, col = 0;
	shown.forEach(function(n){
		[n.visualLeft, n.visualRight].forEach(function(c){ if(c && c.shown && c !== n) isChild[c.id] = true; });
	});
	function place(n, depth){
		if(!n || !n.shown || visited[n.id])
			return;
		visited[n.id] = true;
		place(n.visualLeft, depth + 1);
		n.cell = {row: depth, col: col};
		col = col + 1;
		place(n.visualRight, depth + 1);
	}
	var roots = shown.filter(function(n){ return !isChild[n.id]; }).sort(function(a, b){ return a.id - b.id; });
	roots.forEach(function(r){ place(r, 0); });
	shown.forEach(function(n){ place(n, 0); }); // only a cycle of child links is left
}
var lastPlaced = null, placementCounter = 0;

var TAIL_NAMES = ['tail', 'last', 'rear', 'son'];

function chainsOf(shown){
	var indeg = {}, visited = {}, chains = [];
	var i, n;

	for(i=0; i < shown.length; i++)
		if(shown[i].visualNext && shown[i].visualNext.shown)
			indeg[shown[i].visualNext.id] = (indeg[shown[i].visualNext.id] || 0) + 1;

	// placed nodes first (top to bottom, left to right), then new nodes in creation order
	var ordered = shown.slice().sort(function(a, b){
		if(a.cell && b.cell) return a.cell.row - b.cell.row || a.cell.col - b.cell.col;
		if(a.cell) return -1;
		if(b.cell) return 1;
		return a.id - b.id;
	});

	function walk(start){
		var chain = [];
		for(n = start; n && n.shown && !visited[n.id]; n = n.visualNext){
			visited[n.id] = true;
			chain.push(n);
		}
		chains.push(chain);
	}

	// Cycles first, so that a node that only points into a ring (a node being inserted, or
	// one being cut out) does not decide where the ring's row begins. A ring starts after
	// the node a pointer called tail (last, rear, son) points to, as a circular list is
	// usually kept; otherwise at its leftmost drawn node.
	var onCycle = {};
	for(i=0; i < shown.length; i++){
		n = shown[i].visualNext;
		for(var steps = 0; n && n.shown && steps < shown.length && n !== shown[i]; steps++)
			n = n.visualNext;
		if(n === shown[i])
			onCycle[n.id] = true;
	}
	for(i=0; i < pointers.length; i++){
		var tp = pointers[i];
		if(!tp.scope && tp.active && tp.points && onCycle[tp.points.id] && TAIL_NAMES.indexOf(tp.name) >= 0 && !visited[tp.points.id])
			walk(tp.points.visualNext);
	}
	for(i=0; i < ordered.length; i++)
		if(onCycle[ordered[i].id] && !visited[ordered[i].id])
			walk(ordered[i]);

	for(i=0; i < ordered.length; i++)          // chains that start at a head
		if(!indeg[ordered[i].id] && !visited[ordered[i].id])
			walk(ordered[i]);

	for(i=0; i < ordered.length; i++)          // anything left (not expected)
		if(!visited[ordered[i].id])
			walk(ordered[i]);

	return chains;
}

// the longest run of a chain that is already drawn on one row in consecutive cells
function keptRun(chain){
	var best = null;

	for(var i=0; i < chain.length; i++){
		if(!chain[i].cell)
			continue;

		for(var d = 1; d >= -1; d -= 2){
			var j = i, oldest = chain[i].placedOrder;
			// a right-to-left run is kept only if its nodes were linked before (a list being
			// reversed). Two fresh nodes linked right-to-left (a stack push) are rearranged.
			while(j + 1 < chain.length && chain[j+1].cell &&
			      chain[j+1].cell.row === chain[i].cell.row &&
			      chain[j+1].cell.col - chain[j].cell.col === d &&
			      (d === 1 || (chain[j].everLinked && chain[j+1].everLinked))){
				j++;
				oldest = Math.min(oldest, chain[j].placedOrder);
			}

			var length = j - i + 1;
			if(!best || length > best.length || (length === best.length && oldest < best.oldest)) // ties: older nodes stay
				best = {start: i, length: length, dir: d, row: chain[i].cell.row, col: chain[i].cell.col, oldest: oldest};
		}
	}
	return best;
}

function isIsolated(node, shown){
	if(node.visualNext && node.visualNext.shown)
		return false;
	for(var i=0; i < shown.length; i++)
		if(shown[i].visualNext === node)
			return false;
	return true;
}

// tidy: a whole chain drawn right to left (a reversed or re-linked list) is laid out left
// to right again, in the same cells. Used at the end of a run (see parse).
function layout(tidy){
	var shown = allNodes.filter(function(n){ return n.shown; });
	var chains = chainsOf(shown);
	var occupied = {};
	var i, k;

	var table = drawnTable(), tables = bucketTables();
	if(table)
		hashCells(shown, tables);
	else if(treeMode)
		treeCells(shown);
	else {

	var plans = chains.map(function(chain, index){ return {chain: chain, run: keptRun(chain), index: index}; });

	// keep the biggest already-drawn chains first, new chains last
	plans.sort(function(a, b){
		var la = a.run ? a.run.length : 0, lb = b.run ? b.run.length : 0;
		return lb - la || a.index - b.index;
	});

	var maxRow = -1;
	for(i=0; i < shown.length; i++)
		if(shown[i].cell)
			maxRow = Math.max(maxRow, shown[i].cell.row);

	plans.forEach(function(plan){
		var chain = plan.chain, run = plan.run;
		var row, firstCol, dir;

		if(run && tidy && run.dir === -1 && run.length === chain.length && chain.length > 1){
			row = run.row;
			dir = 1;
			firstCol = run.col - (chain.length - 1);
		}
		else if(run){
			row = run.row;
			dir = run.dir;
			firstCol = run.col - run.start * dir;
		}
		else if(chain.length === 1 && lastPlaced && lastPlaced.shown && lastPlaced.cell && isIsolated(lastPlaced, shown)){
			row = lastPlaced.cell.row;          // x, y, z created one after another: same row
			firstCol = lastPlaced.cell.col + 1;
			dir = 1;
		}
		else {
			row = maxRow + 1;                   // a new list: a new row
			firstCol = 0;
			dir = 1;
		}

		function fits(r){
			for(var k=0; k < chain.length; k++)
				if(occupied[r + ',' + (firstCol + k * dir)])
					return false;
			return true;
		}

		while(!fits(row))
			row++;

		for(k=0; k < chain.length; k++){
			var n = chain[k];
			if(!n.cell){
				lastPlaced = n;
				placementCounter = placementCounter + 1; // (no ++ inside expressions: PaperScript rewrites them)
				n.placedOrder = placementCounter;
			}
			n.cell = {row: row, col: firstCol + k * dir};
			occupied[row + ',' + n.cell.col] = true;
		}
		maxRow = Math.max(maxRow, row);
	});

	} // not a tree

	// grid cells -> canvas positions (the leftmost column and the top row start at the origin)
	var minCol = Infinity, maxCol = -Infinity, minRow = Infinity;
	for(i=0; i < shown.length; i++){
		minCol = Math.min(minCol, shown[i].cell.col);
		maxCol = Math.max(maxCol, shown[i].cell.col);
		minRow = Math.min(minRow, shown[i].cell.row);
	}
	if(table){ // the first table is column 0 and its first cell row 0
		minCol = 0;
		minRow = 0;
		var lastTable = tables[tables.length - 1].visual;
		maxCol = Math.max(maxCol, lastTable.graphCol !== undefined ? lastTable.graphCol + GRAPH_COLS(tables[tables.length - 1]) : lastTable.col0 + 1);
	}

	var visibleWidth = Math.max(300, canvasHolderWidth() - COL_X0 - geometry().width - 30);
	var widest = maxColWidth(), narrowest = geometry().width + 25;
	colWidth = maxCol > minCol ? Math.max(narrowest, Math.min(widest, visibleWidth / (maxCol - minCol))) : widest;

	// the size the drawing needs; fitCanvas() scales it down when the card is narrower
	var maxRowUsed = -Infinity;
	for(i=0; i < shown.length; i++)
		maxRowUsed = Math.max(maxRowUsed, shown[i].cell.row);
	extent = shown.length
		? {width: COL_X0 + (maxCol - minCol) * colWidth + geometry().width + 40, height: ROW_Y0 + (maxRowUsed - minRow) * rowH() + NODE_H + 100}
		: null;

	var rows = layoutArrays();
	if(rows.length){ // the row arrays and grids sit over everything else
		var arrayWidth = COL_X0 + Math.max.apply(null, rows.map(heapWidth)) + 40;
		extent = extent ? {width: Math.max(extent.width, arrayWidth), height: extent.height + topOffset()}
		                : {width: arrayWidth, height: ROW_TOP + topOffset()};
	}

	if(table){
		var lastRow = Math.max.apply(null, tables.map(function(t){ return t.visual.cells.length; })) - 1;
		for(i=0; i < shown.length; i++)
			lastRow = Math.max(lastRow, shown[i].cell.row);
		var graphHeight = Math.max.apply(null, tables.map(function(t){ return t.visual.graphCol !== undefined ? 2 * graphRadius(t) + 70 : 0; }));
		extent = {width: Math.max(extent ? extent.width : 0, COL_X0 + maxCol * colWidth + geometry().width + 40), height: ROW_Y0 + topOffset() + Math.max(lastRow * rowH() + NODE_H + 40, graphHeight)};
	}

	var moves = [], fades = [];
	for(i=0; i < shown.length; i++){
		var node = shown[i];
		var target = new Point(COL_X0 + (node.cell.col - minCol) * colWidth, ROW_Y0 + topOffset() + (node.cell.row - minRow) * rowH());

		if(!node.boxDraw){                     // a new node: appears in place
			node.position = target;
			node.render();
			fades.push(node);
		}
		else if(node.position.getDistance(target) > 0.5)
			moves.push({node: node, from: node.position, to: target});
	}

	// remember which nodes are part of a link (see keptRun)
	for(i=0; i < shown.length; i++)
		if(shown[i].visualNext && shown[i].visualNext.shown){
			shown[i].everLinked = true;
			shown[i].visualNext.everLinked = true;
		}

	fitCanvas();
	animate(moves, fades);
}

///////////////////////////////////////  Canvas size  //////////////////////////////////////
//
// The canvas takes the width of its card. Its height follows the drawing; a drawing that
// is wider than the card is scaled down (view.zoom) instead of being cut off.

var extent = null; // {width, height} the drawing needs, set by layout()
var MIN_HEIGHT = 160; // empty canvas; with nodes the height follows the drawing

function canvasHolderWidth(){
	var holder = view.element.parentNode;
	return (holder && holder.clientWidth) || view.viewSize.width;
}

function fitCanvas(){
	var width = canvasHolderWidth();
	var need = extent || {width: width, height: MIN_HEIGHT};
	// a very tall drawing (long tables, deep trees) is scaled down to stay on the screen too
	var tallest = Math.max(360, (window.innerHeight || 800) - 260);
	var zoom = Math.min(1, width / need.width, tallest / need.height);
	var height = Math.max(MIN_HEIGHT, Math.ceil(need.height * zoom));

	if(view.viewSize.width !== width || view.viewSize.height !== height)
		view.viewSize = new Size(width, height);
	view.zoom = zoom;
	view.center = new Point(width / (2 * zoom), height / (2 * zoom)); // keep the origin at the top left
}

window.addEventListener('resize', fitCanvas);
fitCanvas();

////////////////////////////////////////  Animation  /////////////////////////////////////

var tween = null;

function easeInOut(t){ return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; }

function applyTween(t){
	var e = easeInOut(t);
	for(var i=0; i < tween.moves.length; i++){
		var m = tween.moves[i];
		m.node.moveTo(m.from + (m.to - m.from) * e);
	}
	for(var j=0; j < tween.fades.length; j++)
		if(tween.fades[j].boxDraw)
			tween.fades[j].boxDraw.opacity = e * (tween.fades[j].lost ? LOST_OPACITY : 1);

	redrawPointers(); // redraws the arrows too
}

function finishTween(){
	if(!tween) return;
	applyTween(1);
	tween = null;
}

function animate(moves, fades){
	finishTween();
	tween = {moves: moves, fades: fades, start: Date.now(), duration: Math.min(350, player.delay() * 0.7)};

	if(!player.animating || tween.duration < 80)
		finishTween();
	else
		applyTween(0);
}

function onFrame(){
	if(!tween) return;

	var t = (Date.now() - tween.start) / tween.duration;
	if(t >= 1)
		finishTween();
	else
		applyTween(t);
}

//////////////////////////////////////////  Pointers  //////////////////////////////////////

var SUBSCRIPT = ['', '', '₂', '₃', '₄', '₅', '₆', '₇', '₈', '₉'];

// scope: null for a global variable, {id, fn, depth} for a local of a call. Locals get
// their own color; in a recursion the deeper calls' pointers are labeled p₂, p₃...
function Pointer(node, name, color, direction, scope){
	this.name = name || '';
	this.scope = scope || null;
	this.label = this.name + (scope && scope.depth > 1 ? (SUBSCRIPT[scope.depth] || '₊') : '');
	this.points = node;
	this.kind = scope ? 'local' : (color === 'blue' || color === 'named') ? 'named' : 'pointer'; // the color comes from the theme
	this.direction = direction || 'down';
	this.active = false;

	var self = this;

	this.draw = function(node){
		if(self.active && node && self.points && self.points !== node)
			ghosts.pointers.push({pointer: self, from: self.points, to: node});
		self.points = node || self.points;
		self.active = true;
		if(self.scope)
			setFrameVar(self.scope.id, self.name, '→ ' + self.points.shownData, false, true);
		else
			removeVariable(self.name); // it is not null any more
		redrawPointers();
	}

	this.markNull = function(){
		if(self.active && self.points)
			ghosts.pointers.push({pointer: self, from: self.points, to: null});
		self.points = null;
		self.active = false;
		if(self.scope)
			setFrameVar(self.scope.id, self.name, codeWord('null'), true, true);
		else
			showVariable(self.name, codeWord('null'), true); // listed in the variables area
		redrawPointers();
	}

	this.remove = function(){
		self.active = false;
		if(!self.scope)
			removeVariable(self.name);
		redrawPointers();
	}

	pointers.push(this);
}

window.Pointer = Pointer;

// pointers that point to the same node in the same direction share one arrow: "prev, curr"
var pointerDrawings = [];
function redrawPointers(){
	redrawArrows(); // a link back to an earlier node routes around the pointers' names
	for(var i=0; i < pointerDrawings.length; i++)
		pointerDrawings[i].remove();
	pointerDrawings = [];

	var groups = {}, order = [];
	pointers.forEach(function(p){
		if(!p.active || !p.points || !p.points.shown || !p.points.position)
			return;
		var key = p.points.id + (treeMode || drawnTable() ? '' : p.direction);
		if(!groups[key]){
			groups[key] = [];
			order.push(key);
		}
		groups[key].push(p);
	});

	order.forEach(function(key){
		var group = groups[key];
		var pos = group[0].points.position;
		var up = drawnTable() ? true : !treeMode && group[0].direction === 'up'; // in a tree the parent's link comes from above; next to a table all names go above (rows are close)

		var dx = geometry().dataX; // aim at the data cell
		var rise = drawnTable() ? 26 : 40; // bucket rows are close: a shorter arrow keeps the name off the row above
		var start = pos + (up ? [dx - 10, -rise] : [dx - 10, 55]);
		var end = pos + (up ? [dx + 10, -3] : [dx + 10, 28]);
		var focused = group.some(function(p){ return focus.pointers.indexOf(p) >= 0; });
		var color = focused ? PAL.changed : PAL[group[0].kind];
		var line = new Path.Line({from: start, to: end, strokeColor: color, strokeWidth: focused ? 3 : 2});
		var items = [line, arrowTip(end, (end - start).angle, color)];

		// The names share the width of one column; what does not fit is shown as "+2" (all
		// values are in the call stack panel). The pointer the step changed comes first, then
		// the locals of the running call, the globals, and the locals of the calls below it.
		var top = visualFrames.length ? visualFrames[visualFrames.length - 1].id : null;
		function rank(p){
			if(focus.pointers.indexOf(p) >= 0) return 0;
			if(p.scope && p.scope.id === top) return 1;
			if(!p.scope) return 2;
			return 3 + 1 / (1 + p.scope.depth); // deeper calls (more recent) first
		}
		var sorted = group.slice().sort(function(a, b){ return rank(a) - rank(b); });
		var room = Math.max(60, colWidth - 12);
		var labels = [], x = 0;
		for(var li = 0; li < sorted.length; li++){
			var p = sorted[li], more = sorted.length - li - 1;
			var label = new PointText({ point: [x, 0], fontSize: 20+'px', fillColor: PAL[p.kind], content: p.label + (more ? ',' : ''),
			                            fontWeight: focus.pointers.indexOf(p) >= 0 ? 'bold' : 'normal'});
			if(li > 0 && x + label.bounds.width + (more ? 30 : 0) > room){ // no room: "+n" for this one and the rest
				label.remove();
				labels.push(new PointText({ point: [x, 0], fontSize: 16+'px', fillColor: PAL.text, opacity: 0.7, content: '+' + (more + 1)}));
				break;
			}
			x += label.bounds.width + 5;
			labels.push(label);
		}
		var labelGroup = new Group(labels);
		labelGroup.position = start + (up ? [-4, drawnTable() ? -11 : -14] : [-4, 14]);
		if(labelGroup.bounds.left < 8) // a long name under the first column would be cut off at the left edge
			labelGroup.position = labelGroup.position + [8 - labelGroup.bounds.left, 0];

		items.push(labelGroup);
		pointerDrawings.push(new Group(items));
	});
	drawGhosts();
}

// where the arrow and the name of a pointer go for a node (the same as redrawPointers uses)
function pointerSpot(node, direction){
	var pos = node.position, dx = geometry().dataX;
	var up = drawnTable() ? true : !treeMode && direction === 'up';
	var rise = drawnTable() ? 26 : 40;
	var start = pos + (up ? [dx - 10, -rise] : [dx - 10, 55]);
	return {up: up, start: start, end: pos + (up ? [dx + 10, -3] : [dx + 10, 28]), label: start + (up ? [-4, drawnTable() ? -11 : -14] : [-4, 14])};
}

// an old value, small and struck through
function struckText(content, point, justification, size, color){
	var text = new PointText({point: point, justification: justification, fontSize: size + 'px', fillColor: color, opacity: GHOST_OPACITY + 0.15, content: content});
	var b = text.bounds;
	return new Group([text, new Path.Line({from: [b.left - 1, b.center.y + 1], to: [b.right + 1, b.center.y + 1], strokeColor: color, strokeWidth: 1, opacity: GHOST_OPACITY + 0.15})]);
}

// A link, faded and dashed: the arrow the line looked like before the step
function fadeArrow(group){
	group.opacity = GHOST_OPACITY;
	if(group.children && group.children[0])
		group.children[0].dashArray = [6, 5];
	if(group.children && group.children.length === 3) // the dot at the start belongs to the real link
		group.children[2].remove();
	return group;
}

var GHOST_OPACITY = 0.45;
var ghostDrawing = null;

// Step comparison (setting stepCompare): the state before the last step, faded and dashed, behind
// the new one: the old target of a link, where a pointer came from (and a dashed arrow to where
// it is now), an old value struck through.
function drawGhosts(){
	if(ghostDrawing){
		ghostDrawing.remove();
		ghostDrawing = null;
	}
	if(!settingOn('stepCompare'))
		return;
	var items = [], any = false;

	ghosts.links.forEach(function(g){
		if(!g.from.shown || !g.from.position || !g.to.shown || !g.to.position)
			return;
		items.push(fadeArrow(treeMode ? treeArrow(g.from, g.to, g.kind, PAL.stroke) : nodeArrow(g.from, g.to, g.kind, PAL.stroke)));
		any = true;
	});

	ghosts.pointers.forEach(function(g){
		if(!g.from.shown || !g.from.position || !g.pointer.active && g.to)
			return;
		var dir = g.pointer.direction, color = PAL[g.pointer.kind];
		var spot = pointerSpot(g.from, dir);
		// other pointers still stand at that node: their arrow is the same one, so the faded name
		// only goes on a second line under theirs (no arrow of its own)
		var crowded = pointers.some(function(p){ return p !== g.pointer && p.active && p.points === g.from && (treeMode || drawnTable() || p.direction === dir); });
		var label = spot.label + [0, crowded ? (spot.up ? -24 : 24) : 0];
		var parts = [new PointText({point: label + [0, crowded ? 5 : 6], justification: 'center', fontSize: (crowded ? 15 : 18) + 'px', fillColor: color, content: g.pointer.label})];
		if(!crowded){
			parts.push(new Path.Line({from: spot.start, to: spot.end, strokeColor: color, strokeWidth: 2, dashArray: [4, 3]}));
			parts.push(arrowTip(spot.end, (spot.end - spot.start).angle, color));
		}
		var ghost = new Group(parts);
		ghost.opacity = GHOST_OPACITY;
		items.push(ghost);
		any = true;

		// and a dashed arrow from the old name to the new one
		if(g.to && g.to.shown && g.to.position){
			var now = pointerSpot(g.to, dir).label;
			var half = 8 + 5 * g.pointer.label.length;
			var sign = now.x >= label.x ? 1 : -1;
			var a = new Point(label.x + sign * (half + 4), label.y + (spot.up ? -12 : 14));
			var b = new Point(now.x - sign * 26, now.y + (spot.up ? -14 : 16));
			if(a.getDistance(b) > 14){
				var bulge = (spot.up ? -1 : 1) * (14 + a.getDistance(b) * 0.08);
				var arc = new Path({segments: [a], strokeColor: color, strokeWidth: 1.5, dashArray: [4, 3]});
				arc.arcTo(new Point((a.x + b.x) / 2, (a.y + b.y) / 2 + bulge), b);
				var move = new Group([arc, arrowTip(b, arc.getTangentAt(arc.length).angle, color)]);
				move.opacity = GHOST_OPACITY + 0.1;
				items.push(move);
			}
		}
	});

	ghosts.values.forEach(function(g){
		if(!g.node.shown || !g.node.position)
			return;
		var gg = geometry();
		items.push(struckText(typeof g.old === 'boolean' ? codeWord(String(g.old)) : '' + g.old, g.node.position + [gg.width - 12, -5], 'center', 13, PAL.stroke));
		any = true;
	});

	if(ghosts.cells.length) any = true;
	if(any){ // what the faded things are, in the bottom right corner of the drawing
		var note = new PointText({point: [view.viewSize.width / view.zoom - 10, view.viewSize.height / view.zoom - 8], justification: 'right',
			fontSize: 12 + 'px', fillColor: PAL.stroke, opacity: 0.55, content: t('ghostLegend')});
		items.push(note);
	}
	if(items.length)
		ghostDrawing = new Group(items);
}

// the drawn pointers by variable: "p" for a global, "<call id>:p" for a local
var pointerMap = {};
function pointerKey(name, scope){ return scope ? scope.id + ':' + name : name; }

// point the pointer called `name` to `node` (or mark it as null)
function pointTo(name, node, color, direction, scope){
	var key = pointerKey(name, scope);
	var pointer = pointerMap[key];

	if(!pointer){
		pointer = new Pointer(node, name, color, direction, scope);
		pointerMap[key] = pointer;
	}
	if(node == null)
		pointer.markNull();
	else
		pointer.draw(node);
	focus.pointers.push(pointer);
	if(!scope && TAIL_NAMES.indexOf(name) >= 0)
		layout(); // a circular list's row starts after its tail
	return pointer;
}

//////////////////////////////////////  Variables area  ////////////////////////////////////

// the #variables list next to the canvas (built by js/layout.js): "name = value".
// Pointers that are null are listed here too (isNull), because they have no arrow.
var variableItems = {};

function escapeHTML(text){
	return String(text).replace(/[&<>"]/g, function(c){ return {'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]; });
}

function showVariable(name, value, isNull){
	var list = document.getElementById('variables');
	if(!list)
		return;

	var item = variableItems[name];
	if(!item){
		item = variableItems[name] = document.createElement('li');
		list.appendChild(item);
	}
	var html = '<span class="name">' + escapeHTML(name) + ' =</span><span class="value">' + escapeHTML(value) + '</span>';
	if(item.innerHTML !== html){
		item.innerHTML = html;
		item.className = isNull ? 'is-null' : '';
		if(player.animating){ // flash the changed value
			void item.offsetWidth;
			item.className += ' changed';
		}
	}
}

function removeVariable(name){
	if(!variableItems[name])
		return;
	variableItems[name].remove();
	delete variableItems[name];
}

//////////////////////////////////////  Call stack panel  //////////////////////////////////
//
// #callstack (built by js/layout.js) shows the calls that are running, the innermost on
// top, with their local variables. It is drawn state: callStep / returnStep change it.

var visualFrames = [];  // {id, title, vars: {name: {text, isNull, isPointer}}, order: []}
var returnNote = '';

function findVisualFrame(id){
	for(var i=0; i < visualFrames.length; i++)
		if(visualFrames[i].id === id)
			return visualFrames[i];
	return null;
}

function setFrameVar(id, name, text, isNull, isPointer){
	var frame = findVisualFrame(id);
	if(!frame)
		return;
	if(!frame.vars[name])
		frame.order.push(name);
	frame.vars[name] = {text: String(text), isNull: !!isNull, isPointer: !!isPointer};
	renderCallStack();
}

// a plain value (number, boolean...): a global goes to the variables panel, a local to its call
function showValue(name, value, scope){
	if(!scope && shownNumbers[name] !== value){
		shownNumbers[name] = value; // the index markers of row arrays read it
		if(layoutArrays().length)
			drawRowArrays();
	}
	if(isArray(value) || value === true || value === false)
		value = formatValue(value);
	if(scope)
		setFrameVar(scope.id, name, formatValue(value), value === null, false);
	else
		showVariable(name, value);
}

function renderCallStack(){
	if(layoutArrays().length) // index markers can be locals of the running call
		drawRowArrays();
	var box = document.getElementById('callstack');
	if(!box)
		return;

	var MAX_SHOWN = 8, html = '';
	for(var i = visualFrames.length - 1; i >= Math.max(0, visualFrames.length - MAX_SHOWN); i--){
		var f = visualFrames[i];
		var vars = f.order.map(function(name){
			var v = f.vars[name];
			return '<span class="frame-var' + (v.isNull ? ' is-null' : '') + (v.isPointer ? ' is-pointer' : '') + '">' +
			       escapeHTML(name) + (v.text.charAt(0) === '→' ? ' ' : ' = ') + escapeHTML(v.text) + '</span>';
		}).join('');
		html += '<li' + (i === visualFrames.length - 1 ? ' class="current"' : '') + '><div class="frame-head">' + escapeHTML(f.title) + '</div>' +
		        (vars ? '<div class="frame-vars">' + vars + '</div>' : '') + '</li>';
	}
	if(visualFrames.length > MAX_SHOWN)
		html += '<li class="more">' + escapeHTML(t('moreCalls', {n: visualFrames.length - MAX_SHOWN})) + '</li>';
	box.innerHTML = html;

	var note = document.getElementById('callstack-note');
	if(note)
		note.textContent = returnNote;

	var panel = box.parentNode;
	if(panel)
		panel.hidden = !visualFrames.length && !returnNote;
	fitCanvas();
}

function callStep(info, def){
	highlight(def.doc, {lineNumber: def.lineNumber});
	returnNote = '';

	var args = info.args.map(function(a){ return formatValue(a.value); }).join(', ');
	visualFrames.push({id: info.id, title: info.fn + '(' + args + ')', vars: {}, order: []});
	narrate(t('nCalled', {call: info.fn + '(' + args + ')'}));

	var scope = {id: info.id, fn: info.fn, depth: info.depth};
	info.args.forEach(function(a){
		if(a.value === null || isNode(a.value))
			pointTo(a.name, a.value, undefined, undefined, scope);
		else
			setFrameVar(info.id, a.name, formatValue(a.value), false, false);
	});
	renderCallStack();
}

// remove a call from the panel together with its pointers; returns its frame
function dropFrame(info){
	for(var key in pointerMap) // the call's pointers disappear with it
		if(pointerMap[key].scope && pointerMap[key].scope.id === info.id){
			pointerMap[key].remove();
			delete pointerMap[key];
		}

	var frame = findVisualFrame(info.id);
	visualFrames = visualFrames.filter(function(f){ return f.id !== info.id; });
	return frame;
}

function returnStep(info, value, exitLine, def){
	highlight(def.doc, {lineNumber: exitLine});
	var frame = dropFrame(info);
	var call = frame ? frame.title : info.fn + '()';
	returnNote = value === undefined ? t('noteFinished', {call: call}) : t('noteReturned', {call: call, value: formatValue(value)});
	narrate(value === undefined ? t('nFinished', {call: call}) : t('nReturned', {call: call, value: formatValue(value)}));
	renderCallStack();
}

////////////////////////////////////////  Line highlighting  ///////////////////////////////

var lineMark = null, logicMarks = {}, docCounter = 0;

function highlight(doc, line, type, result){
	if(!doc || !line || !line.lineNumber)
		return;

	var ln = line.lineNumber - 1;

	if(lineMark)
		lineMark.clear();

	if(type == 'logical'){
		if(!doc.dsvId)
			docCounter = docCounter + 1;
			doc.dsvId = docCounter;

		var key = doc.dsvId + ':' + ln + ':' + line.start;
		if(logicMarks[key])
			logicMarks[key].clear();

		logicMarks[key] = doc.markText({line: ln, ch: line.start}, {line: ln, ch: line.end},
			{className: result ? "styled-background-logical-true" : "styled-background-logical-false"});
	}

	lineMark = doc.markText({line: ln, ch: 0}, {line: ln, ch: (doc.getLine(ln) || '').length}, {className: "styled-background-normal"});
}

function clearHighlights(all){
	if(lineMark)
		lineMark.clear();
	lineMark = null;

	if(all){
		for(var key in logicMarks)
			logicMarks[key].clear();
		logicMarks = {};
	}
}

//////////////////////////////////////////  Player  //////////////////////////////////////
//
// The steps of all runs on the page are kept, so the user can go back and forth.

var ICONS = {
	back:  '<svg viewBox="0 0 16 16" width="14" height="14"><path d="M3 2h2v12H3zM14 2v12L6 8z" fill="currentColor"/></svg>',
	play:  '<svg viewBox="0 0 16 16" width="14" height="14"><path d="M4 2l10 6-10 6z" fill="currentColor"/></svg>',
	pause: '<svg viewBox="0 0 16 16" width="14" height="14"><path d="M3 2h4v12H3zM9 2h4v12H9z" fill="currentColor"/></svg>',
	next:  '<svg viewBox="0 0 16 16" width="14" height="14"><path d="M11 2h2v12h-2zM2 2v12l8-6z" fill="currentColor"/></svg>',
	end:   '<svg viewBox="0 0 16 16" width="14" height="14"><path d="M1 2v12l6-6zM7 2v12l6-6zM13 2h2v12h-2z" fill="currentColor"/></svg>',
	replay: '<svg viewBox="0 0 16 16" width="15" height="15"><path d="M3.5 8a4.5 4.5 0 1 0 1.3-3.2" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M3 1.8v3.6h3.6z" fill="currentColor"/></svg>',
	share: '<svg viewBox="0 0 16 16" width="15" height="15"><path d="M6.5 9.5l3-3M7 4.5l1.3-1.3a2.5 2.5 0 013.5 3.5L10.5 8M9 11.5l-1.3 1.3a2.5 2.5 0 01-3.5-3.5L5.5 8" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>'
};

var SPEEDS = [1400, 900, 550, 300, 120]; // ms per step

var player = {
	steps: [],
	cursor: 0,         // index of the next step
	playing: true,
	animating: true,   // false while replaying (step back)
	speed: window.dsv ? window.dsv.settings.speed : 2, // the default comes from the settings
	timer: null,
	lastStep: 0,

	delay: function(){ return SPEEDS[player.speed]; },

	add: function(step){
		player.steps.push(step);
		player.schedule();
		player.updateUI();
	},

	schedule: function(){
		if(player.timer || !player.playing || player.cursor >= player.steps.length)
			return;
		var wait = Math.max(0, player.delay() - (Date.now() - player.lastStep));
		player.timer = setTimeout(player.tick, wait);
	},

	tick: function(){
		player.timer = null;
		if(!player.playing)
			return;
		player.forward();
		player.schedule();
	},

	forward: function(){
		if(player.cursor >= player.steps.length)
			return false;

		finishTween();
		runNextStep();
		finishStep();
		player.lastStep = Date.now();

		if(player.cursor === player.steps.length)
			clearHighlights(false);

		player.updateUI();
		return true;
	},

	back: function(){
		player.pause();
		if(player.cursor > 0)
			player.replayTo(player.cursor - 1);
	},

	toEnd: function(){
		player.seek(player.steps.length);
	},

	replayTo: function(k){
		player.seek(k);
	},

	// go to step k: backwards by replaying from the start, forwards by running the steps
	// at once. Only the last step's narration and lost-node warning are shown.
	seek: function(k){
		finishTween();
		k = Math.max(0, Math.min(k, player.steps.length));
		if(k === player.cursor)
			return;
		if(k < player.cursor){
			resetVisuals();
			player.cursor = 0;
		}

		player.animating = false;
		while(player.cursor < k - 1)
			runNextStep();
		updateReachability(); // the warning is about what the last step lost
		if(player.cursor < k)
			runNextStep();
		finishStep();
		player.animating = true;

		if(player.cursor === player.steps.length)
			clearHighlights(false);
		player.updateUI();
	},

	play: function(){ // also called right before a run adds its steps, so the queue may still be empty
		player.playing = true;
		player.lastStep = 0;
		player.schedule();
		player.updateUI();
	},

	pause: function(){
		player.playing = false;
		clearTimeout(player.timer);
		player.timer = null;
		player.updateUI();
	},

	updateUI: function(){
		if(!player.ui) return;
		var ui = player.ui;
		var running = player.playing && player.cursor < player.steps.length;
		var atEnd = player.steps.length > 0 && player.cursor >= player.steps.length;
		ui.play.innerHTML = running ? ICONS.pause : atEnd ? ICONS.replay : ICONS.play;
		ui.play.title = running ? t('pause') : atEnd ? t('replay') : t('play');
		ui.play.setAttribute('aria-label', ui.play.title);
		ui.play.disabled = !player.steps.length; // Step 0 / 0: nothing to play
		ui.counter.textContent = t('stepCounter', {i: player.cursor, n: player.steps.length});
		updateStats();
		ui.back.disabled = player.cursor === 0;
		ui.next.disabled = ui.end.disabled = player.cursor >= player.steps.length;
		ui.timeline.max = player.steps.length;
		ui.timeline.value = player.cursor;
		ui.timeline.disabled = !player.steps.length;
	}
};

///////////////////////////////  Focus, narration, lost nodes  ///////////////////////////////
//
// A step records what it changed (focus): those links and pointers are drawn in the
// "changed" color until the next step. It also leaves a sentence (narration) that says
// what happened. After a step the nodes no variable and no link reaches are marked lost.

var LOST_OPACITY = 0.45;
var focus = {edges: [], pointers: []};
var narration = '';

// what the run did to arrays up to the step shown: comparisons (conditions that read cells) and writes
var stats = {compare: 0, write: 0};

// Step comparison: what the last step changed, as it was before, drawn faded and dashed behind the
// new state: a link's old target, the place a pointer came from, an old value (see drawGhosts).
// Like focus it belongs to one step: runStep starts it empty.
var ghosts = {links: [], pointers: [], values: [], cells: []};
function clearGhosts(){ ghosts = {links: [], pointers: [], values: [], cells: []}; }
function ghostLink(node, kind, old, now){ // node.kind pointed to `old`, now to `now`
	if(isNode(old) && old.shown && old !== now && old !== node)
		ghosts.links.push({from: node, kind: kind, to: old});
}
function ghostValue(node, old, now){
	if(old !== now && old !== null && old !== undefined && old !== '')
		ghosts.values.push({node: node, old: old});
}
function ghostCell(visual, index, old, now){
	if(old !== now && old !== null && old !== undefined && !isNode(old))
		ghosts.cells.push({visual: visual, index: index, old: old});
}

function isFocusedEdge(node, kind){ return focus.edges.indexOf(node.id + kind) >= 0; }
function focusEdge(node, kind){ focus.edges.push(node.id + kind); }
function narrate(text){ narration = text || ''; }

// runs the step at the cursor and moves the cursor on. (Not runStep(player.cursor++):
// PaperScript rewrites a postfix ++ inside an argument and passes the new value.)
function runNextStep(){
	var i = player.cursor;
	player.cursor = i + 1;
	runStep(i);
}

function runStep(i){
	focus = {edges: [], pointers: []};
	clearGhosts();
	narration = '';
	player.steps[i]();
}

// the code language of the page when it is not Düğüm: {name, from, display, mode} (see js/codelang.js)
function codeLangInfo(){
	return window.dsvCode && window.dsvCode.langs[window.dsvCodeLang] || null;
}

// Java has no delete: a node nothing reaches is the garbage collector's
function lostText(key){ return window.dsvCodeLang === 'java' ? key + 'Java' : key; }

function settingOn(key){ return !window.dsv || window.dsv.settings[key] !== false; }
var lastNarration = '', lastWarning = '';

function updateStats(){
	if(!player.ui || !player.ui.stats) return;
	var shown = stats.compare + stats.write > 0;
	player.ui.stats.hidden = !shown;
	if(shown)
		player.ui.stats.textContent = t('statsCompare') + ' ' + stats.compare + ' · ' + t('statsWrite') + ' ' + stats.write;
}

function finishStep(){
	updateStats();
	var lost = updateReachability();
	redrawArrows();
	redrawPointers();

	var warning = '';
	if(lost.length && settingOn('warnings'))
		warning = t(lostText(lost.length > 1 ? 'nLostMany' : 'nLostOne'), {nodes: lost.map(nodeLabel).join(', ')});
	lastNarration = narration;
	lastWarning = warning;
	showNarration(settingOn('narration') ? narration : '', warning);
}

// marks the shown nodes no pointer reaches (through next / prev); returns the newly lost ones
function updateReachability(){
	var reached = {}, todo = [];
	pointers.forEach(function(p){ if(p.active && p.points && p.points.shown) todo.push(p.points); });
	allArrays.forEach(function(a){ if(a.visual.shown) a.visual.cells.forEach(function(c){ if(isNode(c) && c.shown) todo.push(c); }); });
	while(todo.length){
		var n = todo.pop();
		if(reached[n.id]) continue;
		reached[n.id] = true;
		[n.visualNext, n.visualPrev, n.visualLeft, n.visualRight].forEach(function(m){ if(m && m.shown && !reached[m.id]) todo.push(m); });
	}

	var newlyLost = [];
	allNodes.forEach(function(n){
		if(!n.shown) return;
		var lost = !reached[n.id];
		if(lost === !!n.lost) return;
		n.lost = lost;
		if(lost) newlyLost.push(n);
		if(n.position) n.render();
	});
	return newlyLost;
}

function nodeLabel(n){ return isNode(n) ? '[' + n.data + ']' : 'null'; }

function showNarration(text, warning){
	var box = document.getElementById('narration');
	if(!box) return;
	var shown = codeLangInfo();
	var code = function(t){ // the pieces in `...` are code, shown in the chosen code language
		return String(t).split('`').map(function(part, i){
			return i % 2 ? '<code>' + escapeHTML(shown ? shown.display(part) : part) + '</code>' : escapeHTML(part);
		}).join('');
	};
	box.innerHTML = (text ? '<span>' + code(text) + '</span>' : '') +
	                (warning ? '<span class="narration-warning">⚠ ' + code(warning) + '</span>' : '');
}

// the sentence for a statement, made when it runs (the values are the ones of that moment)
function describe(line, res, removed){
	var name = '`' + line.lhs + '`';
	var pointsTo = function(v){ return v === null ? t('nPointsNull', {name: name}) : t('nPointsTo', {name: name, node: nodeLabel(v)}); };
	var cond = String(line.text).trim();

	switch(line.type){
	case 'declaration':
	case 'assignment':
		if(line.rhs.type == 'node' && res.firstNext) return t('nNewNodeNext', {name: name, node: nodeLabel(res), next: nodeLabel(res.firstNext)});
		if(line.rhs.type == 'node') return t('nNewNode', {name: name, node: nodeLabel(res)});
		if(line.rhs.type == 'array' && res.visual.kind === 'grid') return t('nNewMatrix', {name: name, r: res.visual.rows, c: res.visual.cols});
		if(line.rhs.type == 'array') return t('nNewArray', {name: name, n: res.length});
		if(res === null || isNode(res)) return pointsTo(res);
		return t('nValue', {name: name, value: formatValue(res)});
	case 'matrix assignment':
	case 'array assignment':
		var cell = '`' + line.array + '[' + (line.type == 'matrix assignment' ? res.row + '][' + res.col : res.index) + ']`';
		if(res.newNode) return t('nCellNew', {cell: cell, node: nodeLabel(res.newNode)});
		if(res.value === null) return t('nCellNull', {cell: cell});
		if(isNode(res.value)) return t('nCellNode', {cell: cell, node: nodeLabel(res.value)});
		return t('nCellValue', {cell: cell, value: formatValue(res.value)});
	case 'object property right':
		if(res === null || isNode(res)) return pointsTo(res);
		return t('nValue', {name: name, value: formatValue(res)});
	case 'object property left':
	case 'object property left-right':
		if(res.prop == '.data') return t('nData', {node: '[' + res.oldData + ']', value: formatValue(res.value)});
		var field = '`' + fieldName(res.prop.slice(1)) + '`'; // the field as the chosen code language names it (sonraki in Turkish code)
		if(!VISUAL_FIELD[res.prop]) return t('nField', {node: nodeLabel(res.target), field: field, value: formatValue(res.value)}); // t.height = 2
		var link = {node: nodeLabel(res.target), field: field};
		if(res.newNode) { link['new'] = nodeLabel(res.newNode); return t('nLinkNew', link); }
		if(res.value === null) return t('nLinkNull', link);
		link.target = nodeLabel(res.value);
		return t('nLink', link);
	case 'logical':
		if(line.mainType == 'if')
			return t(res ? 'nIfTrue' : line.falsePart ? 'nIfElse' : 'nIfSkip', {c: cond});
		if(line.mainType == 'while' || line.mainType == 'for')
			return t(res ? 'nLoopTrue' : 'nLoopFalse', {c: cond});
		return t(res ? 'nCondTrue' : 'nCondFalse', {c: cond});
	case 'print':
		return t('nPrint', {value: res});
	case 'free object':
		return t('nFreed', {node: nodeLabel(removed)});
	case 'expression':
		return res === undefined ? t('nExpr', {code: cond}) : t('nExprValue', {code: cond, value: formatValue(res)});
	case 'break':
		return t('nBreak');
	case 'continue':
		return t('nContinue');
	}
	return '';
}

// forget everything that was drawn (the program state is not touched)
function resetVisuals(){
	allNodes.forEach(function(n){
		n.hide();
		n.visualNext = null;
		n.visualPrev = null;
		n.visualLeft = null;
		n.visualRight = null;
		n.shownData = n.firstData;
		n.shownHeight = undefined;
		n.shownWeight = undefined;
		n.shownChosen = undefined;
	});
	lastPlaced = null;
	doublyMode = false;
	treeMode = false;
	allArrays.forEach(function(a){ a.visual.shown = false; a.visual.cells = a.visual.kind === 'grid' ? nullCells(a.visual.rows * a.visual.cols) : a.map(function(){ return null; }); });
	shownNumbers = {};

	pointerMap = {};
	pointers = [];
	redrawPointers();

	visualFrames = [];
	returnNote = '';
	renderCallStack();

	for(var name in variableItems)
		variableItems[name].remove();
	variableItems = {};
	extent = null;
	fitCanvas();

	clearHighlights(true);
	focus = {edges: [], pointers: []};
	clearGhosts();
	stats = {compare: 0, write: 0};
	showNarration('', '');

	var output = document.getElementById("output");
	if(output)
		output.textContent = '';
}

function createPlayerUI(){
	var canvas = document.getElementById('myCanvas0');
	if(!canvas)
		return;

	var bar = document.createElement('div');
	bar.className = 'dsv-player';

	function button(icon, title, onClick){
		var b = document.createElement('button');
		b.className = 'dsv-btn';
		b.innerHTML = icon;
		b.title = title;
		b.addEventListener('click', onClick);
		bar.appendChild(b);
		return b;
	}

	var ui = {};
	ui.back = button(ICONS.back, t('stepBack'), player.back);
	ui.play = button(ICONS.pause, t('pause'), function(){
		if(!player.steps.length) return;                    // nothing to play (the button is disabled too)
		if(player.cursor >= player.steps.length){ player.pause(); player.seek(0); player.play(); return; } // at the end: from the start again
		player.playing ? player.pause() : player.play();
	});
	ui.play.classList.add('dsv-play');
	ui.next = button(ICONS.next, t('stepForward'), function(){ player.pause(); player.forward(); });
	ui.end  = button(ICONS.end, t('toEnd'), function(){ player.pause(); player.toEnd(); });

	var speedLabel = document.createElement('label');
	speedLabel.className = 'dsv-speed';
	speedLabel.innerHTML = escapeHTML(t('speed')) + ' <input type="range" min="0" max="' + (SPEEDS.length - 1) + '" step="1" value="' + player.speed + '">';
	ui.speed = speedLabel.querySelector('input');
	ui.speed.addEventListener('input', function(e){ player.speed = Number(e.target.value); });
	bar.appendChild(speedLabel);

	ui.stats = document.createElement('span'); // comparisons and writes of a run that works on arrays
	ui.stats.className = 'dsv-stats';
	ui.stats.hidden = true;
	bar.appendChild(ui.stats);

	ui.counter = document.createElement('span');
	ui.counter.className = 'dsv-counter';
	bar.appendChild(ui.counter);

	// drag to any step
	ui.timeline = document.createElement('input');
	ui.timeline.type = 'range';
	ui.timeline.className = 'dsv-timeline';
	ui.timeline.min = 0;
	ui.timeline.setAttribute('aria-label', t('step'));
	ui.timeline.title = t('timelineTitle');
	ui.timeline.addEventListener('input', function(){
		var k = Number(ui.timeline.value); // read it first: pause() puts the slider back on the current step
		player.pause();
		player.seek(k);
	});
	bar.appendChild(ui.timeline);

	var narrationBox = document.createElement('div');
	narrationBox.id = 'narration';
	narrationBox.className = 'dsv-narration';
	narrationBox.setAttribute('aria-live', 'polite');
	narrationBox.setAttribute('data-empty', t('narrationEmpty'));

	canvas.parentNode.insertBefore(bar, canvas);
	canvas.parentNode.insertBefore(narrationBox, canvas);
	player.ui = ui;
	player.updateUI();

	// ← / → step, space play/pause (not while typing in an editor or a field)
	document.addEventListener('keydown', function(e){
		var t = e.target;
		if(e.altKey || e.ctrlKey || e.metaKey || (t.closest && t.closest('.CodeMirror, input, textarea, select, button, [contenteditable]')))
			return;
		if(e.key === 'ArrowLeft'){ player.back(); e.preventDefault(); }
		else if(e.key === 'ArrowRight'){ player.pause(); player.forward(); e.preventDefault(); }
		else if(e.key === ' '){ ui.play.click(); e.preventDefault(); }
	});
}

createPlayerUI();

/////////////////////  Draw the Graphics Part  /////////////////////

function drawGraphics(line, result){

	var res = result;
	var doc = window.activeEditor;                  // the editor that runs this code
	// snapshot of the node a free/delete removes. Only there: evaluating line.text again for
	// other statements would run the calls in it twice (push(3))
	var lhs_temp = line.type == 'free object' ? safeEval(line.text) : null;
	var doubly = doublyRequested;
	var tree = treeRequested;
	var reads = cellReads.filter(function(r, i, all){ // each cell once
		return all.findIndex(function(q){ return q.visual === r.visual && q.index === r.index; }) === i;
	});
	cellReads = [];
	var scope = scopeOf(line.lhs);                  // null for a global variable
	var sentence = describe(line, res, lhs_temp);   // what happened, with the values of now

	player.add(function(){

		if(doubly && !doublyMode)
			enableDoublyMode();
		if(tree && !treeMode)
			enableTreeMode();
		narrate(sentence);
		reads.forEach(function(r){ focusEdge(r.visual, 'read' + r.index); });
		if(line.type == 'logical' && reads.length)   // a condition that looked at cells: a comparison
			stats.compare = stats.compare + 1;
		else if(line.type == 'array assignment' || line.type == 'matrix assignment')
			stats.write = stats.write + 1;

		if(line.type == 'declaration' || line.type == 'assignment')
		{
			highlight(doc, line);

			if(line.rhs.type == 'array')        //  table = new Array(5)
			{
				res.visual.shown = true;
				res.visual.name = line.lhs;
				layout();
			}
			else if(line.rhs.type == 'node') 		//  x = Node(2)
			{
				showNewNode(res);
				layout();

				var key = pointerKey(line.lhs, scope);
				var cameFrom = pointerMap[key] && pointerMap[key].active ? pointerMap[key].points : null;
				if(pointerMap[key])  // a new node: replace the old pointer with a fresh one
					pointerMap[key].remove();

				pointerMap[key] = new Pointer(res, line.lhs, 'blue', 'up', scope);
				pointerMap[key].draw(res);
				if(cameFrom && cameFrom !== res)
					ghosts.pointers.push({pointer: pointerMap[key], from: cameFrom, to: res});
				focus.pointers.push(pointerMap[key]);
			}
			else if(res === null || isNode(res))  // p1 = null  /  p1 = x  /  p1 = x.next
				pointTo(line.lhs, res, undefined, undefined, scope);
			else                                  // a plain value: count = count + 1
				showValue(line.lhs, res, scope);
		}
		else if(line.type == 'array assignment')
		{
			highlight(doc, line);
			if(res.newNode)
				showNewNode(res.newNode);
			ghostCell(res.array.visual, res.index, res.array.visual.cells[res.index], res.value);
			res.array.visual.cells[res.index] = res.value;
			focusEdge(res.array.visual, 'cell' + res.index);
			layout();
		}
		else if(line.type == 'matrix assignment')
		{
			highlight(doc, line);
			if(res.newNode)
				showNewNode(res.newNode);
			ghostCell(res.array.visual, res.index, res.array.visual.cells[res.index], res.value);
			res.array.visual.cells[res.index] = res.value;
			focusEdge(res.array.visual, 'cell' + res.index);
			layout();
		}
		else if(line.type == 'logical')
		{
			highlight(doc, line, 'logical', res);
		}
		else if(line.type == 'print')
		{
			highlight(doc, line);
			var output = document.getElementById("output");
			if(output)
				output.textContent += res + '\n';
		}
		else if(line.type == 'object property left') // p.next = x;  p.next = Node(11);  p.data = 5
		{
			highlight(doc, line);

			if(VISUAL_FIELD[res.prop])
			{
				if(res.newNode)
					showNewNode(res.newNode);

				ghostLink(res.target, res.prop.slice(1), res.target[VISUAL_FIELD[res.prop]], res.value);
				res.target[VISUAL_FIELD[res.prop]] = res.value;
				focusEdge(res.target, res.prop.slice(1));
				layout();
			}
			else if(res.prop == '.data' && res.target.boxDraw)
			{
				ghostValue(res.target, res.target.shownData, res.value);
				res.target.shownData = res.value;
				res.target.render();
			}
			else if(res.prop == '.height' && res.target.boxDraw) // drawn next to a tree node
			{
				res.target.shownHeight = res.value;
				res.target.render();
			}
			else if(res.prop == '.weight' && res.target.boxDraw) // drawn over the node, and on its edge in a graph
			{
				res.target.shownWeight = res.value;
				res.target.render();
				drawTable();
			}
			else if(res.prop == '.chosen' && res.target.boxDraw) // an edge of a graph taken into a tree: drawn thick and blue
			{
				res.target.shownChosen = !!res.value;
				drawTable();
			}
		}
		else if(line.type == 'object property right') // p1 = p1.next  /  max = p.data
		{
			highlight(doc, line);

			if(res === null || isNode(res))
				pointTo(line.lhs, res, undefined, undefined, scope);
			else
				showValue(line.lhs, res, scope);
		}
		else if(line.type == 'object property left-right') // p.next = x.next
		{
			highlight(doc, line);

			if(VISUAL_FIELD[res.prop]){
				ghostLink(res.target, res.prop.slice(1), res.target[VISUAL_FIELD[res.prop]], res.value);
				res.target[VISUAL_FIELD[res.prop]] = res.value;
				focusEdge(res.target, res.prop.slice(1));
				layout();
			}
			else if(res.prop == '.data' && res.target.boxDraw) // p.data = p.next.data
			{
				ghostValue(res.target, res.target.shownData, res.value);
				res.target.shownData = res.value;
				res.target.render();
			}
			else if(res.prop == '.height' && res.target.boxDraw)
			{
				res.target.shownHeight = res.value;
				res.target.render();
			}
			else if(res.prop == '.weight' && res.target.boxDraw)
			{
				res.target.shownWeight = res.value;
				res.target.render();
				drawTable();
			}
			else if(res.prop == '.chosen' && res.target.boxDraw)
			{
				res.target.shownChosen = !!res.value;
				drawTable();
			}
		}
		else if(line.type == 'free object') // removes the object // free p1 / free p1.next
		{
			highlight(doc, line);

			if(isNode(lhs_temp)){
				lhs_temp.hide();
				layout();
			}
		}
		else if(line.type == 'expression' || line.type == 'break' || line.type == 'continue')
		{
			highlight(doc, line);
		}
	});
}

// show a node that was created from the command prompt (Node(5))
window.showNode = function(node){
	player.add(function(){
		showNewNode(node);
		layout();
	});
}


///////////////////  Parse the code   //////////////////////////////

// user variables are globals. Some global names belong to the browser and cannot be
// changed (top, parent, self, name...): the assignment would be silently ignored.
var userGlobals = {}; // names of the user's global variables and functions
var ENGINE_GLOBALS = ['Node', 'Pointer', 'parse', 'showNode', 'explainError', 'dsvApplyTheme', 'dsvApplySettings', 'dsvExamples', 'dsv', 'activeEditor', 'editor2', 'dsvShareLink', 'dsvRunBlock', 'dsvApplyLessonMode', 'dsvCode', 'dsvCodeLang', 'dsvParser',
                      'taban', 'tavan', 'karekök', 'mutlak', 'tamBöl'];

// the language's math functions (Turkish names): taban(7 / 2) is 3
window.taban = Math.floor;
window.tavan = Math.ceil;
window['karekök'] = Math.sqrt;
window.mutlak = Math.abs;
// integer division of C++ / Java (a / b with two int sides, see js/codelang.js): cut toward zero
window['tamBöl'] = function(a, b){
	if(b === 0)
		throw ownError(currentLine, 'eDivZero');
	return Math.trunc(a / b);
};

// an error of our own: "Line 3: ..." in the chosen language, shown as it is
// The pieces of code in a message (between backticks in the texts) in the chosen code
// language: `p != null` is p != boş in Turkish code and p != nullptr in C++. A declaration
// (`var x = ...`) becomes auto x = ... in C++; an array has its own form in C++ and Java.
var CODE_EXAMPLES = {'var t = new Array(n)': {cpp: 'int t[n]', java: 'int[] t = new int[n]'},
                     'var g = new Array(3, 4)': {cpp: 'int g[3][4]', java: 'int[][] g = new int[3][4]'}};
function codePieces(text){
	var lang = codeLangInfo(), id = window.dsvCodeLang;
	return String(text).replace(/`([^`\n]*)`/g, function(m, piece){
		if(!lang)
			return piece;
		if(CODE_EXAMPLES[piece] && CODE_EXAMPLES[piece][id])
			return CODE_EXAMPLES[piece][id];
		if(id === 'cpp' && /^\.\w/.test(piece))
			return '->' + piece.slice(1);                         // the field of a pointer
		var shown = lang.display(piece);
		if(/^var\s/.test(piece) && (id === 'cpp' || id === 'java'))
			shown = (id === 'cpp' ? 'auto ' : 'var ') + shown;    // display leaves the var out
		return shown;
	});
}
function te(key, vars){ return codePieces(t(key, vars)); } // a message with its code in the code language

function ownError(line, key, vars){
	var e = new Error((line ? t('eLine', {n: line}) : '') + te(key, vars));
	e.dsvOwn = true;
	return e;
}

function assignGlobal(name, value){
	if(ENGINE_GLOBALS.indexOf(name) >= 0)
		throw ownError(currentLine, 'eEngineName', {name: name});
	window[name] = value;
	userGlobals[name] = true; // removed when a block runs again (see runBlock)
	if(window[name] !== value)
		throw ownError(currentLine, 'eReserved', {name: name, hint: name === 'top' ? t('eReservedTop') : '.'});
}

var currentLine = null; // the line that is being executed, for error messages
var currentDoc = null;  // the editor that line belongs to (a function body may be in another block)

// the line an error happened on gets a red background in its editor until the next run
var errorLines = [];
function markErrorLine(doc, line){
	if(!doc || !line || !doc.addLineClass)
		return;
	errorLines.push({doc: doc, handle: doc.addLineClass(line - 1, 'background', 'dsv-error-line')});
}
function clearErrorLines(){
	errorLines.forEach(function(e){ e.doc.removeLineClass(e.handle, 'background', 'dsv-error-line'); });
	errorLines = [];
}

function processOneItem(item){

	cellReads = [];
	currentLine = item.lineNumber;
	currentDoc = window.activeEditor;

	if(item.type == 'logical')
	{
		if(item.mainType == 'if')
		{
			var condition = evalExpr(item.text);
			drawGraphics(item, condition);

			if(condition)
				recursivelyProcess(item.truePart)
			else if(item.falsePart)
				recursivelyProcess(item.falsePart)
		}
		else if(item.mainType == 'while' || item.mainType == 'for')
		{
			if(item.init) // for(var i = 0, j = 9; ...): several declarations
				[].concat(item.init).forEach(processOneItem);

			var guard = 0, stopped = false;
			while(evalExpr(item.text)){
				drawGraphics(item, true);

				if(runLoopBody(item.statements) === 'break'){
					stopped = true;
					break;
				}

				if(item.update)
					[].concat(item.update).forEach(processOneItem);

				guard = guard + 1;
				if(guard > 1000)
					throw ownError(item.lineNumber, 'eLoop');
			}
			if(!stopped) // after a break the condition is not checked again
				drawGraphics(item, false);
		}
		else{ // there is no type, only logical expression
			item.value = evalExpr(item.text);
			drawGraphics(item, item.value);
		}
	}
	else if(item.type == 'declaration' || item.type == 'assignment')
	{
		item['#evaluation']++;

		var value = item.rhs.type == 'node'   //  x = new? Node(2)  /  Node(i)
			? makeNode(item.rhs)
			: item.rhs.type == 'array' ? (item.rhs.size2 !== null && item.rhs.size2 !== undefined
				? makeMatrix(evalExpr(item.rhs.size), evalExpr(item.rhs.size2))   // g = new Array(3, 4)
				: makeArray(evalExpr(item.rhs.size)))                             // table = new Array(5)
			: evalExpr(item.rhs);

		setVar(item.lhs, value, item.type == 'declaration');
		if(isArray(value) && !value.dsvName)
			value.dsvName = item.lhs;                // the name the errors of a matrix call it by
		if(isNode(value))
			value.setName(item.lhs);

		drawGraphics(item, value);
	}
	else if(item.type == 'expression')
	{
		item['#evaluation']++;
		item.value = evalExpr(item.text); // the command prompt shows it
		drawGraphics(item, item.value);
	}
	else if(item.type == 'print')
	{
		var resu = '';
		for(var i=0; i < item.list.length; i++)
			resu += item.list[i].subtype == 'var' ? printedValue(evalExpr(item.list[i].text)) : item.list[i].text;
		printLog.push(resu);

		drawGraphics(item, resu);
	}
	else if(item.type == 'object property left') // p.next = x;  p.next = Node(11);  p.data = 5
	{
		item['#evaluation']++;

		var path = propertyPath(item.property);
		var last = item.property[item.property.length-1].join(''); // ".next" or ".data"
		var target = evalExpr(item.lhs + path.slice(0, path.length - last.length));
		var newNode = null;
		var oldData = target ? target.data : undefined; // the narration names the node by its value before the change

		if(item.rhs.type == 'node')
		{
			newNode = makeNode(item.rhs);
			target[last.slice(1)] = newNode;
		}
		else
			target[last.slice(1)] = evalExpr(rhsCode(item.rhs));

		drawGraphics(item, {target: target, prop: last, value: target[last.slice(1)], newNode: newNode, oldData: oldData});
	}
	else if(item.type == 'array assignment') // table[k] = n
	{
		item['#evaluation']++;

		var arr = evalExpr(item.array);
		if(!isArray(arr))
			throw ownError(item.lineNumber, 'eNotArray', {name: item.array});
		if(isMatrix(arr))
			throw ownError(item.lineNumber, 'eMatrixOneIndex', {name: item.array});
		var index = evalExpr(item.index);
		if(!(index >= 0 && index < arr.length && index % 1 === 0))
			throw ownError(item.lineNumber, 'eIndex', {name: item.array, i: formatValue(index), n: arr.length, last: arr.length - 1});
		var cellNode = null, cellValue;
		if(item.rhs && item.rhs.type == 'node')
			cellValue = cellNode = makeNode(item.rhs);
		else
			cellValue = evalExpr(rhsCode(item.rhs));
		arr[index] = cellValue;
		if(!arr.visual.kind && cellValue !== null && cellValue !== undefined)
			arr.visual.kind = isNode(cellValue) ? 'buckets' : 'row'; // decides how it is drawn
		if(/^[A-Za-z_şğçöüıŞĞÇÖÜİ][A-Za-z0-9_şğçöüıŞĞÇÖÜİ]*$/.test(item.index)) // s[size] = v: mark "size" under the row
			(arr.visual.indexVars = arr.visual.indexVars || {})[item.index] = true;

		drawGraphics(item, {array: arr, index: index, value: cellValue, newNode: cellNode});
	}
	else if(item.type == 'matrix assignment') // g[i][j] = n
	{
		item['#evaluation']++;

		var mat = evalExpr(item.array);
		if(!isMatrix(mat))
			throw ownError(item.lineNumber, 'eNotMatrix', {name: item.array});
		var mrow = evalExpr(item.row), mcol = evalExpr(item.col), mv = mat.visual;
		if(!validIndex(mrow, mv.rows))
			throw ownError(item.lineNumber, 'eMatrixRow', {name: item.array, i: formatValue(mrow), n: mv.rows, last: mv.rows - 1});
		if(!validIndex(mcol, mv.cols))
			throw ownError(item.lineNumber, 'eMatrixCol', {name: item.array, i: formatValue(mrow), j: formatValue(mcol), n: mv.cols, last: mv.cols - 1});
		var mnode = null, mvalue;
		if(item.rhs && item.rhs.type == 'node')
			mvalue = mnode = makeNode(item.rhs);
		else
			mvalue = evalExpr(rhsCode(item.rhs));
		mat.raw[mrow][mcol] = mvalue;

		drawGraphics(item, {array: mat, row: mrow, col: mcol, index: mrow * mv.cols + mcol, value: mvalue, newNode: mnode});
	}
	else if(item.type == 'object property right') // p1 = p1.next
	{
		item['#evaluation']++;

		item.text = item.lhs + ' = ' + item.rhs + propertyPath(item.property);
		var moved = evalExpr(item.rhs + propertyPath(item.property));
		setVar(item.lhs, moved, false);

		drawGraphics(item, moved);
	}
	else if(item.type == 'object property left-right') // p.next = x.next
	{
		item['#evaluation']++;

		var pathLeft = propertyPath(item.propertyLeft);
		var lastLeft = item.propertyLeft[item.propertyLeft.length-1].join('');
		var targetLeft = evalExpr(item.lhs + pathLeft.slice(0, pathLeft.length - lastLeft.length));

		var oldDataLeft = targetLeft ? targetLeft.data : undefined;
		targetLeft[lastLeft.slice(1)] = evalExpr(item.rhs + propertyPath(item.propertyRight));

		drawGraphics(item, {target: targetLeft, prop: lastLeft, value: targetLeft[lastLeft.slice(1)], oldData: oldDataLeft});
	}
	else if(item.type == 'free object') // removes the object // free p1 / free p1.next
	{
		drawGraphics(item);
	}
	else if(item.type == 'break' || item.type == 'continue')
	{
		drawGraphics(item);
		throw {loopSignal: item.type, lineNumber: item.lineNumber}; // caught by the nearest loop
	}
	else if(item.type == 'function')
	{
		defineFunction(item);
	}
	else if(item.type == 'return')
	{
		var returned = item.text === null ? undefined : evalExpr(item.text);
		throw {returnSignal: true, value: returned, lineNumber: item.lineNumber}; // caught by callUser
	}
}

//////////////////////////////////////  Functions  /////////////////////////////////////////

var MAX_CALL_DEPTH = 200;
var unfinishedCalls = []; // calls an error interrupted (their returnStep never came)

// a user function becomes a JavaScript function, so a call can sit anywhere inside an
// expression (var v = pop(), return 1 + count(p.next)) and recursion works by itself
// the first function defined inside another function's body (or null)
function nestedFunction(items, inFunction){
	var list = [].concat(items || []);
	for(var i = 0; i < list.length; i++){
		var item = list[i];
		if(!item || typeof item !== 'object')
			continue;
		if(item.type === 'function' && inFunction)
			return item;
		var inside = inFunction || item.type === 'function';
		var parts = [item.body, item.truePart, item.falsePart, item.statements];
		for(var k = 0; k < parts.length; k++){
			var found = parts[k] && nestedFunction(parts[k], inside);
			if(found)
				return found;
		}
	}
	return null;
}

function defineFunction(item){
	currentLine = item.lineNumber;
	var def = {name: item.name, params: item.params, body: item.body,
	           lineNumber: item.lineNumber, endLine: item.endLine, doc: window.activeEditor};
	assignGlobal(item.name, function(){ return callUser(def, arguments); });
}

function callUser(def, args){
	if(frames.length >= MAX_CALL_DEPTH)
		throw ownError(currentLine, 'eDepth', {max: MAX_CALL_DEPTH});

	var sameDepth = 1;
	frames.forEach(function(f){ if(f.fn === def.name) sameDepth++; });

	frameCounter = frameCounter + 1;
	var frame = {id: frameCounter, fn: def.name, sameDepth: sameDepth, vars: Object.create(null)};
	def.params.forEach(function(param, i){ frame.vars[param] = args[i] === undefined ? null : args[i]; });

	var callerLine = currentLine, callerDoc = window.activeEditor;
	var info = {id: frame.id, fn: def.name, depth: sameDepth,
	            args: def.params.map(function(param){ return {name: param, value: frame.vars[param]}; })};

	player.add(function(){ callStep(info, def); });

	frames.push(frame);
	window.activeEditor = def.doc; // the body is highlighted in the editor that defined it

	var result, exitLine = def.endLine, finished = false;
	try {
		recursivelyProcess(def.body);
		finished = true;
	}
	catch(signal){
		if(signal && signal.returnSignal){
			finished = true;
			result = signal.value;
			exitLine = signal.lineNumber;
		}
		else if(signal && signal.loopSignal){ // a break inside a function cannot leave the caller's loop
			unfinishedCalls.push(info);
			throw ownError(signal.lineNumber, 'eLoopOnly', {kw: signal.loopSignal});
		}
		else {
			unfinishedCalls.push(info); // an error stopped this call; its frame stays visible until the next run
			throw signal;
		}
	}
	finally {
		frames.pop();
		window.activeEditor = callerDoc;
		if(finished) // after an error currentLine stays on the failing line, for the message
			currentLine = callerLine;
	}

	player.add(function(){ returnStep(info, result, exitLine, def); });
	return result;
}

// a field name as the chosen code language writes it
function fieldName(name){ return codeLangInfo() && codeLangInfo().field ? codeLangInfo().field(name) : name; }

// what print writes: the plain value (null, true), whatever the code language
function printedValue(value){ return value === null || value === true || value === false ? String(value) : formatValue(value); }

// null / true / false as the chosen code language writes them (boş, doğru in Turkish code; nullptr in C++)
function codeWord(word){ return codeLangInfo() ? codeLangInfo().display(word) : word; }

function formatValue(value){
	if(isNode(value)) return t('nodeValue', {data: value.data});
	if(isArray(value)) return t('arrayValue', {n: value.length});
	if(value && value.dsvRow) return t('rowValue', {n: value.length});   // g[1]: a row of a matrix
	if(value === null) return codeWord('null');
	if(value === true || value === false) return codeWord(String(value));
	if(value === undefined) return t('undefinedValue');
	return String(value);
}

// run the body of a loop; returns 'break' when a break statement left the loop
function runLoopBody(statements){
	try {
		recursivelyProcess(statements);
	}
	catch(signal){
		if(signal && signal.loopSignal === 'break')
			return 'break';
		if(!(signal && signal.loopSignal === 'continue'))
			throw signal;
	}
	return 'done';
}

function recursivelyProcess(items){

	if(items instanceof Array)
	{
		for(var i=0; i < items.length; i++)
			processOneItem(items[i]);
	}
	else
		processOneItem(items);
}


// turn parser and JavaScript errors into short explanations for learners (chosen language)
function explainError(err, source){
	var lineOf = function(n){ return n ? t('eLine', {n: n}) : ''; };

	if(err && err.loopSignal) // break / continue that is not inside a loop
		return lineOf(err.lineNumber) + te('eLoopOnly', {kw: err.loopSignal});

	if(err && err.returnSignal) // return that is not inside a function
		return lineOf(err.lineNumber) + te('eReturnOnly');

	if(err instanceof RangeError && /call stack/i.test(err.message))
		return te('eStack');

	var m, msg = (err && err.message) || String(err);

	if(err && err.name === 'SyntaxError' && err.location){ // from the PEG parser
		var loc = err.location.start;
		var found = err.found === null ? t('eEndOfCode') : (err.found === '\n' ? t('eEndOfLine') : '"' + err.found + '"');
		var line = (source || '').split('\n')[loc.line - 1] || '';
		// find(3).next = x: writing to a field of a call's result is left out on purpose
		var callField = /^\s*([A-Za-z_şğçöüıŞĞÇÖÜİ][A-Za-z0-9_şğçöüıŞĞÇÖÜİ]*)\s*\(([^()]*)\)\s*(\.|->)\s*([A-Za-z_]\w*)[^=]*=(?!=)/.exec(line);
		if(callField)
			return t('eLine', {n: loc.line}) + te('eCallField', {call: callField[1] + '(' + callField[2] + ')', field: callField[4], dot: callField[3]});
		return t('eSyntax', {line: loc.line, col: loc.column, found: found}) + '\n\n' +
		       '  ' + line + '\n  ' + new Array(loc.column).join(' ') + '^';
	}

	if(err && err.dsvOwn) // our own messages already say where
		return msg;

	var where = lineOf(currentLine);

	if((m = /Cannot read propert(?:y|ies) of (?:null|undefined) \(reading '([^']+)'\)/.exec(msg)) ||
	   (m = /can't access property "([^"]+)", .* is (?:null|undefined)/.exec(msg)))
		return where + te('eNullRead', {field: m[1]});

	if((m = /Cannot set propert(?:y|ies) of (?:null|undefined) \(setting '([^']+)'\)/.exec(msg)))
		return where + te('eNullWrite', {field: m[1]});

	if((m = /^(\S+) is not defined/.exec(msg)))
		return where + te('eUndefined', {name: m[1]});

	if((m = /^(\S+) is not a function/.exec(msg)))
		return where + te('eNotFunction', {name: m[1]});

	return where + t('eGeneric', {msg: msg}); // the message may quote anything
}

window.explainError = explainError;

// the parser is compiled from grammer.pegjs ahead of time (js/grammar.js, npm run build:grammar)
var parser = window.dsvParser;

// what the program printed in its latest run, one entry per print (the output panel only fills while the steps play)
var printLog = [];
window.dsvPrintedText = function(){ return printLog.join(','); };

var rawDugum = false; // a quiet run of hidden code: Düğüm as it is, not translated back from C++ / Java / Türkçe

window.parse = function(text) {

	var output = document.getElementById("output");
	if(output)
		output.textContent = '';
	printLog = [];

	currentLine = null;
	currentDoc = window.activeEditor;
	clearErrorLines();

	var original = text;
	try {
		var text = text || editor.getValue();
		original = text;
		if(codeLangInfo() && !rawDugum) // C++ / Java run as the Düğüm they stand for, line by line
			text = codeLangInfo().from(text);
		var result = parser.parse(text);

		if(!result)
			return null;

		if(/\.prev\b/.test(text))
			doublyRequested = true;
		if(/\.(left|right)\b/.test(text))
			treeRequested = true;
		if(HEAP_FORMULA.test(text))
			heapRequested = true;
		text.replace(new RegExp('(' + NAME_RE + ')\\s*\\[\\s*(' + NAME_RE + ')', 'g'), function(m, array, index){
			(indexUses[array] = indexUses[array] || {})[index] = true; // a[mid]: mid is marked under the cells of a
			return m;
		});
		text.replace(new RegExp('(' + NAME_RE + ')\\s*\\[[^\\]\\[]*\\]\\s*\\[\\s*(' + NAME_RE + ')', 'g'), function(m, array, index){
			(gridColUses[array] = gridColUses[array] || {})[index] = true; // g[i][j]: j is marked under the columns of g
			return m;
		});

		frames = []; // a previous run may have stopped inside a call
		if(unfinishedCalls.length){ // ... and left its frames in the panel: remove them first
			var stale = unfinishedCalls;
			unfinishedCalls = [];
			player.add(function(){ stale.forEach(dropFrame); returnNote = ''; renderCallStack(); });
		}

		// the language keeps functions at the top level: a function inside a function is an error
		var nested = nestedFunction(result, false);
		if(nested)
			throw ownError(nested.lineNumber, 'eNestedFunction', {name: nested.name});

		// functions can be called before the line that defines them (as in JavaScript)
		result.forEach(function(item){ if(item.type === 'function') defineFunction(item); });

		player.play();
		var firstStep = player.steps.length;
		recursivelyProcess(result);

		// the counters of comparisons and writes start from zero with every block (the blocks above run again
		// before it, so that the drawing is the same, but what they did is not what this block did)
		if(player.steps.length > firstStep){
			var first = player.steps[firstStep];
			player.steps[firstStep] = function(){ stats = {compare: 0, write: 0}; first(); };
		}

		// after the last step of a run, a list left drawn right to left is turned to read
		// left to right (part of the step, so stepping back and forth gives the same picture)
		var lastIndex = player.steps.length - 1;
		if(lastIndex >= firstStep){
			var lastStep = player.steps[lastIndex];
			player.steps[lastIndex] = function(){ lastStep(); layout(true); };
		}

		return result;
	} catch (err) {
		document.getElementById("output").textContent = explainError(err, original); // the message quotes the line as it was written
		if(err && err.name === 'SyntaxError' && err.location)
			markErrorLine(window.activeEditor, err.location.start.line);
		else
			markErrorLine(currentDoc, (err && err.lineNumber) || currentLine);
		return null;
	}
}


function qsa(sel) {
    return Array.apply(null, document.querySelectorAll(sel));
}

function insertAfter(el, referenceNode) {
    referenceNode.parentNode.insertBefore(el, referenceNode.nextSibling);
}

// Running block k starts the page from a clean state: the blocks before it run again at
// once (their steps are skipped), then block k runs with its animation. So running a block
// twice does not draw a second copy of the list, a block always starts from what the
// blocks above it produce (also after they were edited), and block 2 can be run first.
var blockEditors = [];

window.dsvRunBlock = function(k){ return runBlock(k); }; // lesson mode runs the block of a part; true when it ran without an error

function runBlock(k){
	if(window.dsvPlanMark)
		window.dsvPlanMark(); // a lesson plan counts the page as done once a block was run
	resetProgram();

	for(var i = 0; i < k; i++){
		window.activeEditor = blockEditors[i].doc; // set it before parsing: the steps remember it
		if(!parse(blockEditors[i].getValue())){
			var output = document.getElementById('output');
			if(output)
				output.textContent = t('eInBlock', {n: i + 1}) + output.textContent;
			player.toEnd();
			return false;
		}
		player.toEnd();
	}

	window.activeEditor = blockEditors[k].doc;
	return !!parse(blockEditors[k].getValue());
}

// Quiet runs (the exercise checks): code runs as the program, but nothing is drawn, no step is added and the
// output panel is left as it was. The program (variables, functions, nodes) keeps what the code did.
function quietly(work){
	var add = player.add, play = player.play, editor = window.activeEditor;
	var output = document.getElementById('output'), text = output ? output.textContent : '';
	// what running code changes in the engine besides the program itself: put back afterwards, so hidden code
	// does not change how the student's own animation is drawn (drawing modes, index markers, open calls)
	var kept = {doubly: doublyRequested, tree: treeRequested, heap: heapRequested, uses: JSON.stringify(indexUses),
	            cols: JSON.stringify(gridColUses), open: unfinishedCalls.slice(), frames: frames.slice()};
	player.add = function(){};
	player.play = function(){};
	window.activeEditor = null;
	try { return work(function(){ return output ? output.textContent : ''; }); }
	finally {
		player.add = add;
		player.play = play;
		window.activeEditor = editor;
		doublyRequested = kept.doubly;
		treeRequested = kept.tree;
		heapRequested = kept.heap;
		indexUses = JSON.parse(kept.uses);
		gridColUses = JSON.parse(kept.cols);
		unfinishedCalls = kept.open;
		frames = kept.frames;
		clearErrorLines();   // a hidden run that failed inside the student's function must not mark the student's line
		if(output) output.textContent = text;
	}
}

// code: Düğüm. Returns {ok, error}; error is the explained message
window.dsvRunQuiet = function(code){
	return quietly(function(shown){
		rawDugum = true;
		try {
			var ok = !!parse(code);
			return {ok: ok, error: ok ? '' : shown()};
		} finally { rawDugum = false; }
	});
};

// expression: JavaScript over the program's variables; helpers (name -> function) win over the user's own names
window.dsvEvalQuiet = function(expression, helpers){
	return quietly(function(){
		currentLine = null;   // an error of the expression is not on a line of any code that ran before
		try {
			var value = (new Function('__h', 'with(window){ with(__h){ return (' + expression + '\n); } }'))(helpers || {});
			return {ok: true, value: value, error: ''};
		} catch(err){
			return {ok: false, value: undefined, error: explainError(err, expression)};
		}
	});
};

// forget the program (the user's variables, functions and nodes) and everything drawn
function resetProgram(){
	finishTween();
	player.pause();
	resetVisuals();
	clearHighlights(true);

	for(var name in userGlobals)
		delete window[name];
	userGlobals = {};
	delete window.temp_node; // made by the command prompt for Node(5)

	allNodes = [];
	allArrays = [];
	pointers = [];
	pointerMap = {};
	frames = [];
	unfinishedCalls = [];
	doublyRequested = false;
	treeRequested = false;
	heapRequested = false;
	indexUses = {};
	gridColUses = {};
	currentLine = null;

	player.steps = [];
	player.cursor = 0;
	player.lastStep = 0;
	player.updateUI();
}

// for the tests: what is drawn right now
window.dsvState = function(){
	return {
		nodes: allNodes.filter(function(n){ return n.shown; }).map(function(n){ return n.shownData; }),
		pointers: pointers.filter(function(p){ return p.active; }).map(function(p){ return p.label; }).sort(),
		doubly: doublyMode,
		tree: treeMode,
		grids: allArrays.filter(function(a){ return a.visual.shown && a.visual.kind === 'grid'; }).map(function(a){
			var v = a.visual, rows = [], reads = [], focused = null, r, c;
			for(r = 0; r < v.rows; r = r + 1){
				rows.push(v.cells.slice(r * v.cols, (r + 1) * v.cols).map(function(x){ return isNode(x) ? '[' + x.shownData + ']' : x; }));
				for(c = 0; c < v.cols; c = c + 1){
					if(isFocusedEdge(v, 'read' + (r * v.cols + c))) reads.push([r, c]);
					if(isFocusedEdge(v, 'cell' + (r * v.cols + c))) focused = [r, c];
				}
			}
			return {name: v.name, rows: v.rows, cols: v.cols, cells: rows, reads: reads, focus: focused, markers: gridMarkers(v)};
		}),
		arrays: allArrays.filter(function(a){ return a.visual.shown && a.visual.kind !== 'grid'; }).map(function(a){
			var markers = {};
			var at = markersOf(a.visual);
			Object.keys(at).forEach(function(k){ at[k].forEach(function(n){ markers[n] = Number(k); }); });
			return {name: a.visual.name, kind: a.visual.kind === 'buckets' ? 'buckets' : 'row', markers: markers,
			        cells: a.visual.cells.map(function(c){ return isNode(c) ? '[' + c.shownData + ']' : c; }),
			        bars: barsOn(a),
			        forest: forestOf(a) ? forestOf(a).parent : null,
			        reads: a.visual.cells.map(function(c, i){ return isFocusedEdge(a.visual, 'read' + i) ? i : -1; }).filter(function(i){ return i >= 0; }),
			        heap: heapLevels(a) ? a.visual.cells.slice(0, heapUsed(a)) : null, // the cells drawn as a tree
			        graph: a.visual.graphCol !== undefined ? graphState(a) : null};    // the graph drawn beside the chains
		}),
		bands: (function(){ var top = ROW_TOP; return layoutArrays().map(function(a){ var b = [a.visual.name, top, rowBand(a)]; top = top + rowBand(a); return b; }); })(),
		heights: allNodes.filter(function(n){ return n.shown && n.shownHeight !== undefined; }).map(function(n){ return [n.shownData, n.shownHeight]; }),
		lost: allNodes.filter(function(n){ return n.shown && n.lost; }).map(function(n){ return n.shownData; }),
		nullNext: allNodes.filter(function(n){ return n.shown && !(n.visualNext && n.visualNext.shown); }).map(function(n){ return n.shownData; }),
		narration: (document.getElementById('narration') || {}).textContent || '',
		stats: {compare: stats.compare, write: stats.write},
		// step comparison: what the last step changed, as it was before ("2>3 next": the next of [2] was [3];
		// "curr:1>2": curr moved from [1] to [2]; "2<-4": the value 4 became 2; "a[0]:5": the cell held 5)
		ghosts: {
			links: ghosts.links.map(function(g){ return g.from.shownData + '>' + g.to.shownData + ' ' + g.kind; }),
			pointers: ghosts.pointers.map(function(g){ return g.pointer.label + ':' + g.from.shownData + '>' + (g.to ? g.to.shownData : 'null'); }),
			values: ghosts.values.map(function(g){ return g.node.shownData + '<-' + g.old; }),
			cells: ghosts.cells.map(function(g){
				return g.visual.name + (g.visual.kind === 'grid' ? '[' + Math.floor(g.index / g.visual.cols) + '][' + g.index % g.visual.cols + ']' : '[' + g.index + ']') + ':' + g.old;
			}),
			drawn: !!ghostDrawing
		},
		// how the next / prev arrows on the canvas are drawn: {straight: 3, hook: 2, other: 0}
		arrows: (function(){
			var count = {straight: 0, hook: 0, other: 0};
			(function visit(items){
				items.forEach(function(item){
					if(item.data && item.data.arrow) count[item.data.arrow] = count[item.data.arrow] + 1;
					else if(item.children) visit(item.children);
				});
			})(project.layers);
			return count;
		})(),
		// the drawn values row by row, left to right
		rows: (function(){
			var byRow = {};
			allNodes.forEach(function(n){ if(n.shown && n.cell) (byRow[n.cell.row] = byRow[n.cell.row] || []).push(n); });
			return Object.keys(byRow).sort(function(a, b){ return a - b; }).map(function(r){
				return byRow[r].sort(function(a, b){ return a.cell.col - b.cell.col; }).map(function(n){ return n.shownData; });
			});
		})()
	};
};

///////////////////////////////////////  Sharing  ///////////////////////////////////////
//
// A link carries the blocks that differ from the page's own code, after the #:
// page.html#b2=...&b3=... (the code as UTF-8 in base64url). Opening it puts that code into
// the blocks; it does not run it: the code runs as JavaScript in the visitor's browser, so
// the visitor reads it first and presses Run. Nothing is sent to a server.

var blockOriginals = [];

function encodeCode(text){
	return btoa(unescape(encodeURIComponent(text))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function decodeCode(data){
	var b64 = data.replace(/-/g, '+').replace(/_/g, '/');
	while(b64.length % 4)
		b64 = b64 + '=';
	return decodeURIComponent(escape(atob(b64)));
}

function sharedHash(){
	var lang = codeLangInfo() ? 'c=' + window.dsvCodeLang : '';
	var parts = lang ? [lang] : [];
	var plan = /(?:^#|&)(plan=[A-Za-z0-9_-]+&i=\d+)(?:&|$)/.exec(location.hash); // a link from a lesson plan keeps the plan
	if(plan) parts.unshift(plan[1]);
	blockEditors.forEach(function(editor, i){
		var code = editor.getValue();
		if(code !== blockOriginals[i])
			parts.push('b' + (i + 1) + '=' + encodeCode(code));
	});
	return parts.join('&');
}

var toastTimer = null;
function toast(text){
	var box = document.getElementById('dsv-toast');
	if(!box){
		box = document.createElement('div');
		box.id = 'dsv-toast';
		box.className = 'dsv-toast';
		box.setAttribute('role', 'status');
		document.body.appendChild(box);
	}
	box.textContent = text;
	box.classList.add('show');
	clearTimeout(toastTimer);
	toastTimer = setTimeout(function(){ box.classList.remove('show'); }, 2500);
}

function shareLink(){
	var hash = sharedHash();
	var url = location.href.split('#')[0] + (hash ? '#' + hash : '');
	if(history.replaceState)
		history.replaceState(null, '', url); // the address bar shows the link too
	var copied = function(){ toast(t(/(^|&)b\d+=/.test(hash) ? 'shareCopied' : 'shareCopiedPage')); };
	var manual = function(){ window.prompt(t('shareManual'), url); };
	if(navigator.clipboard && navigator.clipboard.writeText)
		navigator.clipboard.writeText(url).then(copied, manual);
	else
		manual();
	return url;
}
window.dsvShareLink = shareLink;

function openSharedCode(){
	var hash = location.hash.replace(/^#/, '');
	if(!hash)
		return;
	var changed = 0;
	hash.split('&').forEach(function(part){
		var m = /^b(\d+)=([A-Za-z0-9_-]*)$/.exec(part);
		var editor = m && blockEditors[Number(m[1]) - 1];
		if(!editor)
			return;
		try {
			editor.setValue(decodeCode(m[2]));
			changed = changed + 1;
		} catch(e) {} // a broken link: that block keeps its own code
	});
	if(!changed)
		return;

	var lesson = document.querySelector('main.lesson');
	var h1 = lesson && lesson.querySelector('h1');
	if(!h1)
		return;
	var banner = document.createElement('div');
	banner.className = 'share-banner';
	banner.setAttribute('role', 'note');
	banner.innerHTML = '<span>' + escapeHTML(t('sharedBanner', {n: changed})) + '</span>';
	var back = document.createElement('button');
	back.className = 'link-btn';
	back.textContent = t('sharedRestore');
	back.addEventListener('click', function(){
		blockEditors.forEach(function(editor, i){ editor.setValue(blockOriginals[i]); });
		var keep = /(?:^#|&)(plan=[A-Za-z0-9_-]+&i=\d+)(?:&c=\w+)?(?:&|$)/.exec(location.hash); // the plan stays, the shared code goes
		if(history.replaceState)
			history.replaceState(null, '', location.href.split('#')[0] + (keep ? '#' + keep[0].replace(/^#/, '') : ''));
		banner.parentNode.removeChild(banner);
	});
	banner.appendChild(back);
	insertAfter(banner, h1);
}

function setEditors(items){

	// every textarea with the class "deneme" becomes a CodeMirror editor with a run button
	if(window.dsvCode && window.dsvCode.defineModes)
		window.dsvCode.defineModes(CodeMirror); // the colours of Düğüm with Turkish words
	items.forEach(function (editorEl) {

		var editor = CodeMirror.fromTextArea(editorEl, {
			mode: codeLangInfo() ? codeLangInfo().mode : "javascript",
			extraKeys: {"Ctrl-Space": "autocomplete"},
			styleActiveLine: true,
			lineNumbers: true,
			lineWrapping: true,
			autoCloseBrackets: true,
			autoCloseTags: true,
			theme: 'dsv',
			viewportMargin: Infinity
		});

		var index = blockEditors.length;
		blockEditors.push(editor);
		function run(){ runBlock(index); }

		editor.addKeyMap({"Ctrl-Enter": run, "Cmd-Enter": run});

		var button = document.createElement("button");
		button.innerHTML = ICONS.play + '<span>' + escapeHTML(t('run')) + '</span>';
		button.title = t('runTitle');
		button.className = "btn-round btn-lg dsv-run";
		insertAfter(button, editor.getWrapperElement());
		button.addEventListener("click", run);

		// shares the page's code as a link (see shareLink)
		var share = document.createElement("button");
		share.className = "dsv-share";
		share.innerHTML = ICONS.share;
		share.title = t('shareTitle');
		share.setAttribute('aria-label', t('shareTitle'));
		insertAfter(share, button);
		share.addEventListener("click", function(){ shareLink(); });

		// appears once the code was changed: puts the example's own code back
		var original = editor.getValue();
		blockOriginals.push(original);
		var restore = document.createElement("button");
		restore.className = "dsv-restore";
		restore.textContent = t('restore');
		restore.title = t('restoreTitle');
		restore.hidden = true;
		insertAfter(restore, button);
		restore.addEventListener("click", function(){ editor.setValue(original); editor.focus(); });
		editor.on("change", function(){ restore.hidden = editor.getValue() === original; });

		editor.on("focus", function() { window.activeEditor = editor.doc });
	});
}

setEditors(qsa(".deneme"));
openSharedCode();
window.dsvReady = true; // the page can run code now (the tests wait for this)
