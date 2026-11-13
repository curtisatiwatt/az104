import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
const root = resolve(process.argv.includes('--dist') ? 'dist' : '.');
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.json': 'application/json' };
http.createServer(async (req, res) => {
  try {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    const file = resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
    if (!file.startsWith(root + sep) || pathname.split('/').some(p => p.startsWith('.'))) { res.writeHead(403); return res.end(); }
    const body = await readFile(file); res.writeHead(200, { 'Content-Type': types[extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-cache' }); res.end(body);
  } catch { res.writeHead(404); res.end('Not found'); }
}).listen(5184, '127.0.0.1', () => console.log('Local: http://127.0.0.1:5184'));
