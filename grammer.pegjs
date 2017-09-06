/*
 * Programming Language Grammar for Linked List Visualisation
 * ==========================
 * var p1 = Node(3)
 * var p2 = Node(3)
 * p1.next = p2
 */
{

/*

function iterate(){}
function redraw(){}
function appendANode(){}
var list1 = []

function Node(val, next){ 
	console.log('node '+val+' is created with next '+next)
	//this.drawNodeSomewhere = function(){}
	//this.drawArrow = function(){}
	//this.setName = function(){}
    //this.next = next;
} 

function Pointer(val){ 
	console.log('pointer '+val+' is created.')
	//this.draw = function(){}
   	//this.setName = function(){}
    //this.points = val;
   	//this.drawArrow = function(){}
} 
*/


window.Node = Node; 
window.Pointer = Pointer;

}


start = statement*

statement 
  =	block_item
  

if_statement
  = _ 'eğer' + '(' _ los:logical_statement  _ ')' _ nl
  		_ lines1:(compound_statement / block_item) _ nl
  lines2:( _ 'değilse' _ nl 
  		_ (compound_statement / block_item) )? nl
{      
  los.mainType = 'if';
  
  if(lines2 && typeof(lines2[5]) != "undefined")
     lines2 = lines2[5] 
		
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
 = _ 'yinele' _ '(' los:logical_statement ')' _ nl 
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

 
compound_statement
 = nl _'{' _ [ \n]* _ b:block_item_list _ '}' _ nl _{  // block itemlar yerine bos da olabilir
 	return b
 }



block_item
 =   object_poperty_set1
    / object_poperty_set2
    / print_statement
  	/ appendNode
  	/ object_statement
	/ declaration
	/ logical_statement
	/ if_statement
	/ while_statement
	/ print_statement
	/ math_functions
	/ expression_statement
	/ null_statement
	/ comment

block_item_list = (block_item)* 

null_statement
 = ';' _ comment? nl {
 	return {'type': 'null', 'text': '', 'lineNumber': location().start.line};
 }

//////////////////////////////////////// Declaration //////


declaration
 =  _ 'var' _ dec:init_declarator_list _ nl{
	return {'type': 'declaration', '#evaluation': 0, 'text':'var '+dec.lhs+' = ' + dec.rhs, 'lhs':dec.lhs, 'rhs': dec.rhs, 'lineNumber': location().start.line};
 }
 /
  _ ass:init_declarator_list  {
	return {'type': 'assignment', '#evaluation': 0, 'text': ass.lhs+' = '+ass.rhs, 'lhs':ass.lhs, 'rhs': ass.rhs, 'lineNumber': location().start.line};
 }

init_declarator_list
 = 	init:init_declarator (',' _ init_declarator)* {return init;}

init_declarator
	= _ left:name _"="_ exp: (dogru / yanlis / math_functions / expression_statement) nl{

	if( typeof(exp) == 'boolean')
    	return {'lhs': left, 'rhs': exp.toString()}; // evaluate it, then return it       
    else 
        return {'lhs': left, 'rhs': exp.text};        
}   

print_statement = _ "print" _ exp:( _  '+'? _ (math_functions / StringLiteral / expression_statement))+ _ comment? _ nl {
	//console.log(exp)
    var list = []
    
    for(var i=0; i < exp.length; i++)
	{
      if(exp[i][3].type == 'Literal')
          list.push( {'subtype': 'string', 'text': exp[i][3].value, 'lineNumber': location().start.line}); 
      else
          list.push({ 'subtype': 'var', 'text': exp[i][3].text, 'lineNumber': location().start.line});        
    }
	
    return {'type':'print', 'list': list, 'lineNumber': location().start.line}
}


///// Object reference //////

appendNode
 = "append" _ intt:(integer / name)   _ (comment)* nl{
	appendANode(list1, eval(intt));
	redraw();
	return "node "+intt;
 }

object_statement
 = "var " _ name:name _ "=" _ Object_Constructor nl{
	window.eval("var "+name+"=secret9999");
   	//window.eval(""+name+".drawNodeSomewhere();");
	window.eval(name+".setName('"+name+"')");
 }
 
Object_Constructor
 = node
 / pointer
 
node
 = "Node("_ value:integer _ next:("," _ name)? ")" _ comment? { 
 	if(next)
        window.eval("var secret9999=new Node("+value+","+next[2]+")");
    else
    	window.eval("var secret9999=new Node("+value+")");
	
	window.eval("if(!secret9999.boxDraw) secret9999.drawNodeSomewhere();");
	return "secret9999" 
 } 
 
pointer 
 = "Pointer(" _ p:name _ ")" _ comment? {
	window.eval("var secret9999=new Pointer("+p+")");
	console.log(eval('secret9999')) 	
	return "secret9999";
 }

object_poperty_set2
 = left:name next:(".next")+ _ "=" _ right:name nl{
	var str = 'var pointedNode9999=0; ' +
              'if('+left+'.constructor.name == "Pointer") ' +
                 	'pointedNode9999 = '+left+'.points; ' +
              'else if('+ left + '.constructor.name == "Node") ' +
                  	'pointedNode9999 = '+left+';';

        window.eval(str);	

        var left = "pointedNode9999";

        for(var i=0; i < next.length-1; i++) // go to the last node when we have multiple next
	        window.eval('pointedNode9999 = pointedNode9999.next;');

        window.eval(left+".drawArrow("+right+")");      	 
        window.eval(left+".next="+right);

        return left+'->'+right;
  } 
  
object_poperty_set1
 = left:name _ "=" _ right:name next:(".next")+ nl{
	console.log(left+".draw("+right+".points"+next.join('')+")");
	window.eval(left+".draw("+right+".points"+next.join('')+")");
	
	return left+'->'+right+' '+next.length+'  -'+next.join('')+'-\n'; 
  }  







/////////////////////////////////////////////////////////////////   Mathematical Operations

expression_statement = head:Term tail:(_ ("+" / "-") _ Term)* {  	    
   	return {'type':'expression', '#evaluation': 0, 'text':text(), 'lineNumber': location().start.line, 'start':location().start.column, 'end':location().end.column-1}; // evaluate it, then return it    
}

Term
  = head:Factor tail:(_ ("*" / "/" / "%") _ Factor)* 

Factor
  = "(" _ expr:expression_statement _ ")" { return expr; }
  / f:Float { return f.text;}
  / i:Integer { return i.text;}
  / n:name {return n.text}
  

logical_statement = _ f1:factor2 _ op:operator _ f2:factor2 log:(_ logical_operator _ logical_statement)* _ nl
{
	var text = f1+' ';
    text += op + ' ' + f2; 
        
    if(log[0] != undefined)  
    {	
    	log = log[0];
    
    	text += ' '+ log[1];
        text += ' '+ log[3].text;
    }
    
	return {'type':'logical', 'text': text, 'lineNumber': location().start.line, 'start': location().start.column-1, 'end': location().end.column-1};
}
	  
factor2 = "(" logical_statement ")" 
	   / name
	   / Float
       / integer
	   

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

taban = 'taban' _ '(' _ exp:expression_statement _ ')'{
 	return {'type':'math_func', '#evaluation': 0, 'text': 'Math.floor(' + exp.text + ')', 'lineNumber': location().end.line, 'start':location().start.column, 'end':location().end.column-1}; 
}
tavan = 'tavan' _ '(' _ exp:expression_statement _ ')'{
 	return {'type':'math_func', '#evaluation': 0, 'text': 'Math.ceil(' + exp.text + ')', 'lineNumber': location().end.line, 'start':location().start.column, 'end':location().end.column-1}; 
}
karekok = 'karekök' _ '(' _ exp:expression_statement _ ')'{
 	return {'type':'math_func', '#evaluation': 0, 'text': 'Math.sqrt(' + exp.text + ')', 'lineNumber': location().end.line, 'start':location().start.column, 'end':location().end.column-1}; 
}
mutlakDeger = 'mutlak' _ '(' _ exp:expression_statement _ ')'{
 	return {'type':'math_func', '#evaluation': 0, 'text': 'Math.abs(' + exp.text + ')', 'lineNumber': location().end.line, 'start':location().start.column, 'end':location().end.column-1}; 
}



////////////////////////////////////////////// Name = Variable

///// Name = Variable

name = l:letter i:integer {return l+i}
     / l:letter {return l;} 

dogru = 'doğru' {return true;}
yanlis = 'yanlış' {return false;}


letter "letter" 
  = [a-zA-Z_|ş|ğ|ç|ö|ü|ı|ü|Ş|Ğ|Ç|Ö|Ü|I|Ü]+ {return text()} 

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
   = _ "//" _ value:[ a-zA-Z0-9|\=|(|)|+|\-|\+|*|\._|ş|ğ|ç|ö|ü|ı|Ş|Ğ|Ç|Ö|Ü|I|Ü]* nl {return {type: 'comment', value: value.join("")}; }
  
operator
  = operator_text / operator_symbol
  
logical_operator
  = logical_operator_text / logical_operator_symbol
  
logical_operator_text
  = "and"					{ return "&&"; }
	/ "or"					{ return "||"; }
    
logical_operator_symbol
  = "&&"					{ return text(); }
	/ "||"					{ return text(); }    

operator_text
  =  "ge" 					{ return ">="; }
	/ "se"					{ return "<="; }
	/ "smaller"				{ return "<"; }
	/ "greater"	 			{ return ">"; }
	/ "notequal"			{ return "!="; }  
	/ "equal"				{ return "=="; }
  
operator_symbol
  = "<="					{ return text(); }
	/ "<"					{ return text(); }
	/ ">="					{ return text(); }
	/ ">"					{ return text(); }
	/ "=="					{ return text(); }
	/ "!="					{ return text(); }