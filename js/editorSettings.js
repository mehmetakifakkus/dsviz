
var editor2 = CodeMirror.fromTextArea(document.getElementById('command'), {
  mode: "javascript",
  lineNumbers: false,
  theme: 'eclipse'
});

//editor2.setSize(450, 45);

var commandHist = [], currHist = 0;
editor2.setOption("extraKeys", {
	Enter: function(cm) {
	  evaluateCommand()
	  console.log(editor2.getValue())
	  commandHist.push(editor2.getValue())
	  currHist = commandHist.length;

	  cm.setValue("");
	  cm.clearHistory();
	},
	Up: function(cm){
		if(currHist <= 0)
			return;

		currHist--;
		editor2.setValue(commandHist[currHist]);
		editor2.setCursor({line: 1, ch: 50})
	},
	Down: function(cm){
		if(currHist >= commandHist.length-1)
			return;

		currHist++;
		editor2.setValue(commandHist[currHist]);
		editor2.setCursor({line: 1, ch: 50})
	}
});

function evaluateCommand(){

	var res = '';

	try {
		var command = editor2.getValue();

		if(command.length == 0) return null;

		var result = window.parse(command);

		if(!result)
			return

		res = result[0];

		//document.getElementById("result").textContent = JSON.stringify(result, null, 3);

		document.getElementById("resultSign").innerHTML = "Successfully operated";
		document.getElementById("resultSign").className = "label label-success";
	}
	catch (err) {
		document.getElementById("result").textContent = err.toString();
		document.getElementById("resultSign").innerHTML = "Error!";
		document.getElementById("resultSign").className = "label label-warning";
	}

	setTimeout(function(){
		document.getElementById("resultSign").className = "label label-default";
		document.getElementById("resultSign").innerHTML = "";
	}, 5000);

	if(res.type == 'logical')
	{
		var result = eval(res.text)
		document.getElementById("output").textContent = JSON.stringify(result, null, 2);
		return;
	}

	if(res.type == 'assignment')
	{
		var result = eval(res.lhs)
		document.getElementById("output").textContent = JSON.stringify(typeof result == 'number' ? result : createSummary(result), null, 3);

		//document.getElementById("output").textContent = JSON.stringify(result, null, 2);
		return;
	}

	function createSummary(tree){
		if(tree == null)
			return null;

		return {data: tree.data, next: createSummary(tree.next)};
	}

	if(res.type == 'expression')
	{
		var evaluation = eval(res.text);

		document.getElementById("output").textContent = JSON.stringify(typeof evaluation == 'object' ? createSummary(evaluation) : evaluation, null, 3);

		/*if(result.constructor.name == 'Node')
			document.getElementById("output").textContent = JSON.stringify(createSummary(result), null, 3);
		else
			document.getElementById("output").textContent = JSON.stringify(result, null, 3);
			*/
		return;
	}

	if(res.type == 'object property')
	{
		var str = ''
		res.property.forEach(function(el){
			str += el.join('')
		});

		var result = eval(res.variable + str);

		document.getElementById("output").textContent = JSON.stringify(typeof result == 'number' ? result : createSummary(result), null, 3);
		return;
	}

	if(res.type == 'node')
	{
		window.eval("var temp_node = new Node(" + res.data + ");");
		window.eval("if(!temp_node.boxDraw) temp_node.drawNodeSomewhere();");

		//console.error(item.lhs + str + prop + ' = temp_node')

		//window.eval(item.lhs + str + prop + ' = temp_node')
		//window.eval(item.lhs + str + '.drawArrow(temp_node)')

		return;
	}
}


/*
*
*	#######################      	Editor Functions   	  #######################
*
*/

window.activeEditor = editor2.doc;

var markedLine, markedLogic, logicals = [];
function highlightLine(line, type, result) { // type is used for logical,  result is logical true or false

	console.log(window.activeEditor)

  var ln = line.lineNumber-1;

  if(markedLine)
    markedLine.clear();

	if(type == 'logical')
	if(result)
		markedLogic = window.activeEditor.markText({line: ln, ch: line.start}, {line: ln, ch: line.end}, {className: "styled-background-logical-true"});
	else
		markedLogic = window.activeEditor.markText({line: ln, ch: line.start}, {line: ln, ch: line.end}, {className: "styled-background-logical-false"});

	logicals.push(markedLogic);

	markedLine = window.activeEditor.markText({line: ln, ch: 0}, {line: ln, ch: 50}, {className: "styled-background-normal"});
}

function deleteLastLine(){
	if(markedLine)
    	markedLine.clear();
	//console.log('deleteLastLine')
}

