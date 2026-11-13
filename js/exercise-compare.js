/*
 * Exercises: draws the expected value next to the student's value, with the differences marked
 * (js/exercise.js calls it under a failed expectation and in the attempt history).
 *
 *   dsvCompare.shape(expression, expected)          -> 'list' | 'grid' | 'array' | 'value'
 *   dsvCompare.draw(shape, expected, actual, nonList) -> a div.ex-compare, or null when there is nothing to draw
 *
 * A list comes as walk()'s text ("4>3>2>1", "" for an empty list). Items are compared by position:
 * a different value is .diff on both sides, an item only the student has is .extra, an item only the
 * expected value has is .missing (with a dashed place on the student's side). Plain HTML: it never
 * touches the page's own drawing.
 */
(function(){
	var MAX_ITEMS = 50, MAX_GRID = 12;
	function t(key){ return window.dsv ? window.dsv.t(key) : key; }
	function mk(tag, cls, text){
		var e = document.createElement(tag);
		if(cls) e.className = cls;
		if(text !== undefined) e.textContent = text;
		return e;
	}
	function json(v){
		try { return JSON.stringify(v === undefined ? null : v); } catch(e) { return String(v); }
	}
	function same(a, b){ return json(a) === json(b); }
	function cellText(v){ return typeof v === 'string' ? v : json(v); }

	function shape(expression, expected){
		if(/^\s*(walk|back)\s*\(/.test(String(expression))) return 'list';
		if(Array.isArray(expected) && expected.length && expected.every(Array.isArray)) return 'grid';
		if(Array.isArray(expected)) return 'array';
		return 'value';
	}

	function listItems(text){ return text === '' ? [] : String(text).split('>'); }

	// one side's items of a sequence: expected (e) against actual (a), from the point of view of `side`
	function sequence(box, e, a, side, joiner){
		var mine = side === 'expected' ? e : a, other = side === 'expected' ? a : e;
		var n = Math.max(e.length, a.length), row = mk('div', 'ex-cmp-row');
		if(!mine.length && joiner)
			row.appendChild(mk('span', 'ex-cmp-empty', t('exCmpEmpty')));   // an empty list says so (the student's side also shows the missing places)
		for(var i = 0; i < n; i++){
			var item;
			if(i < mine.length){
				item = mk('span', 'ex-cmp-item', cellText(mine[i]));
				if(i >= other.length) item.className += side === 'expected' ? ' missing' : ' extra';
				else if(!same(mine[i], other[i])) item.className += ' diff';
			}
			else if(side === 'actual')
				item = mk('span', 'ex-cmp-item missing', ' ');   // the place of an item the student does not have
			else
				continue;
			if(joiner && row.querySelector('.ex-cmp-item')) row.appendChild(mk('span', 'ex-cmp-arrow', '→'));
			row.appendChild(item);
		}
		box.appendChild(row);
	}

	function grid(box, e, a, side){
		var mine = side === 'expected' ? e : a, other = side === 'expected' ? a : e, rows = Math.max(e.length, a.length);
		var g = mk('div', 'ex-cmp-grid');
		for(var r = 0; r < rows; r++){
			var mr = mine[r] || null, or = other[r] || [], er = e[r] || [], ar = a[r] || [];
			var cols = Math.max(er.length, ar.length), row = mk('div', 'ex-cmp-row');
			for(var c = 0; c < cols; c++){
				var item;
				if(mr && c < mr.length){
					item = mk('span', 'ex-cmp-item', cellText(mr[c]));
					if(c >= or.length) item.className += side === 'expected' ? ' missing' : ' extra';
					else if(!same(mr[c], or[c])) item.className += ' diff';
				}
				else if(side === 'actual') item = mk('span', 'ex-cmp-item missing', ' ');
				else item = mk('span', 'ex-cmp-gap', ' ');
				row.appendChild(item);
			}
			g.appendChild(row);
		}
		box.appendChild(g);
	}

	function draw(kind, expected, actual, nonList){
		if(actual === undefined) return null;
		var e = expected, a = actual, mode = kind;
		if(kind === 'list'){
			if(nonList || typeof a !== 'string' || typeof e !== 'string') mode = 'value';
			else { e = listItems(e); a = listItems(a); }
		}
		else if(kind === 'array' && !(Array.isArray(e) && Array.isArray(a))) mode = 'value';
		else if(kind === 'grid' && !(Array.isArray(e) && Array.isArray(a) && e.every(Array.isArray) && a.every(Array.isArray))) mode = 'value';

		if((mode === 'list' || mode === 'array') && (e.length > MAX_ITEMS || a.length > MAX_ITEMS)) return null;
		if(mode === 'grid'){
			var big = function(m){ return m.length > MAX_GRID || m.some(function(r){ return r.length > MAX_GRID; }); };
			if(big(e) || big(a)) return null;
		}

		var wrap = mk('div', 'ex-compare ex-cmp-shape-' + mode);
		['expected', 'actual'].forEach(function(side){
			var box = mk('div', 'ex-cmp-side');
			box.setAttribute('data-side', side);
			box.appendChild(mk('div', 'ex-cmp-caption', t(side === 'expected' ? 'exCmpExpected' : 'exCmpActual')));
			if(mode === 'value')
				box.appendChild(mk('span', 'ex-cmp-value' + (same(e, a) ? '' : ' diff'), json(side === 'expected' ? expected : actual)));
			else if(mode === 'grid')
				grid(box, e, a, side);
			else
				sequence(box, e, a, side, mode === 'list');
			wrap.appendChild(box);
		});
		return wrap;
	}

	// one attempt of the history (the student's exercise page and the teacher's class page):
	// h = {t, lang, code, kind, error, results}; o = {label(result), issue(h), when(iso), load(h) or null, note (text) or null}
	function attemptView(h, o){
		var item = mk('details', 'ex-hist-item');
		item.setAttribute('data-kind', h.kind);
		var sum = mk('summary');
		sum.appendChild(mk('span', 'ex-hist-icon', h.kind === 'pass' ? '✓' : h.kind === 'error' ? '⚠' : '✗'));
		sum.appendChild(mk('span', 'ex-hist-when', o.when(h.t)));
		sum.appendChild(mk('span', 'ex-hist-issue', o.issue(h)));
		item.appendChild(sum);
		item.appendChild(mk('pre', 'ex-hist-code', h.code));
		(Array.isArray(h.results) ? h.results : []).forEach(function(r){
			if(!r || typeof r !== 'object') return;
			item.appendChild(mk('div', 'ex-hist-label', o.label(r)));
			var d = !r.failed && r.actual !== undefined ? draw(r.shape, r.expected, r.actual, r.nonList) : null;
			if(d) item.appendChild(d);
			else if(r.error && r.error !== h.error) item.appendChild(mk('p', 'ex-hist-error', r.error));
		});
		if(h.error) item.appendChild(mk('p', 'ex-hist-error', h.error));
		if(o.load){
			var load = mk('button', 'ex-hist-load', t('exHistLoad'));
			load.type = 'button';
			load.addEventListener('click', function(){ o.load(h); });
			item.appendChild(load);
		}
		else if(o.note)
			item.appendChild(mk('p', 'ex-hist-lang', o.note));
		return item;
	}

	window.dsvCompare = {shape: shape, draw: draw};
	window.dsvAttemptView = attemptView;
})();
