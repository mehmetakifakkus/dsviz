
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

		window.activeEditor = editor2.doc; // highlight the command prompt, not the last editor
		var result = window.parse(command);

		if(!result)
			return

		res = result[0];

		//document.getElementById("result").textContent = JSON.stringify(result, null, 3);

		document.getElementById("resultSign").innerHTML = "Başarıyla çalıştı";
		document.getElementById("resultSign").className = "label label-success";
	}
	catch (err) {
		document.getElementById("output").textContent = window.explainError ? window.explainError(err, command) : err.toString();
		document.getElementById("resultSign").innerHTML = "Hata!";
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
		window.showNode(window.temp_node);

		//console.error(item.lhs + str + prop + ' = temp_node')

		//window.eval(item.lhs + str + prop + ' = temp_node')
		//window.eval(item.lhs + str + '.drawArrow(temp_node)')

		return;
	}
}


window.activeEditor = editor2.doc;
