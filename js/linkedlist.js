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

var initialPositionX = 80, initialPositionY = 150;
function Node(content, next){

	if(typeof Node.counter == undefined || content == undefined)
        Node.counter = 0;

    this.id = Node.counter++; // newly created vertex will have different id

	this.data = content || '';
	this.next = next || null;

	var self = this;

	// draw a node at location p
	this.drawNode = function(p){
		self.position = p || initialPosition;

		var rect = new Path.Rectangle({ point: [p.x, p.y],  size: [50, 25],  strokeColor: 'black', strokeWidth: 2});
		var line = new Path.Line({from: [p.x + 30, p.y], to: [p.x + 30, p.y + 25], strokeColor: 'black', strokeWidth: 2});
		var circle = new Path.Circle( { radius:4, fillColor: 'black', center: [p.x + 40, p.y + 12]});

		var text = new PointText({ position: new Point(self.data >= 10 ? p.x+5 : p.x+10, p.y+19), fontSize: 18+'px', fillColor: 'black', content:''+ self.data});

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

	this.drawNodeNearby = function(){

		var normalized;

		while(true){
			normalized = createRandom2D(initialPositionX, initialPositionX + 30, initialPositionY - 80, initialPositionY + 80) - [25,12];

			var hitResult = project.hitTest(normalized, {fill:true, tolerance:75});
			if (!hitResult) // if random point hits create a new one
				break;
		}
		self.drawNode(normalized);
		initialPositionX += 100;
	}

	// re-draw a node with old position
	this.redraw = function(){
		self.drawNode(self.position);
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

function Pointer(node, name, color, direction){
	this.name = name || '';
	this.points = node;

	var color = color || 'red';
	var direction = direction || 'down';

	if(typeof Pointer.counter == undefined || content == undefined)
        Pointer.counter = 0;

    this.id = Node.counter++; // newly created vertex will have different id


	var self = this;

	this.draw = function(points){

		var start, textPos;
		self.points = points || self.points;


		if(direction == 'up')
		{
			start = self.points.position + [-10, -30];
			textPos = start + [-15, -6];
		}
		else if(direction == 'down')
		{
			start = self.points.position + [-10, 50];
			textPos = start + [-15, 12];
		}
		var text = new PointText({ position: textPos, fontSize: 22+'px', fillColor: color, content:''+ self.name});
		var arrow = Arrow(start, self.points, color);


		if(self.drawing != undefined) // p1 = p1.next ( delete the old one belongs to this pointer)
			self.drawing.remove();

		self.drawing = new Group([text, arrow]);
		//console.log('pointer '+self.name+' is drawn.')
		view.update();
	}

	this.setName = function(name){
		self.name = name;
		self.draw();
		view.update();
	}

	this.remove = function(){
		if(self.drawing != undefined)
			self.drawing.remove();

		//var text = new PointText({ position: [20 + 40*self.id, 20], fontSize: 22+'px', fillColor: color, content:''+ self.name});
		//self.drawing = text;
	}

	this.markNull = function(){
		self.points = null;

		if(self.drawing != undefined) // p1 = null
			self.drawing.remove();

		var text = new PointText({ position: [20 + 40*self.id, 20], fontSize: 22+'px', fillColor: color, content:''+ self.name});
		self.drawing = text;
	}

	if(self.name != '' && self.points != null)
	{
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

//appendANode(list1, 10);

//var p = new Pointer(list1.next, 'p');
//p.draw();

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

setInterval(function(){
	temp = temp.next;
	//pointer1.points.drawArrow(p);
}, 1000);

*/


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


/////////////////////  Draw the Graphics Part  /////////////////////

var time = 0.3, speed = 500;
function drawGraphics(line, result){

	var res = result;
	var lhs_temp = window.eval(line.lhs || line.text);
	var rhs_temp = window.eval(line.rhs);

  setTimeout(function(){

	  console.log(line)

  	if(line.type == 'declaration' || line.type == 'assignment')
	{
		highlightLine(line);

		if(line.rhs.type == 'node') 		//  x = Node(2)
		{
			window.eval("if(!"+line.lhs+".boxDraw) "+line.lhs+".drawNodeNearby();");


			if(eval('typeof pointer_' + line.lhs) != 'undefined') // daha oncekini sil,
				window.eval("pointer_" + line.lhs + ".remove()");


			// node isminde bir pointer oluştur, görsel amaçlı ('pointer_x' gibi)
			window.eval("var pointer_" + line.lhs + " = new Pointer(" + line.lhs + ",'"+ line.lhs +"', 'blue', 'up')");
		}

		else if(line.rhs == 'null')  // reference to null  // p1 = null
		{
			window.eval("pointer_" + line.lhs + ".markNull()");
		}
		else if(eval(line.rhs).constructor.name == 'Node')  // reference to a node (by assigning it) // p1 = x   // p1 = x.next
		{
			if(eval('typeof pointer_' + line.lhs) == 'undefined')
				window.eval("var pointer_" + line.lhs + " = new Pointer(" + line.rhs + ",'"+ line.lhs + "')");
			else
				window.eval("pointer_" + line.lhs + ".draw(" + line.rhs + ")");
		}
		else{
			window.eval(line.text);

			if(eval('typeof text_'+line.lhs) != 'undefined')
				window.eval('text_'+line.lhs + '.content = "'+line.lhs + ' = ' +eval(line.lhs) + '"');
			else
				{
				myTempText = new PointText({ position: new Point(20, 530), fontSize: 18+"px", fillColor: "black", content: line.lhs + " = " + line.rhs});
				window.eval('var text_'+line.lhs + '= myTempText;');
			}
		}
	}
	else if(line.type == 'logical')
	{
		highlightLine(line, 'logical', res);
		console.log(res)
	}
	else if(line.type == 'print')
	{
		//highlightLine(line);
//		insertText(res);
	}
	else if(line.type == 'node append')
	{
		appendANode(list1, eval(line.value));
		//redraw();
	}
	if(line.type == 'object property left') // p.next = x;  p.next = Node(11)
	{
		highlightLine(line);

		if(line.property[0][1] == 'next')
		{
			if(line.rhs.type == 'node')
			{
				window.eval("var temp_node = new Node(" + line.rhs.data + ");");
				window.eval("if(!temp_node.boxDraw) temp_node.drawNodeNearby();");

				window.eval(line.lhs + res.str + res.prop + ' = temp_node')
				window.eval(line.lhs + res.str + '.drawArrow(temp_node)')
				return;
			}
			window.eval(line.lhs + res + '.drawArrow(' + line.rhs + ')')
		}
		else if(line.property[0][1] == 'data')
		{
			//window.eval(line.lhs+".boxDraw.remove()");
			//window.eval(line.lhs+".redraw()");

			console.log(lhs_temp)

			lhs_temp.boxDraw.remove();
			lhs_temp.redraw();
		}
	}
	if(line.type == 'object property right') // p1 = p1.next
	{
		highlightLine(line);

		if(res == null)
			window.eval("pointer_" + line.lhs + ".markNull()");
		else{
			tempNode = res;
			window.eval("pointer_"+line.lhs +".draw(tempNode)"); // draw it on the next position
		}
	}
	if(line.type == 'free object') // removes the object // free p1 / free p1.next
	{
		lhs_temp.boxDraw.remove()
		lhs_temp.arrowDraw.remove()
	}
	if(line.type == 'object property left-right') // p.next = x.next
	{
		eval('lhs_temp' + res.strLeft + '.drawArrow(' + 'rhs_temp' + res.strRight + ')')
	}
	else
	{
		//var result = window.eval(line.text);
		//highlightLine(line);
	}

   }, speed * time)

time++;
}



///////////////////  Parse the code   //////////////////////////////

function processOneItem(item){

	if(item.type == 'logical')
	{
		console.log('[logical] line '+item.lineNumber +' is getting processed, text is: '+ item.text);

		if(item.mainType == 'if')
		{
			drawGraphics(item, eval(item.text));

			if(eval(item.text))
				recursivelyProcess(item.truePart)
			else
				if(item.falsePart)
					recursivelyProcess(item.falsePart)
		}
		else if(item.mainType == 'while')
		{
			while(eval(item.text)){
				drawGraphics(item, eval(item.text));

				if(eval(item.text))
					recursivelyProcess(item.statements)
			}
			drawGraphics(item, eval(item.text));
		}
		else if(item.mainType == 'for')
		{
			while(eval(item.text)){
				if(eval(item.text))
					recursivelyProcess(items.slice(1))
				drawGraphics(item, eval(item.text));
			}
			drawGraphics(item, eval(item.text));
		}
		else{ // there is no type, only logical expression
			drawGraphics(item, item.text);
		}
	}
	if(item.type == 'declaration')
	{
		item['#evaluation']++;

		if(item.rhs.type == 'node') 		//  x = new? Node(2)
		{
			var nodeItem = item.rhs;

			window.eval("var " + item.lhs + " = new Node(" + nodeItem.data + ");");
			window.eval(item.lhs + ".setName('" + item.lhs + "')");

			drawGraphics(item);
		}
		else if(item.rhs == 'null')  // reference to null  // p1 = null
		{
			window.eval(item.lhs + " = null");
			drawGraphics(item)
		}
		else if(eval(item.rhs).constructor.name == 'Node')  // reference to a node (by assigning it) // p1 = x
		{
			window.eval(item.lhs + ' = '+ item.rhs);
			drawGraphics(item)
		}
		else{
			window.eval(item.text);
			drawGraphics(item);
		}
	}
	if(item.type == 'assignment')
	{
		item['#evaluation']++;

		if(item.rhs.type == 'node') 		//  x = new? Node(2)
		{
			var nodeItem = item.rhs;

			window.eval("var " + item.lhs + " = new Node(" + nodeItem.data + ");");
			window.eval(item.lhs + ".setName('" + item.lhs + "')");

			drawGraphics(item);
		}
		else if(item.rhs == 'null')  // reference to null  // p1 = null
		{
			window.eval(item.lhs + " = null");
			drawGraphics(item)
		}
		else if(eval(item.rhs).constructor.name == 'Node')  // reference to a node (by assigning it) // p1 = x
		{
			window.eval(item.lhs + ' = '+ item.rhs);
			drawGraphics(item)
		}
		else{
			//window.eval(item.text);
			drawGraphics(item);
		}

	}
	if(item.type == 'expression')
	{
		window.eval(item.text);
		item['#evaluation']++;

		console.log('['+ item.type + '] text:'+ item.text +' line '+item.lineNumber +' is getting processed, result is: '+ eval(item.text));

		drawGraphics(item, eval(item.text));

		//window.eval('text_'+item.lhs + '.content = '+item.lhs + " = " +eval(item.lhs));

	}
	if(item.type == 'print')
	{
		var resu = '';
		for(var i=0; i < item.list.length; i++)
			resu += item.list[i].subtype == 'var' ? eval(item.list[i].text) : item.list[i].text;

		console.log(resu)
		drawGraphics(item, resu);
	}
	if(item.type == 'node append')
		drawGraphics(item, false);

	if(item.type == 'object property left') // p.next = x;  p.next = Node(11)
	{
		item['#evaluation']++;

		var str = ''

		var i=0;
		for(; i < item.property.length-1; i++){  // önceki property ler seçim yapmak için
			str += item.property[i].join('')
		}

		var prop = item.property[i].join(''); // son property

		if(item.rhs.type == 'node')
		{
			//window.eval(item.lhs+".next=" + item.rhs);
			drawGraphics(item, {str: str, prop:prop})
			return;
		}
		else if(item.property[0][1] == 'data')
			window.eval(item.lhs+".data=" + item.rhs.text);
		else
			window.eval(item.lhs+".next=" + item.rhs);

		drawGraphics(item, str)
	}

	if(item.type == 'object property right') // p1 = p1.next
	{
		item['#evaluation']++;

		var str = ''
		item.property.forEach(function(el){ // p1 = p1.next.next
			str += el.join('')
		});
		item.text = item.lhs +' = '+item.rhs + str;

		window.eval(item.text)
		drawGraphics(item, eval(item.lhs))
	}

	if(item.type == 'object property left-right') // p.next = x.next
	{
		var strLeft = '', strRight = '';

		var i=0;
		for(; i < item.propertyLeft.length-1; i++){  // önceki property ler seçim yapmak için
			strLeft += item.propertyLeft[i].join('')
		}

		var propLeft = item.propertyLeft[i].join(''); // son property


		item.propertyRight.forEach(function(el){ // p1 = p1.next.next
			strRight += el.join('')
		});

		console.error(item.lhs + strLeft + propLeft + ' = ' + item.rhs + strRight)
		window.eval(item.lhs + strLeft + propLeft + ' = ' + item.rhs + strRight)
		drawGraphics(item, {strLeft: strLeft, propLeft:propLeft, strRight:strRight})
	}

	if(item.type == 'free object') // removes the object // free p1 / free p1.next
	{
		drawGraphics(item);
	}
}

function recursivelyProcess(items){

	if(items instanceof Array)
	{
		for(var i=0; i < items.length; i++)
		{
			var item = items[i];
			processOneItem(item);
		}
	}
	else
		processOneItem(items);

	setTimeout(function(){ // delete the last line after all operations done
		  deleteLastLine();
	}, speed * time)
	time++;
}


//console.log(PARSER.parse('{var aaa = 123 //deneme}'));

var grammer = null, parser = null;

$.get("grammer.pegjs", function(response) {
	grammer = response;
 	parser = PEG.buildParser(grammer);
	//console.log(response)
});

restart();

window.parse = function(text) {

	//initialPositionX = 80;
	//project.activeLayer.removeChildren(); // clears all including background
	time = 0.3

	try {
		var text = text || editor.getValue();

		//var result = PARSER.parse(grammer); // normalde parser.js derleyip ekledigimiz zaman direk PARSER. diyerek kullanabiliriz. Su an grammer i ekleyerek calisacagiz
		var result = parser.parse(text);
		console.log(result)

		if(!result)
			return null;

		recursivelyProcess(result);

		//document.getElementById("output").textContent = JSON.stringify(result, null, 3); // parse result output kismina yaziliyor

		return result;
	} catch (err) {
		document.getElementById("output").textContent = err.toString();
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

	//deneme ismindeki tüm editörler codemirror editorü olacak
	items.forEach(function (editorEl) {

	//console.log(editorEl)

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

	//editor.setSize(450, 160);

	var map = {
		"Ctrl-Enter": function(){
			parse(editor.getValue());
			window.activeEditor = editor.doc
		},
		"Cmd-Enter": function(){
			parse(editor.getValue());
			window.activeEditor = editor.doc
		}
	}
	editor.addKeyMap(map);

		console.error(editor)
// 1. Create the button
var button = document.createElement("button");
button.innerHTML = '<span class="glyphicon glyphicon-play icon-white"></span>';
button.classList = "btn-round btn-lg";
button.style = "background-color: #0d47a1; display: inline-block; position: relative; float: left; margin-top: -50px; z-index:2; margin-left: calc(100% - 78px);";

// 2. Append somewhere
var body = document.getElementsByTagName("body")[0];
insertAfter(button, editor.getWrapperElement())

// 3. Add event handler
button.addEventListener ("click", function() {
  	parse(editor.getValue());
	window.activeEditor = editor.doc
});

	editor.on("focus", function() { console.log(editor.doc); window.activeEditor = editor.doc })

	});
}

setEditors(qsa(".deneme"));

// add editor
editorNo = 0;
window.addEditor  = function() {

	editorNo++;

	$( "#addElement" ).before(
	'<br>'+
	'<textarea class = "addedEditor'+editorNo+'" onClick = window.>'+
	'var list2 = Node(3);\n'+
	'list2.next = Node(4);\n'+
	'list2.next.next = Node(8);\n'+
	'</textarea>'
	 ) ;
	setEditors(qsa(".addedEditor"+editorNo));
}


var text = new PointText({ position: new Point(20, 500), fontSize: 18+'px', fillColor: 'black', content:'======= Variables ====='});
