// Compiles grammer.pegjs into js/grammar.js, so pages do not download PEG.js and compile the
// grammar on every visit. Run it after every change to the grammar:
//
//     npm run build:grammar
//
// A test (tests/grammar.spec.js) fails while js/grammar.js is older than grammer.pegjs.
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');

function compileGrammar() {
	const context = { window: {} };
	context.self = context;
	vm.createContext(context);
	vm.runInContext(fs.readFileSync(path.join(ROOT, 'js/peg-0.9.0.min.js'), 'utf8'), context);
	const source = context.PEG.buildParser(fs.readFileSync(path.join(ROOT, 'grammer.pegjs'), 'utf8'), { output: 'source' });
	return '// Generated from grammer.pegjs by tools/build-grammar.js (npm run build:grammar). Do not edit.\n' +
	       'window.dsvParser = ' + source + ';\n';
}

module.exports = { compileGrammar };

if (require.main === module) {
	const out = path.join(ROOT, 'js/grammar.js');
	fs.writeFileSync(out, compileGrammar());
	console.log('wrote ' + path.relative(ROOT, out) + ' (' + fs.statSync(out).size + ' bytes)');
}
