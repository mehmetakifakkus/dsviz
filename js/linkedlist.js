nodes = [];
pointers = [];

//////////////////////////////////////////  ClearAll  ////////////////////////////////////

function intersectsNode(list, path){
	list = list.next;
	var total = 0;

	while(list){
		if(list.boxDraw){
			var cross = path.getIntersections(list.boxDraw.children[1]);
			total+= cross.length;
		}
		list = list.next;
	}
	return total >= 1;
}

function clearDrawables(list){
	list = list.next;

	while(list){
		if(list.boxDraw)
			list.boxDraw.remove();

		if(list.next && list.arrowDraw)
			list.arrowDraw.remove();

		list = list.next;
	}
	for(var i=0; i<pointers.length; i++)
		pointers[i].drawing.remove();
}

//////////////////////////////////////  Math Functions  //////////////////////////////////

function getRandomFloat(min, max) {
	return Math.random() * (max - min) + min;
}

function createRandom2D(minX, maxX, minY, maxY) {

	var x_ = maxX || view.size.width;
	var y_ = maxY || view.size.height;

	var x = getRandomFloat(minX || 0.1 * x_, 0.9 * x_);
	var y = getRandomFloat(minY || 0.1 * y_, 0.9 * y_);

	return new Point(x,y);
}

////////////////////////////////////////// Linked List Node //////////////////////////////

function Node(content, next){

	if(typeof Node.counter == undefined || content == undefined)
        Node.counter = 0;

    this.id = Node.counter++; // newly created vertex will have different id

	this.content = content || '';
	this.next = next || null;

	var self = this;

	// draw a node at location p
	this.drawNode = function(p){
		self.position = p;

		var rect = new Path.Rectangle({ point: [p.x, p.y],  size: [50, 25],  strokeColor: 'black', strokeWidth: 2});
		var line = new Path.Line({from: [p.x + 30, p.y], to: [p.x + 30, p.y + 25], strokeColor: 'black', strokeWidth: 2});
		var circle = new Path.Circle( { radius:4, fillColor: 'black', center: [p.x + 40, p.y + 12]});

		var text = new PointText({ position: new Point(self.content >= 10 ? p.x+5 : p.x+10, p.y+19), fontSize: 18+'px', fillColor: 'black', content:''+ self.content});

		self.boxDraw = new Group([rect, line, circle, text]);
	}

	// draw randomly on the stage
	this.drawNodeSomewhere = function(){

		var normalized;

		while(true){
			normalized = createRandom2D() - [25,12];

			var hitResult = project.hitTest(normalized, {fill:true, tolerance:75});
			if (!hitResult) // if random point hits create a new one
				break;
		}
		self.drawNode(normalized);
	}

	// delete the old one, redraw it
	this.drawArrow = function(obj){ // obj is the node that this node points
		if(self.arrowDraw)
			self.arrowDraw.remove();

		if(self != obj && obj != null) //
			self.arrowDraw = Arrow(self, obj);
	}

	this.setName = function(name){
		self.name = name;
		//self.draw(self.points);
	}

	if(self.next)
	{
		self.drawNodeSomewhere();
		self.drawArrow(self.next);
	}
}

function Pointer(node, name, color){
	this.name = name || '';
	this.points = node;

	var color = color || 'blue';
	var direction = 'up';

	var self = this;

	this.draw = function(points){

		var start, textPos;
		self.points = points || self.points;

		if(direction == 'up')
		{
			start = self.points.position + [-10, -30];
			textPos = start + [-15, -6];
		}
		else
		{
			start = self.points.position + [-10, 50];
			textPos = start + [-15, 12];
		}
		var text = new PointText({ position: textPos, fontSize: 22+'px', fillColor: color, content:''+ self.name});
		var arrow = Arrow(start, self.points, color);

		if(self.drawing != undefined)
			self.drawing.remove();

		self.drawing = new Group([text, arrow]);
		console.log('pointer '+self.name+' is drawn.')
	}

	this.setName = function(name){
		self.name = name;
		self.draw();
		view.update();
	}

	pointers.push(this);
}

////////////////////////////////////////// Linked List Functions /////////////////////////

function appendANode(list, value){
	var tmp = list;
	while(tmp.next) tmp = tmp.next;

	var newNode = new Node(value);
	newNode.next = null;
	tmp.next = newNode;

	console.log('append '+value+' length:'+length(list));
}

function length(list){
	var count = 0;
	list = list.next;
	while(list){
		count++;
		list = list.next;
	}
	return count;
}

////////////////////////////////////////  Adjacency List Representation //////////////////

function Arrow(from, to, color, char){ // from and to are instanceof Point, otherwise convert it with a proper way

	// change 'from' and 'to' to Point objects
	if(from instanceof Node && to instanceof Node)
	{
		from = from.position + [40, 12];

		curve = to.boxDraw.children[0].getNearestLocation(from);

		var p1 = curve._segment1.point;
		var p2 = curve._segment2.point;

		var to = new Point((p1.x + p2.x)/2, (p1.y + p2.y)/2);

		//var line = new Path.Line({from: event.point, to: avg, strokeColor: 'black', strokeWidth: 2});

		//to = to.boxDraw.children[0].getNearestPoint(from);
	}
	else if(from.constructor.name == 'Point' && to instanceof Node)
	{
		if(from.y < to.position.y) // it points from upward, else from downward
			to   = to.position + [10, -3];
		else
			to   = to.position + [10, 28];
	}

	var arrowTip = new Path({segments: [new Point(-9 + to.x, -5 + to.y), new Point(to.x, to.y), new Point(-9 + to.x, 5 + to.y)], strokeColor: 'black', strokeWidth: 2, strokeColor: color || 'black'});

	var line = new Path.Line({from: from, to: to, strokeColor: color || 'black', strokeWidth: 2});

	if(intersectsNode(list1, line)){  // if intersects change line to an arc
		line.remove();
		to   = to + [3, -14];
		arrowTip.position += [3, -14];

		line = new Path({segments: [from], strokeWidth: 2, strokeColor: color || 'black'});

		// Draw an arc through the position of the through
		var through = ((from + to) / 2) - [0, from.getDistance(to)/4.8];
		line.arcTo(through, to);

		var angleout = line.segments[line.segments.length-1].handleIn.angleInDegrees;
		arrowTip.rotate(angleout-180, to);
	}
	else
		arrowTip.rotate((to - from).angle, to);

	return new Group([line, arrowTip]);
}

function drawLinkedList(list, i){
	var pos = new Point(20, 60 + 80*i);
	new PointText({position: new Point(pos.x, pos.y + 19), fontSize: 18+'px', fillColor: 'black', content:'list'+ i});
	new Path.Rectangle({ point: [pos.x+40, pos.y],  size: [20, 25],  strokeColor: 'black', strokeWidth: 2});
	new Path.Circle( { radius:4, fillColor: 'black', center: [70, pos.y+ 12]});

	var prev;

	if(list.id == 0)
		list = list.next;

	if(list){
		list.drawNode(new Point(pos.x +90, pos.y));
		Arrow(new Point(70, pos.y+12), new Point(110, pos.y+12));  // static arrow between list head and first node

		prev = list;
		list = list.next;
	}

	var k=1;
	while(list)
	{
		list.drawNode(new Point(pos.x + 90 + 80*k, pos.y));
		prev.drawArrow(list);
		prev = list;
		list = list.next;
		k++;
	}
}

var list1 = new Node(); // start with a dummy node to prevent that list is initially null (since we have to care differently)

appendANode(list1, 10);

var p = new Pointer(list1.next, 'p');
p.draw();

window.appendANode = appendANode;
window.clearDrawables = clearDrawables;
window.drawLinkedList = drawLinkedList;
window.list1 = list1;
window.Node = Node;
window.Pointer = Pointer;

//p.drawNext();

//p.points.drawArrow(pointer1.points.next.next.next.next);
//p.points.drawArrow(pointer1.points.next.next);

//var q = new Pointer('q', list.next.next, 'red');
//q.draw();

/*

setInterval(function(){
	q.drawNext();
	p.points.drawArrow(q.points);
}, 1000);
*/

//q.points.drawArrow(pointer1.points.next.next);
//list.next.drawArrow(list.next.next.next)

//var temp = p.points.next;

/*

setInterval(function(){
	temp = temp.next;
	//pointer1.points.drawArrow(p);
}, 1000);
*/


//var ai = new AdjacencyItem(new Point(70,100), 3);
//var ai2 = new AdjacencyItem(new Point(150,100), 27);

//Arrow(new Point(100, 50), new Point(180, 90));
//Arrow(ai, ai2);


function onFrame(){

}

window.restart = function(){
	clearDrawables(list1);
	list1 = new Node();
	window.list1 = list1;
}

window.redraw = function(){
	clearDrawables(list1);
	project.activeLayer.removeChildren();
	drawLinkedList(list1, 1);

	var p = new Pointer(list1.next);
	p.setName('p')
}

window.next = function(){
	p1.drawNext();
}

var newNode = null;

var hitOptions = {fill:true, tolerance:50};
function onMouseDown(event){


	var normalized = event.point - [25,12];

	var hitResult = project.hitTest(normalized, hitOptions);

	if (!hitResult) // if random point hits create a new one
	{
		console.log('serbest')
		newNode = new Node(1);
		newNode.drawNode(normalized)
	}
	else{
		var n = new Node();
		n.drawNodeSomewhere();
	}

}

function onMouseMove(event){

	if(newNode){

		curve = newNode.boxDraw.children[0].getNearestLocation(event.point);

		if(curve){

			var p1 = curve._segment1.point;
			var p2 = curve._segment2.point;

			var avg = new Point((p1.x + p2.x)/2, (p1.y + p2.y)/2);

			var line = new Path.Line({from: event.point, to: avg, strokeColor: 'black', strokeWidth: 2});

			line.removeOnMove();
		}

//		var line = new Path.Line({from: event.point, to: newNode.boxDraw.children[0].getNearestLocation(event.point).point, strokeColor: 'black', strokeWidth: 2});

	}
}

/////////////////////  Some Useful Functions  //////////////////////

Array.prototype.clear = function() {
  while (this.length) {
    this.pop();
  }
};

///////////////////  Parse the code   //////////////////////////////


//console.log(PARSER.parse('{var aaa=123 //deneme}'));

var grammer = null;

$.get("grammer.pegjs", function(response) {
	grammer = response;
	//console.log(response)
});

restart();

window.parse = function(text) {

	try {
		var text = text || editor.getValue();

		//var result = PARSER.parse(grammer); // normalde parser.js derleyip ekledigimiz zaman direk PARSER. diyerek kullanabiliriz. Su an grammer i ekleyerek calisacagiz

		var parser = PEG.buildParser(grammer);
		var result = parser.parse(text);

		console.log(result);

		document.getElementById("result").textContent = JSON.stringify(result, null, 3);
	} catch (err) {
		document.getElementById("result").textContent = err.toString();
	}
}

window.parse();
