// Servidor local sin dependencias. En producción basta un hosting estático HTTPS.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const PORT = Number(process.env.PORT || 8000);
const ROOT = new URL('./', import.meta.url);
const ALLOWED_FILES = new Map([
  ['', 'text/html; charset=utf-8'], ['index.html', 'text/html; charset=utf-8'],
  ['styles.css', 'text/css; charset=utf-8'], ['app.js', 'text/javascript; charset=utf-8'],
  ['db.js', 'text/javascript; charset=utf-8'], ['finance.js', 'text/javascript; charset=utf-8'],
  ['sw.js', 'text/javascript; charset=utf-8'], ['manifest.json', 'application/manifest+json; charset=utf-8'],
  ['icons/icon-192.png', 'image/png'], ['icons/icon-512.png', 'image/png']
]);
const server = createServer(async (request, response) => {
  if (!['GET', 'HEAD'].includes(request.method)) { response.writeHead(405, { Allow: 'GET, HEAD' }).end(); return; }
  let path;
  try { path = decodeURIComponent(new URL(request.url, 'http://localhost').pathname).slice(1); }
  catch { response.writeHead(400).end('Solicitud inválida'); return; }
  if (!ALLOWED_FILES.has(path)) { response.writeHead(404).end('No encontrado'); return; }
  try {
    const body = await readFile(fileURLToPath(new URL(path || 'index.html', ROOT)));
    response.writeHead(200, {
      'Content-Type': ALLOWED_FILES.get(path), 'Content-Length': body.length,
      'Cache-Control': 'no-cache', 'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'"
    });
    response.end(request.method === 'HEAD' ? undefined : body);
  } catch { response.writeHead(500).end('No se pudo leer el archivo'); }
});
server.on('error', error => { console.error(`No se pudo iniciar: ${error.message}`); process.exitCode = 1; });
server.listen(PORT, '127.0.0.1', () => console.log(`Mi Billetera Lite: http://localhost:${PORT}\nPresiona Ctrl+C para detener.`));
