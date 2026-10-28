// Arnés CDP sin dependencias. Solo crea y cierra su propio Chrome headless y su perfil temporal.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import http from 'node:http';
import { spawn } from 'node:child_process';
export const dormir = (ms) => new Promise(r => setTimeout(r, ms));
export async function navegador(dist, kit) {
  const tipos = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.webp': 'image/webp', '.woff2': 'font/woff2', '.svg': 'image/svg+xml' };
  const srv = http.createServer((req, res) => {
    const ruta = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    if (ruta === '/muestreo.html') { res.setHeader('content-type', 'text/html'); return res.end('<!doctype html><title>Muestreo aislado</title>'); }
    let f = ruta.startsWith('/__kit/') ? path.join(kit, ruta.slice(7)) : path.join(dist, ruta);
    if (!path.extname(f)) f += '.html';
    if (!fs.existsSync(f) || !fs.statSync(f).isFile()) { res.writeHead(404); return res.end(); }
    res.setHeader('content-type', tipos[path.extname(f)] ?? 'application/octet-stream');
    fs.createReadStream(f).pipe(res);
  });
  await new Promise(r => srv.listen(0, '127.0.0.1', r));
  const perfil = fs.mkdtempSync(path.join(os.tmpdir(), 'b2-chrome-'));
  const chrome = spawn(process.env.CHROME, ['--headless=new', '--no-sandbox', '--disable-breakpad', '--remote-debugging-port=0', `--user-data-dir=${perfil}`,
    '--no-first-run', '--no-default-browser-check', '--hide-scrollbars', 'about:blank'], { stdio: 'ignore' });
  const terminado = new Promise(r => chrome.once('exit', r));
  let puerto;
  async function cerrar() {
    if (chrome.exitCode === null) { chrome.kill('SIGTERM'); await terminado; }
    srv.closeAllConnections(); await new Promise(r => srv.close(r));
    fs.rmSync(perfil, { recursive: true, force: true, maxRetries: 20, retryDelay: 100 });
  }
  try {
    for (let i = 0; i < 100; i++) {
      try { puerto = fs.readFileSync(path.join(perfil, 'DevToolsActivePort'), 'utf8').split('\n')[0]; break; }
      catch { await dormir(100); }
    }
    if (!puerto) throw new Error('Chrome no inició');
  } catch (e) { await cerrar(); throw e; }
  const base = `http://127.0.0.1:${srv.address().port}`;
  async function pagina(antes = '') {
    const t = await (await fetch(`http://127.0.0.1:${puerto}/json/new?about:blank`, { method: 'PUT' })).json();
    const ws = new WebSocket(t.webSocketDebuggerUrl), pendientes = new Map(), errores = [];
    let id = 0;
    await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
    ws.onmessage = ({ data }) => {
      const m = JSON.parse(data);
      if (m.method === 'Runtime.exceptionThrown') errores.push(m.params.exceptionDetails.exception?.description ?? m.params.exceptionDetails.text);
      const p = pendientes.get(m.id); if (!p) return;
      pendientes.delete(m.id); clearTimeout(p.reloj);
      m.error ? p.rej(new Error(m.error.message)) : p.res(m.result);
    };
    const send = (method, params = {}) => new Promise((res, rej) => {
      const n = ++id, reloj = setTimeout(() => { pendientes.delete(n); rej(new Error(`CDP sin respuesta: ${method}`)); }, 30000);
      pendientes.set(n, { res, rej, reloj }); ws.send(JSON.stringify({ id: n, method, params }));
    });
    const ev = async expression => {
      const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
      if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? r.exceptionDetails.text);
      return r.result.value;
    };
    const hasta = async (expr, ms = 20000) => {
      const inicio = Date.now();
      do { if (await ev(expr)) return true; await dormir(100); } while (Date.now() - inicio < ms);
      throw new Error(`Condición pendiente: ${expr}`);
    };
    await send('Page.enable'); await send('Runtime.enable');
    await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 800, deviceScaleFactor: 1, mobile: false });
    if (antes) await send('Page.addScriptToEvaluateOnNewDocument', { source: antes });
    return { send, ev, hasta, errores,
      ir: async (ruta = '/demo-estandar') => { await send('Page.navigate', { url: base + ruta }); await hasta('document.readyState === "complete"'); },
      captura: async archivo => { const { data } = await send('Page.captureScreenshot', { format: 'png' }); fs.writeFileSync(archivo, Buffer.from(data, 'base64')); return data; },
      cerrar: async () => { ws.close(); await fetch(`http://127.0.0.1:${puerto}/json/close/${t.id}`); },
    };
  }
  return { base, pagina, cerrar };
}
