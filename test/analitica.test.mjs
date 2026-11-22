// gtag.js en diferido (v1.5.4): la etiqueta de Google no se descarga al cargar la página. Se pide con la primera
// interacción o a los 4 s, lo que ocurra primero y una sola vez; mientras tanto los eventos esperan en dataLayer.
// Se evalúa el script real que emite Analytics con dobles de window, document y los temporizadores.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { gtagDiferido } from '../lib/analitica.mjs';

function pagina(ids) {
  const oyentes = new Map();
  const temporizadores = [];
  const agregados = [];
  const window = {
    addEventListener: (n, f) => oyentes.set(n, f),
    removeEventListener: (n, f) => { if (oyentes.get(n) === f) oyentes.delete(n); },
  };
  const document = { createElement: (etiqueta) => ({ etiqueta }), head: { appendChild: (e) => agregados.push(e) } };
  const setTimeout = (f, ms) => { temporizadores.push({ f, ms, activo: true }); return temporizadores.length - 1; };
  const clearTimeout = (i) => { if (temporizadores[i]) temporizadores[i].activo = false; };
  new Function('window', 'document', 'setTimeout', 'clearTimeout', `with (window) { ${gtagDiferido(ids)} }`)(window, document, setTimeout, clearTimeout);
  const interactuar = (n) => oyentes.get(n)?.();
  const vencer = () => temporizadores.filter((t) => t.activo).forEach((t) => { t.activo = false; t.f(); });
  return { window, oyentes, temporizadores, agregados, interactuar, vencer };
}

test('al cargar la página no se pide gtag.js y la configuración queda en dataLayer', () => {
  const p = pagina(['G-AAAA1111', 'AW-222222']);
  assert.deepEqual(p.agregados, []);
  const ordenes = p.window.dataLayer.map((a) => Array.from(a).slice(0, 2));
  assert.equal(ordenes[0][0], 'js');
  assert.deepEqual(ordenes.slice(1), [['config', 'G-AAAA1111'], ['config', 'AW-222222']]);
});

test('la primera interacción pide gtag.js con el primer id, una sola vez', () => {
  const p = pagina(['G-AAAA1111', 'AW-222222']);
  p.interactuar('pointerdown');
  p.interactuar('scroll');
  p.vencer();
  assert.equal(p.agregados.length, 1);
  assert.deepEqual(p.agregados[0], { etiqueta: 'script', async: true, src: 'https://www.googletagmanager.com/gtag/js?id=G-AAAA1111' });
  assert.equal(p.oyentes.size, 0, 'los oyentes se retiran al pedir la etiqueta');
});

test('sin interacción, gtag.js se pide a los 4 s', () => {
  const p = pagina(['G-AAAA1111']);
  assert.deepEqual(p.temporizadores.map((t) => t.ms), [4000]);
  p.vencer();
  assert.equal(p.agregados.length, 1);
  p.interactuar('keydown');
  assert.equal(p.agregados.length, 1);
});

test('escucha puntero, teclado, toque y desplazamiento', () => {
  assert.deepEqual([...pagina(['G-AAAA1111']).oyentes.keys()].sort(), ['keydown', 'pointerdown', 'scroll', 'touchstart']);
});

test('sin ids no hay script', () => {
  assert.equal(gtagDiferido([]), '');
});
