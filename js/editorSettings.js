var editor = CodeMirror.fromTextArea(document.getElementById('codemirror'), {
  mode: "javascript",
  extraKeys: {"Ctrl-Space": "autocomplete"},
  styleActiveLine: true,
  lineNumbers: true,
  lineWrapping: true,
  autoCloseBrackets: true,
  autoCloseTags: true,
  theme: 'eclipse'
});
editor.setSize(450, 250);


var editor2 = CodeMirror.fromTextArea(document.getElementById('command'), {
  mode: "javascript",
  lineNumbers: false,
  theme: 'eclipse'
});

editor2.setSize(450, 45);

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

	try {
		var command = editor2.getValue();
		var result = window.parse(command);

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

}


/*
*
*	#######################      	Editor Functions   	  #######################
*
*/

var markedLine, markedLogic, logicals = [];
function highlightLine(line, type, result) { // type is used for logical,  result is logical true or false

	var ln = line.lineNumber-1;

 	if(markedLine)
   		markedLine.clear();

	if(result)
		markedLogic = editor.markText({line: ln, ch: 0}, {line: ln, ch: 100}, {className: "styled-background-logical-true"});
	else
		markedLogic = editor.markText({line: ln, ch: 0}, {line: ln, ch: 100}, {className: "styled-background-logical-false"});

	logicals.push(markedLogic);

	markedLine = editor.markText({line: ln, ch: 0}, {line: ln, ch: 100}, {className: "styled-background-normal"});
}
