/*
 * Programming Language Grammar for Linked List Visualisation
 * ==========================
 * var p1 = Node(3)
 * var p2 = Node(3)
 * p1.next = p2
 */

{
  // whitespace-only matches return the string 'ws'; keep only real statement objects
  function isItem(x) { return x !== null && typeof x === 'object'; }

  // new Node(1, new Node(2)) as text, for the statement's text
  function nodeText(n) {
    return 'new Node(' + n.data + (n.next ? ', ' + (typeof n.next === 'string' ? n.next : nodeText(n.next)) : '') + ')';
  }

  // a statement may stand for several (var a = 1, b = 2): such lists are spread out
  function flat(list) {
    var out = [];
    list.forEach(function(x) {
      if (x instanceof Array) out.push.apply(out, x.filter(isItem));
      else if (isItem(x)) out.push(x);
    });
    return out;
  }
}

start = s:statement* { return flat(s); }

statement 
  =	block_item
  

if_statement "if"
  = _ ('if' / 'eğer') !idChar _ '(' _ los:condition  _ ')' _ nl
  		_ lines1:(compound_statement / block_item) _ nl
  lines2:( _ ('else' / 'değilse') !idChar _ nl
  		_ body:(compound_statement / block_item) { return body; } )? nl
{
  los.mainType = 'if';
		
	return {'type': 'logical', 
			'mainType': 'if',
		    'text': los.text,
			'truePart':lines1,
			'falsePart': lines2,
			'lineNumber': los.lineNumber,
			'start': los.start,
			'end': los.end
		   };	
}
 
while_statement
 = _ ('yinele' / 'while') _ '(' los:condition ')' _ nl 
   _ lines:(compound_statement / block_item) _ nl
{ 
    if(lines instanceof Array)
     for(var i=0; i < lines.length; i++)
		lines[i].up = 'while';
	else
	    lines.up = 'while';
	
	return {'type': 'logical', 
		'mainType': 'while',
		'text': los.text,
		'statements': lines,
		'lineNumber': los.lineNumber,
		'start': los.start,
		'end': los.end
	   };	
} 

 
for_statement "for"
 = _ 'for' !idChar _ '(' _ init:for_init? _ ';' _ los:condition? _ ';' _ update:for_update? _ ')' _ nl
   _ lines:(compound_statement / block_item) _ nl
{
	var head = location().start.line;
	if(init) init.lineNumber = head;
	if(update) update.lineNumber = head;

	return {'type': 'logical',
		'mainType': 'for',
		'text': los ? los.text : 'true',
		'init': init,
		'update': update,
		'statements': lines,
		'lineNumber': head,
		'start': los ? los.start : 0,
		'end': los ? los.end : 0
	   };
}

for_init = object_statement / right_object_poperty / declaration
for_update = increment / right_object_poperty / declaration

// break / continue: leave the loop / go on with the next round
loop_control
 = _ kind:('break' / 'continue') !idChar _ ';'? _ nl {
	return {'type': kind, 'text': kind, 'lineNumber': location().start.line};
 }

// i++  i--  i += 2  i -= 2   (written as an assignment)
increment
 = _ n:name _ op:('++' / '--') _ ';'? _ nl {
	var rhs = n + (op == '++' ? ' + 1' : ' - 1');
	return {'type': 'assignment', '#evaluation': 0, 'text': n + ' = ' + rhs, 'lhs': n, 'rhs': rhs, 'lineNumber': location().start.line};
 }
 / _ n:name _ op:('+=' / '-=') _ e:expression_statement _ ';'? _ nl {
	var rhs = n + ' ' + op.charAt(0) + ' (' + e.text + ')';
	return {'type': 'assignment', '#evaluation': 0, 'text': n + ' = ' + rhs, 'lhs': n, 'rhs': rhs, 'lineNumber': location().start.line};
 }

// function push(v) { ... }   (or: fonksiyon push(v) { ... })
function_declaration "function"
 = _ ('function' / 'fonksiyon') !idChar _ n:name _ '(' _ params:param_list? _ ')' _ nl
   _ '{' _ [ \n]* _ body:block_item_list _ end:closing_brace _ nl
{
	return {'type': 'function', 'name': n, 'params': params || [], 'body': flat(body),
	        'lineNumber': location().start.line, 'endLine': end};
}

param_list
 = first:name rest:(_ ',' _ name)* { return [first].concat(rest.map(function(r){ return r[3]; })); }

closing_brace
 = '}' { return location().start.line; }

// return / return value   (or: döndür)
return_statement "return"
 = _ ('return' / 'döndür') !idChar _ value:condition? _ ';'? _ nl
{
	return {'type': 'return', 'text': value ? value.text : null, 'lineNumber': location().start.line};
}

// count(p.next), push(5): a call inside an expression; the engine turns every user
// function into a JavaScript function, so the call runs when the expression is evaluated
call_expression
 = n:name _ '(' _ args:(expression_statement (_ ',' _ expression_statement)*)? _ ')' ('.' name)* { return text(); }   // pop().data, find(3).next too

compound_statement
 = nl _'{' _ [ \n]* _ b:block_item_list _ '}' _ nl _{  // block itemlar yerine bos da olabilir
 	return flat(b)
 }



block_item
=	 [ \t\r] {return 'ws';}
	/ function_declaration
	/ return_statement
	/ for_statement
	/ loop_control
	/ increment
    /l: logical_statement _ nl {return l;}
	/ object_statement	
	/ Object_Constructor
	/ free_item
	/ matrix_assignment
	/ index_assignment
		
	/ left_right_object_poperty 
	/ left_object_poperty
    / right_object_poperty

    / declaration

	/ print_statement
	/ if_statement
	/ while_statement

	/ e:expression_statement _ nl {return e;}
	/ object_poperty

	/ math_functions
	/ null_statement
	/ comment

block_item_list = (block_item)* 

null_statement
 = ';' _ comment? nl {
 	return {'type': 'null', 'text': '', 'lineNumber': location().start.line};
 }

//////////////////////////////////////// Declaration //////


declaration
 =  _ 'var' !idChar _ list:init_declarator_list {
	var line = location().start.line;
	var items = list.map(function(dec){
		return {'type': 'declaration', '#evaluation': 0, 'text': dec.text ? 'var ' + dec.text : 'var '+dec.lhs+' = ' + dec.rhs, 'lhs':dec.lhs, 'rhs': dec.rhs, 'lineNumber': line};
	});
	return items.length === 1 ? items[0] : items; // var a = 1, b = 2: one statement for each name
 }
 /
  _ list:init_declarator_list {
	var line = location().start.line;
	var items = list.map(function(ass){
		return {'type': 'assignment', '#evaluation': 0, 'text': ass.text || ass.lhs+' = '+ass.rhs, 'lhs':ass.lhs, 'rhs': ass.rhs, 'lineNumber': line};
	});
	return items.length === 1 ? items[0] : items;
 }

init_declarator_list
 = 	first:init_declarator rest:(',' _ init_declarator)* _ nl { return [first].concat(rest.map(function(r){ return r[2]; })); }

init_declarator
	= _ left:name _"="_ exp: (array_constructor / node / dogru / yanlis / (o:object_poperty !(_ [-+*/%(=<>!&|]) { return o; }) / bool_expression / expression_statement) _ nl{   // taban(x) + 1 is a call in an expression

	if( typeof(exp) == 'boolean')
    	return {'lhs': left, 'rhs': exp.toString()}; // evaluate it, then return it
    else if(exp.type == 'node') // x = new Node(9): without this it was read as "x = new" and "Node(9)"
        return {'lhs': left, 'rhs': exp, 'text': left + ' = ' + nodeText(exp)};
    else if(exp.type == 'array') // table = new Array(5)
        return {'lhs': left, 'rhs': exp, 'text': left + ' = new Array(' + exp.size + (exp.size2 ? ', ' + exp.size2 : '') + ')'};
    else
        return {'lhs': left, 'rhs': exp.text};
}   

// ok = a == b, found = p != null && p.data > 3: a condition as a value (true / false)
bool_expression
 = c:condition &{ return /(==|!=|<|>|&&|\|\||!|\bnot\b|\band\b|\bor\b|değil)/.test(c.text); } { return {type: 'expression', text: c.text}; }

// print "toplam: " + sum     (the parts after the first one must be joined with +)
print_statement = _ "print" !idChar _ first:print_item rest:( _ '+' _ print_item)* _ comment? _ nl {
    var items = [first].concat(rest.map(function(r){ return r[3]; }));
    var line = location().start.line;

    var list = items.map(function(item){
      return item.type == 'Literal'
          ? {'subtype': 'string', 'text': item.value, 'lineNumber': line}
          : {'subtype': 'var', 'text': item.text, 'lineNumber': line};
    });

    return {'type':'print', 'list': list, 'lineNumber': line}
}

print_item = StringLiteral / expression_statement // taban(x), karekök(x)... are calls (defined by the engine)


/////////////////////////			 Object reference 		////////////////

object_statement
 = "var " _ name:name _ "=" _ "new"? _ obj:Object_Constructor _ nl !(_ ',') {   // var x = new Node(1), y = ... is a declaration list
	return {'type': 'declaration', 'lhs': name, 'rhs': obj, 'lineNumber': location().start.line}
 }
 
Object_Constructor
 = node

// new Array(5) (or: new Dizi(5)): an array of 5 cells, all null; new Array(3, 4): a matrix of 3 rows and 4 columns
array_constructor
 = _ 'new'? _ ('Array' / 'Dizi') !idChar _ '(' _ size:expression_statement size2:(_ ',' _ s2:expression_statement { return s2; })? _ ')' _ comment? _ nl {
	return {'type': 'array', 'size': size.text, 'size2': size2 ? size2.text : null, 'lineNumber': location().start.line};
 }

// table[k], table[hash(v)].data: reading a cell inside an expression (evaluated as JavaScript)
index_access
 = name _ '[' _ expression_statement _ ']' (_ '[' _ expression_statement _ ']')? ('.' name)* { return text(); }   // g[i][j]: a cell of a matrix

// g[i][j] = v: a cell of a matrix (new Array(3, 4))
matrix_assignment
 = _ a:name _ '[' _ r:expression_statement _ ']' _ '[' _ c:expression_statement _ ']' _ '=' !'=' _ right:(Object_Constructor / e:expression_statement { return e.text.trim(); }) _ nl {
	return {'type': 'matrix assignment', '#evaluation': 0, 'array': a, 'row': r.text, 'col': c.text, 'rhs': right,
	        'text': a + '[' + r.text + '][' + c.text + '] = ' + (typeof right === 'string' ? right : nodeText(right)), 'lineNumber': location().start.line};
 }

// table[k] = n   /   table[k] = p.next   /   table[k] = new Node(5)
index_assignment
 = _ a:name _ '[' _ i:expression_statement _ ']' _ '=' !'=' _ right:(Object_Constructor / e:expression_statement { return e.text.trim(); }) _ nl {
	return {'type': 'array assignment', '#evaluation': 0, 'array': a, 'index': i.text, 'rhs': right,
	        'text': a + '[' + i.text + '] = ' + (typeof right === 'string' ? right : nodeText(right)), 'lineNumber': location().start.line};
 }
 
// Node(5), Node(i), Node(p.data + 1): a number literal stays a number, anything else is
// kept as an expression and evaluated when the statement runs
// the second value is the new node's next: new Node(0, head), Node(5, p.next), Node(1, null),
// or another new node: new Node(1, new Node(2, new Node(3)))
node
 = _ 'new'? _ n:node_call _ comment? _ nl { n.lineNumber = location().start.line; return n; }

node_call
 = 'Node' '('_ value:node_value _ next:("," _ nx:node_next { return nx; })? _ ")" {
	return {'type': 'node', 'data': value, 'next': next, 'lineNumber': location().start.line};
 }

node_next
 = 'new'? _ n:node_call !(_ [-+*/%.]) { return n; }
 / e:expression_statement { return e.text.trim(); }

node_value
 = n:integer &(_ (')' / ',')) { return n; }
 / e:expression_statement { return e.text; }

/////////////////////////       Object properties        ////////////////
  
left_right_object_poperty   												// pointer hareketi icin p1 = p1.next
 = propL: object_poperty _ "=" _ propR: object_poperty !(_ [-+*/%]) _ nl{   // p1 = p1.next, but not p = p.data + 1
 	return {'type': 'object property left-right', '#evaluation': 0, 'lhs': propL.variable, 'propertyLeft': propL.property, 'rhs': propR.variable, 'propertyRight': propR.property, 'lineNumber': location().start.line}
  } 

left_object_poperty												// bağ kurmak icin x.next = q;  x.next = Node(11) veya data guncellemek icin
 = prop:object_poperty "=" _ right: (Object_Constructor / e:expression_statement { return e.text; }) _ nl{   // x.next = merge(a, b), t.height = a + 1 too
  	return {'type': 'object property left', '#evaluation': 0, 'lhs': prop.variable, 'property': prop.property, 'rhs': right, 'lineNumber': location().start.line}
  } 

right_object_poperty   												// pointer hareketi icin p1 = p1.next
 = left:name _ "=" _ prop:object_poperty !(_ [-+*/%]) _ nl{   // p1 = p1.next, but not s = p.data + 1
 	return {'type': 'object property right', '#evaluation': 0, 'lhs': left, 'property': prop.property, 'rhs': prop.variable, 'lineNumber': location().start.line}
  }  

object_poperty
 = variable:name prop:('.' name)+ _ nl{
 	return {'type': 'object property', 'variable': variable, 'property': prop, 'text': text(), 'lineNumber': location().start.line}
  } 

free_item
 = ("free " / "delete ") _ op:(object_poperty / name) _ nl{
   return {'type': 'free object', 'text': op.text != undefined ? op.text: op,  'lineNumber': location().start.line}
 }



/////////////////////////////////////////////////////////////////   Mathematical Operations

expression_statement = head:Term tail:(_ ("+" / "-") _ Term)* {  	    
   	return {'type':'expression', '#evaluation': 0, 'text':text(), 'lineNumber': location().start.line, 'start':location().start.column, 'end':location().end.column-1}; // evaluate it, then return it    
}

Term
  = head:Factor tail:(_ ("*" / "/" / "%") _ Factor)* 

Factor
  = "(" _ expr:expression_statement _ ")" { return expr; }
  / c:call_expression { return c; }
  / ia:index_access { return ia; }
  / op: object_poperty {return op.text;}
  / f:Float { return f.text;}
  / i:Integer { return i.text;}
  / n:name {return n.text}
  

logical_statement = _ f1:factor2 _ op:operator _ f2:factor2 log:(_ logical_operator _ logical_statement)*
{
	var text = f1.text+' ';
    text += op + ' ' + f2.text; 
        
    if(log[0] != undefined)  
    {	
    	log = log[0];
    
    	text += ' '+ log[1];
        text += ' '+ log[3].text;
    }
	
	return {'type':'logical', 'text': text, 'lineNumber': location().start.line, 'start': location().start.column-1, 'end': location().end.column-1};
}

// The condition of if / while / for and a return value. Unlike a statement on its own
// line it does not need a comparison: if(p), while(!isEmpty()), return p == null.
// Precedence: || < && < ! < comparison. The text is the JavaScript that is evaluated.
condition
 = _ c:or_condition {
	return {'type':'logical', 'text': c, 'lineNumber': location().start.line, 'start': location().start.column-1, 'end': location().end.column-1};
 }

or_condition
 = head:and_condition tail:(_ logical_or _ and_condition)* {
	return tail.reduce(function(text, t){ return text + ' ' + t[1] + ' ' + t[3]; }, head);
 }

and_condition
 = head:not_condition tail:(_ logical_and _ not_condition)* {
	return tail.reduce(function(text, t){ return text + ' ' + t[1] + ' ' + t[3]; }, head);
 }

not_condition
 = ('!' !'=' / 'not' !idChar / 'değil' !idChar) _ c:not_condition { return '!' + c; }
 / comparison

comparison
 = l:condition_operand _ op:operator _ r:condition_operand { return l + ' ' + op + ' ' + r; }
 / condition_operand

condition_operand
 = "(" _ c:or_condition _ ")" !(_ ('+' / '-' / '*' / '/' / '%')) { return '(' + c + ')'; }
 / o:object_poperty !(_ [-+*/%]) { return o.text; }   // node.data + 1 is an expression, not a lone field
 / e:expression_statement { return e.text; }

logical_and
 = "&&" { return text(); }
 / "and" !idChar { return "&&"; }

logical_or
 = "||" { return text(); }
 / "or" !idChar { return "||"; }

factor2 = "(" logical_statement ")" 
	   / object_poperty
	   / expression_statement
	   
	   

////////////////////////////////////////////////////////////////////// math functions

function_combination
 = head:math_functions _ tail:('+' _ math_functions)*
 {
 	console.log(tail[0]);
    for(var i=0; i<tail.length; i++)
    	head.text += tail[i][0] + tail[i][2].text; 
    return head
 }

math_functions
 = taban / tavan/ karekok / mutlakDeger

taban 
 = 'taban' _ '(' _ exp:expression_statement _ ')'{
 	return {'type':'math_func', '#evaluation': 0, 'text': 'Math.floor(' + exp.text + ')', 'lineNumber': location().end.line, 'start':location().start.column, 'end':location().end.column-1}; 
}
tavan 
 = 'tavan' _ '(' _ exp:expression_statement _ ')'{
 	return {'type':'math_func', '#evaluation': 0, 'text': 'Math.ceil(' + exp.text + ')', 'lineNumber': location().end.line, 'start':location().start.column, 'end':location().end.column-1}; 
}
karekok "karekök"
 = 'karekök' _ '(' _ exp:expression_statement _ ')'{
 	return {'type':'math_func', '#evaluation': 0, 'text': 'Math.sqrt(' + exp.text + ')', 'lineNumber': location().end.line, 'start':location().start.column, 'end':location().end.column-1}; 
}
mutlakDeger 
 = 'mutlak' _ '(' _ exp:expression_statement _ ')'{
 	return {'type':'math_func', '#evaluation': 0, 'text': 'Math.abs(' + exp.text + ')', 'lineNumber': location().end.line, 'start':location().start.column, 'end':location().end.column-1}; 
}



////////////////////////////////////////////// Name = Variable

///// Name = Variable

name = l:letter i:integer {return l+i}
     / l:letter {return l;} 

dogru = 'doğru' !idChar {return true;}
yanlis = 'yanlış' !idChar {return false;}


letter "letter" 
  = [a-zA-Z_şğçöüıŞĞÇÖÜİ]+ {return text()}

// a keyword must not be followed by a letter or a digit: "settle" is not "se" + "ttle"
idChar = [a-zA-Z0-9_şğçöüıŞĞÇÖÜİ]

StringLiteral "string"
  = '"' chars:DoubleStringCharacter* '"' {
      return { type: "Literal", value: chars.join("") };
    }

DoubleStringCharacter
  = !('"' / "\\" / LineTerminator) SourceCharacter { return text(); }
  / "\\" sequence:EscapeSequence { return sequence; }
  / LineContinuation

LineContinuation
  = "\\" LineTerminatorSequence { return ""; }  
  
LineTerminatorSequence "end of line"
  = "\n"
  / "\r\n"
  / "\r"
  / "\u2028"
  / "\u2029"  
  
LineTerminator
  = [\n\r\u2028\u2029]  
 
SourceCharacter
  = . 
 
EscapeSequence
  = CharacterEscapeSequence

CharacterEscapeSequence
  = SingleEscapeCharacter

SingleEscapeCharacter
  = "'" / '"'  / "\\"  
  / "b"  { return "\b"; }
  / "f"  { return "\f"; }
  / "n"  { return "\n"; }
  / "r"  { return "\r"; }
  / "t"  { return "\t"; }
  / "v"  { return "\v"; } 
  
  
Float "float" 
  = _ '-'? [0-9]+ '.' [0-9]* { return {type: 'float', text: text()}; }

Integer "integer"
  = _ '-'? [0-9]+ { return {type: 'integer', text: text()}; }
   
integer "integer"
  = [0-9]+ { return parseInt(text(), 10); }

_ "whitespace"
  = [ \t\r]* {return null;}
  
nl "newline"
  = comment? [\n]* {return null;}

comment 
   = _ "//" value:[^\n]* nl {return {type: 'comment', value: value.join("")}; }
  
operator
  = operator_text / operator_symbol
  
logical_operator
  = logical_operator_text / logical_operator_symbol
  
logical_operator_text
  = "and" !idChar			{ return "&&"; }
	/ "or" !idChar			{ return "||"; }
    
logical_operator_symbol
  = "&&"					{ return text(); }
	/ "||"					{ return text(); }    

operator_text
  =  "ge" !idChar			{ return ">="; }
	/ "se" !idChar			{ return "<="; }
	/ "smaller" !idChar		{ return "<"; }
	/ "greater" !idChar		{ return ">"; }
	/ "notequal" !idChar		{ return "!="; }
	/ "equal" !idChar		{ return "=="; }
  
operator_symbol
  = "<="					{ return text(); }
	/ "<"					{ return text(); }
	/ ">="					{ return text(); }
	/ ">"					{ return text(); }
	/ "=="					{ return text(); }
	/ "!="					{ return text(); }