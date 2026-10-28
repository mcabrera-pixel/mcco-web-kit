import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const TIPOS = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml',
  '.webp': 'image/webp', '.woff2': 'font/woff2', '.png': 'image/png', '.mp4': 'video/mp4', '.json': 'application/json' };

function dentroDeRaiz(raiz, archivo) {
  const rel = path.relative(raiz, archivo);
  if (path.isAbsolute(rel) || rel.startsWith('..')) return false;
  try {
    const real = fs.realpathSync(archivo);
    const relReal = path.relative(raiz, real);
    if (path.isAbsolute(relReal) || relReal.startsWith('..')) return false;
  } catch {
    // El archivo no existe; el chequeo de cadena basta por ahora.
  }
  return true;
}

export function servidor(raiz) {
  const s = http.createServer((req, res) => {
    const ruta = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    let archivo = path.resolve(raiz, '.' + ruta);
    if (!dentroDeRaiz(raiz, archivo)) { res.writeHead(403); return res.end('403'); }
    if (fs.existsSync(archivo) && fs.statSync(archivo).isDirectory()) archivo = path.join(archivo, 'index.html');
    if (!fs.existsSync(archivo) && fs.existsSync(archivo + '.html')) archivo += '.html';
    if (!dentroDeRaiz(raiz, archivo)) { res.writeHead(403); return res.end('403'); }
    if (!fs.existsSync(archivo)) { res.writeHead(404); return res.end('404'); }
    res.writeHead(200, { 'content-type': TIPOS[path.extname(archivo)] ?? 'application/octet-stream' });
    fs.createReadStream(archivo).pipe(res);
  });
  return new Promise((r) => s.listen(0, '127.0.0.1', () => r({ s, base: `http://127.0.0.1:${s.address().port}` })));
}
