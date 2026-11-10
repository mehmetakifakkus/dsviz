/*
 * Code languages: the pages can show and run their code in C++ or Java instead of Düğüm, or in
 * Düğüm with Turkish keywords (see "Düğüm with Turkish words" below).
 *
 * The engine only knows Düğüm. C++ code is turned into Düğüm line by line before it is
 * parsed (fromCpp), so the drawing, the narration and the error messages work the same and
 * every line keeps its number. The examples are written in Düğüm and shown in C++ by toCpp,
 * which infers the types (Node*, int, bool, arrays, function signatures) from the code of the
 * whole page.
 *
 * The C++ that is understood is the part a data structures course needs: a predefined
 * struct Node {data, next, prev, left, right}, Node* / int / bool / double variables,
 * arrays (Node* t[5]), new / delete, ->, nullptr / NULL, if / else / while / for,
 * functions, cout << ... << endl. Java the same way: Node p, Node[] t = new Node[5],
 * System.out.println, static methods, a class around them; it has no delete (the garbage
 * collector removes nodes nothing reaches). Everything else stays Düğüm (one statement per line).
 */
(function(){
	var ID = 'A-Za-z0-9_şğçöüıŞĞÇÖÜİ';
	var NAME = '[A-Za-z_şğçöüıŞĞÇÖÜİ][' + ID + ']*';
	var TYPE = '(?:void|int|long|short|double|float|bool|char|auto|string|Node)';

	// ---------- text helpers (they leave string literals alone) ----------

	// [code, comment]: the comment starts at a // that is not inside a string
	function splitComment(line){
		var inString = false;
		for(var i = 0; i < line.length; i++){
			var ch = line.charAt(i);
			if(ch === '"' && line.charAt(i - 1) !== '\\') inString = !inString;
			else if(!inString && ch === '/' && line.charAt(i + 1) === '/') return [line.slice(0, i), line.slice(i)];
		}
		return [line, ''];
	}

	// applies fn to the parts of code outside string literals
	function outsideStrings(code, fn){
		return code.split(/("(?:[^"\\]|\\.)*")/).map(function(part, i){ return i % 2 ? part : fn(part); }).join('');
	}

	// splits at sep where no bracket is open and not inside a string
	function splitTop(s, sep){
		var parts = [], depth = 0, inString = false, start = 0;
		for(var i = 0; i < s.length; i++){
			var ch = s.charAt(i);
			if(ch === '"' && s.charAt(i - 1) !== '\\') inString = !inString;
			if(inString) continue;
			if('([{'.indexOf(ch) >= 0) depth++;
			else if(')]}'.indexOf(ch) >= 0) depth--;
			else if(depth === 0 && s.substr(i, sep.length) === sep){
				parts.push(s.slice(start, i));
				start = i + sep.length;
				i += sep.length - 1;
			}
		}
		parts.push(s.slice(start));
		return parts;
	}

	// the index of the bracket that closes the one at `open`
	function closing(s, open){
		var depth = 0, inString = false;
		for(var i = open; i < s.length; i++){
			var ch = s.charAt(i);
			if(ch === '"' && s.charAt(i - 1) !== '\\') inString = !inString;
			if(inString) continue;
			if(ch === '(' || ch === '[') depth++;
			else if(ch === ')' || ch === ']'){ depth--; if(depth === 0) return i; }
		}
		return -1;
	}

	function trimRight(s){ return s.replace(/\s+$/, ''); }

	// ---------- Düğüm expression -> C++ expression ----------

	function exprCpp(s){ return exprIn(s, 'cpp'); }

	// taban((i - 1) / 2) is written (i - 1) / 2: an index halved, as C++ and Java code does it
	// with integer division (the same for every index that is not negative). Only for a whole
	// number divisor and a bracketed left side without decimals.
	function plainHalving(s){
		var re = /\btaban\s*\(/g, m;
		while((m = re.exec(s))){
			var open = m.index + m[0].length - 1, end = closing(s, open);
			if(end < 0) break;
			var arg = s.slice(open + 1, end), lead = arg.search(/\S/);
			var inner = lead >= 0 && arg.charAt(lead) === '(' ? closing(arg, lead) : -1;
			var div = inner > 0 ? /^\s*\/\s*(\d+)\s*$/.exec(arg.slice(inner + 1)) : null;
			if(div && !/\d\.\d/.test(arg)){
				s = s.slice(0, m.index) + arg.slice(lead, inner + 1) + ' / ' + div[1] + s.slice(end + 1);
				re.lastIndex = m.index;
			}
		}
		return s;
	}

	function exprIn(s, lang){
		var java = lang === 'java', math = java ? 'Math.' : '';
		s = plainHalving(s);
		return outsideStrings(s, function(part){
			part = part
				.replace(/\bdeğil\b\s*/g, '!').replace(/\bnot\b\s*/g, '!')
				.replace(/\band\b/g, '&&').replace(/\bor\b/g, '||')
				.replace(/\bdoğru\b/g, 'true').replace(/\byanlış\b/g, 'false')
				.replace(/\btaban\s*\(/g, math + 'floor(').replace(/\btavan\s*\(/g, math + 'ceil(')
				.replace(/karekök\s*\(/g, math + 'sqrt(').replace(/\bmutlak\s*\(/g, math + 'abs(')
				.replace(new RegExp('(^|[^' + ID + '.])Node\\s*\\(', 'g'), function(m, before){ return before + 'new Node('; })
				.replace(/new\s+new\s+Node/g, 'new Node');
			if(java)
				return part;
			return part.replace(/\bnull\b/g, 'nullptr')
				.replace(new RegExp('([' + ID + '\\])])\\.(?=[A-Za-z_])', 'g'), '$1->'); // p.next -> p->next (not 2.5)
		});
	}

	// ---------- types of Düğüm expressions ----------

	var POINTER_FIELDS = /\.(next|prev|left|right)\s*$/, NUMBER_FIELDS = /\.(data|height)\s*$/;

	function stripParens(s){
		s = s.trim();
		while(s.charAt(0) === '(' && closing(s, 0) === s.length - 1)
			s = s.slice(1, -1).trim();
		return s;
	}

	// 'Node*', 'int', 'bool', 'double', 'array', 'null' (null: a pointer whose kind is open) or undefined
	function typeOf(expr, lookup, funcs){
		var s = stripParens(expr);
		if(s === '') return undefined;
		if(/^null$/.test(s)) return 'null';
		if(/^(new\s+)?Node\s*\(/.test(s) && closing(s, s.indexOf('(')) === s.length - 1) return 'Node*';
		if(/^new\s+(Array|Dizi)\s*\(/.test(s)) return 'array';
		if(/^(true|false|doğru|yanlış)$/.test(s)) return 'bool';
		var bare = outsideStrings(s, function(p){ return p; }).replace(/"(?:[^"\\]|\\.)*"/g, '""');
		if(/(==|!=|<=|>=|&&|\|\||(^|[^<>=!])[<>](?!=)|^!|\bnot\b|\band\b|\bor\b|\bdeğil\b)/.test(bare)) return 'bool';
		if(/^-?\d+$/.test(s)) return 'int';
		if(/^-?\d+\.\d*$/.test(s)) return 'double';
		var parts = splitTop(s, '+').length > 1 || splitTop(s, '-').length > 1 || splitTop(s, '*').length > 1 ||
		            splitTop(s, '/').length > 1 || splitTop(s, '%').length > 1;
		if(parts){
			if(/\d\.\d/.test(bare)) return 'double';
			return 'int';
		}
		if(POINTER_FIELDS.test(s)) return 'Node*';
		if(NUMBER_FIELDS.test(s)) return 'int';
		if(new RegExp('^' + NAME + '$').test(s)) return lookup(s);
		var call = new RegExp('^(' + NAME + ')\\s*\\(').exec(s);
		if(call && closing(s, s.indexOf('(')) === s.length - 1){
			if(/^(taban|tavan|mutlak)$/.test(call[1])) return 'int';
			if(call[1] === 'karekök') return 'double';
			return funcs[call[1]] ? funcs[call[1]].ret : undefined;
		}
		var index = new RegExp('^(' + NAME + ')\\s*\\[').exec(s);
		if(index && closing(s, s.indexOf('[')) === s.length - 1){
			var t = lookup(index[1]);
			return t && t.indexOf('arr:') === 0 ? t.slice(4) : undefined;
		}
		return undefined;
	}

	function isPointer(t){ return t === 'Node*' || t === 'null' || t === 'arr:Node*'; }

	// ---------- the statements of a page (lines of all its blocks) ----------

	var KEYWORDS = {'eğer': 'if', 'değilse': 'else', 'yinele': 'while', 'fonksiyon': 'function', 'döndür': 'return'};

	function normalizeKeywords(code){
		return code.replace(/^(\s*)(eğer|değilse|yinele|fonksiyon|döndür)(?![A-Za-z0-9_şğçöüıŞĞÇÖÜİ])/, function(m, sp, kw){ return sp + KEYWORDS[kw]; })
		           .replace(/^(\s*)else\s+eğer\b/, '$1else if');
	}

	// the declarators of "var a = 1, b = x" as [{name, expr}]
	function declarators(list){
		return splitTop(list, ',').map(function(d){
			var m = new RegExp('^\\s*(' + NAME + ')\\s*(?:=\\s*([\\s\\S]*))?$').exec(d);
			return m ? {name: m[1], expr: m[2] === undefined ? '' : m[2].trim()} : null;
		}).filter(Boolean);
	}

	// one pass over the lines: calls visit(kind, info, fn) for what the type inference needs
	function scan(lines, visit){
		var fn = null, depth = 0, bodyDepth = -1;
		lines.forEach(function(line, index){
			var code = normalizeKeywords(trimRight(splitComment(line)[0])).trim();
			var header = new RegExp('^function\\s+(' + NAME + ')\\s*\\(([^)]*)\\)').exec(code);
			if(header){
				fn = header[1];
				bodyDepth = depth;
				visit('function', {name: fn, params: header[2].split(',').map(function(p){ return p.trim(); }).filter(Boolean), index: index}, fn);
			}
			var opens = (code.match(/\{/g) || []).length, closes = (code.match(/\}/g) || []).length;
			var body = code.replace(/^[{}\s]+|[{}\s]+$/g, '');
			// a header with a statement on the same line: if(x) return y
			var head = /^(if|while|for)\s*\(/.exec(body);
			if(head){
				var end = closing(body, body.indexOf('('));
				var inside = body.slice(body.indexOf('(') + 1, end);
				if(head[1] === 'for'){
					var forParts = splitTop(inside, ';');
					if(/^\s*var\s/.test(forParts[0])) visit('var', declarators(forParts[0].replace(/^\s*var\s+/, '')), fn);
				}
				else visit('cond', inside, fn);
				body = body.slice(end + 1).trim();
			}
			else if(/^else\b/.test(body))
				body = body.replace(/^else\s*/, '');
			if(body && !header){
				var m;
				if((m = /^var\s+([\s\S]*)$/.exec(body))) visit('var', declarators(m[1]), fn);
				else if((m = /^return\s+([\s\S]+)$/.exec(body))) visit('return', m[1], fn);
				else if((m = new RegExp('^(' + NAME + ')\\s*\\[([\\s\\S]*?)\\]\\s*=(?!=)\\s*([\\s\\S]*)$').exec(body))) visit('cell', {name: m[1], expr: m[3]}, fn);
				else if((m = new RegExp('^(' + NAME + ')\\s*=(?!=)\\s*([\\s\\S]*)$').exec(body))) visit('assign', {name: m[1], expr: m[2]}, fn);
				visit('code', body, fn);
			}
			depth += opens - closes;
			if(fn && depth <= bodyDepth && closes){ fn = null; bodyDepth = -1; }
		});
	}

	function inferTypes(lines){
		var globals = {}, funcs = {}, nullCells = {};
		var scopeOf = function(fn){ return fn && funcs[fn] ? funcs[fn].vars : null; };
		var lookup = function(fn){
			return function(name){
				var scope = scopeOf(fn);
				if(scope && scope[name] !== undefined) return scope[name];
				return globals[name];
			};
		};
		var setVar = function(fn, name, t, local){
			var scope = local ? scopeOf(fn) : (scopeOf(fn) && scopeOf(fn)[name] !== undefined ? scopeOf(fn) : globals);
			if(!scope) scope = globals;
			if(t === undefined) return;
			var old = scope[name];
			if(old === undefined || old === 'null' || (old === 'int' && t === 'double')) scope[name] = t;
		};

		for(var pass = 0; pass < 4; pass++){
			scan(lines, function(kind, info, fn){
				var look = lookup(fn);
				if(kind === 'function'){
					var f = funcs[info.name] = funcs[info.name] || {params: info.params, vars: {}, ret: undefined, returnsValue: false, evidence: {}};
					info.params.forEach(function(p){ if(f.vars[p] === undefined && f.evidence[p]) f.vars[p] = f.evidence[p]; });
				}
				else if(kind === 'var'){
					info.forEach(function(d){
						var t = d.expr === '' ? undefined : typeOf(d.expr, look, funcs);
						if(t === 'array') t = lookup(fn)(d.name) && lookup(fn)(d.name).indexOf('arr:') === 0 ? lookup(fn)(d.name) : 'arr:?';
						setVar(fn, d.name, t, true);
					});
				}
				else if(kind === 'assign'){
					var ta = typeOf(info.expr, look, funcs);
					if(ta !== 'array') setVar(fn, info.name, ta, false);
				}
				else if(kind === 'cell'){
					var te = typeOf(info.expr, look, funcs);
					var holder = scopeOf(fn) && scopeOf(fn)[info.name] !== undefined ? scopeOf(fn) : globals;
					// only a value decides the kind: null is written into both kinds (an empty cell)
					if(te && te !== 'null' && (holder[info.name] === 'arr:?' || holder[info.name] === undefined)) holder[info.name] = 'arr:' + (te === 'Node*' ? 'Node*' : te);
					else if(te === 'null') nullCells[info.name] = true;
				}
				else if(kind === 'return' && fn){
					var tr = typeOf(info, look, funcs), f2 = funcs[fn];
					f2.returnsValue = true;
					if(tr !== undefined && (f2.ret === undefined || f2.ret === 'null')) f2.ret = tr;
				}
				if(kind === 'code' || kind === 'cond'){
					var text = typeof info === 'string' ? info : '';
					// a parameter used as a node is a pointer
					if(fn && funcs[fn]) funcs[fn].params.forEach(function(p){
						var used = new RegExp('(^|[^' + ID + '.])' + p + '\\s*(\\.|[!=]=\\s*null)').test(text) ||
						           new RegExp('null\\s*[!=]=\\s*' + p + '(?![' + ID + '])').test(text);
						if(used) funcs[fn].vars[p] = 'Node*';
					});
					// arguments of calls tell the types of parameters
					var callRe = new RegExp('(' + NAME + ')\\s*\\(', 'g'), m;
					while((m = callRe.exec(text))){
						var g = funcs[m[1]];
						if(!g) continue;
						var end = closing(text, m.index + m[0].length - 1);
						if(end < 0) continue;
						var args = splitTop(text.slice(m.index + m[0].length, end), ',');
						args.forEach(function(a, i){
							var p = g.params[i];
							if(!p || !a.trim()) return;
							var t = typeOf(a, look, funcs);
							if(t && t !== 'array' && (g.vars[p] === undefined || g.vars[p] === 'null')) g.vars[p] = t;
						});
					}
				}
			});
		}
		// an array that only ever gets null holds nodes (an empty hash table); otherwise numbers
		[globals].concat(Object.keys(funcs).map(function(n){ return funcs[n].vars; })).forEach(function(scope){
			Object.keys(scope).forEach(function(name){
				if(scope[name] === 'arr:?') scope[name] = nullCells[name] ? 'arr:Node*' : 'arr:int';
			});
		});
		Object.keys(funcs).forEach(function(name){
			var f = funcs[name];
			if(!f.returnsValue) f.ret = 'void';
			else if(f.ret === undefined || f.ret === 'null') f.ret = 'Node*';
			f.params.forEach(function(p){
				if(f.vars[p] === undefined) f.vars[p] = 'int';
				else if(f.vars[p] === 'null') f.vars[p] = 'Node*';
			});
		});
		return {globals: globals, funcs: funcs};
	}

	function cppType(t){ return langType(t, 'cpp'); }

	function langType(t, lang){
		if(t === 'Node*' || t === 'null') return lang === 'java' ? 'Node' : 'Node*';
		if(t === 'bool') return lang === 'java' ? 'boolean' : 'bool';
		if(t === 'double') return t;
		return 'int';
	}

	// ---------- Düğüm -> C++ or Java (for showing the examples) ----------

	function toCpp(blocks){ return toLang(blocks, 'cpp'); }
	function toJava(blocks){ return toLang(blocks, 'java'); }

	function toLang(blocks, lang){
		var java = lang === 'java';
		var exprCpp = function(s){ return exprIn(s, lang); };
		var cppType = function(t){ return langType(t, lang); };
		var lines = [], starts = [];
		blocks.forEach(function(code){
			starts.push(lines.length);
			lines.push.apply(lines, code.split('\n'));
		});
		var types = inferTypes(lines);
		var declared = {}, fnNow = null, depth = 0, bodyDepth = -1;

		var typeIn = function(name){
			var f = fnNow && types.funcs[fnNow];
			if(f && f.vars[name] !== undefined) return f.vars[name];
			return types.globals[name];
		};
		var lookup = function(name){ return typeIn(name); };

		function declaration(list, forInit){
			var decls = declarators(list);
			var parts = decls.map(function(d){
				var t = typeIn(d.name);
				var arr = /^new\s+(Array|Dizi)\s*\(([\s\S]*)\)\s*$/.exec(d.expr);
				if(arr){
					var elem = t && t.indexOf('arr:') === 0 && t !== 'arr:?' ? t.slice(4) : 'int';
					var sizes = splitTop(arr[2], ',').map(function(x){ return '[' + x.trim() + ']'; }).join(''); // [3] or, for a matrix, [3][4]
					var dims = sizes.split('][').length > 1 ? '[][]' : '[]';
					if(java) return {type: cppType(elem) + dims, text: d.name + ' = new ' + cppType(elem) + sizes};
					return {type: cppType(elem), text: d.name + sizes};
				}
				if(t === undefined) t = typeOf(d.expr, lookup, types.funcs);
				return {type: cppType(t), text: d.name + (d.expr !== '' ? ' = ' + exprCpp(d.expr) : '')};
			});
			decls.forEach(function(d){ declared[(fnNow || '') + ':' + d.name] = true; });
			var same = parts.every(function(p){ return p.type === parts[0].type; });
			if(same) return parts[0].type + ' ' + parts.map(function(p){ return p.text; }).join(', ');
			return parts.map(function(p){ return p.type + ' ' + p.text; }).join(forInit ? ', ' : '; ');
		}

		function printStatement(code){
			var items;
			try { items = window.dsvParser.parse(code + '\n')[0].list; } catch(e) { items = null; }
			if(java){ // "+" joins text in Java: a sum inside goes in parentheses
				if(!items) return 'System.out.println(' + exprCpp(code.replace(/^print\s+/, '')) + ')';
				return 'System.out.println(' + items.map(function(it){
					if(it.subtype === 'string') return JSON.stringify(it.text);
					var e = exprCpp(it.text.trim());
					return items.length > 1 && (splitTop(e, '+').length > 1 || splitTop(e, '-').length > 1) ? '(' + e + ')' : e;
				}).join(' + ') + ')';
			}
			if(!items) return 'cout << ' + exprCpp(code.replace(/^print\s+/, '')) + ' << endl';
			return 'cout << ' + items.map(function(it){
				return it.subtype === 'string' ? JSON.stringify(it.text) : exprCpp(it.text.trim());
			}).join(' << ') + ' << endl';
		}

		function statement(code){
			var m;
			if(!code) return '';
			if((m = /^var\s+([\s\S]*)$/.exec(code))) return declaration(m[1]) + ';';
			if(/^print\b/.test(code)) return printStatement(code) + ';';
			if((m = /^(delete|free)\s+([\s\S]*)$/.exec(code))) // Java has no delete: say so in a comment
				return java ? '// delete ' + m[2] + ': ' + (window.dsv ? window.dsv.t('javaNoDelete') : 'not needed in Java') : 'delete ' + exprCpp(m[2]) + ';';
			if((m = /^return\b\s*([\s\S]*)$/.exec(code))) return 'return' + (m[1] ? ' ' + exprCpp(m[1]) : '') + ';';
			if(/^(break|continue)$/.test(code)) return code + ';';
			// t[k] = null in an array of numbers: C++ has no null int, the empty cell is 0
			if((m = new RegExp('^(' + NAME + ')\\s*\\[([\\s\\S]*?)\\]\\s*=(?!=)\\s*null\\s*$').exec(code)) && typeIn(m[1]) === 'arr:int')
				return m[1] + '[' + exprCpp(m[2]) + '] = 0;';
			// x = ... at the top level without var: the first one declares it in C++
			if((m = new RegExp('^(' + NAME + ')\\s*=(?!=)\\s*([\\s\\S]*)$').exec(code)) && !fnNow && !declared[':' + m[1]]){
				declared[':' + m[1]] = true;
				var t = typeIn(m[1]);
				if(t !== undefined && t.indexOf('arr:') !== 0) return cppType(t) + ' ' + m[1] + ' = ' + exprCpp(m[2]) + ';';
			}
			return exprCpp(code) + ';';
		}

		function line(text){
			var indent = /^\s*/.exec(text)[0];
			var split = splitComment(text.slice(indent.length));
			var code = normalizeKeywords(trimRight(split[0])).trim(), comment = split[1];
			var out;
			var header = new RegExp('^function\\s+(' + NAME + ')\\s*\\(([^)]*)\\)\\s*([\\s\\S]*)$').exec(code);
			if(code === '' ){
				out = '';
			}
			else if(header){
				fnNow = header[1];
				bodyDepth = depth;
				var f = types.funcs[fnNow];
				var params = header[2].split(',').map(function(p){ return p.trim(); }).filter(Boolean);
				out = (java ? 'static ' : '') + (f.ret === 'void' ? 'void' : cppType(f.ret)) + ' ' + fnNow + '(' +
				      params.map(function(p){ return cppType(f.vars[p]) + ' ' + p; }).join(', ') + ')' + (header[3] ? ' ' + header[3] : '');
			}
			else if(/^[{}]+$/.test(code)){
				out = code;
			}
			else {
				var m = /^(if|while|for)\s*\(/.exec(code), rest = code, prefix = '';
				if(/^else\b/.test(rest)){
					prefix = 'else ';
					rest = rest.replace(/^else\s*/, '');
					m = /^(if|while|for)\s*\(/.exec(rest);
				}
				if(m){
					var end = closing(rest, rest.indexOf('('));
					var inside = rest.slice(rest.indexOf('(') + 1, end), after = rest.slice(end + 1).trim();
					if(m[1] === 'for'){
						var parts = splitTop(inside, ';');
						var init = /^\s*var\s/.test(parts[0]) ? declaration(parts[0].replace(/^\s*var\s+/, ''), true) : exprCpp(parts[0].trim());
						inside = init + '; ' + exprCpp((parts[1] || '').trim()) + '; ' + exprCpp((parts[2] || '').trim());
					}
					else inside = exprCpp(inside.trim());
					out = prefix + m[1] + '(' + inside + ')' + (after && after !== '{' ? ' ' + statement(after) : after ? ' ' + after : '');
				}
				else if(prefix)
					out = 'else' + (rest && rest !== '{' ? ' ' + statement(rest) : rest ? ' ' + rest : '');
				else
					out = statement(rest);
			}
			var opens = (code.match(/\{/g) || []).length, closes = (code.match(/\}/g) || []).length;
			depth += opens - closes;
			if(fnNow && !header && depth <= bodyDepth && closes){ fnNow = null; bodyDepth = -1; }

			out = indent + out;
			if(comment){
				var column = indent.length + split[0].length; // keep comments where they were, if they still fit
				var gap = Math.max(1, column - out.length);
				out = (out.trim() ? out + new Array(gap + 1).join(' ') : indent) + comment;
			}
			return out;
		}

		var outLines = lines.map(line);
		return blocks.map(function(code, i){
			var end = i + 1 < starts.length ? starts[i + 1] : outLines.length;
			return outLines.slice(starts[i], end).join('\n');
		});
	}

	// ---------- integer division (C++ and Java) ----------
	//
	// In C++ and Java 7 / 2 is 3 when both sides are integers (cut toward zero: -7 / 2 is -3);
	// in the engine (JavaScript) it is 3.5. The types of the C++ / Java source are collected
	// (variables, parameters, int arrays, the return types of functions, the data and height
	// fields of nodes), and a / b with two integer sides becomes tamBöl(a, b) in the Düğüm.

	function typeKind(type, mark){
		if(mark && mark.indexOf('*') >= 0) return 'ptr';
		if(/^(int|long|short|char)$/.test(type)) return 'int';
		if(/^(double|float)$/.test(type)) return 'double';
		return 'other';
	}

	function collectTypes(lines){
		var types = {globals: {}, funcs: {}}, fn = null, depth = 0, fnDepth = -1;
		var HEADER = new RegExp('^\\s*(?:(?:public|private|protected|static|final|inline)\\s+)*(void|int|long|short|char|double|float|bool|boolean|Node)\\s*(\\*+|\\[\\s*\\])?\\s*(' + NAME + ')\\s*\\(');
		lines.forEach(function(line){
			var code = splitComment(line)[0].replace(/"(?:[^"\\]|\\.)*"/g, '""');
			var header = HEADER.exec(code);
			if(header && !/=/.test(code.slice(0, code.indexOf('(')))){
				fn = header[3];
				fnDepth = depth;
				types.funcs[fn] = {ret: typeKind(header[1], header[2]), vars: {}};
			}
			var declRe = /\b(int|long|short|char|double|float|bool|boolean|Node|auto)\b\s*(\*+|\[\s*\])?\s*/g, m;
			while((m = declRe.exec(code))){
				var rest = code.slice(m.index + m[0].length).split(/[;{]/)[0];
				splitTop(rest, ',').forEach(function(d){
					d = d.trim().replace(/^\*+\s*/, '');
					var name = new RegExp('^(' + NAME + ')\\s*(\\[|\\(|=|,|\\)|$)').exec(d);
					if(!name || name[2] === '(') return; // a function name, or no declaration
					var scope = fn ? types.funcs[fn].vars : types.globals;
					var array = name[2] === '[' || (m[2] && m[2].indexOf('[') >= 0);
					scope[name[1]] = array ? 'arr:' + typeKind(m[1]) : typeKind(m[1], m[2]);
				});
			}
			var opens = (code.match(/\{/g) || []).length, closes = (code.match(/\}/g) || []).length;
			depth += opens - closes;
			if(fn && !header && depth <= fnDepth && closes){ fn = null; fnDepth = -1; }
		});
		return types;
	}

	// is this (Düğüm) expression an integer, given the collected types?
	function isIntExpr(expr, fn, types){
		var s = expr.replace(/"(?:[^"\\]|\\.)*"/g, '""');
		if(/""/.test(s) || new RegExp('(^|[^' + ID + '.])\\d+\\.\\d*').test(s)) return false; // text, or a number like 2.0
		var lookup = function(name){
			var f = fn && types.funcs[fn];
			if(f && f.vars[name] !== undefined) return f.vars[name];
			return types.globals[name];
		};
		var re = new RegExp('(\\.?)\\s*([A-Za-z_şğçöüıŞĞÇÖÜİ][' + ID + ']*|\\d+)\\s*([\\(\\[.]?)', 'g'), m, any = false;
		while((m = re.exec(s))){
			any = true;
			var word = m[2];
			if(/^\d+$/.test(word)) continue;
			if(m[3] === '.'){ re.lastIndex--; continue; } // p.data: the last field decides, not p
			if(m[1] === '.'){ if(/^(data|height|length)$/.test(word)) continue; return false; }
			if(m[3] === '('){
				if(/^(tamBöl|taban|tavan|mutlak)$/.test(word)) continue;
				if(types.funcs[word] && types.funcs[word].ret === 'int') continue;
				return false;
			}
			if(m[3] === '['){ if(lookup(word) === 'arr:int') continue; return false; }
			if(lookup(word) !== 'int') return false;
		}
		return any;
	}

	function isIdChar(ch){ return !!ch && new RegExp('[' + ID + '.]').test(ch); }

	// the bracket that opens the one closing at `close` (going left)
	function openingBack(s, close){
		var depth = 0;
		for(var i = close; i >= 0; i--){
			var ch = s.charAt(i);
			if(ch === ')' || ch === ']') depth++;
			else if(ch === '(' || ch === '['){ depth--; if(depth === 0) return i; }
		}
		return 0;
	}

	// the start of the primary (name.field[i](args)...) that ends at `end`
	function primaryStart(s, end){
		var k = end;
		while(k >= 0){
			var ch = s.charAt(k);
			if(ch === ')' || ch === ']'){ k = openingBack(s, k) - 1; continue; }
			if(isIdChar(ch)){ k--; continue; }
			break;
		}
		return k + 1;
	}

	// the end (exclusive) of the primary that starts at `start`
	function primaryEnd(s, start){
		var k = start;
		if(s.charAt(k) === '-' || s.charAt(k) === '!') k++;
		while(k < s.length){
			var ch = s.charAt(k);
			if(ch === '(' || ch === '['){ var c = closing(s, k); if(c < 0) return s.length; k = c + 1; continue; }
			if(isIdChar(ch)){ k++; continue; }
			break;
		}
		return k;
	}

	// the / operators of a line, outside strings, from the right
	function lastDivision(s, before){
		var inString = false, found = -1;
		for(var i = 0; i < before; i++){
			var ch = s.charAt(i);
			if(ch === '"' && s.charAt(i - 1) !== '\\') inString = !inString;
			else if(!inString && ch === '/' && s.charAt(i + 1) !== '=' && s.charAt(i + 1) !== '/' && s.charAt(i - 1) !== '/') found = i;
		}
		return found;
	}

	function integerDivision(code, fn, types){
		var i = code.length;
		while((i = lastDivision(code, i)) >= 0){
			// left: a chain of * / % over primaries (left to right, so a * b / c is (a * b) / c)
			var k = i - 1;
			while(code.charAt(k) === ' ') k--;
			var ls = primaryStart(code, k);
			for(;;){
				var j = ls - 1;
				while(code.charAt(j) === ' ') j--;
				if('*/%'.indexOf(code.charAt(j)) >= 0 && code.charAt(j) && code.charAt(j - 1) !== '/'){
					var j2 = j - 1;
					while(code.charAt(j2) === ' ') j2--;
					var start = primaryStart(code, j2);
					if(start > j2) break;
					ls = start;
				}
				else break;
			}
			// a unary minus belongs to the left side: -7 / 2 is (-7) / 2
			var u = ls - 1;
			while(code.charAt(u) === ' ') u--;
			if(code.charAt(u) === '-'){
				var v = u - 1;
				while(code.charAt(v) === ' ') v--;
				if(v < 0 || '=(,+-*/%<>!&|?:'.indexOf(code.charAt(v)) >= 0 || /\b(return|print)$/.test(code.slice(0, v + 1)))
					ls = u;
			}
			var rs = i + 1;
			while(code.charAt(rs) === ' ') rs++;
			var re = primaryEnd(code, rs);
			var left = code.slice(ls, i).trim(), right = code.slice(rs, re).trim();
			if(left && right && isIntExpr(left, fn, types) && isIntExpr(right, fn, types)){
				code = code.slice(0, ls) + 'tamBöl(' + left + ', ' + right + ')' + code.slice(re);
				i = ls + 'tamBöl('.length + left.length; // go on with the / inside the left side
			}
		}
		return code;
	}

	// tamBöl(a, b) back to a / b, for showing a statement
	function showDivision(text){
		var at;
		while((at = text.indexOf('tamBöl(')) >= 0){
			var end = closing(text, at + 'tamBöl'.length);
			if(end < 0) break;
			var args = splitTop(text.slice(at + 'tamBöl('.length, end), ',');
			text = text.slice(0, at) + args[0].trim() + ' / ' + (args[1] || '').trim() + text.slice(end + 1);
		}
		return text;
	}

	// ---------- C++ -> Düğüm (before running) ----------

	var DECL = new RegExp('^(\\s*)(?:const\\s+|unsigned\\s+|static\\s+)*(' + TYPE + ')\\s*(\\**)\\s*(' + NAME + '[\\s\\S]*)$');
	var FUNC = new RegExp('^(\\s*)(?:static\\s+|inline\\s+)*(' + TYPE + ')\\s*\\**\\s*(' + NAME + ')\\s*\\(([^()]*)\\)\\s*([\\s\\S]*)$');

	function fromCpp(text){
		var inStruct = false, hasMain = false;
		var lines = text.split('\n'), types = collectTypes(lines), fn = null, depth = 0, fnDepth = -1;
		var out = lines.map(function(line){
			var split = splitComment(line), code = split[0], comment = split[1];
			var opens = (code.match(/\{/g) || []).length, closes = (code.match(/\}/g) || []).length, before = depth;
			depth += opens - closes;
			var finish = function(c){ // the function the line is in, then integer division
				var header = new RegExp('^\\s*function\\s+(' + NAME + ')\\s*\\(').exec(c);
				if(header){ fn = header[1]; fnDepth = before; }
				c = integerDivision(c, fn, types);
				if(fn && !header && depth <= fnDepth && closes){ fn = null; fnDepth = -1; }
				return c;
			};
			// lines with nothing to run become empty comments (a blank first line is not a statement)
			if(inStruct){
				if(/\}\s*;/.test(code)) inStruct = false;
				return '//';
			}
			if(/^\s*(struct|class)\s+Node\b/.test(code)){
				inStruct = !/\}\s*;/.test(code);
				return '//';
			}
			if(/^\s*#\s*include\b/.test(code) || /^\s*using\s+namespace\b/.test(code))
				return '//';

			code = outsideStrings(code, function(part){
				return part.replace(/->/g, '.').replace(/\bnullptr\b|\bNULL\b/g, 'null').replace(/\bstd::/g, '')
				           .replace(/\bfloor\s*\(/g, 'taban(').replace(/\bceil\s*\(/g, 'tavan(')
				           .replace(/\bsqrt\s*\(/g, 'karekök(').replace(/\babs\s*\(/g, 'mutlak(');
			});
			code = trimRight(code).replace(/;\s*$/, '');

			// int c = f(); bool e = g(); -> one Düğüm declaration list
			var pieces = /^\s*(?:\}\s*)?(?:else\s+)?for\s*\(/.test(code) ? [code] : splitTop(code, ';');
			if(pieces.length > 1){
				var indent = /^\s*/.exec(code)[0];
				var converted = pieces.map(function(piece){ return convertStatement(indent + piece.trim()); });
				if(converted.every(function(c){ return /^\s*var\s/.test(c); }))
					code = indent + 'var ' + converted.map(function(c){ return c.replace(/^\s*var\s+/, ''); }).join(', ');
				code = finish(code);
				return code + (comment ? ' ' + comment.replace(/^\s*/, '') : '');
			}
			code = finish(convertStatement(code));
			return code + (comment ? (code.trim() ? ' ' : '') + comment.replace(/^\s*/, '') : '');
		});
		var result = out.join('\n');
		if(hasMain) result += '\nmain()';
		return result;

		function convertStatement(code){
			var m;
			if((m = /^(\s*)cout\s*<<\s*([\s\S]*)$/.exec(code))){
				var parts = splitTop(m[2], '<<').map(function(p){ return p.trim(); })
					.filter(function(p){ return p && p !== 'endl' && p !== '"\\n"'; });
				code = m[1] + 'print ' + (parts.length ? parts.join(' + "" + ') : '""');
			}
			else if((m = new RegExp('^(\\s*)(\\+\\+|--)\\s*(' + NAME + ')\\s*$').exec(code)))
				code = m[1] + m[3] + m[2];
			else if((m = FUNC.exec(code)) && !/=/.test(code.slice(0, code.indexOf('(')))){
				var params = m[4].trim() === 'void' ? [] : m[4].split(',').map(function(p){
					var names = p.match(new RegExp(NAME, 'g'));
					return names ? names[names.length - 1] : '';
				}).filter(function(p){ return p && !new RegExp('^' + TYPE + '$').test(p); });
				if(m[3] === 'main') hasMain = true;
				code = m[1] + 'function ' + m[3] + '(' + params.join(', ') + ')' + (m[5] ? ' ' + m[5] : '');
			}
			else if((m = /^(\s*(?:\}\s*)?(?:else\s+)?for\s*\(\s*)(?:const\s+)?(?:int|long|double|float|bool|auto|Node\s*\*)\s*\**\s*/.exec(code)))
				code = m[1] + 'var ' + code.slice(m[0].length);
			else if((m = DECL.exec(code)) && /^[A-Za-z_şğçöüıŞĞÇÖÜİ][A-Za-z0-9_şğçöüıŞĞÇÖÜİ]*\s*([=,\[]|$)/.test(m[4])){
				var pointer = m[2] === 'Node' || m[3].length > 0;
				var decls = splitTop(m[4], ',').map(function(d){
					d = d.trim().replace(/^\*+\s*/, '');
					var arr = new RegExp('^(' + NAME + ')\\s*\\[([^\\]]*)\\](?:\\s*\\[([^\\]]*)\\])?\\s*$').exec(d);
					if(arr) return arr[1] + ' = new Array(' + arr[2].trim() + (arr[3] !== undefined ? ', ' + arr[3].trim() : '') + ')';   // int g[3][4]: a matrix
					if(/=/.test(d)) return d;
					return d + (pointer ? ' = null' : ' = 0');
				});
				code = m[1] + 'var ' + decls.join(', ');
			}
			return code;
		}
	}

	// ---------- Java -> Düğüm (before running) ----------

	var JTYPE = '(?:void|int|long|short|double|float|boolean|char|Node)';
	var JMOD = '(?:(?:public|private|protected|static|final)\\s+)*';
	var JDECL = new RegExp('^(\\s*)' + JMOD + '(' + JTYPE + ')\\s*((?:\\[\\s*\\]){0,2})\\s*(' + NAME + '[\\s\\S]*)$');
	var JFUNC = new RegExp('^(\\s*)' + JMOD + '(' + JTYPE + ')\\s*(?:\\[\\s*\\])?\\s*(' + NAME + ')\\s*\\(([^()]*)\\)\\s*([\\s\\S]*)$');

	function fromJava(text){
		var inNodeClass = false, hasMain = false, depth = 0, wrappers = [];
		var lines = text.split('\n'), types = collectTypes(lines), fn = null, fnDepth = -1;
		var out = lines.map(function(line){
			var split = splitComment(line), code = split[0], comment = split[1];
			var opens = (code.match(/\{/g) || []).length, closes = (code.match(/\}/g) || []).length;
			var before = depth;
			depth += opens - closes;
			var finish = function(c){ // the function the line is in, then integer division
				var header = new RegExp('^\\s*function\\s+(' + NAME + ')\\s*\\(').exec(c);
				if(header){ fn = header[1]; fnDepth = before; }
				c = integerDivision(c, fn, types);
				if(fn && !header && depth <= fnDepth && closes){ fn = null; fnDepth = -1; }
				return c;
			};
			// class Node { ... } is built in; a class around the methods (public class Main { ... }) is left out
			if(inNodeClass){
				if(depth <= inNodeClass - 1){ inNodeClass = false; }
				return '//';
			}
			if(new RegExp('^\\s*' + JMOD + 'class\\s+Node\\b').test(code)){
				if(depth > before) inNodeClass = depth;
				return '//';
			}
			if(new RegExp('^\\s*' + JMOD + 'class\\s+' + NAME).test(code)){
				if(depth > before) wrappers.push(depth);
				return '//';
			}
			if(/^\s*\}\s*$/.test(code) && wrappers.length && before === wrappers[wrappers.length - 1]){
				wrappers.pop();
				return '//';
			}
			if(/^\s*(import|package)\b/.test(code))
				return '//';

			code = outsideStrings(code, function(part){
				return part.replace(/\bMath\.floor\s*\(/g, 'taban(').replace(/\bMath\.ceil\s*\(/g, 'tavan(')
				           .replace(/\bMath\.sqrt\s*\(/g, 'karekök(').replace(/\bMath\.abs\s*\(/g, 'mutlak(')
				           .replace(/\bnew\s+(?:Node|int|long|double|boolean)\s*\[([^\]]*)\]\s*\[([^\]]*)\]/g, 'new Array($1, $2)')   // new int[3][4]: a matrix
				           .replace(/\bnew\s+(?:Node|int|long|double|boolean)\s*\[([^\]]*)\]/g, 'new Array($1)');
			});
			code = trimRight(code).replace(/;\s*$/, '');

			var pieces = /^\s*(?:\}\s*)?(?:else\s+)?for\s*\(/.test(code) ? [code] : splitTop(code, ';');
			if(pieces.length > 1){
				var indent = /^\s*/.exec(code)[0];
				var converted = pieces.map(function(piece){ return convertStatement(indent + piece.trim()); });
				if(converted.every(function(c){ return /^\s*var\s/.test(c); }))
					code = indent + 'var ' + converted.map(function(c){ return c.replace(/^\s*var\s+/, ''); }).join(', ');
				code = finish(code);
				return code + (comment ? ' ' + comment.replace(/^\s*/, '') : '');
			}
			code = finish(convertStatement(code));
			return code + (comment ? (code.trim() ? ' ' : '') + comment.replace(/^\s*/, '') : '');
		});
		var result = out.join('\n');
		if(hasMain) result += '\nmain()';
		return result;

		function convertStatement(code){
			var m;
			if((m = /^(\s*)System\.out\.print(?:ln)?\s*\(([\s\S]*)\)\s*$/.exec(code)))
				code = m[1] + 'print ' + (m[2].trim() ? m[2].trim() : '""');
			else if((m = new RegExp('^(\\s*)(\\+\\+|--)\\s*(' + NAME + ')\\s*$').exec(code)))
				code = m[1] + m[3] + m[2];
			else if((m = JFUNC.exec(code)) && !/=/.test(code.slice(0, code.indexOf('(')))){
				var params = m[4].split(',').map(function(p){
					var names = p.match(new RegExp(NAME, 'g'));
					return names ? names[names.length - 1] : '';
				}).filter(function(p){ return p && !new RegExp('^' + JTYPE + '$').test(p) && p !== 'String'; });
				if(m[3] === 'main'){ hasMain = true; params = []; }
				code = m[1] + 'function ' + m[3] + '(' + params.join(', ') + ')' + (m[5] ? ' ' + m[5] : '');
			}
			else if((m = /^(\s*(?:\}\s*)?(?:else\s+)?for\s*\(\s*)(?:final\s+)?(?:int|long|double|float|boolean|Node)\s*/.exec(code)))
				code = m[1] + 'var ' + code.slice(m[0].length);
			else if((m = JDECL.exec(code)) && /^[A-Za-z_şğçöüıŞĞÇÖÜİ][A-Za-z0-9_şğçöüıŞĞÇÖÜİ]*\s*(?:\[\s*\]\s*){0,2}([=,]|$)/.test(m[4])){
				var reference = m[2] === 'Node' || m[3].length > 0;
				var decls = splitTop(m[4], ',').map(function(d){
					d = d.trim().replace(new RegExp('^(' + NAME + ')\\s*\\[\\s*\\]'), '$1'); // int s[] = ...
					if(/=/.test(d)) return d;
					return d + (reference ? ' = null' : ' = 0');
				});
				code = m[1] + 'var ' + decls.join(', ');
			}
			return code;
		}
	}

	// a piece of Düğüm in the narration, shown the way of the chosen language (p->next, nullptr)
	function displayCpp(text){ return exprCpp(showDivision(text)).replace(/^var\s+/, ''); }
	function displayJava(text){ return exprIn(showDivision(text), 'java').replace(/^var\s+/, ''); }

	// ---------- Düğüm with Turkish words ----------
	//
	// The same language with Turkish keywords and field names: değişken (var), eğer (if),
	// değilse (else), yinele (while), için (for), fonksiyon, döndür (return), kır (break),
	// devam (continue), yaz (print), boş (null), doğru / yanlış, yeni Düğüm(...) (new Node),
	// yeni Dizi(n) (new Array), sil (delete), ve / veya / değil (and / or / not), and the fields
	// .veri, .sonraki, .önceki, .sol, .sağ, .yükseklik, .ağırlık, .seçili. It is translated word by word in both
	// directions (outside strings and comments), so every line keeps its number.

	var TR_WORDS = {'var': 'değişken', 'if': 'eğer', 'else': 'değilse', 'while': 'yinele', 'for': 'için',
	                'function': 'fonksiyon', 'return': 'döndür', 'break': 'kır', 'continue': 'devam',
	                'print': 'yaz', 'null': 'boş', 'true': 'doğru', 'false': 'yanlış', 'new': 'yeni',
	                'Node': 'Düğüm', 'Array': 'Dizi', 'delete': 'sil', 'free': 'sil',
	                'and': 've', 'or': 'veya', 'not': 'değil'};
	var TR_FIELDS = {'data': 'veri', 'next': 'sonraki', 'prev': 'önceki', 'left': 'sol', 'right': 'sağ', 'height': 'yükseklik', 'weight': 'ağırlık', 'chosen': 'seçili'};
	function inverse(map){
		var out = {};
		Object.keys(map).forEach(function(k){ if(!(map[k] in out)) out[map[k]] = k; });
		return out;
	}
	var TR_WORDS_BACK = inverse(TR_WORDS), TR_FIELDS_BACK = inverse(TR_FIELDS);
	TR_WORDS_BACK['sil'] = 'delete';
	var hasOwn = Object.prototype.hasOwnProperty;

	// the words of a piece of code (no strings) through the maps; numbers like 2.5 stay as they are
	function mapWords(part, words, fields){
		return part.replace(new RegExp('\\d+(?:\\.\\d+)?|(\\.?)(' + NAME + ')', 'g'), function(m, dot, word){
			if(word === undefined) return m;
			if(dot) return hasOwn.call(fields, word) ? '.' + fields[word] : m;
			return hasOwn.call(words, word) ? words[word] : m;
		});
	}

	function lineTr(line, toTurkish){
		var parts = splitComment(line);
		var code = outsideStrings(parts[0], function(part){
			if(toTurkish)
				part = part.replace(/\s*&&\s*/g, ' ve ').replace(/\s*\|\|\s*/g, ' veya ');
			return toTurkish ? mapWords(part, TR_WORDS, TR_FIELDS) : mapWords(part, TR_WORDS_BACK, TR_FIELDS_BACK);
		});
		return code + parts[1];
	}

	function toTurkish(blocks){
		return blocks.map(function(block){
			return block.split('\n').map(function(line){ return lineTr(line, true); }).join('\n');
		});
	}
	function fromTurkish(text){
		return text.split('\n').map(function(line){ return lineTr(line, false); }).join('\n');
	}
	function displayTurkish(text){ return lineTr(text, true); }
	function fieldTurkish(name){ return hasOwn.call(TR_FIELDS, name) ? TR_FIELDS[name] : name; }

	// a CodeMirror mode for it: the Turkish keywords coloured as keywords
	var TR_KEYWORDS = ['değişken', 'eğer', 'değilse', 'yinele', 'için', 'fonksiyon', 'döndür', 'kır', 'devam', 'yaz', 'yeni', 'sil', 've', 'veya', 'değil'];
	var TR_ATOMS = ['boş', 'doğru', 'yanlış'];
	function defineModes(CM){
		if(!CM || CM.modes['dugum-tr'])
			return;
		var word = new RegExp('^' + NAME);
		CM.defineMode('dugum-tr', function(){
			return {
				startState: function(){ return {afterDot: false}; },
				token: function(stream, state){
					if(stream.eatSpace()) return null;
					var afterDot = state.afterDot;
					state.afterDot = false;
					if(stream.match('//')){ stream.skipToEnd(); return 'comment'; }
					if(stream.match(/^"(?:[^"\\]|\\.)*"?/)) return 'string';
					if(stream.match(/^\d+(?:\.\d+)?/)) return 'number';
					var w = stream.match(word);
					if(w){
						if(afterDot) return 'property';
						if(TR_KEYWORDS.indexOf(w[0]) >= 0) return 'keyword';
						if(TR_ATOMS.indexOf(w[0]) >= 0) return 'atom';
						if(w[0] === 'Düğüm' || w[0] === 'Dizi') return 'variable-3';
						return 'variable';
					}
					var ch = stream.next();
					if(ch === '.') state.afterDot = true;
					return /[+\-*\/%=<>!&|]/.test(ch) ? 'operator' : null;
				}
			};
		});
	}

	var LANGS = {
		turkce: {name: 'Türkçe', to: toTurkish, from: fromTurkish, display: displayTurkish, field: fieldTurkish, mode: 'dugum-tr'},
		cpp: {name: 'C++', to: toCpp, from: fromCpp, display: displayCpp, mode: 'text/x-c++src'},
		java: {name: 'Java', to: toJava, from: fromJava, display: displayJava, mode: 'text/x-java'}
	};

	window.dsvCode = {toTurkish: toTurkish, fromTurkish: fromTurkish, defineModes: defineModes, toCpp: toCpp, fromCpp: fromCpp, displayCpp: displayCpp, toJava: toJava, fromJava: fromJava,
	                  displayJava: displayJava, inferTypes: inferTypes, langs: LANGS, integerDivision: integerDivision, collectTypes: collectTypes};
})();
