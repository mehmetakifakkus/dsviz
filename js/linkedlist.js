/*
 * Linked list visualisation engine (PaperScript, runs on canvas "myCanvas0").
 *
 * How it works
 * ------------
 * 1. parse() turns the code of an editor into a list of statements (grammer.pegjs).
 * 2. processOneItem() EXECUTES every statement immediately (window.eval) and hands a
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
	try { return window.eval(code); }
	catch(e) { return undefined; }
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

var NODE_W = 50, NODE_H = 25;

function Node(content, next){

	Node.counter = (Node.counter || 0) + 1;
	this.id = Node.counter; // newly created node will have a different id

	this.data = (content === undefined || content === null) ? '' : content;
	this.next = next || null;

	// visual state (see the comment at the top of the file)
	this.shown = false;
	this.visualNext = null;
	this.shownData = this.data;
	this.cell = null;      // {row, col} on the layout grid
	this.position = null;  // top left corner of the box
	this.boxDraw = null;
	this.arrowDraw = null;

	var self = this;

	this.render = function(){
		if(self.boxDraw)
			self.boxDraw.remove();

		var p = self.position;
		var rect = new Path.Rectangle({ point: [p.x, p.y],  size: [NODE_W, NODE_H],  strokeColor: 'black', strokeWidth: 2, fillColor: 'white'});
		var line = new Path.Line({from: [p.x + 30, p.y], to: [p.x + 30, p.y + NODE_H], strokeColor: 'black', strokeWidth: 2});
		var circle = new Path.Circle( { radius:4, fillColor: 'black', center: [p.x + 40, p.y + 12]});
		var text = new PointText({ point: [p.x + 15, p.y + 19], justification: 'center', fontSize: 18+'px', fillColor: 'black', content:''+ self.shownData});

		self.boxDraw = new Group([rect, line, circle, text]);
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
		if(self.boxDraw)
			self.boxDraw.remove();
		if(self.arrowDraw)
			self.arrowDraw.remove();
		self.boxDraw = self.arrowDraw = null;
	}

	this.setName = function(name){
		self.name = name;
	}

	allNodes.push(this);
}

window.Node = Node;

//////////////////////////////////////////  Arrows  //////////////////////////////////////

function arrowTip(end, angle, color){
	var tip = new Path({segments: [end + [-9, -5], end, end + [-9, 5]], strokeColor: color || 'black', strokeWidth: 2});
	tip.rotate(angle, end);
	return tip;
}

// the "next" arrow of a node
function nodeArrow(from, to){
	var a = from.position, b = to.position;
	var start = a + [40, 12];
	var line, angle, end;

	var sameRow = Math.abs(a.y - b.y) < 1;
	var dx = b.x - a.x;

	if(sameRow && dx > 0 && dx <= colWidth + 1) {        // the neighbour on the right: straight
		end = b + [0, 12];
		line = new Path.Line({from: start, to: end, strokeColor: 'black', strokeWidth: 2});
		angle = (end - start).angle;
	}
	else if(sameRow) {                                    // to the left or skipping nodes: an arc above
		end = b + [NODE_W / 2, 0];
		var through = new Point((start.x + end.x) / 2, a.y - 18 - Math.abs(dx) * 0.1);
		line = new Path({segments: [start], strokeColor: 'black', strokeWidth: 2});
		line.arcTo(through, end);
		angle = line.getTangentAt(line.length).angle;
	}
	else {                                                // another row: straight to the top or bottom edge
		end = b + [NODE_W / 2, b.y > a.y ? 0 : NODE_H];
		line = new Path.Line({from: start, to: end, strokeColor: 'black', strokeWidth: 2});
		angle = (end - start).angle;
	}

	return new Group([line, arrowTip(end, angle)]);
}

function redrawArrows(){
	for(var i=0; i < allNodes.length; i++){
		var n = allNodes[i];

		if(n.arrowDraw)
			n.arrowDraw.remove();
		n.arrowDraw = null;

		if(n.shown && n.visualNext && n.visualNext.shown && n.visualNext !== n)
			n.arrowDraw = nodeArrow(n, n.visualNext);
	}
}

//////////////////////////////////////////  Layout  //////////////////////////////////////
//
// Nodes live on a grid. A chain (head -> ... -> tail, following visualNext) is drawn on
// one row. The layout is stable: the longest part of a chain that is already drawn in
// order (left to right OR right to left) keeps its cells and the other nodes of the chain
// are placed around it. So reversing a list only flips arrows, inserting at the head
// shifts the list right, and a node that is cut out of a list drops to the next row.

var ROW_Y0 = 110, ROW_H = 160, COL_X0 = 60, COL_W = 100;
var colWidth = COL_W;
var lastPlaced = null;

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
			var j = i;
			while(j + 1 < chain.length && chain[j+1].cell &&
			      chain[j+1].cell.row === chain[i].cell.row &&
			      chain[j+1].cell.col - chain[j].cell.col === d)
				j++;

			if(!best || j - i + 1 > best.length)
				best = {start: i, length: j - i + 1, dir: d, row: chain[i].cell.row, col: chain[i].cell.col};
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
			if(!n.cell)
				lastPlaced = n;
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

	var visibleWidth = Math.max(500, Math.min(view.size.width, window.innerWidth * 0.6) - COL_X0 - 40);
	colWidth = maxCol > minCol ? Math.max(75, Math.min(COL_W, visibleWidth / (maxCol - minCol))) : COL_W;

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

	animate(moves, fades);
}

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

function Pointer(node, name, color, direction){
	this.name = name || '';
	this.points = node;
	this.color = color || 'red';
	this.direction = direction || 'down';
	this.active = false;

	var self = this;

	this.draw = function(node){
		self.points = node || self.points;
		self.active = true;
		removeVariable(self.name); // it is not null any more
		redrawPointers();
	}

	this.markNull = function(){
		self.points = null;
		self.active = false;
		showVariable(self.name, 'null', self.color); // listed in the variables area
		redrawPointers();
	}

	this.remove = function(){
		self.active = false;
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

		var start = pos + (up ? [-10, -40] : [-10, 55]);
		var end = pos + (up ? [10, -3] : [10, 28]);
		var line = new Path.Line({from: start, to: end, strokeColor: group[0].color, strokeWidth: 2});
		var items = [line, arrowTip(end, (end - start).angle, group[0].color)];

		var labels = [], x = 0;
		group.forEach(function(p, index){
			var label = new PointText({ point: [x, 0], fontSize: 20+'px', fillColor: p.color, content: p.name + (index < group.length - 1 ? ',' : '')});
			x += label.bounds.width + 5;
			labels.push(label);
		});
		var labelGroup = new Group(labels);
		labelGroup.position = start + (up ? [-4, -14] : [-4, 14]);

		items.push(labelGroup);
		pointerDrawings.push(new Group(items));
	});
}

// point the pointer called `name` to `node` (or mark it as null)
function pointTo(name, node, color, direction){
	var pointer = window['pointer_' + name];

	if(!pointer){
		pointer = new Pointer(node, name, color, direction);
		window['pointer_' + name] = pointer;
	}
	if(node == null)
		pointer.markNull();
	else
		pointer.draw(node);
}

//////////////////////////////////////  Variables area  ////////////////////////////////////

var VARS_Y = 620;
new PointText({ point: [20, VARS_Y], fontSize: 18+'px', fillColor: 'black', content:'======= Değişkenler ====='});

// show "name = value" in the variables area (also used for pointers that are null)
var variableTexts = {}, variableOrder = [];
function showVariable(name, value, color){
	var content = name + ' = ' + value;

	if(variableTexts[name]){
		variableTexts[name].content = content;
		variableTexts[name].fillColor = color || 'black';
	}
	else {
		variableTexts[name] = new PointText({ point: [20, VARS_Y + 30 + 26 * variableOrder.length], fontSize: 18+'px', fillColor: color || 'black', content: content});
		variableOrder.push(name);
	}
}

function removeVariable(name){
	if(!variableTexts[name])
		return;

	variableTexts[name].remove();
	delete variableTexts[name];
	variableOrder.splice(variableOrder.indexOf(name), 1);

	for(var i=0; i < variableOrder.length; i++) // close the gap
		variableTexts[variableOrder[i]].point = new Point(20, VARS_Y + 30 + 26 * i);
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
		n.shownData = n.data;
	});
	lastPlaced = null;

	pointers.forEach(function(p){ delete window['pointer_' + p.name]; });
	pointers = [];
	redrawPointers();

	for(var name in variableTexts)
		variableTexts[name].remove();
	variableTexts = {};
	variableOrder = [];

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
	var lhs_temp = safeEval(line.lhs || line.text); // snapshot of the left hand side

	player.add(function(){

		if(line.type == 'declaration' || line.type == 'assignment')
		{
			highlight(doc, line);

			if(line.rhs.type == 'node') 		//  x = Node(2)
			{
				res.shown = true;
				layout();

				if(window['pointer_' + line.lhs])  // a new node: replace the old pointer with a fresh one
					window['pointer_' + line.lhs].remove();

				window['pointer_' + line.lhs] = new Pointer(res, line.lhs, 'blue', 'up');
				window['pointer_' + line.lhs].draw(res);
			}
			else if(res === null || isNode(res))  // p1 = null  /  p1 = x  /  p1 = x.next
				pointTo(line.lhs, res);
			else                                  // a plain value: count = count + 1
				showVariable(line.lhs, res);
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

			if(res.prop == '.next')
			{
				if(res.newNode)
					res.newNode.shown = true;

				res.target.visualNext = res.value;
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
				pointTo(line.lhs, res);
			else
				showVariable(line.lhs, res);
		}
		else if(line.type == 'object property left-right') // p.next = x.next
		{
			highlight(doc, line);

			if(res.prop == '.next'){
				res.target.visualNext = res.value;
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
		else if(line.type == 'expression')
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

var currentLine = null; // the line that is being executed, for error messages

function processOneItem(item){

	currentLine = item.lineNumber;

	if(item.type == 'logical')
	{
		if(item.mainType == 'if')
		{
			var condition = window.eval(item.text);
			drawGraphics(item, condition);

			if(condition)
				recursivelyProcess(item.truePart)
			else if(item.falsePart)
				recursivelyProcess(item.falsePart)
		}
		else if(item.mainType == 'while')
		{
			var guard = 0;
			while(window.eval(item.text)){
				drawGraphics(item, true);
				recursivelyProcess(item.statements)

				if(++guard > 1000)
					throw new Error('Satır ' + item.lineNumber + ': döngü 1000 kereden fazla döndü. Sonsuz bir döngü olabilir mi? Döngü koşulunun bir gün yanlış olacağından emin olun.');
			}
			drawGraphics(item, false);
		}
		else{ // there is no type, only logical expression
			drawGraphics(item, window.eval(item.text));
		}
	}
	else if(item.type == 'declaration' || item.type == 'assignment')
	{
		item['#evaluation']++;

		if(item.rhs.type == 'node') 		//  x = new? Node(2)
		{
			window.eval(item.lhs + " = new Node(" + item.rhs.data + ");");
			window.eval(item.lhs + ".setName('" + item.lhs + "')");
		}
		else
			window.eval(item.lhs + ' = ' + item.rhs);

		drawGraphics(item, window.eval(item.lhs));
	}
	else if(item.type == 'expression')
	{
		item['#evaluation']++;
		drawGraphics(item, window.eval(item.text));
	}
	else if(item.type == 'print')
	{
		var resu = '';
		for(var i=0; i < item.list.length; i++)
			resu += item.list[i].subtype == 'var' ? window.eval(item.list[i].text) : item.list[i].text;

		drawGraphics(item, resu);
	}
	else if(item.type == 'object property left') // p.next = x;  p.next = Node(11);  p.data = 5
	{
		item['#evaluation']++;

		var path = propertyPath(item.property);
		var last = item.property[item.property.length-1].join(''); // ".next" or ".data"
		var target = window.eval(item.lhs + path.slice(0, path.length - last.length));
		var newNode = null;

		if(item.rhs.type == 'node')
		{
			newNode = new Node(item.rhs.data);
			target[last.slice(1)] = newNode;
		}
		else
			window.eval(item.lhs + path + ' = ' + rhsCode(item.rhs));

		drawGraphics(item, {target: target, prop: last, value: target[last.slice(1)], newNode: newNode});
	}
	else if(item.type == 'object property right') // p1 = p1.next
	{
		item['#evaluation']++;

		item.text = item.lhs + ' = ' + item.rhs + propertyPath(item.property);
		window.eval(item.text);

		drawGraphics(item, window.eval(item.lhs));
	}
	else if(item.type == 'object property left-right') // p.next = x.next
	{
		item['#evaluation']++;

		var pathLeft = propertyPath(item.propertyLeft);
		var lastLeft = item.propertyLeft[item.propertyLeft.length-1].join('');
		var targetLeft = window.eval(item.lhs + pathLeft.slice(0, pathLeft.length - lastLeft.length));

		window.eval(item.lhs + pathLeft + ' = ' + item.rhs + propertyPath(item.propertyRight));

		drawGraphics(item, {target: targetLeft, prop: lastLeft, value: targetLeft[lastLeft.slice(1)]});
	}
	else if(item.type == 'free object') // removes the object // free p1 / free p1.next
	{
		drawGraphics(item);
	}
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
		       'Pointer listenin sonunu geçmiş olabilir; döngü koşulunu kontrol edin (ör. p != null).';

	if((m = /Cannot set propert(?:y|ies) of (?:null|undefined) \(setting '([^']+)'\)/.exec(msg)))
		return where + 'null olan bir pointer\'ın .' + m[1] + ' alanı değiştirilmeye çalışıldı. Pointer bir düğümü göstermiyor.';

	if((m = /^(\S+) is not defined/.exec(msg)))
		return where + '"' + m[1] + '" tanımlı değil. Önce var ile tanımlayın (ör. var ' + m[1] + ' = ...).';

	if(msg.indexOf('Satır ') === 0) // our own messages already say where
		return msg;

	return where + 'Hata: ' + msg;
}

window.explainError = explainError;

var grammer = null, parser = null;

$.get("grammer.pegjs", function(response) {
	grammer = response;
 	parser = PEG.buildParser(grammer);
});

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
			theme: 'eclipse',
			viewportMargin: Infinity
		});

		function run(){
			window.activeEditor = editor.doc; // set it before parsing: the steps remember it
			parse(editor.getValue());
		}

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

// add editor
var editorNo = 0;
window.addEditor  = function() {

	editorNo++;

	$( "#addElement" ).before(
	'<br>'+
	'<textarea class = "addedEditor'+editorNo+'">'+
	'var list2 = Node(3);\n'+
	'list2.next = Node(4);\n'+
	'list2.next.next = Node(8);\n'+
	'</textarea>'
	 ) ;
	setEditors(qsa(".addedEditor"+editorNo));
}
