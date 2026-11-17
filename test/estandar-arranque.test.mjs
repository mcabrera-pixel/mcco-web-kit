// Arranque diferido del WebGL (K-143): el primer getContext('webgl2') de la página bloquea el hilo principal mientras
// el proceso de GPU termina de iniciar, y dentro del callback del IntersectionObserver cae pegado al primer pintado
// (tareas largas de 65 a 177 ms en la portada de condron.cl con v1.4.2). El campo y la nube crean su contexto en una
// tarea aparte: el callback del observador solo la agenda, tras un retraso y en tiempo ocioso. Dobles del DOM, sin GPU.
import { test } from 'node:test';
import assert from 'node:assert/strict';

const contextos = [];
const lienzo = () => ({ style: {}, dataset: {}, remove() {}, setAttribute() {}, addEventListener() {},
  getContext(tipo) { contextos.push(tipo); return null; } });
const elemento = (extra = {}) => ({ dataset: {}, style: {}, setAttribute() {}, removeAttribute() {}, toggleAttribute() {},
  closest: () => null, querySelector: () => null, querySelectorAll: () => [], getBoundingClientRect: () => ({}), ...extra });
const heroCampo = elemento();
const capaCampo = elemento({ closest: (sel) => (sel === '.std-hero' ? heroCampo : null), parentElement: heroCampo });
const respaldo = { getAttribute: (n) => (n === 'src' ? '/media/nube/a.webp' : null) };
const anclaNube = elemento({ querySelector: (sel) => (sel === 'img' ? respaldo : null) });
const selectores = { '[data-std-campo]': capaCampo, '[data-std-nube="hero"]': anclaNube };

const ociosos = [], temporizadores = [], observadores = [];
globalThis.window = globalThis;
globalThis.document = { readyState: 'complete', baseURI: 'https://ejemplo.cl/', documentElement: elemento(),
  querySelector: (sel) => selectores[sel] ?? null, querySelectorAll: () => [], addEventListener() {},
  createElement: (tag) => (tag === 'canvas' ? lienzo() : elemento()) };
globalThis.addEventListener = () => {};
globalThis.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
globalThis.requestIdleCallback = (fn) => ociosos.push(fn);
globalThis.cancelAnimationFrame = () => {};
globalThis.IntersectionObserver = class {
  constructor(cb) { this.cb = cb; this.objetivos = []; observadores.push(this); }
  observe(el) { this.objetivos.push(el); }
  disconnect() {}
};

const reloj = globalThis.setTimeout;
function correr(cola) { while (cola.length) cola.shift()(); }
// Mientras dura la prueba, setTimeout solo anota: así se ve qué corre dentro del callback y qué queda para después.
function conTemporizadoresAnotados(fn) {
  globalThis.setTimeout = (cb, ms = 0, ...args) => { temporizadores.push({ ms, cb: () => cb(...args) }); return temporizadores.length; };
  try { fn(); } finally { globalThis.setTimeout = reloj; }
}

for (const [nombre, modulo, ancla] of [['campo', '../lib/estandar/campo.js', capaCampo], ['nube', '../lib/estandar/nube.js', anclaNube]]) {
  test(`${nombre}: el contexto WebGL2 se crea en una tarea diferida, no en el callback del observador`, async () => {
    contextos.length = 0;
    await import(`${modulo}?arranque=${nombre}`);
    correr(ociosos); // alArrancar: después de la carga y en tiempo ocioso se pone a vigilar
    const io = observadores.find((o) => o.objetivos.includes(ancla));
    assert.ok(io, 'vigila su ancla con un IntersectionObserver');
    conTemporizadoresAnotados(() => {
      io.cb([{ isIntersecting: true, target: ancla }]);
      assert.deepEqual(contextos, [], 'el callback del observador no crea el contexto');
      const espera = temporizadores.shift();
      assert.ok(espera && espera.ms >= 300, `agenda el arranque con un retraso de al menos 300 ms (${espera?.ms})`);
      espera.cb();
      assert.deepEqual(contextos, [], 'después del retraso espera además tiempo ocioso');
      correr(ociosos);
    });
    assert.deepEqual(contextos, ['webgl2'], 'en la tarea diferida crea un solo contexto WebGL2');
  });
}
