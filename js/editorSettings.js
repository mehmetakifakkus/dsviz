
var editor2 = CodeMirror.fromTextArea(document.getElementById('command'), {
  mode: "javascript",
  lineNumbers: false,
  theme: 'dsv'
});

//editor2.setSize(450, 45);

var commandHist = [], currHist = 0;
editor2.setOption("extraKeys", {
	Enter: function(cm) {
	  var command = editor2.getValue();
	  if(!command.trim()){ // an empty line runs nothing and stays out of the history
	    cm.setValue("");
	    return;
	  }
	  evaluateCommand()
	  if(commandHist[commandHist.length - 1] !== command) // the same command twice in a row is kept once
	    commandHist.push(command)
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
		if(currHist >= commandHist.length-1){ // past the newest command: back to an empty line
			currHist = commandHist.length;
			editor2.setValue("");
			return;
		}

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

		window.activeEditor = editor2.doc; // highlight the command prompt, not the last editor
		var result = window.parse(command);

		if(!result)
			return

		res = result[0];

		//document.getElementById("result").textContent = JSON.stringify(result, null, 3);

		document.getElementById("resultSign").innerHTML = window.dsv ? window.dsv.t("commandOk") : "OK";
		document.getElementById("resultSign").className = "label label-success";
	}
	catch (err) {
		document.getElementById("output").textContent = window.explainError ? window.explainError(err, command) : err.toString();
		document.getElementById("resultSign").innerHTML = window.dsv ? window.dsv.t("commandError") : "!";
		document.getElementById("resultSign").className = "label label-warning";
	}

	setTimeout(function(){
		document.getElementById("resultSign").className = "label label-default";
		document.getElementById("resultSign").innerHTML = "";
	}, 5000);

	if(res.type == 'logical')
	{
		var result = 'value' in res ? res.value : eval(res.text) // the value the run computed
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

	// a node and the nodes after it as nested {data, next}; a link back to a node already
	// listed (a cycle or a circular list) ends the summary instead of looping forever
	function createSummary(tree, seen, isTree){
		if(tree == null)
			return null;
		if(tree.dsvArray) // an array: each cell on its own
			return tree.map(function(cell){ return cell && typeof cell === 'object' ? createSummary(cell) : cell; });
		seen = seen || [];
		if(isTree === undefined) // a tree when the first node has a child; then its leaves are tree nodes too
			isTree = !!(tree.left || tree.right);
		if(seen.indexOf(tree) >= 0)
			return window.dsv ? window.dsv.t("cycleBack", {data: tree.data}) : "↺ [" + tree.data + "]";
		seen.push(tree);
		if(isTree)
			return {data: tree.data, left: createSummary(tree.left, seen, true), right: createSummary(tree.right, seen, true)};
		return {data: tree.data, next: createSummary(tree.next, seen, false)};
	}

	if(res.type == 'expression')
	{
		var evaluation = 'value' in res ? res.value : eval(res.text); // do not call a function twice

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
		window.eval("var temp_node = new Node(" + res.data + (typeof res.next === "string" ? ", " + res.next : "") + ");");
		window.showNode(window.temp_node);

		//console.error(item.lhs + str + prop + ' = temp_node')

		//window.eval(item.lhs + str + prop + ' = temp_node')
		//window.eval(item.lhs + str + '.drawArrow(temp_node)')

		return;
	}
}


window.activeEditor = editor2.doc;
