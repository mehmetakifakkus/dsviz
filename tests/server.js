// A tiny static file server for the tests (no dependencies): serves the repository root.
// Usage: node tests/server.js [port]
var http = require('http');
var fs = require('fs');
var path = require('path');

var root = path.resolve(__dirname, '..');
var port = +(process.argv[2] || process.env.PORT || 8765);
var types = {
	'.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
	'.pegjs': 'text/plain; charset=utf-8', '.png': 'image/png', '.svg': 'image/svg+xml', '.json': 'application/json'
};

http.createServer(function(req, res){
	var url = decodeURIComponent(req.url.split('?')[0]);
	var file = path.join(root, url === '/' ? 'index.html' : url);
	if(file.indexOf(root) !== 0){ res.writeHead(403); return res.end(); }
	fs.readFile(file, function(err, data){
		if(err){ res.writeHead(404); return res.end('not found'); }
		res.writeHead(200, {'Content-Type': types[path.extname(file)] || 'application/octet-stream'});
		res.end(data);
	});
}).listen(port, function(){ console.log('http://localhost:' + port); });
