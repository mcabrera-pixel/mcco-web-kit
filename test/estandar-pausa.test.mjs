// Pruebas de lib/estandar/pausa.js con un documento mínimo: una sola pausa para todos los botones [data-std-pausa] (el
// del hero y el de la historia), con su texto y sin aria-pressed, y el evento std-pausa en window en cada cambio.
import { test } from 'node:test';
import assert from 'node:assert/strict';

class Boton extends EventTarget {
  textContent = 'Pausar movimiento';
  #atributos = new Map();
  setAttribute(nombre, valor) { this.#atributos.set(nombre, String(valor)); }
  getAttribute(nombre) { return this.#atributos.get(nombre) ?? null; }
}
const hero = new Boton(), historia = new Boton();
globalThis.document = { querySelectorAll: (sel) => (sel === '[data-std-pausa]' ? [hero, historia] : []) };
const ventana = new EventTarget();
globalThis.addEventListener = ventana.addEventListener.bind(ventana);
globalThis.dispatchEvent = ventana.dispatchEvent.bind(ventana);
const avisos = [];
addEventListener('std-pausa', (e) => avisos.push(e.detail.pausa));
const { pausado, fijarPausa, marcarMovimiento } = await import('../lib/estandar/pausa.js');

const botones = () => [hero, historia].map((b) => [b.textContent, b.getAttribute('aria-pressed')]);
const clic = (b) => b.dispatchEvent(new Event('click'));
// El texto cambia con el estado, así que no lleva aria-pressed (patrón de botón de WAI-ARIA): con los dos, un lector
// anunciaría «Reanudar movimiento, presionado» con el movimiento detenido.
const PAUSAR = ['Pausar movimiento', null], REANUDAR = ['Reanudar movimiento', null];

test('al cargar: sin pausa, los dos botones dicen «Pausar movimiento», sin aria-pressed, y no hay aviso', () => {
  assert.equal(pausado(), false);
  assert.deepStrictEqual(botones(), [PAUSAR, PAUSAR]);
  assert.deepStrictEqual(avisos, []);
});

// Rompe si cada botón lleva su propio estado: el del hero y el de la historia tienen que decir lo mismo siempre.
test('el botón del hero pausa todo: los dos botones cambian y llega un solo std-pausa { pausa: true }', () => {
  clic(hero);
  assert.equal(pausado(), true);
  assert.deepStrictEqual(botones(), [REANUDAR, REANUDAR]);
  assert.deepStrictEqual(avisos, [true]);
});

test('el botón de la historia reanuda todo', () => {
  clic(historia);
  assert.equal(pausado(), false);
  assert.deepStrictEqual(botones(), [PAUSAR, PAUSAR]);
  assert.deepStrictEqual(avisos, [true, false]);
});

// Rompe si fijarPausa avisa sin cambio: la nube y el campo reaccionan a cada aviso.
test('fijarPausa avisa solo cuando cambia el estado', () => {
  fijarPausa(true);
  fijarPausa(true);
  assert.deepStrictEqual(botones(), [REANUDAR, REANUDAR]);
  fijarPausa(false);
  fijarPausa(false);
  assert.deepStrictEqual(avisos, [true, false, true, false]);
  assert.equal(pausado(), false);
});

// El botón de pausa del hero se ve mientras el hero lleve data-std-movimiento (sin depender de :has()). Rompe si una
// fuente que se apaga (el campo sin contexto, por ejemplo) borra la marca de la otra, que sigue moviéndose.
test('marcarMovimiento: una palabra por fuente en data-std-movimiento y sin atributo cuando no queda ninguna', () => {
  const heroFalso = { dataset: {} };
  marcarMovimiento(heroFalso, 'nube', true);
  assert.equal(heroFalso.dataset.stdMovimiento, 'nube');
  marcarMovimiento(heroFalso, 'campo', true);
  marcarMovimiento(heroFalso, 'campo', true);
  assert.equal(heroFalso.dataset.stdMovimiento, 'nube campo');
  marcarMovimiento(heroFalso, 'nube', false);
  assert.equal(heroFalso.dataset.stdMovimiento, 'campo');
  marcarMovimiento(heroFalso, 'campo', false);
  assert.equal('stdMovimiento' in heroFalso.dataset, false);
  assert.doesNotThrow(() => marcarMovimiento(null, 'campo', true));
});
