#!/usr/bin/env node
// Campo despejado detrás del texto del hero (v1.4.1; antetítulo y cifras, v1.4.2). Página de contrato sin Astro (test/fixtures/estandar-html),
// copiada con estandar-copiar --completo y servida con los mismos encabezados CSP que estandar-html.verificar.mjs.
// En 1366 × 650 y 390 × 844 px, con el centro del campo sobre la bajada y un cuadro fijado con la pausa común:
// - bajo la caja del texto del H1, de la bajada y de las acciones el lienzo no tiene ningún píxel con alfa > 0;
// - en el hero lejos del texto (y fuera de la nube) sí hay guiones;
// - el borde es suave: la franja pegada al texto tiene mucho menos alfa media que una franja algo más afuera;
// - tras alargar la bajada y tras cambiar el tamaño de la ventana se cumple lo mismo sobre las cajas nuevas;
// - con texto .std-oculto (solo para lectores de pantalla) en las acciones, la zona despejada no crece hacia donde ese
//   texto no se ve: a la derecha del texto visible sigue habiendo campo (variante oculto.html, en 1366 px);
// - con texto propio del sitio, con clases que el kit no conoce (variante cifras.html, como la portada de as-built: un
//   antetítulo .eyebrow antes del H1 y una fila de cifras <dl class="proof-row"> después de las acciones, con su CSS en
//   línea), tampoco hay guiones bajo el texto del antetítulo ni bajo el de cada cifra, en 1366 × 650 y 390 × 844. La
//   última cifra lleva además un texto .sr-only (recorte de 1 px, como as-built) largo y sin cortes de línea, que no
//   se ve y no agranda la zona: en 1366 px sigue habiendo campo a la derecha del texto visible;
// - con texto del sitio dentro de elementos en línea que envuelven un bloque (variante nota.html: una nota enlazada
//   <a class="nota"><p>…</p></a> y un elemento propio <x-nota><div>…</div></x-nota> después de las acciones, cuyo
//   primer rectángulo es un fragmento vacío de 0 × 0 px y no un recorte de 1 px), tampoco hay guiones bajo su texto,
//   en 1366 × 650 y 390 × 844. Va en una página aparte para no cambiar la geometría de cifras.html. Lleva también un
//   campo de formulario (<input> con placeholder), cuyo texto no es un nodo: no hay guiones bajo su caja.
// La caja de cada pieza es la de su texto: un Range sobre el contenido del H1 y de la bajada (sus líneas) y la unión
// de las píldoras de las acciones. La del elemento también se registra en la evidencia: el H1 y la bajada son bloques
// del ancho del hero. La del antetítulo, la de cada cifra y la de cada nota se miden aparte, sobre sus nodos de texto
// (un Range por nodo, sin los que están en blanco ni los de .sr-only).
// Para leer el lienzo WebGL sin depender del compositor se fuerza preserveDrawingBuffer con un script previo a la carga.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { navegador, dormir } from './fixtures/navegador.mjs';
import { KIT } from '../scripts/estandar-verificar.mjs';

const salida = path.resolve(process.env.ESTANDAR_EVIDENCIA || path.join(KIT, '.tmp-prueba-html'), 'campo-texto');
process.env.TMPDIR ||= KIT;
const sitio = path.join(salida, 'html');
fs.rmSync(salida, { recursive: true, force: true });
fs.mkdirSync(salida, { recursive: true });
fs.cpSync(path.join(KIT, 'test/fixtures/estandar-html'), sitio, { recursive: true });
const copia = spawnSync(process.execPath, [path.join(KIT, 'scripts/estandar-copiar.mjs'), path.join(sitio, 'estandar'), '--completo'], { encoding: 'utf8', timeout: 120000 });
assert.equal(copia.status, 0, copia.stdout + copia.stderr);
// Variante con la prop `oculto` de Acciones en el hero: un span .std-oculto largo en cada píldora.
const contrato = fs.readFileSync(path.join(sitio, 'index.html'), 'utf8');
const acciones = '<a class="std-pildora" href="#galeria">Ver piezas</a><a class="std-pildora std-pildora--fantasma" href="#pie">Contacto</a>';
assert.ok(contrato.includes(acciones));
fs.writeFileSync(path.join(sitio, 'oculto.html'), contrato.replace(acciones,
  '<a class="std-pildora" href="#galeria">Ver piezas<span class="std-oculto"> del contrato del estándar, con todas sus piezas y variantes</span></a>' +
  '<a class="std-pildora std-pildora--fantasma" href="#pie">Contacto<span class="std-oculto"> con el equipo comercial del grupo y de sus marcas, en Chile y en el extranjero</span></a>'));
// Variante con texto propio del sitio en el hero, como la portada de as-built: antetítulo antes del H1 y fila de cifras
// después de las acciones, con clases que el kit no conoce y su CSS en línea (el de portada.css de as-built).
const cifrasCss = `<style>
.std-hero .eyebrow { font-size: 12px; letter-spacing: .04em; color: var(--std-gris); margin: 0 0 16px; }
.std-hero .proof-row { display: flex; justify-content: center; gap: 40px; max-width: 780px; margin: 32px auto 0; padding-top: 24px; border-top: 1px solid var(--std-linea); }
.std-hero .proof-row dt { font-size: 24px; line-height: 1.2; color: var(--std-tinta); }
.std-hero .proof-row dd { margin: 6px 0 0; font-size: 14px; line-height: 1.47; color: var(--std-gris); max-width: 220px; }
.std-hero .nota, .std-hero x-nota { font-size: 14px; line-height: 1.47; color: var(--std-gris); }
.std-hero .nota p { margin: 32px 0 0; }
.std-hero x-nota div { margin: 8px 0 0; }
.std-hero .correo { margin: 8px 0 0; font: 14px/1.47 inherit; }
.sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0,0,0,0); white-space: nowrap; border: 0; }
@media (max-width: 640px) {
  .std-hero .proof-row { gap: 14px; margin-top: 28px; }
  .std-hero .proof-row > div { flex: 1; }
  .std-hero .proof-row dt { font-size: 21px; }
  .std-hero .proof-row dd { font-size: 12px; }
}
</style>`;
const h1 = '<h1 class="std-h1" id="std-hero-titulo">';
assert.ok(contrato.includes(h1) && contrato.includes('</head>'));
fs.writeFileSync(path.join(sitio, 'cifras.html'), contrato.replace('</head>', cifrasCss + '</head>')
  .replace(h1, '<p class="eyebrow">Escaneo láser para minería e industria</p>' + h1)
  .replace(acciones + '</div>', acciones + '</div><dl class="proof-row">' +
    '<div><dt>±<span>2</span> mm</dt><dd>precisión de levantamiento</dd></div>' +
    '<div><dt>FARO</dt><dd>escáner con certificado de calibración</dd></div>' +
    '<div><dt>UF <span>45</span></dt><dd>desde, control dimensional<span class="sr-only"> en plantas de procesos, chancadores, molinos y estructuras de faenas mineras e industriales de todo Chile</span></dd></div></dl>'));
// Variante con texto del sitio dentro de elementos en línea que envuelven un bloque, después de las acciones.
fs.writeFileSync(path.join(sitio, 'nota.html'), contrato.replace('</head>', cifrasCss + '</head>')
  .replace(acciones + '</div>', acciones + '</div>' +
    '<a class="nota" href="#pie"><p>Nota enlazada: plazos y condiciones del servicio</p></a>' +
    '<x-nota><div>Aviso de un elemento propio del sitio</div></x-nota>' +
    '<input class="correo" type="email" placeholder="Tu correo" aria-label="Correo">'));
if (!process.env.CHROME) throw new Error('Falta CHROME: ruta al ejecutable de Chrome/Chromium. Se usa CDP, sin Playwright.');
const headers = { 'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; media-src 'self'; worker-src 'self'; connect-src 'self'", 'X-Content-Type-Options': 'nosniff' };
const opciones = { headers, temporales: salida, chromeArgs: process.env.ESTANDAR_SWIFTSHADER === '1' ? ['--enable-unsafe-swiftshader', '--use-angle=swiftshader'] : [] };

// Franjas alrededor de la caja unión del texto, en píxeles CSS: pegada (0-16), media (48-112) y lejos (desde 64).
const CERCA = 16, MEDIA = [48, 112], LEJOS = 64;
// Lejos del texto tiene que haber campo de verdad: al menos 100 píxeles pintados y un 0,3 % de la zona (v1.4.0
// pinta de 200 a 1800 y del 0,7 al 3,3 %; en 390 px la zona lejana son solo las orillas al lado de la nube).
const MIN_PINTADOS = 100, MIN_FRACCION = 0.003;
// Un recorte duro en el borde deja la franja pegada con casi la misma alfa media que la media; el desvanecimiento no.
const BORDE_SUAVE = 0.35;
// Rampa (8-20 px de la caja): tiene que haber guiones y todos tenues, con alfa máxima bajo la mitad de la de la zona
// lejana. Un corte duro a d ≤ ~25 px deja ahí guiones con alfa plena; uno más lejos la deja vacía; uno más cerca que
// 16 px lo atrapa BORDE_SUAVE. Con la rampa smoothstep(8, 56) la razón queda cerca de 0,3.
const RAMPA = [8, 20], TENUE = 0.5;

// Antes de la carga: lienzos WebGL2 con preserveDrawingBuffer (lectura estable) y la medición, solo para la prueba.
const antes = `
const get = HTMLCanvasElement.prototype.getContext;
HTMLCanvasElement.prototype.getContext = function (t, o, ...a) { return get.call(this, t, t === 'webgl2' ? { ...o, preserveDrawingBuffer: true } : o, ...a); };
window.__campoTexto = (extra = {}, enteros = {}) => {
  const host = document.querySelector('[data-std-campo]'), hero = host.closest('.std-hero'), c = host.querySelector('canvas');
  if (!c) return null;
  const z = host.getBoundingClientRect(), sx = c.width / z.width, sy = c.height / z.height;
  const t = document.createElement('canvas'); t.width = c.width; t.height = c.height;
  const g = t.getContext('2d', { willReadFrequently: true }); g.drawImage(c, 0, 0);
  const datos = g.getImageData(0, 0, c.width, c.height).data;
  const rel = r => ({ x0: r.left - z.left, y0: r.top - z.top, x1: r.right - z.left, y1: r.bottom - z.top });
  const piezas = { h1: 'h1', bajada: '.std-hero__bajada', acciones: '.std-acciones' };
  const unir = v => ({ x0: Math.min(...v.map(b => b.x0)), y0: Math.min(...v.map(b => b.y0)), x1: Math.max(...v.map(b => b.x1)), y1: Math.max(...v.map(b => b.y1)) });
  const cajas = {}, elementos = {}, rangos = {};
  for (const [n, s] of Object.entries(piezas)) {
    const e = hero.querySelector(s), r = document.createRange();
    r.selectNodeContents(e);
    rangos[n] = rel(r.getBoundingClientRect());
    elementos[n] = rel(e.getBoundingClientRect());
    cajas[n] = n === 'acciones' ? unir([...e.children].map(a => rel(a.getBoundingClientRect()))) : rangos[n];
  }
  // Piezas propias del sitio (nombre: selector; si hay varias, nombre1, nombre2…): la unión de las cajas de sus nodos
  // de texto visibles, un Range por nodo, sin los que están en blanco ni los que están dentro de .sr-only.
  const textoDe = e => {
    const w = document.createTreeWalker(e, NodeFilter.SHOW_TEXT), r = document.createRange(), v = [];
    for (let t; (t = w.nextNode());) {
      if (!t.data.trim() || t.parentElement.closest('.sr-only')) continue;
      r.selectNodeContents(t);
      const b = r.getBoundingClientRect();
      if (b.width) v.push(rel(b));
    }
    return unir(v);
  };
  for (const [n, s] of Object.entries(extra)) {
    const v = [...hero.querySelectorAll(s)];
    if (!v.length) throw new Error('Falta la pieza ' + n + ': ' + s);
    v.forEach((e, i) => { const k = v.length > 1 ? n + (i + 1) : n; cajas[k] = textoDe(e); elementos[k] = rel(e.getBoundingClientRect()); });
  }
  // Piezas que cuentan con su caja completa, como los campos de formulario (su texto no es un nodo).
  for (const [n, s] of Object.entries(enteros)) {
    const e = hero.querySelector(s);
    if (!e) throw new Error('Falta la pieza ' + n + ': ' + s);
    cajas[n] = elementos[n] = rel(e.getBoundingClientRect());
  }
  const union = unir(Object.values(cajas));
  const ancla = hero.querySelector('[data-std-nube="hero"]');
  const nube = ancla ? rel(ancla.getBoundingClientRect()) : null;
  // Bajo una caja cuenta todo píxel del lienzo que la toque, aunque sea en parte.
  const bajo = b => {
    let pixeles = 0, pintados = 0, alfaMax = 0;
    for (let y = Math.max(0, Math.floor(b.y0 * sy)); y < Math.min(c.height, Math.ceil(b.y1 * sy)); y++)
      for (let x = Math.max(0, Math.floor(b.x0 * sx)); x < Math.min(c.width, Math.ceil(b.x1 * sx)); x++) {
        const a = datos[(y * c.width + x) * 4 + 3]; pixeles++;
        if (a > 0) { pintados++; alfaMax = Math.max(alfaMax, a); }
      }
    return { pixeles, pintados, alfaMax };
  };
  // Las franjas usan el centro de cada píxel y su distancia a la caja unión; fuera de la nube y del borde inferior
  // difuminado del hero (70 px), que atenúan el campo por su cuenta.
  const zona = dentro => {
    let pixeles = 0, pintados = 0, suma = 0, alfaMax = 0;
    for (let y = 0; y < c.height; y++) {
      const cy = (y + .5) / sy;
      if (cy > z.height - 70) break;
      for (let x = 0; x < c.width; x++) {
        const cx = (x + .5) / sx;
        if (nube && cx >= nube.x0 && cx <= nube.x1 && cy >= nube.y0 && cy <= nube.y1) continue;
        const d = Math.hypot(Math.max(union.x0 - cx, 0, cx - union.x1), Math.max(union.y0 - cy, 0, cy - union.y1));
        if (!dentro(cx, cy, d)) continue;
        const a = datos[(y * c.width + x) * 4 + 3]; pixeles++;
        if (a > 0) { pintados++; suma += a; alfaMax = Math.max(alfaMax, a); }
      }
    }
    return { pixeles, pintados, fraccion: pixeles ? pintados / pixeles : 0, alfaMedia: pixeles ? suma / pixeles / 255 : 0, alfaMax };
  };
  const franja = (desde, hasta) => zona((cx, cy, d) => d > desde && d <= hasta);
  const centro = window.__mccoCampo.state.center;
  return {
    lienzo: [c.width, c.height], escala: [sx, sy], centro, cajas, elementos, rangos, union, nube,
    centroEnTexto: centro[0] >= union.x0 && centro[0] <= union.x1 && centro[1] >= union.y0 && centro[1] <= union.y1,
    bajo: Object.fromEntries(Object.entries(cajas).map(([n, b]) => [n, bajo(b)])),
    cerca: franja(0, ${CERCA}), media: franja(${MEDIA[0]}, ${MEDIA[1]}), lejos: franja(${LEJOS}, Infinity),
    rampa: franja(${RAMPA[0]}, ${RAMPA[1]}),
    // A la derecha del texto visible, a la altura del texto y lejos de él.
    derecha: zona((cx, cy) => cx > union.x1 + ${LEJOS} && cy >= union.y0 && cy <= union.y1),
  };
};`;

let browser;
const resultados = [];
function ok(nombre, valor, detalle) {
  resultados.push({ nombre, ok: !!valor, detalle });
  console.log(`${valor ? 'OK' : 'FALLA'} ${nombre}${detalle === undefined ? '' : ': ' + JSON.stringify(detalle)}`);
}
const despejado = m => Object.values(m.bajo).every(b => b.pintados === 0);
const conCampo = m => m.lejos.pintados >= MIN_PINTADOS && m.lejos.fraccion >= MIN_FRACCION;
// Cada cuadro fijado se evalúa completo: centro en el texto (si se pide), texto despejado, campo lejos y borde suave.
function evaluar(nombre, m, { centro = true } = {}) {
  if (centro) ok(`${nombre}: el centro del campo está sobre el texto`, m.centroEnTexto, { centro: m.centro, union: m.union });
  for (const [pieza, b] of Object.entries(m.bajo)) ok(`${nombre}: sin guiones bajo ${pieza}`, b.pintados === 0, { caja: m.cajas[pieza], ...b });
  ok(`${nombre}: hay campo lejos del texto`, conCampo(m), { ...m.lejos, minimo: MIN_PINTADOS, fraccionMinima: MIN_FRACCION });
  ok(`${nombre}: borde suave`, m.media.alfaMedia > 0 && m.cerca.alfaMedia < BORDE_SUAVE * m.media.alfaMedia,
    { cerca: m.cerca, media: m.media, razon: m.media.alfaMedia ? m.cerca.alfaMedia / m.media.alfaMedia : null, maximo: BORDE_SUAVE });
  ok(`${nombre}: rampa sin corte duro (${RAMPA.join('-')} px)`, m.rampa.pintados > 0 && m.lejos.alfaMax > 0 && m.rampa.alfaMax < TENUE * m.lejos.alfaMax,
    { rampa: m.rampa, alfaMaxLejos: m.lejos.alfaMax, razon: m.lejos.alfaMax ? m.rampa.alfaMax / m.lejos.alfaMax : null, maximo: TENUE });
}
// Lleva el mouse al centro de la bajada y espera a que el centro del campo llegue (persigue con unos 1,4 s de retraso);
// después fija el cuadro con la pausa común, que dibuja el campo completo y se detiene.
async function centrarYPausar(p) {
  const [x, y] = await p.ev(`(()=>{const r=document.querySelector('.std-hero__bajada').getBoundingClientRect();return [r.left+r.width/2,r.top+r.height/2]})()`);
  for (let i = 0; i < 6; i++) { await p.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: x + i, y }); await dormir(60); }
  await p.hasta(`(()=>{const z=document.querySelector('[data-std-campo]').getBoundingClientRect(),c=__mccoCampo.state.center;return Math.hypot(c[0]-(${x}-z.left),c[1]-(${y}-z.top))<12})()`, 90000);
  await p.ev('document.querySelector("[data-std-pausa]").click()');
  await p.hasta('__mccoNube.state.paused && !__mccoCampo.state.running');
  await dormir(300);
}
// Tras un cambio, el campo vuelve a dibujarse en pausa: se espera a que el lienzo cumpla o pase el plazo.
async function medirTras(p) {
  const fin = Date.now() + 8000;
  let m;
  do { await dormir(250); m = await p.ev('__campoTexto()'); } while (!(m && despejado(m) && conCampo(m)) && Date.now() < fin);
  return m;
}

try {
  browser = await navegador(sitio, KIT, opciones);
  for (const [w, h, escala, otra] of [[1366, 650, 1, [1024, 600]], [390, 844, 2, [360, 740]], [1366, 650, 1, null],
    [1366, 650, 1, 'cifras'], [390, 844, 2, 'cifras'], [1366, 650, 1, 'nota'], [390, 844, 2, 'nota']]) {
    const p = await browser.pagina(antes);
    const evidencia = {};
    try {
      if (otra === 'nota') {
        // Texto del sitio dentro de elementos en línea que envuelven un bloque: también queda despejado.
        await p.send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: escala, mobile: false });
        await p.ir('/nota.html');
        await p.ev('document.fonts.ready');
        await p.hasta('window.__mccoCampo?.state.puntos>0 && window.__mccoNube?.state.frames>2', 30000);
        await centrarYPausar(p);
        // Precondición del caso: los dos van en línea y envuelven un bloque, así que su primer rectángulo es un
        // fragmento vacío (no un recorte de 1 px) y su caja completa sí tiene tamaño.
        const envoltorios = await p.ev(`['.nota', 'x-nota'].map(s => { const e = document.querySelector(s), [r] = e.getClientRects(), b = e.getBoundingClientRect();
          return { s, display: getComputedStyle(e).display, primero: [r.width, r.height], caja: [b.width, b.height] }; })`);
        ok(`${w}x${h} nota: la nota y el elemento propio son en línea y envuelven un bloque`,
          envoltorios.every(e => e.display === 'inline' && e.primero[0] < 2 && e.primero[1] < 2 && e.caja[0] > 100 && e.caja[1] > 10), envoltorios);
        const m = evidencia.nota = await p.ev(`__campoTexto({ nota: '.nota', elementoPropio: 'x-nota' }, { formulario: '.correo' })`);
        ok(`${w}x${h} nota: la nota, el elemento propio y el campo de formulario están bajo las acciones`,
          m.cajas.nota.y0 >= m.cajas.acciones.y1 && m.cajas.elementoPropio.y0 >= m.cajas.nota.y1 && m.cajas.formulario.y0 >= m.cajas.elementoPropio.y1,
          { acciones: m.cajas.acciones, nota: m.cajas.nota, elementoPropio: m.cajas.elementoPropio, formulario: m.cajas.formulario });
        evaluar(`${w}x${h} nota`, m);
        await p.captura(path.join(salida, `hero-nota-${w}.png`));
        ok(`${w}x${h} nota: excepciones`, p.errores.length === 0, p.errores);
        const fallos = p.red.filter(r => r.status >= 400 || r.fallo), logs = p.consola.filter(r => r.level === 'error');
        ok(`${w}x${h} nota: recursos, MIME y CSP`, fallos.length === 0 && logs.length === 0, { fallos, logs });
        continue;
      }
      if (otra === 'cifras') {
        // Antetítulo y fila de cifras con clases propias del sitio: su texto también queda despejado.
        await p.send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: escala, mobile: false });
        await p.ir('/cifras.html');
        await p.ev('document.fonts.ready');
        await p.hasta('window.__mccoCampo?.state.puntos>0 && window.__mccoNube?.state.frames>2', 30000);
        await centrarYPausar(p);
        const m = evidencia.cifras = await p.ev(`__campoTexto({ antetitulo: '.eyebrow', cifra: '.proof-row > div' })`);
        ok(`${w}x${h} cifras: el antetítulo está sobre el H1 y las cifras bajo las acciones`,
          m.cajas.antetitulo.y1 <= m.cajas.h1.y0 && ['cifra1', 'cifra2', 'cifra3'].every(k => m.cajas[k]?.y0 >= m.cajas.acciones.y1),
          { antetitulo: m.cajas.antetitulo, h1: m.cajas.h1, acciones: m.cajas.acciones, cifras: [m.cajas.cifra1, m.cajas.cifra2, m.cajas.cifra3] });
        // El antetítulo es un bloque del ancho del hero; lo que se despeja es su texto.
        ok(`${w}x${h} cifras: el bloque del antetítulo es más ancho que su texto`,
          m.elementos.antetitulo.x1 - m.elementos.antetitulo.x0 > m.cajas.antetitulo.x1 - m.cajas.antetitulo.x0 + 40,
          { bloque: m.elementos.antetitulo, texto: m.cajas.antetitulo });
        evaluar(`${w}x${h} cifras`, m);
        if (w > 900) ok(`${w}x${h} cifras: hay campo a la derecha del texto visible (el .sr-only no cuenta)`,
          m.derecha.pintados >= MIN_PINTADOS && m.derecha.fraccion >= MIN_FRACCION, { ...m.derecha, minimo: MIN_PINTADOS, fraccionMinima: MIN_FRACCION });
        await p.captura(path.join(salida, `hero-cifras-${w}.png`));
        ok(`${w}x${h} cifras: excepciones`, p.errores.length === 0, p.errores);
        const fallos = p.red.filter(r => r.status >= 400 || r.fallo), logs = p.consola.filter(r => r.level === 'error');
        ok(`${w}x${h} cifras: recursos, MIME y CSP`, fallos.length === 0 && logs.length === 0, { fallos, logs });
        continue;
      }
      if (!otra) {
        // Texto .std-oculto en las acciones: se lee con lector de pantalla pero no se ve, así que no despeja campo.
        await p.send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: escala, mobile: false });
        await p.ir('/oculto.html');
        await p.ev('document.fonts.ready');
        await p.hasta('window.__mccoCampo?.state.puntos>0 && window.__mccoNube?.state.frames>2', 30000);
        await centrarYPausar(p);
        const m = evidencia.oculto = await p.ev('__campoTexto()');
        ok(`${w}x${h} oculto: el Range de las acciones sí incluye el texto oculto`, m.rangos.acciones.x1 > m.union.x1 + 200, { rango: m.rangos.acciones, union: m.union });
        evaluar(`${w}x${h} oculto`, m);
        ok(`${w}x${h} oculto: hay campo a la derecha del texto visible`, m.derecha.pintados >= MIN_PINTADOS && m.derecha.fraccion >= MIN_FRACCION,
          { ...m.derecha, minimo: MIN_PINTADOS, fraccionMinima: MIN_FRACCION });
        await p.captura(path.join(salida, `hero-${w}-oculto.png`));
        ok(`${w}x${h} oculto: excepciones`, p.errores.length === 0, p.errores);
        continue;
      }
      await p.send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: escala, mobile: false });
      await p.ir('/index.html');
      await p.ev('document.fonts.ready');
      await p.hasta('window.__mccoCampo?.state.puntos>0 && window.__mccoNube?.state.frames>2', 30000);
      await centrarYPausar(p);
      const inicial = evidencia.inicial = await p.ev('__campoTexto()');
      evaluar(`${w}x${h}`, inicial);
      await p.captura(path.join(salida, `hero-${w}-inicial.png`));

      // El contenido cambia de alto: la bajada pasa a varias líneas y las acciones bajan.
      await p.ev(`document.querySelector('.std-hero__bajada').textContent += ' Una bajada bastante más larga, para que ocupe varias líneas del hero y empuje hacia abajo las acciones.'`);
      const alargada = evidencia.alargada = await medirTras(p);
      ok(`${w}x${h} bajada alargada: la bajada creció`, alargada.cajas.bajada.y1 - alargada.cajas.bajada.y0 > inicial.cajas.bajada.y1 - inicial.cajas.bajada.y0 + 20,
        { antes: inicial.cajas.bajada, despues: alargada.cajas.bajada });
      evaluar(`${w}x${h} bajada alargada`, alargada);
      await p.captura(path.join(salida, `hero-${w}-bajada-larga.png`));

      // La ventana cambia de tamaño: se reanuda, el centro vuelve a la bajada y se fija otro cuadro.
      await p.send('Emulation.setDeviceMetricsOverride', { width: otra[0], height: otra[1], deviceScaleFactor: escala, mobile: false });
      const redimensionada = evidencia.redimensionadaEnPausa = await medirTras(p);
      evaluar(`${w}x${h} → ${otra.join('x')} en pausa`, redimensionada, { centro: false });
      await p.ev('document.querySelector("[data-std-pausa]").click()');
      await p.hasta('!__mccoNube.state.paused');
      await centrarYPausar(p);
      const final = evidencia.redimensionada = await p.ev('__campoTexto()');
      evaluar(`${w}x${h} → ${otra.join('x')}`, final);
      await p.captura(path.join(salida, `hero-${w}-redimensionado.png`));

      ok(`${w}x${h}: excepciones`, p.errores.length === 0, p.errores);
      const fallos = p.red.filter(r => r.status >= 400 || r.fallo), logs = p.consola.filter(r => r.level === 'error');
      ok(`${w}x${h}: recursos, MIME y CSP`, fallos.length === 0 && logs.length === 0, { fallos, logs });
    } catch (e) {
      ok(`${w}x${h}`, false, e.message);
    } finally {
      fs.writeFileSync(path.join(salida, `medidas-${w}${typeof otra === 'string' ? '-' + otra : otra ? '' : '-oculto'}.json`), JSON.stringify(evidencia, null, 2) + '\n');
      await p.cerrar();
    }
  }
} finally {
  await browser?.cerrar();
  fs.writeFileSync(path.join(salida, 'resultados.json'), JSON.stringify(resultados, null, 2) + '\n');
}
console.log(`${resultados.filter(r => r.ok).length}/${resultados.length} comprobaciones; evidencia: ${salida}`);
process.exitCode = resultados.some(r => !r.ok) ? 1 : 0;
