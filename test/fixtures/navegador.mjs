// Arnés CDP sin dependencias. Solo crea y cierra su propio Chrome headless y su perfil temporal.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import http from 'node:http';
import { spawn } from 'node:child_process';
export const dormir = (ms) => new Promise(r => setTimeout(r, ms));
export async function navegador(dist, kit, opciones = {}) {
  const tipos = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.webp': 'image/webp', '.woff2': 'font/woff2', '.svg': 'image/svg+xml', '.png': 'image/png', '.mp4': 'video/mp4', '.json': 'application/json' };
  const srv = http.createServer((req, res) => {
    for (const [nombre, valor] of Object.entries(opciones.headers ?? {})) res.setHeader(nombre, valor);
    const ruta = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    if (ruta === '/muestreo.html') { res.setHeader('content-type', 'text/html'); return res.end('<!doctype html><title>Muestreo aislado</title>'); }
    let f = ruta.startsWith('/__kit/') ? path.join(kit, ruta.slice(7)) : path.join(dist, ruta);
    if (!path.extname(f)) f += '.html';
    if (!fs.existsSync(f) || !fs.statSync(f).isFile()) { res.writeHead(404); return res.end(); }
    res.setHeader('content-type', tipos[path.extname(f)] ?? 'application/octet-stream');
    fs.createReadStream(f).pipe(res);
  });
  await new Promise(r => srv.listen(0, '127.0.0.1', r));
  const perfil = fs.mkdtempSync(path.join(opciones.temporales ?? os.tmpdir(), 'b2-chrome-'));
  const chrome = spawn(process.env.CHROME, ['--headless=new', '--no-sandbox', '--disable-breakpad', '--remote-debugging-port=0', `--user-data-dir=${perfil}`,
    '--no-first-run', '--no-default-browser-check', '--hide-scrollbars', ...(opciones.chromeArgs ?? []), 'about:blank'], { stdio: ['ignore', 'ignore', 'pipe'], env: { ...process.env, XDG_CONFIG_HOME: path.join(perfil, 'config'), XDG_CACHE_HOME: path.join(perfil, 'cache') } });
  let diagnostico = '';
  chrome.stderr.on('data', data => { diagnostico = (diagnostico + data).slice(-4000); });
  const terminado = new Promise(r => chrome.once('exit', r));
  let puerto;
  async function cerrar() {
    if (chrome.exitCode === null && chrome.signalCode === null) {
      // Browser.close deja que Chrome cierre sus procesos y termine de escribir el perfil antes de borrarlo.
      try {
        const v = await (await fetch(`http://127.0.0.1:${puerto}/json/version`)).json();
        const cierre = new WebSocket(v.webSocketDebuggerUrl);
        await new Promise((res, rej) => { cierre.onopen = res; cierre.onerror = rej; });
        cierre.send(JSON.stringify({ id: 1, method: 'Browser.close' }));
        await Promise.race([terminado, dormir(3000)]); cierre.close();
      } catch { /* Si falló el arranque, solo se termina el proceso hijo creado aquí. */ }
      if (chrome.exitCode === null && chrome.signalCode === null) { chrome.kill('SIGTERM'); await terminado; }
    }
    srv.closeAllConnections(); await new Promise(r => srv.close(r));
    for (let i = 0; ; i++) {
      try { fs.rmSync(perfil, { recursive: true, force: true }); break; }
      catch (e) { if (i === 40) throw e; await dormir(100); }
    }
  }
  try {
    for (let i = 0; i < 100; i++) {
      try { puerto = fs.readFileSync(path.join(perfil, 'DevToolsActivePort'), 'utf8').split('\n')[0]; break; }
      catch { await dormir(100); }
    }
    if (!puerto) throw new Error(`Chrome no inició: ${diagnostico}`);
  } catch (e) { await cerrar(); throw e; }
  const base = `http://127.0.0.1:${srv.address().port}`;
  async function pagina(antes = '') {
    const t = await (await fetch(`http://127.0.0.1:${puerto}/json/new?about:blank`, { method: 'PUT' })).json();
    const ws = new WebSocket(t.webSocketDebuggerUrl), pendientes = new Map(), errores = [], red = [], consola = [];
    let id = 0;
    await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
    ws.onmessage = ({ data }) => {
      const m = JSON.parse(data);
      if (m.method === 'Network.responseReceived') red.push(m.params.response);
      if (m.method === 'Network.loadingFailed') red.push({ fallo: m.params.errorText, bloqueado: m.params.blockedReason });
      if (m.method === 'Log.entryAdded') consola.push(m.params.entry);
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
    await send('Page.enable'); await send('Page.bringToFront'); await send('Runtime.enable'); await send('Network.enable'); await send('Log.enable');
    await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 800, deviceScaleFactor: 1, mobile: false });
    if (antes) await send('Page.addScriptToEvaluateOnNewDocument', { source: antes });
    return { send, ev, hasta, errores, red, consola,
      ir: async (ruta = '/demo-estandar') => { await send('Page.navigate', { url: base + ruta }); await hasta('document.readyState === "complete"'); },
      captura: async archivo => { const { data } = await send('Page.captureScreenshot', { format: 'png' }); fs.writeFileSync(archivo, Buffer.from(data, 'base64')); return data; },
      cerrar: async () => { ws.close(); await fetch(`http://127.0.0.1:${puerto}/json/close/${t.id}`); },
    };
  }
  return { base, pagina, cerrar };
}
