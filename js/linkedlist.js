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
	this.prev = null;
	this.left = null;  // a tree node's children
	this.right = null;

	// visual state (see the comment at the top of the file)
	this.shown = false;
	this.visualNext = null;
	this.visualPrev = null;
	this.visualLeft = null;
	this.visualRight = null;
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

		if(self.lost){ // no variable and no link reaches this node any more
			items[0].dashArray = [5, 4];
			items.push(new PointText({ point: [p.x + g.width / 2, p.y + NODE_H + 18], justification: 'center', fontSize: 12+'px', fillColor: PAL.pointer, content: t('unreachable')}));
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
	var neighbour = sameRow && (isNext ? dx > 0 : dx < 0) && Math.abs(dx) <= colWidth + 1;

	if(neighbour) {                                       // straight to the neighbour
		end = isNext ? b + [0, g.nextY] : b + [g.width, g.prevY];
		line = new Path.Line({from: start, to: end, strokeColor: color, strokeWidth: 2});
		angle = (end - start).angle;
	}
	else if(sameRow && isNext && dx < -colWidth - 1) {    // back past other nodes (a circle): a loop over the pointers
		var r = returnLoop(from, to, start);
		line = r.line; end = r.end; angle = r.angle;
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
	return new Group([line, arrowTip(end, angle, color), dot]);
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
function rowH(){ return treeMode ? 110 : ROW_H; }

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

	if(treeMode)
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

	var visibleWidth = Math.max(300, canvasHolderWidth() - COL_X0 - geometry().width - 30);
	var widest = maxColWidth(), narrowest = geometry().width + 25;
	colWidth = maxCol > minCol ? Math.max(narrowest, Math.min(widest, visibleWidth / (maxCol - minCol))) : widest;

	// the size the drawing needs; fitCanvas() scales it down when the card is narrower
	var maxRowUsed = -Infinity;
	for(i=0; i < shown.length; i++)
		maxRowUsed = Math.max(maxRowUsed, shown[i].cell.row);
	extent = shown.length
		? {width: COL_X0 + (maxCol - minCol) * colWidth + geometry().width + 40, height: ROW_Y0 + (maxRowUsed - minRow) * rowH() + NODE_H + 85}
		: null;

	var moves = [], fades = [];
	for(i=0; i < shown.length; i++){
		var node = shown[i];
		var target = new Point(COL_X0 + (node.cell.col - minCol) * colWidth, ROW_Y0 + (node.cell.row - minRow) * rowH());

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
	redrawArrows(); // a link back to an earlier node routes around the pointers' names
	for(var i=0; i < pointerDrawings.length; i++)
		pointerDrawings[i].remove();
	pointerDrawings = [];

	var groups = {}, order = [];
	pointers.forEach(function(p){
		if(!p.active || !p.points || !p.points.shown || !p.points.position)
			return;
		var key = p.points.id + (treeMode ? '' : p.direction);
		if(!groups[key]){
			groups[key] = [];
			order.push(key);
		}
		groups[key].push(p);
	});

	order.forEach(function(key){
		var group = groups[key];
		var pos = group[0].points.position;
		var up = !treeMode && group[0].direction === 'up'; // in a tree the parent's link comes from above

		var dx = geometry().dataX; // aim at the data cell
		var start = pos + (up ? [dx - 10, -40] : [dx - 10, 55]);
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
		labelGroup.position = start + (up ? [-4, -14] : [-4, 14]);
		if(labelGroup.bounds.left < 8) // a long name under the first column would be cut off at the left edge
			labelGroup.position = labelGroup.position + [8 - labelGroup.bounds.left, 0];

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
	end:   '<svg viewBox="0 0 16 16" width="14" height="14"><path d="M1 2v12l6-6zM7 2v12l6-6zM13 2h2v12h-2z" fill="currentColor"/></svg>'
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
		ui.play.innerHTML = running ? ICONS.pause : ICONS.play;
		ui.play.title = running ? t('pause') : t('play');
		ui.counter.textContent = t('stepCounter', {i: player.cursor, n: player.steps.length});
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
	narration = '';
	player.steps[i]();
}

function settingOn(key){ return !window.dsv || window.dsv.settings[key] !== false; }
var lastNarration = '', lastWarning = '';

function finishStep(){
	var lost = updateReachability();
	redrawArrows();
	redrawPointers();

	var warning = '';
	if(lost.length && settingOn('warnings'))
		warning = t(lost.length > 1 ? 'nLostMany' : 'nLostOne', {nodes: lost.map(nodeLabel).join(', ')});
	lastNarration = narration;
	lastWarning = warning;
	showNarration(settingOn('narration') ? narration : '', warning);
}

// marks the shown nodes no pointer reaches (through next / prev); returns the newly lost ones
function updateReachability(){
	var reached = {}, todo = [];
	pointers.forEach(function(p){ if(p.active && p.points && p.points.shown) todo.push(p.points); });
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
	var code = function(t){ return escapeHTML(t).replace(/`([^`]+)`/g, '<code>$1</code>'); };
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
		if(line.rhs.type == 'node') return t('nNewNode', {name: name, node: nodeLabel(res)});
		if(res === null || isNode(res)) return pointsTo(res);
		return t('nValue', {name: name, value: formatValue(res)});
	case 'object property right':
		if(res === null || isNode(res)) return pointsTo(res);
		return t('nValue', {name: name, value: formatValue(res)});
	case 'object property left':
	case 'object property left-right':
		if(res.prop == '.data') return t('nData', {node: nodeLabel(res.target), value: formatValue(res.value)});
		var link = {node: nodeLabel(res.target), field: res.prop.slice(1)};
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
		n.shownData = n.data;
	});
	lastPlaced = null;
	doublyMode = false;
	treeMode = false;

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
	ui.play = button(ICONS.pause, t('pause'), function(){ player.playing && player.cursor < player.steps.length ? player.pause() : player.play(); });
	ui.next = button(ICONS.next, t('stepForward'), function(){ player.pause(); player.forward(); });
	ui.end  = button(ICONS.end, t('toEnd'), function(){ player.pause(); player.toEnd(); });

	var speedLabel = document.createElement('label');
	speedLabel.className = 'dsv-speed';
	speedLabel.innerHTML = escapeHTML(t('speed')) + ' <input type="range" min="0" max="' + (SPEEDS.length - 1) + '" step="1" value="' + player.speed + '">';
	ui.speed = speedLabel.querySelector('input');
	ui.speed.addEventListener('input', function(e){ player.speed = Number(e.target.value); });
	bar.appendChild(speedLabel);

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
	var scope = scopeOf(line.lhs);                  // null for a global variable
	var sentence = describe(line, res, lhs_temp);   // what happened, with the values of now

	player.add(function(){

		if(doubly && !doublyMode)
			enableDoublyMode();
		if(tree && !treeMode)
			enableTreeMode();
		narrate(sentence);

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
				focus.pointers.push(pointerMap[key]);
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

			if(VISUAL_FIELD[res.prop])
			{
				if(res.newNode)
					res.newNode.shown = true;

				res.target[VISUAL_FIELD[res.prop]] = res.value;
				focusEdge(res.target, res.prop.slice(1));
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

			if(VISUAL_FIELD[res.prop]){
				res.target[VISUAL_FIELD[res.prop]] = res.value;
				focusEdge(res.target, res.prop.slice(1));
				layout();
			}
			else if(res.prop == '.data' && res.target.boxDraw) // p.data = p.next.data
			{
				res.target.shownData = res.value;
				res.target.render();
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
var ENGINE_GLOBALS = ['Node', 'Pointer', 'parse', 'showNode', 'explainError', 'dsvApplyTheme', 'dsvApplySettings', 'dsvExamples', 'dsv', 'activeEditor', 'editor2'];

// an error of our own: "Line 3: ..." in the chosen language, shown as it is
function ownError(line, key, vars){
	var e = new Error((line ? t('eLine', {n: line}) : '') + t(key, vars));
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

function formatValue(value){
	if(isNode(value)) return t('nodeValue', {data: value.data});
	if(value === null) return 'null';
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
		return lineOf(err.lineNumber) + t('eLoopOnly', {kw: err.loopSignal});

	if(err && err.returnSignal) // return that is not inside a function
		return lineOf(err.lineNumber) + t('eReturnOnly');

	if(err instanceof RangeError && /call stack/i.test(err.message))
		return t('eStack');

	var m, msg = (err && err.message) || String(err);

	if(err && err.name === 'SyntaxError' && err.location){ // from the PEG parser
		var loc = err.location.start;
		var found = err.found === null ? t('eEndOfCode') : (err.found === '\n' ? t('eEndOfLine') : '"' + err.found + '"');
		var line = (source || '').split('\n')[loc.line - 1] || '';
		return t('eSyntax', {line: loc.line, col: loc.column, found: found}) + '\n\n' +
		       '  ' + line + '\n  ' + new Array(loc.column).join(' ') + '^';
	}

	if(err && err.dsvOwn) // our own messages already say where
		return msg;

	var where = lineOf(currentLine);

	if((m = /Cannot read propert(?:y|ies) of (?:null|undefined) \(reading '([^']+)'\)/.exec(msg)) ||
	   (m = /can't access property "([^"]+)", .* is (?:null|undefined)/.exec(msg)))
		return where + t('eNullRead', {field: m[1]});

	if((m = /Cannot set propert(?:y|ies) of (?:null|undefined) \(setting '([^']+)'\)/.exec(msg)))
		return where + t('eNullWrite', {field: m[1]});

	if((m = /^(\S+) is not defined/.exec(msg)))
		return where + t('eUndefined', {name: m[1]});

	if((m = /^(\S+) is not a function/.exec(msg)))
		return where + t('eNotFunction', {name: m[1]});

	return where + t('eGeneric', {msg: msg});
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
	currentDoc = window.activeEditor;
	clearErrorLines();

	try {
		var text = text || editor.getValue();
		var result = parser.parse(text);

		if(!result)
			return null;

		if(/\.prev\b/.test(text))
			doublyRequested = true;
		if(/\.(left|right)\b/.test(text))
			treeRequested = true;

		frames = []; // a previous run may have stopped inside a call
		if(unfinishedCalls.length){ // ... and left its frames in the panel: remove them first
			var stale = unfinishedCalls;
			unfinishedCalls = [];
			player.add(function(){ stale.forEach(dropFrame); returnNote = ''; renderCallStack(); });
		}

		// functions can be called before the line that defines them (as in JavaScript)
		result.forEach(function(item){ if(item.type === 'function') defineFunction(item); });

		player.play();
		var firstStep = player.steps.length;
		recursivelyProcess(result);

		// after the last step of a run, a list left drawn right to left is turned to read
		// left to right (part of the step, so stepping back and forth gives the same picture)
		var lastIndex = player.steps.length - 1;
		if(lastIndex >= firstStep){
			var lastStep = player.steps[lastIndex];
			player.steps[lastIndex] = function(){ lastStep(); layout(true); };
		}

		return result;
	} catch (err) {
		document.getElementById("output").textContent = explainError(err, text);
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

function runBlock(k){
	resetProgram();

	for(var i = 0; i < k; i++){
		window.activeEditor = blockEditors[i].doc; // set it before parsing: the steps remember it
		if(!parse(blockEditors[i].getValue())){
			var output = document.getElementById('output');
			if(output)
				output.textContent = t('eInBlock', {n: i + 1}) + output.textContent;
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
	treeRequested = false;
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
		lost: allNodes.filter(function(n){ return n.shown && n.lost; }).map(function(n){ return n.shownData; }),
		nullNext: allNodes.filter(function(n){ return n.shown && !(n.visualNext && n.visualNext.shown); }).map(function(n){ return n.shownData; }),
		narration: (document.getElementById('narration') || {}).textContent || '',
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
		button.innerHTML = ICONS.play + '<span>' + escapeHTML(t('run')) + '</span>';
		button.title = t('runTitle');
		button.className = "btn-round btn-lg dsv-run";
		insertAfter(button, editor.getWrapperElement());
		button.addEventListener("click", run);

		// appears once the code was changed: puts the example's own code back
		var original = editor.getValue();
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
