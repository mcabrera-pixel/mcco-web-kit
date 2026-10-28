// Verificación de la Tarea 2 (layout, barra global, sub-navegación, bloque y hero) en Chrome sin ventana, por el
// protocolo de DevTools y sin dependencias (Node ≥ 22 trae WebSocket). Usa un perfil temporal: no toca el Chrome de
// Mario. Sirve el dist de la plantilla con un servidor local y revisa /demo-estandar en computador, tableta, celular,
// teclado, mouse, sin JS y con movimiento reducido. Las capturas quedan en la carpeta de salida.
//
// Uso (desde cualquier carpeta, con la plantilla ya construida con el kit local):
//   node task-2-verificacion.mjs [<dist de la plantilla>] [<carpeta de capturas>] [<carpeta de la maqueta>]
// Por defecto: base/mcco-web-template/dist y <temporal>/task-2-capturas. CHROME=<ruta> cambia el ejecutable.
// Sale con 1 si alguna verificación falla. Refleja el estado de la Tarea 2: cuando la Tarea 4 oculte el respaldo de
// la nube con WebGL, la verificación «nube: respaldo visible» tiene que pasar a decir eso.
import { contrasteSubnav } from './fixtures/contraste-subnav.mjs';
import { servidor } from './fixtures/servidor-estatico.mjs';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const [DIST = path.resolve(AQUI, '../../../base/mcco-web-template/dist'), OUT = path.join(os.tmpdir(), 'task-2-capturas'), MAQUETA] = process.argv.slice(2);
const CHROME = process.env.CHROME ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe';
if (!fs.existsSync(path.join(DIST, 'demo-estandar.html'))) { console.error(`No está ${DIST}/demo-estandar.html: corre npm run build en la plantilla.`); process.exit(2); }
fs.mkdirSync(OUT, { recursive: true });

const { s: srv, base: BASE } = await servidor(DIST);
const maq = MAQUETA ? await servidor(MAQUETA) : null;
const perfil = fs.mkdtempSync(path.join(os.tmpdir(), 'cdp-perfil-'));
const PUERTO = 9400 + Math.floor(Math.random() * 400);
const chrome = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${PUERTO}`, `--user-data-dir=${perfil}`,
  '--no-first-run', '--no-default-browser-check', '--hide-scrollbars', 'about:blank'], { stdio: 'ignore' });
let cerrado = false;
function limpiar() {
  if (cerrado) return; cerrado = true;
  if (chrome.pid) {
    if (process.platform === 'win32') spawnSync('taskkill', ['/pid', String(chrome.pid), '/T', '/F'], { stdio: 'ignore' });
    else chrome.kill('SIGKILL');
  }
  srv.close(); maq?.s.close();
  if (path.dirname(path.resolve(perfil)) !== path.resolve(os.tmpdir()) || !path.basename(perfil).startsWith('cdp-perfil-')) throw new Error('Perfil fuera de la carpeta temporal');
  const espera = new Int32Array(new SharedArrayBuffer(4));
  for (let i = 0; fs.existsSync(perfil); i++) {
    try { fs.rmSync(perfil, { recursive: true, force: true }); }
    catch (e) { if (i >= 60) { console.error(`Perfil temporal sin borrar: ${perfil} (${e.code})`); process.exitCode = 1; break; } Atomics.wait(espera, 0, 0, 250); }
  }
}
const vigia = setTimeout(() => { console.error('FALLA: vigía de la Tarea 2'); process.exit(1); }, Number(process.env.LIMITE_MS ?? 280000));
process.on('exit', limpiar);
process.on('SIGINT', () => process.exit(130));

const dormir = (ms) => new Promise((r) => setTimeout(r, ms));
async function json(ruta) {
  for (let i = 0; i < 80; i++) {
    try { return await (await fetch(`http://127.0.0.1:${PUERTO}${ruta}`)).json(); } catch { await dormir(150); }
  }
  throw new Error('Chrome no responde');
}

class Cdp {
  constructor(url) {
    this.ws = new WebSocket(url); this.id = 0; this.pend = new Map(); this.oyentes = new Set();
    this.ws.onmessage = (ev) => {
      const m = JSON.parse(ev.data);
      if (m.id) { const p = this.pend.get(m.id); this.pend.delete(m.id); m.error ? p.rej(new Error(`${p.metodo}: ${m.error.message}`)) : p.res(m.result); }
      else for (const o of this.oyentes) o(m);
    };
  }
  abrir() { return new Promise((r, j) => { this.ws.onopen = r; this.ws.onerror = j; }); }
  send(metodo, params = {}) {
    const id = ++this.id; this.ws.send(JSON.stringify({ id, method: metodo, params }));
    return new Promise((res, rej) => this.pend.set(id, { res, rej, metodo }));
  }
  esperar(metodo, ms = 15000) {
    return new Promise((res, rej) => {
      const t = setTimeout(() => { this.oyentes.delete(o); rej(new Error(`timeout ${metodo}`)); }, ms);
      const o = (m) => { if (m.method === metodo) { clearTimeout(t); this.oyentes.delete(o); res(m.params); } };
      this.oyentes.add(o);
    });
  }
}

const resultados = [];
const ok = (nombre, cond, detalle = '') => { resultados.push({ nombre, ok: !!cond, detalle }); console.log(`${cond ? 'OK  ' : 'FALLA'} ${nombre}${detalle ? `  (${detalle})` : ''}`); };

async function nuevaPagina() {
  const t = await (await fetch(`http://127.0.0.1:${PUERTO}/json/new?about:blank`, { method: 'PUT' })).json();
  const c = new Cdp(t.webSocketDebuggerUrl); await c.abrir();
  c.errores = []; c.fuentes = [];
  c.oyentes.add((m) => {
    if (m.method === 'Runtime.exceptionThrown') c.errores.push(m.params.exceptionDetails.text + ' ' + (m.params.exceptionDetails.exception?.description ?? ''));
    if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') c.errores.push(m.params.args.map((a) => a.value ?? a.description).join(' '));
    if (m.method === 'Log.entryAdded' && m.params.entry.level === 'error' && !/favicon\.ico/.test(m.params.entry.url ?? '')) c.errores.push(m.params.entry.text + ' ' + (m.params.entry.url ?? ''));
    if (m.method === 'Network.requestWillBeSent' && /\.woff2/.test(m.params.request.url)) c.fuentes.push(m.params.request.url);
  });
  await Promise.all([c.send('Page.enable'), c.send('Runtime.enable'), c.send('Log.enable'), c.send('Network.enable'), c.send('DOM.enable'), c.send('CSS.enable')]);
  c.ev = async (expr) => {
    const r = await c.send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
    if (r.exceptionDetails) throw new Error(`${expr.slice(0, 80)}: ${r.exceptionDetails.exception?.description ?? r.exceptionDetails.text}`);
    return r.result.value;
  };
  c.vista = (width, height, mobile = false, deviceScaleFactor = 1) => c.send('Emulation.setDeviceMetricsOverride', { width, height, mobile, deviceScaleFactor });
  c.ir = async (url) => { const carga = c.esperar('Page.loadEventFired'); await c.send('Page.navigate', { url }); await carga; await c.ev('document.fonts.ready.then(() => true)'); await c.cuadros(); };
  // Espera dos cuadros: el evento scroll del cuadro siguiente ya se despachó y la clase ya se aplicó.
  c.cuadros = () => c.ev('new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => r(true))))');
  const TECLAS = { Tab: 9, Enter: 13, Escape: 27, ' ': 32, End: 35, Home: 36 };
  c.tecla = async (key, mod = 0) => {
    const base = { key, code: key === ' ' ? 'Space' : key, windowsVirtualKeyCode: TECLAS[key], modifiers: mod };
    await c.send('Input.dispatchKeyEvent', { type: 'keyDown', ...base, ...(key === 'Enter' ? { text: '\r' } : key === ' ' ? { text: ' ' } : {}) });
    await c.send('Input.dispatchKeyEvent', { type: 'keyUp', ...base });
    await c.cuadros();
  };
  c.clic = async (x, y) => {
    for (const type of ['mouseMoved', 'mousePressed', 'mouseReleased']) await c.send('Input.dispatchMouseEvent', { type, x, y, button: 'left', clickCount: 1 });
    await c.cuadros();
  };
  c.centro = (sel) => c.ev(`(() => { const r = document.querySelector(${JSON.stringify(sel)}).getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; })()`);
  c.captura = async (nombre) => { const { data } = await c.send('Page.captureScreenshot', { format: 'png' }); fs.writeFileSync(path.join(OUT, nombre + '.png'), Buffer.from(data, 'base64')); };
  return c;
}

// Oráculo independiente del tono: qué hay bajo la última fila de la sub-navegación según el hit testing.
const ORACULO = `(() => {
  const sub = document.querySelector('.std-subnav');
  const y = sub.getBoundingClientRect().bottom - 1;
  const bajo = document.elementsFromPoint(3, y).find((el) => !sub.contains(el));
  const oscuro = bajo?.closest('[data-std-oscuro]');
  const esperado = !!oscuro && oscuro.getBoundingClientRect().width >= document.documentElement.clientWidth - 1;
  return { esperado, real: sub.classList.contains('is-oscura'), bajo: bajo ? bajo.tagName + '.' + bajo.className : null, y: scrollY };
})()`;

try {
  await json('/json/version');
  const URL_DEMO = `${BASE}/demo-estandar`;

  // ── Computador, 1280 × 800 ─────────────────────────────────────────────────────────────
  const p = await nuevaPagina();
  await p.vista(1280, 800);
  await p.ir(URL_DEMO);
  const esc = await p.ev(`(() => {
    const cs = (sel, pseudo) => getComputedStyle(document.querySelector(sel), pseudo);
    const r = (sel) => { const b = document.querySelector(sel).getBoundingClientRect(); return [Math.round(b.width), Math.round(b.height)]; };
    const a = document.querySelector('.std-gnav__enlaces a');
    return {
      gnavAlto: r('.std-gnav')[1], gnavFondo: cs('.std-gnav').backgroundColor,
      enlaceDeco: getComputedStyle(a).textDecorationLine, enlaceColor: getComputedStyle(a).color, enlaceTam: getComputedStyle(a).fontSize,
      enlaceArea: [...document.querySelectorAll('.std-gnav__enlaces a')].map((x) => { const b = x.getBoundingClientRect(); return [Math.round(b.width), Math.round(b.height)]; }),
      botonDisplay: cs('.std-gnav__menu').display, logo: r('.std-gnav__logo img'), logoLink: r('.std-gnav__logo'),
      subAlto: r('.std-subnav')[1], subPos: cs('.std-subnav').position,
      subTitulo: cs('.std-subnav__titulo').fontSize, subEnlaceDisplay: cs('.std-subnav__enlace').display,
      subEnlaceDeco: cs('.std-subnav__enlace').textDecorationLine, subEnlaceColor: cs('.std-subnav__enlace').color,
      subEnlaceArea: [...document.querySelectorAll('.std-subnav__enlace')].map((x) => { const b = x.getBoundingClientRect(); return [Math.round(b.width), Math.round(b.height)]; }),
      largo: cs('.std-subnav__largo').display, corto: cs('.std-subnav__corto').display, pildoraDeco: cs('.std-subnav__accion').textDecorationLine,
      h1: cs('.std-hero .std-h1').fontSize, h1Peso: cs('.std-hero .std-h1').fontWeight, heroPad: cs('.std-hero').paddingTop,
      fantasmaFondo: cs('.std-hero .std-pildora--fantasma').backgroundColor, bajadaColor: cs('.std-hero__bajada').color,
      nube: r('.std-nube'), respaldoFiltro: cs('.std-nube__respaldo').filter, respaldoOpacidad: cs('.std-nube__respaldo').opacity,
      rotulo: document.querySelector('[data-rotulo]').textContent, rotuloTam: cs('[data-rotulo]').fontSize,
      bloquePad: cs('#claro').paddingTop + ' ' + cs('#claro').paddingLeft, negroFondo: cs('#negro').backgroundColor, negroColor: cs('#negro').color,
      suaveFondo: cs('#negro-suave').backgroundColor, parchFondo: cs('#parchment').backgroundColor,
      masDespues: cs('.std-mas', '::after').content, fantasmaOscuro: cs('#negro .std-pildora--fantasma').color,
      interLatin: [...document.fonts].filter((f) => f.family.replace(/"/g, '') === 'Inter').map((f) => f.status + ':' + f.unicodeRange.slice(0, 12)),
      interUsada: document.fonts.check('600 56px Inter'),
      ancho: document.documentElement.scrollWidth, vw: document.documentElement.clientWidth,
    };
  })()`);
  ok('barra global negra de 44 px', esc.gnavAlto === 44 && esc.gnavFondo === 'rgb(0, 0, 0)', `${esc.gnavAlto} ${esc.gnavFondo}`);
  ok('enlaces de la barra sin subrayado, 12 px, blanco al 80 %', esc.enlaceDeco === 'none' && esc.enlaceTam === '12px' && esc.enlaceColor === 'rgba(255, 255, 255, 0.8)');
  ok('enlaces de la barra con área de 44 × 44', esc.enlaceArea.every(([w, h]) => w >= 44 && h >= 44), JSON.stringify(esc.enlaceArea));
  ok('botón de menú oculto en computador', esc.botonDisplay === 'none');
  ok('logo de 15 px de alto y enlace de 44 px', esc.logo[1] === 15 && esc.logoLink[1] === 44, JSON.stringify([esc.logo, esc.logoLink]));
  ok('sub-navegación fija de 52 px', esc.subAlto === 52 && esc.subPos === 'sticky');
  ok('sub-navegación: título 21 px, enlaces visibles sin subrayado, acción con texto largo', esc.subTitulo === '21px' && esc.subEnlaceDisplay !== 'none' && esc.subEnlaceDeco === 'none' && esc.largo !== 'none' && esc.corto === 'none' && esc.pildoraDeco === 'none');
  ok('enlaces de la sub-navegación con área de 44 × 44', esc.subEnlaceArea.every(([w, h]) => w >= 44 && h >= 44), JSON.stringify(esc.subEnlaceArea));
  ok('hero: H1 de 56 px en 600 y 56 px arriba', esc.h1 === '56px' && esc.h1Peso === '600' && esc.heroPad === '56px');
  ok('hero: píldora fantasma con fondo blanco', esc.fantasmaFondo === 'rgb(255, 255, 255)');
  ok('nube: respaldo visible e invertido', esc.respaldoOpacidad === '1' && /invert\(1\)/.test(esc.respaldoFiltro) && esc.nube[1] >= 240, JSON.stringify(esc.nube));
  ok('rótulo de origen bajo la nube', esc.rotulo === 'Ilustración en nube de puntos.' && esc.rotuloTam === '12px');
  ok('bloques: 80 px de aire y 22 px de margen', esc.bloquePad === '80px 22px');
  ok('tonos: negro, negro suave y parchment', esc.negroFondo === 'rgb(0, 0, 0)' && esc.suaveFondo === 'rgb(22, 22, 23)' && esc.parchFondo === 'rgb(245, 245, 247)' && esc.negroColor === 'rgb(245, 245, 247)');
  ok('píldora fantasma en negro usa --accion-oscuro', esc.fantasmaOscuro === 'rgb(41, 151, 255)', esc.fantasmaOscuro);
  ok('enlace de texto lleva el «›» por CSS', /›/.test(esc.masDespues), esc.masDespues);
  ok('Inter cargada y en uso', esc.interUsada && esc.interLatin.some((s) => s.startsWith('loaded')), JSON.stringify(esc.interLatin));
  ok('sin scroll horizontal', esc.ancho <= esc.vw, `${esc.ancho} ${esc.vw}`);
  ok('una sola descarga de Inter latina (la precarga se reutiliza)', p.fuentes.filter((u) => u.includes('inter-latin-wght')).length === 1, JSON.stringify(p.fuentes));
  const slots = await p.ev(`(() => { const pie = document.querySelector('body > footer'); const main = document.querySelector('body > main'); const grupo = document.querySelector('.mcco-grupo');
    return { icono: !!document.querySelector('head link[rel="icon"][href="/favicon.svg"]'), precarga: document.querySelectorAll('head link[rel="preload"][as="font"]').length,
      orden: !!(pie && main && grupo && (main.compareDocumentPosition(pie) & 4) && (pie.compareDocumentPosition(grupo) & 4)),
      hijasBody: [...document.body.children].filter((e) => e.tagName !== 'SCRIPT').map((e) => e.tagName.toLowerCase() + (e.className ? '.' + String(e.className).split(' ')[0] : '')).join(' > '),
      bodyStd: document.body.className }; })()`);
  ok('slot head: el favicon del sitio llega a <head> junto con la precarga', slots.icono && slots.precarga === 1, JSON.stringify(slots));
  ok('slot pie: después de <main> y antes del bloque Grupo MCCO; body.std', slots.orden && slots.bodyStd === 'std', slots.hijasBody);

  // Arreglo 1: el script de la sub-navegación mide en el propio evento, sin requestAnimationFrame (R13).
  const guion = await p.ev(`Promise.all([...document.scripts].map((s) => s.src ? fetch(s.src).then((r) => r.text()) : s.textContent))
    .then((textos) => { const sub = textos.filter((t) => t.includes('is-oscura')); return { encontrados: sub.length, conRaf: sub.filter((t) => t.includes('requestAnimationFrame')).length }; })`);
  ok('arreglo 1: el script de la sub-navegación no usa requestAnimationFrame', guion.encontrados === 1 && guion.conRaf === 0, JSON.stringify(guion));
  // Arreglo 2: --std-tinta-80 (#333336) definido en la hoja y usado por la bajada del hero y los enlaces de la sub-navegación.
  const tinta = await p.ev(`(() => {
    const reglas = []; for (const h of document.styleSheets) { try { for (const r of h.cssRules) reglas.push(r); } catch {} }
    const usa = (clase) => reglas.some((r) => r.selectorText?.includes(clase) && r.style?.color === 'var(--std-tinta-80)');
    return { token: getComputedStyle(document.documentElement).getPropertyValue('--std-tinta-80').trim(),
      bajada: usa('std-hero__bajada'), enlace: usa('std-subnav__enlace'),
      colores: [getComputedStyle(document.querySelector('.std-hero__bajada')).color, getComputedStyle(document.querySelector('.std-subnav__enlace')).color] };
  })()`);
  ok('arreglo 2: --std-tinta-80 vale #333336 y lo usan la bajada y los enlaces de la sub-navegación', tinta.token === '#333336' && tinta.bajada && tinta.enlace && tinta.colores.every((c) => c === 'rgb(51, 51, 54)'), JSON.stringify(tinta));
  // Arreglo 3: aria-current="page" solo en el enlace a la página actual (sin anclas ni /#…).
  const actual = await p.ev(`[...document.querySelectorAll('.std-gnav__enlaces a')].map((a) => [a.getAttribute('href'), a.getAttribute('aria-current')])`);
  const marcados = actual.filter(([, c]) => c !== null);
  ok('arreglo 3: aria-current="page" solo en /demo-estandar', marcados.length === 1 && marcados[0][0] === '/demo-estandar' && marcados[0][1] === 'page', JSON.stringify(actual));
  await p.captura('1-computador-arriba');

  // B2-final: contraste durante ambos cruces, sin movimiento reducido y sin depender de FPS.
  const contraste = await contrasteSubnav(p);
  fs.writeFileSync(path.join(OUT, 'subnav-contraste.json'), JSON.stringify(contraste, null, 2));
  const minimo = Math.min(...contraste.frames.map(f => f.minimo));
  ok('SubNav AA en cada cuadro al entrar y salir de negro y negro suave', minimo >= 4.5 && contraste.frames.some(f => f.oscura) && contraste.frames.some(f => !f.oscura), `${contraste.frames.length} cuadros; mínimo ${minimo.toFixed(3)}:1`);
  ok('SubNav sin interpolación del fondo ni del texto', contraste.transiciones.length === 0, JSON.stringify(contraste.transiciones));

  // Tono de la sub-navegación en todo el recorrido, de 29 en 29 px, contra el oráculo.
  const alto = await p.ev('document.documentElement.scrollHeight - innerHeight');
  const fallas = []; let oscuras = 0, pasos = 0;
  for (let y = 0; y <= alto; y += 29) {
    await p.ev(`scrollTo(0, ${y})`); await p.cuadros();
    const o = await p.ev(ORACULO); pasos++; if (o.real) oscuras++;
    if (o.esperado !== o.real) fallas.push(o);
  }
  ok('tono de la sub-navegación correcto en cada posición', fallas.length === 0 && oscuras > 0, `${pasos} posiciones, ${oscuras} oscuras, fallas ${JSON.stringify(fallas.slice(0, 3))}`);
  // Saltos: ancla, tecla Fin, inicio y bajada de golpe.
  for (const [nombre, js] of [['ancla #negro', `location.hash = '#negro'`], ['ancla #parchment', `location.hash = '#parchment'`], ['tecla Fin (scrollTo al final)', 'scrollTo(0, document.documentElement.scrollHeight)'], ['vuelta al inicio', 'scrollTo(0, 0)'], ['ancla #negro-suave', `location.hash = '#negro-suave'`]]) {
    await p.ev(js); await p.cuadros();
    const o = await p.ev(ORACULO);
    ok(`salto: ${nombre}`, o.esperado === o.real, JSON.stringify(o));
  }
  // Cambio de tamaño: la medición también corre en resize.
  await p.ev(`scrollTo(0, document.querySelector('#negro').offsetTop + 40)`); await p.cuadros();
  await p.vista(900, 700); await p.cuadros(); await p.cuadros();
  let o = await p.ev(ORACULO);
  ok('cambio de tamaño: el tono sigue al bloque que queda debajo', o.esperado === o.real, JSON.stringify(o));
  await p.vista(1280, 800); await p.cuadros();
  await p.ev(`location.hash = '#negro'`); await p.cuadros();
  await p.captura('2-computador-subnav');
  await p.ev(`document.querySelector('#acciones').scrollIntoView({ block: 'center' })`); await p.cuadros();
  await p.captura('3-computador-parchment');
  // Píldora chica: su área táctil llega a 44 px aunque se vea de 28.
  const chica = await p.ev(`(() => { const el = document.querySelector('.std-subnav__accion'); const b = el.getBoundingClientRect(); const x = b.left + b.width / 2, cy = b.top + b.height / 2; return { alto: Math.round(b.height), arriba: el.contains(document.elementFromPoint(x, cy - 21)), abajo: el.contains(document.elementFromPoint(x, cy + 21)) }; })()`);
  ok('píldora chica de la sub-navegación con 44 px de área táctil', chica.alto === 28 && chica.arriba && chica.abajo, JSON.stringify(chica));
  // Movimiento reducido: sin transiciones.
  await p.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
  const rm = await p.ev(`[getComputedStyle(document.querySelector('.std-subnav')).transitionDuration, getComputedStyle(document.querySelector('.std-gnav__enlaces a')).transitionDuration, getComputedStyle(document.querySelector('.std-gnav__linea')).transitionDuration]`);
  ok('movimiento reducido: sub-navegación, enlaces y botón sin transición', rm.every((d) => /^0s(, 0s)*$/.test(d)), JSON.stringify(rm));
  await p.send('Emulation.setEmulatedMedia', { features: [] });
  ok('sin errores en la consola (computador)', p.errores.length === 0, JSON.stringify(p.errores));
  const lcp = await p.ev(`new Promise((r) => new PerformanceObserver((l) => { const e = l.getEntries().at(-1); r(e ? (e.element?.tagName + '.' + (e.element?.className ?? '') + ' ' + Math.round(e.size)) : null); }).observe({ type: 'largest-contentful-paint', buffered: true }))`);
  console.log('LCP (computador, informativo):', lcp);

  // ── Tableta, 700 px: sin enlaces en la sub-navegación, acción con texto largo ─────────────
  const t = await nuevaPagina();
  await t.vista(700, 900, true);
  await t.ir(URL_DEMO);
  const tab = await t.ev(`[getComputedStyle(document.querySelector('.std-subnav__enlace')).display, getComputedStyle(document.querySelector('.std-subnav__largo')).display, getComputedStyle(document.querySelector('.std-gnav__menu')).display, getComputedStyle(document.querySelector('.std-gnav__enlaces')).display]`);
  ok('700 px: sin enlaces en la sub-navegación, texto largo, botón de menú', tab[0] === 'none' && tab[1] !== 'none' && tab[2] !== 'none' && tab[3] === 'none', JSON.stringify(tab));
  await t.captura('4-tableta-700');

  // ── Celular, 375 × 812 ─────────────────────────────────────────────────────────────────
  const m = await nuevaPagina();
  await m.vista(375, 812, true, 2);
  await m.ir(URL_DEMO);
  const cel = await m.ev(`(() => {
    const cs = (sel) => getComputedStyle(document.querySelector(sel));
    const b = document.querySelector('.std-gnav__menu').getBoundingClientRect();
    return { boton: cs('.std-gnav__menu').display, botonArea: [b.width, b.height], lista: cs('.std-gnav__enlaces').display,
      subAlto: document.querySelector('.std-subnav').getBoundingClientRect().height, titulo: cs('.std-subnav__titulo').fontSize,
      largo: cs('.std-subnav__largo').display, corto: cs('.std-subnav__corto').display, h1: cs('.std-hero .std-h1').fontSize,
      nube: document.querySelector('.std-nube').getBoundingClientRect().height, pad: cs('#claro').paddingTop + ' ' + cs('#claro').paddingLeft,
      heroPad: cs('.std-hero').paddingTop, ancho: document.documentElement.scrollWidth, vw: document.documentElement.clientWidth };
  })()`);
  ok('celular: botón de 44 × 44 visible y lista oculta', cel.boton !== 'none' && cel.botonArea[0] === 44 && cel.botonArea[1] === 44 && cel.lista === 'none');
  ok('celular: sub-navegación de 48 px, título 17 px y textoCorto', cel.subAlto === 48 && cel.titulo === '17px' && cel.largo === 'none' && cel.corto !== 'none');
  ok('celular: H1 de 34 px (bajo 420 px), nube de 250 px, bloques 56/16, hero 44', cel.h1 === '34px' && cel.nube === 250 && cel.pad === '56px 16px' && cel.heroPad === '44px', JSON.stringify(cel));
  ok('celular: sin scroll horizontal', cel.ancho <= cel.vw, `${cel.ancho} ${cel.vw}`);
  await m.captura('5-celular-arriba');

  const estado = () => m.ev(`({ exp: document.querySelector('[data-std-menu]').getAttribute('aria-expanded'), clase: document.querySelector('[data-std-gnav]').classList.contains('is-abierta'), lista: getComputedStyle(document.querySelector('.std-gnav__enlaces')).display, foco: document.activeElement === document.querySelector('[data-std-menu]') ? 'boton' : document.activeElement === document.body ? 'BODY' : (document.activeElement?.textContent?.trim() || document.activeElement?.tagName), hash: location.hash, y: scrollY })`);
  // Teclado: Tab hasta el botón, Enter abre, Tab entra a la bandeja, Escape cierra y devuelve el foco.
  await m.ev('document.activeElement?.blur(); scrollTo(0, 0)');
  await m.tecla('Tab'); await m.tecla('Tab');
  let e = await estado();
  ok('teclado: Tab llega al botón (después del logo)', e.foco === 'boton', JSON.stringify(e));
  await m.tecla('Enter'); e = await estado();
  ok('teclado: Enter abre (aria-expanded="true", bandeja visible, foco en el botón)', e.exp === 'true' && e.clase && e.lista === 'block' && e.foco === 'boton', JSON.stringify(e));
  const bandeja = await m.ev(`[...document.querySelectorAll('.std-gnav__enlaces a')].map((a) => { const b = a.getBoundingClientRect(); return [Math.round(b.height), getComputedStyle(a).fontSize, getComputedStyle(a).textDecorationLine]; })`);
  ok('bandeja: enlaces de 28 px, sin subrayado y 44 px de alto', bandeja.every(([h, f, d]) => h >= 44 && f === '28px' && d === 'none'), JSON.stringify(bandeja));
  await m.captura('6-celular-menu-abierto');
  await m.tecla('Tab'); e = await estado();
  ok('teclado: Tab entra al primer enlace de la bandeja', e.foco === 'Bloques', JSON.stringify(e));
  await m.tecla('Escape'); e = await estado();
  ok('teclado: Escape cierra y el foco vuelve al botón', e.exp === 'false' && !e.clase && e.lista === 'none' && e.foco === 'boton', JSON.stringify(e));
  await m.tecla(' '); e = await estado();
  ok('teclado: Espacio abre', e.exp === 'true' && e.lista === 'block', JSON.stringify(e));
  await m.tecla(' '); e = await estado();
  ok('teclado: Espacio cierra y el foco sigue en el botón', e.exp === 'false' && e.lista === 'none' && e.foco === 'boton', JSON.stringify(e));
  // Foco que sale de la bandeja: Tab después del último enlace cierra (la bandeja no tapa el foco).
  await m.tecla('Enter');
  for (let i = 0; i < 5; i++) await m.tecla('Tab');
  e = await estado();
  ok('teclado: Tab recorre los cinco enlaces', e.foco === 'Contacto' && e.exp === 'true', JSON.stringify(e));
  await m.tecla('Tab'); e = await estado();
  ok('teclado: salir de la bandeja con Tab la cierra', e.exp === 'false' && e.lista === 'none', JSON.stringify(e));
  // Shift+Tab desde el primer enlace vuelve al botón sin cerrar.
  await m.ev('document.querySelector("[data-std-menu]").focus()'); await m.tecla('Enter'); await m.tecla('Tab'); await m.tecla('Tab', 8);
  e = await estado();
  ok('teclado: Shift+Tab desde la bandeja vuelve al botón y la deja abierta', e.foco === 'boton' && e.exp === 'true', JSON.stringify(e));
  await m.tecla('Escape');
  // Clic fuera cierra sin mover el foco al botón (en un punto que no es enlace ni botón).
  await m.ev('scrollTo(0, 0)'); await m.cuadros();
  const [bx, by] = await m.centro('[data-std-menu]');
  await m.clic(bx, by); e = await estado();
  ok('clic: el botón abre', e.exp === 'true' && e.lista === 'block', JSON.stringify(e));
  const fuera = await m.ev(`(() => { const b = document.querySelector('.std-gnav__enlaces').getBoundingClientRect(); for (let y = b.bottom + 20; y < innerHeight; y += 8) { const el = document.elementFromPoint(30, y); if (el && !el.closest('a, button, .std-gnav')) return [30, y, el.tagName + '.' + el.className]; } return null; })()`);
  await m.clic(fuera[0], fuera[1]); e = await estado(); e.bajoClic = fuera[2];
  ok('clic fuera cierra y no lleva el foco al botón', e.exp === 'false' && e.lista === 'none' && e.foco !== 'boton', JSON.stringify(e));
  // Clic en una zona sin foco de la bandeja (su relleno) no la cierra.
  await m.ev('scrollTo(0, 0)'); await m.cuadros();
  await m.clic(bx, by);
  const [px, py] = await m.ev(`(() => { const b = document.querySelector('.std-gnav__enlaces').getBoundingClientRect(); return [b.right - 6, b.bottom - 8]; })()`);
  await m.clic(px, py); e = await estado();
  ok('clic en el relleno de la bandeja no la cierra', e.exp === 'true', JSON.stringify(e));
  // Un enlace de la bandeja cierra y navega a su ancla, sin devolver el foco al botón.
  const [lx, ly] = await m.centro('.std-gnav__enlaces li:first-child a');
  await m.clic(lx, ly); e = await estado();
  const bajoSub = await m.ev(`Math.round(document.querySelector('#claro').getBoundingClientRect().top - document.querySelector('.std-subnav').getBoundingClientRect().bottom)`);
  ok('enlace de la bandeja: cierra, salta al ancla y no devuelve el foco', e.exp === 'false' && e.hash === '#claro' && e.foco !== 'boton' && e.y > 0 && bajoSub >= 0, JSON.stringify({ ...e, bajoSub }));

  // Arreglo 4: girar el celular con la bandeja abierta (cruzar los 833 px) la cierra y deja aria-expanded="false".
  await m.ev('scrollTo(0, 0)'); await m.cuadros();
  await m.clic(bx, by); e = await estado();
  const abiertaAntes = e.exp === 'true' && e.lista === 'block';
  await m.vista(1024, 700, true, 2); await m.cuadros(); await m.cuadros();
  const horizontal = await estado();
  await m.vista(375, 812, true, 2); await m.cuadros(); await m.cuadros();
  const vertical = await estado();
  ok('arreglo 4: al cruzar los 833 px con la bandeja abierta se cierra y no reaparece al volver',
    abiertaAntes && horizontal.exp === 'false' && !horizontal.clase && vertical.exp === 'false' && !vertical.clase && vertical.lista === 'none',
    JSON.stringify({ abiertaAntes, horizontal, vertical }));
  ok('sin errores en la consola (celular)', m.errores.length === 0, JSON.stringify(m.errores));
  await m.ev(`location.hash = '#negro'; scrollBy(0, 40)`); await m.cuadros();
  o = await m.ev(ORACULO);
  ok('celular: sub-navegación oscura sobre el bloque negro', o.real && o.esperado, JSON.stringify(o));
  await m.captura('7-celular-subnav-oscura');

  // ── Sin JS, 375 px: enlaces en la barra y sin botón ─────────────────────────────────────
  const n = await nuevaPagina();
  await n.send('Emulation.setScriptExecutionDisabled', { value: true });
  await n.vista(375, 812, true, 2);
  const carga = n.esperar('Page.loadEventFired'); await n.send('Page.navigate', { url: URL_DEMO }); await carga; await dormir(300);
  const { root } = await n.send('DOM.getDocument', { depth: -1 });
  const estilo = async (sel, prop) => {
    const { nodeId } = await n.send('DOM.querySelector', { nodeId: root.nodeId, selector: sel });
    const { computedStyle } = await n.send('CSS.getComputedStyleForNode', { nodeId });
    return computedStyle.find((x) => x.name === prop)?.value;
  };
  const sinJs = [await estilo('.std-gnav__menu', 'display'), await estilo('.std-gnav__enlaces', 'display'), await estilo('.std-gnav', 'height')];
  ok('sin JS: botón oculto y enlaces visibles en la barra', sinJs[0] === 'none' && sinJs[1] === 'flex', JSON.stringify(sinJs));
  await n.captura('8-celular-sin-js');

  // ── Maqueta, como referencia visual ───────────────────────────────────────────────────
  if (maq) {
    const q = await nuevaPagina();
    await q.vista(1280, 800);
    const c2 = q.esperar('Page.loadEventFired'); await q.send('Page.navigate', { url: `${maq.base}/prueba.html` }); await c2; await dormir(3500);
    await q.captura('9-maqueta-computador');
    await q.vista(375, 812, true, 2); await dormir(1500);
    await q.captura('10-maqueta-celular');
  }
} catch (err) {
  console.error('ERROR', err);
  resultados.push({ nombre: 'script', ok: false, detalle: String(err) });
} finally {
  const fallidas = resultados.filter((r) => !r.ok);
  console.log(`\n${resultados.length - fallidas.length}/${resultados.length} verificaciones OK · capturas en ${OUT}`);
  clearTimeout(vigia);
  limpiar();
  process.exit(fallidas.length ? 1 : 0);
}
