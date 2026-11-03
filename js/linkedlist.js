/*
 * Linked list visualisation engine (PaperScript, runs on canvas "myCanvas0").
 *
 * How it works
 * ------------
 * 1. parse() turns the code of an editor into a list of statements (grammer.pegjs).
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
		local: token('--viz-local', '#7c3aed')
	};
}

// called by js/layout.js after the theme changed
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

function geometry(){
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
	this.prev = null;

	// visual state (see the comment at the top of the file)
	this.shown = false;
	this.visualNext = null;
	this.visualPrev = null;
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

		items.push(new Path.Line({from: [p.x + g.nextX, p.y], to: [p.x + g.nextX, p.y + NODE_H], strokeColor: PAL.stroke, strokeWidth: 2}));
		items.push(new Path.Circle({ radius: 4, fillColor: PAL.stroke, center: [p.x + g.nextX + 10, p.y + g.nextY]}));

		if(doublyMode){
			items.push(new Path.Line({from: [p.x + g.dataX, p.y], to: [p.x + g.dataX, p.y + NODE_H], strokeColor: PAL.stroke, strokeWidth: 2}));
			items.push(new Path.Circle({ radius: 4, fillColor: PAL.stroke, center: [p.x + 10, p.y + g.prevY]}));
		}

		items.push(new PointText({ point: [p.x + g.dataX + 15, p.y + 19], justification: 'center', fontSize: 18+'px', fillColor: PAL.text, content:''+ self.shownData}));

		self.boxDraw = new Group(items);
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
		[self.boxDraw, self.arrowDraw, self.prevArrowDraw].forEach(function(item){ if(item) item.remove(); });
		self.boxDraw = self.arrowDraw = self.prevArrowDraw = null;
	}

	this.setName = function(name){
		self.name = name;
	}

	allNodes.push(this);
}

window.Node = Node;

function enableDoublyMode(){
	if(doublyMode)
		return;
	doublyMode = true;
	allNodes.forEach(function(n){ if(n.shown && n.position) n.render(); });
	layout(); // wider nodes need wider columns
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
function nodeArrow(from, to, kind){
	var a = from.position, b = to.position, g = geometry();
	var isNext = kind !== 'prev';
	var start = a + (isNext ? [g.nextX + 10, g.nextY] : [10, g.prevY]);
	var line, angle, end;

	var sameRow = Math.abs(a.y - b.y) < 1;
	var dx = b.x - a.x;
	var neighbour = sameRow && (isNext ? dx > 0 : dx < 0) && Math.abs(dx) <= colWidth + 1;

	if(neighbour) {                                       // straight to the neighbour
		end = isNext ? b + [0, g.nextY] : b + [g.width, g.prevY];
		line = new Path.Line({from: start, to: end, strokeColor: PAL.stroke, strokeWidth: 2});
		angle = (end - start).angle;
	}
	else if(sameRow) {                                    // backwards or skipping nodes: an arc
		end = b + [g.width / 2, isNext ? 0 : NODE_H];
		var bulge = 18 + Math.abs(dx) * 0.1;
		var through = new Point((start.x + end.x) / 2, isNext ? a.y - bulge : a.y + NODE_H + bulge);
		line = new Path({segments: [start], strokeColor: PAL.stroke, strokeWidth: 2});
		line.arcTo(through, end);
		angle = line.getTangentAt(line.length).angle;
	}
	else {                                                // another row: straight to the top or bottom edge
		end = b + [g.width / 2, b.y > a.y ? 0 : NODE_H];
		line = new Path.Line({from: start, to: end, strokeColor: PAL.stroke, strokeWidth: 2});
		angle = (end - start).angle;
	}

	return new Group([line, arrowTip(end, angle)]);
}

function redrawArrows(){
	for(var i=0; i < allNodes.length; i++){
		var n = allNodes[i];

		if(n.arrowDraw)
			n.arrowDraw.remove();
		if(n.prevArrowDraw)
			n.prevArrowDraw.remove();
		n.arrowDraw = n.prevArrowDraw = null;

		if(!n.shown)
			continue;
		if(n.visualNext && n.visualNext.shown && n.visualNext !== n)
			n.arrowDraw = nodeArrow(n, n.visualNext, 'next');
		if(n.visualPrev && n.visualPrev.shown && n.visualPrev !== n)
			n.prevArrowDraw = nodeArrow(n, n.visualPrev, 'prev');
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

function maxColWidth(){ return doublyMode ? 125 : 100; }
var lastPlaced = null, placementCounter = 0;

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

	for(i=0; i < ordered.length; i++)          // chains that start at a head
		if(!indeg[ordered[i].id] && !visited[ordered[i].id])
			walk(ordered[i]);

	for(i=0; i < ordered.length; i++)          // what is left belongs to cycles
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

function layout(){
	var shown = allNodes.filter(function(n){ return n.shown; });
	var chains = chainsOf(shown);
	var occupied = {};
	var i, k;

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

		if(run){
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
				n.placedOrder = ++placementCounter;
			}
			n.cell = {row: row, col: firstCol + k * dir};
			occupied[row + ',' + n.cell.col] = true;
		}
		maxRow = Math.max(maxRow, row);
	});

	// grid cells -> canvas positions (the leftmost column and the top row start at the origin)
	var minCol = Infinity, maxCol = -Infinity, minRow = Infinity;
	for(i=0; i < shown.length; i++){
		minCol = Math.min(minCol, shown[i].cell.col);
		maxCol = Math.max(maxCol, shown[i].cell.col);
		minRow = Math.min(minRow, shown[i].cell.row);
	}

	var visibleWidth = Math.max(300, canvasHolderWidth() - COL_X0 - geometry().width - 30);
	var widest = maxColWidth(), narrowest = geometry().width + 25;
	colWidth = maxCol > minCol ? Math.max(narrowest, Math.min(widest, visibleWidth / (maxCol - minCol))) : widest;

	// the size the drawing needs; fitCanvas() scales it down when the card is narrower
	var maxRowUsed = -Infinity;
	for(i=0; i < shown.length; i++)
		maxRowUsed = Math.max(maxRowUsed, shown[i].cell.row);
	extent = shown.length
		? {width: COL_X0 + (maxCol - minCol) * colWidth + geometry().width + 40, height: ROW_Y0 + (maxRowUsed - minRow) * ROW_H + NODE_H + 85}
		: null;

	var moves = [], fades = [];
	for(i=0; i < shown.length; i++){
		var node = shown[i];
		var target = new Point(COL_X0 + (node.cell.col - minCol) * colWidth, ROW_Y0 + (node.cell.row - minRow) * ROW_H);

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
	var zoom = Math.min(1, width / need.width);
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
			tween.fades[j].boxDraw.opacity = e;

	redrawArrows();
	redrawPointers();
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
		self.points = node || self.points;
		self.active = true;
		if(self.scope)
			setFrameVar(self.scope.id, self.name, '→ ' + self.points.shownData, false, true);
		else
			removeVariable(self.name); // it is not null any more
		redrawPointers();
	}

	this.markNull = function(){
		self.points = null;
		self.active = false;
		if(self.scope)
			setFrameVar(self.scope.id, self.name, 'null', true, true);
		else
			showVariable(self.name, 'null', true); // listed in the variables area
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
	for(var i=0; i < pointerDrawings.length; i++)
		pointerDrawings[i].remove();
	pointerDrawings = [];

	var groups = {}, order = [];
	pointers.forEach(function(p){
		if(!p.active || !p.points || !p.points.shown || !p.points.position)
			return;
		var key = p.points.id + p.direction;
		if(!groups[key]){
			groups[key] = [];
			order.push(key);
		}
		groups[key].push(p);
	});

	order.forEach(function(key){
		var group = groups[key];
		var pos = group[0].points.position;
		var up = group[0].direction === 'up';

		var dx = geometry().dataX; // aim at the data cell
		var start = pos + (up ? [dx - 10, -40] : [dx - 10, 55]);
		var end = pos + (up ? [dx + 10, -3] : [dx + 10, 28]);
		var color = PAL[group[0].kind];
		var line = new Path.Line({from: start, to: end, strokeColor: color, strokeWidth: 2});
		var items = [line, arrowTip(end, (end - start).angle, color)];

		var labels = [], x = 0;
		group.forEach(function(p, index){
			var label = new PointText({ point: [x, 0], fontSize: 20+'px', fillColor: PAL[p.kind], content: p.label + (index < group.length - 1 ? ',' : '')});
			x += label.bounds.width + 5;
			labels.push(label);
		});
		var labelGroup = new Group(labels);
		labelGroup.position = start + (up ? [-4, -14] : [-4, 14]);

		items.push(labelGroup);
		pointerDrawings.push(new Group(items));
	});
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
	if(scope)
		setFrameVar(scope.id, name, formatValue(value), value === null, false);
	else
		showVariable(name, value);
}

function renderCallStack(){
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
		html += '<li class="more">… ' + (visualFrames.length - MAX_SHOWN) + ' çağrı daha</li>';
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
	returnNote = (frame ? frame.title : info.fn + '()') + (value === undefined ? ' bitti.' : ' döndürdü: ' + formatValue(value));
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
			doc.dsvId = ++docCounter;

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
	end:   '<svg viewBox="0 0 16 16" width="14" height="14"><path d="M1 2v12l6-6zM7 2v12l6-6zM13 2h2v12h-2z" fill="currentColor"/></svg>'
};

var SPEEDS = [1400, 900, 550, 300, 120]; // ms per step

var player = {
	steps: [],
	cursor: 0,         // index of the next step
	playing: true,
	animating: true,   // false while replaying (step back)
	speed: 2,
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
		player.steps[player.cursor++]();
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
		finishTween();
		player.animating = false;
		while(player.forward());
		player.animating = true;
	},

	replayTo: function(k){
		finishTween();
		resetVisuals();

		player.animating = false;
		player.cursor = 0;
		while(player.cursor < k)
			player.steps[player.cursor++]();
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
		ui.play.innerHTML = running ? ICONS.pause : ICONS.play;
		ui.play.title = running ? 'Duraklat' : 'Oynat';
		ui.counter.textContent = 'Adım ' + player.cursor + ' / ' + player.steps.length;
		ui.back.disabled = player.cursor === 0;
		ui.next.disabled = ui.end.disabled = player.cursor >= player.steps.length;
	}
};

// forget everything that was drawn (the program state is not touched)
function resetVisuals(){
	allNodes.forEach(function(n){
		n.hide();
		n.visualNext = null;
		n.visualPrev = null;
		n.shownData = n.data;
	});
	lastPlaced = null;
	doublyMode = false;

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
	ui.back = button(ICONS.back, 'Geri adım', player.back);
	ui.play = button(ICONS.pause, 'Duraklat', function(){ player.playing && player.cursor < player.steps.length ? player.pause() : player.play(); });
	ui.next = button(ICONS.next, 'İleri adım', function(){ player.pause(); player.forward(); });
	ui.end  = button(ICONS.end, 'Sona atla', function(){ player.pause(); player.toEnd(); });

	var speedLabel = document.createElement('label');
	speedLabel.className = 'dsv-speed';
	speedLabel.innerHTML = 'Hız <input type="range" min="0" max="' + (SPEEDS.length - 1) + '" step="1" value="' + player.speed + '">';
	speedLabel.querySelector('input').addEventListener('input', function(e){ player.speed = +e.target.value; });
	bar.appendChild(speedLabel);

	ui.counter = document.createElement('span');
	ui.counter.className = 'dsv-counter';
	bar.appendChild(ui.counter);

	canvas.parentNode.insertBefore(bar, canvas);
	player.ui = ui;
	player.updateUI();
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
	var scope = scopeOf(line.lhs);                  // null for a global variable

	player.add(function(){

		if(doubly && !doublyMode)
			enableDoublyMode();

		if(line.type == 'declaration' || line.type == 'assignment')
		{
			highlight(doc, line);

			if(line.rhs.type == 'node') 		//  x = Node(2)
			{
				res.shown = true;
				layout();

				var key = pointerKey(line.lhs, scope);
				if(pointerMap[key])  // a new node: replace the old pointer with a fresh one
					pointerMap[key].remove();

				pointerMap[key] = new Pointer(res, line.lhs, 'blue', 'up', scope);
				pointerMap[key].draw(res);
			}
			else if(res === null || isNode(res))  // p1 = null  /  p1 = x  /  p1 = x.next
				pointTo(line.lhs, res, undefined, undefined, scope);
			else                                  // a plain value: count = count + 1
				showValue(line.lhs, res, scope);
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

			if(res.prop == '.next' || res.prop == '.prev')
			{
				if(res.newNode)
					res.newNode.shown = true;

				res.target[res.prop == '.next' ? 'visualNext' : 'visualPrev'] = res.value;
				layout();
			}
			else if(res.prop == '.data' && res.target.boxDraw)
			{
				res.target.shownData = res.value;
				res.target.render();
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

			if(res.prop == '.next' || res.prop == '.prev'){
				res.target[res.prop == '.next' ? 'visualNext' : 'visualPrev'] = res.value;
				layout();
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
		node.shown = true;
		layout();
	});
}


///////////////////  Parse the code   //////////////////////////////

// user variables are globals. Some global names belong to the browser and cannot be
// changed (top, parent, self, name...): the assignment would be silently ignored.
var userGlobals = {}; // names of the user's global variables and functions
var ENGINE_GLOBALS = ['Node', 'Pointer', 'parse', 'showNode', 'explainError', 'dsvApplyTheme', 'dsvExamples', 'activeEditor', 'editor2'];

function assignGlobal(name, value){
	if(ENGINE_GLOBALS.indexOf(name) >= 0)
		throw new Error('Satır ' + currentLine + ': "' + name + '" adı uygulamanın kendisi tarafından kullanılıyor, başka bir isim seçin.');
	window[name] = value;
	userGlobals[name] = true; // removed when a block runs again (see runBlock)
	if(window[name] !== value)
		throw new Error('Satır ' + currentLine + ': "' + name + '" adı tarayıcıya ayrılmış, değişken olarak kullanılamaz. ' +
		                'Başka bir isim seçin' + (name === 'top' ? ' (ör. tepe).' : '.'));
}

var currentLine = null; // the line that is being executed, for error messages

function processOneItem(item){

	currentLine = item.lineNumber;

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
			if(item.init)
				processOneItem(item.init);

			var guard = 0, stopped = false;
			while(evalExpr(item.text)){
				drawGraphics(item, true);

				if(runLoopBody(item.statements) === 'break'){
					stopped = true;
					break;
				}

				if(item.update)
					processOneItem(item.update);

				if(++guard > 1000)
					throw new Error('Satır ' + item.lineNumber + ': döngü 1000 kereden fazla döndü. Sonsuz bir döngü olabilir mi? Döngü koşulunun bir gün yanlış olacağından emin olun.');
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
			? new Node(evalExpr(item.rhs.data))
			: evalExpr(item.rhs);

		setVar(item.lhs, value, item.type == 'declaration');
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
			resu += item.list[i].subtype == 'var' ? formatValue(evalExpr(item.list[i].text)) : item.list[i].text;

		drawGraphics(item, resu);
	}
	else if(item.type == 'object property left') // p.next = x;  p.next = Node(11);  p.data = 5
	{
		item['#evaluation']++;

		var path = propertyPath(item.property);
		var last = item.property[item.property.length-1].join(''); // ".next" or ".data"
		var target = evalExpr(item.lhs + path.slice(0, path.length - last.length));
		var newNode = null;

		if(item.rhs.type == 'node')
		{
			newNode = new Node(evalExpr(item.rhs.data));
			target[last.slice(1)] = newNode;
		}
		else
			target[last.slice(1)] = evalExpr(rhsCode(item.rhs));

		drawGraphics(item, {target: target, prop: last, value: target[last.slice(1)], newNode: newNode});
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

		targetLeft[lastLeft.slice(1)] = evalExpr(item.rhs + propertyPath(item.propertyRight));

		drawGraphics(item, {target: targetLeft, prop: lastLeft, value: targetLeft[lastLeft.slice(1)]});
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
function defineFunction(item){
	currentLine = item.lineNumber;
	var def = {name: item.name, params: item.params, body: item.body,
	           lineNumber: item.lineNumber, endLine: item.endLine, doc: window.activeEditor};
	assignGlobal(item.name, function(){ return callUser(def, arguments); });
}

function callUser(def, args){
	if(frames.length >= MAX_CALL_DEPTH)
		throw new Error('Satır ' + currentLine + ': iç içe ' + MAX_CALL_DEPTH + ' fonksiyon çağrısı aşıldı. ' +
		                'Özyinelemenin bir durma koşulu var mı? (ör. if(p == null) return 0)');

	var sameDepth = 1;
	frames.forEach(function(f){ if(f.fn === def.name) sameDepth++; });

	var frame = {id: ++frameCounter, fn: def.name, sameDepth: sameDepth, vars: Object.create(null)};
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
			throw new Error('Satır ' + signal.lineNumber + ': ' + signal.loopSignal + ' yalnızca bir döngünün (while ya da for) içinde kullanılabilir.');
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

function formatValue(value){
	if(isNode(value)) return 'düğüm(' + value.data + ')';
	if(value === null) return 'null';
	if(value === undefined) return 'tanımsız';
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


// turn parser and JavaScript errors into short Turkish explanations for learners
function explainError(err, source){
	if(err && err.loopSignal) // break / continue that is not inside a loop
		return 'Satır ' + err.lineNumber + ': ' + err.loopSignal + ' yalnızca bir döngünün (while ya da for) içinde kullanılabilir.';

	if(err && err.returnSignal) // return that is not inside a function
		return 'Satır ' + err.lineNumber + ': return yalnızca bir fonksiyonun içinde kullanılabilir.';

	if(err instanceof RangeError && /call stack/i.test(err.message))
		return 'Çok fazla iç içe fonksiyon çağrısı. Özyinelemenin bir durma koşulu var mı?';

	var m, msg = (err && err.message) || String(err);

	if(err && err.name === 'SyntaxError' && err.location){ // from the PEG parser
		var loc = err.location.start;
		var found = err.found === null ? 'kodun sonu' : (err.found === '\n' ? 'satır sonu' : '"' + err.found + '"');
		var line = (source || '').split('\n')[loc.line - 1] || '';
		return 'Yazım hatası (satır ' + loc.line + ', sütun ' + loc.column + '): burada ' + found + ' beklenmiyordu.\n\n' +
		       '  ' + line + '\n  ' + new Array(loc.column).join(' ') + '^';
	}

	var where = currentLine ? 'Satır ' + currentLine + ': ' : '';

	if((m = /Cannot read propert(?:y|ies) of (?:null|undefined) \(reading '([^']+)'\)/.exec(msg)) ||
	   (m = /can't access property "([^"]+)", .* is (?:null|undefined)/.exec(msg)))
		return where + 'null olan bir pointer\'ın .' + m[1] + ' alanı okunmaya çalışıldı. ' +
		       'Pointer listenin sonunu geçmiş olabilir; döngü koşulunu kontrol edin (ör. p != null ya da kısaca p).';

	if((m = /Cannot set propert(?:y|ies) of (?:null|undefined) \(setting '([^']+)'\)/.exec(msg)))
		return where + 'null olan bir pointer\'ın .' + m[1] + ' alanı değiştirilmeye çalışıldı. Pointer bir düğümü göstermiyor.';

	if((m = /^(\S+) is not defined/.exec(msg)))
		return where + '"' + m[1] + '" tanımlı değil. Önce var ile tanımlayın (ör. var ' + m[1] + ' = ...).';

	if((m = /^(\S+) is not a function/.exec(msg)))
		return where + '"' + m[1] + '" bir fonksiyon değil. Fonksiyonu çağırmadan önce function ile tanımlayın.';

	if(msg.indexOf('Satır ') === 0) // our own messages already say where
		return msg;

	return where + 'Hata: ' + msg;
}

window.explainError = explainError;

var grammer = null, parser = null;

(function(){
	var request = new XMLHttpRequest();
	request.open('GET', 'grammer.pegjs');
	request.onload = function(){
		grammer = request.responseText;
		parser = PEG.buildParser(grammer);
		window.dsvReady = true; // the page can run code now (the tests wait for this)
	};
	request.send();
})();

window.parse = function(text) {

	var output = document.getElementById("output");
	if(output)
		output.textContent = '';

	currentLine = null;

	try {
		var text = text || editor.getValue();
		var result = parser.parse(text);

		if(!result)
			return null;

		if(/\.prev\b/.test(text))
			doublyRequested = true;

		frames = []; // a previous run may have stopped inside a call
		if(unfinishedCalls.length){ // ... and left its frames in the panel: remove them first
			var stale = unfinishedCalls;
			unfinishedCalls = [];
			player.add(function(){ stale.forEach(dropFrame); returnNote = ''; renderCallStack(); });
		}

		// functions can be called before the line that defines them (as in JavaScript)
		result.forEach(function(item){ if(item.type === 'function') defineFunction(item); });

		player.play();
		recursivelyProcess(result);

		return result;
	} catch (err) {
		document.getElementById("output").textContent = explainError(err, text);
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

function runBlock(k){
	resetProgram();

	for(var i = 0; i < k; i++){
		window.activeEditor = blockEditors[i].doc; // set it before parsing: the steps remember it
		if(!parse(blockEditors[i].getValue())){
			var output = document.getElementById('output');
			if(output)
				output.textContent = 'Blok ' + (i + 1) + ' çalıştırılırken: ' + output.textContent;
			player.toEnd();
			return;
		}
		player.toEnd();
	}

	window.activeEditor = blockEditors[k].doc;
	parse(blockEditors[k].getValue());
}

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
	pointers = [];
	pointerMap = {};
	frames = [];
	unfinishedCalls = [];
	doublyRequested = false;
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
		doubly: doublyMode
	};
};

function setEditors(items){

	// every textarea with the class "deneme" becomes a CodeMirror editor with a run button
	items.forEach(function (editorEl) {

		var editor = CodeMirror.fromTextArea(editorEl, {
			mode: "javascript",
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
		button.innerHTML = ICONS.play;
		button.title = 'Çalıştır (Ctrl+Enter)';
		button.className = "btn-round btn-lg dsv-run";
		insertAfter(button, editor.getWrapperElement());
		button.addEventListener("click", run);

		editor.on("focus", function() { window.activeEditor = editor.doc });
	});
}

setEditors(qsa(".deneme"));
