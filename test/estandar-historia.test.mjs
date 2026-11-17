// Pruebas de lib/estandar/historia.js: el progreso de la historia en negro y el traslado de la nube desde el hero.
// La historia sigue la línea de tiempo de la prueba aprobada: 0,3 de espera y, por cada forma siguiente, 0,9 de cambio
// con la curva power2.inOut y 0,45 quieta. Con cuatro formas son 0,3 + 3 × 1,35 = 4,35 unidades de recorrido.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { morphDesdeProgreso, pasoActivo, progresoSeccion, trasladoNube } from '../lib/estandar/historia.js';
import * as historia from '../lib/estandar/historia.js';

test('cabeHistoria: exige el corte y reserva nube, textos, controles y subnav', () => {
  const medidas = { escritorio: true, viewport: 700, subnav: 52, relleno: 106, contenido: 342, nube: 200 };
  assert.equal(historia.cabeHistoria(medidas), true);
  assert.equal(historia.cabeHistoria({ ...medidas, escritorio: false }), false);
  assert.equal(historia.cabeHistoria({ ...medidas, contenido: 342.1 }), false);
  assert.equal(historia.cabeHistoria({ ...medidas, nube: 201 }), false);
});

test('cabeHistoria: textos y espaciado mayores obligan al flujo y pueden volver a caber', () => {
  const medidas = { escritorio: true, viewport: 800, subnav: 52, relleno: 106, contenido: 600, nube: 200 };
  assert.equal(historia.cabeHistoria(medidas), false);
  assert.equal(historia.cabeHistoria({ ...medidas, contenido: 300 }), true);
  assert.equal(historia.cabeHistoria({ ...medidas, viewport: 1000 }), true);
});

test('cabeHistoria: una medición incompleta o inválida conserva el flujo', () => {
  const medidas = { escritorio: true, viewport: 800, subnav: 52, relleno: 106, contenido: 300, nube: 200 };
  for (const clave of ['viewport', 'subnav', 'relleno', 'contenido', 'nube']) {
    for (const valor of [NaN, Infinity, undefined, -1]) {
      assert.equal(historia.cabeHistoria({ ...medidas, [clave]: valor }), false, `${clave}: ${valor}`);
    }
  }
});

const T = 4.35;

// Rompe si cambian los tramos de la línea de tiempo: la nube tiene que quedar quieta en cada forma el tiempo justo
// para leer su paso, y llegar exacta a la forma siguiente al final de cada cambio.
test('morphDesdeProgreso: espera inicial, llegada a cada forma y final', () => {
  assert.equal(morphDesdeProgreso(0, 4), 0);
  assert.equal(morphDesdeProgreso(1, 4), 3);
  assert.equal(morphDesdeProgreso(0.3 / T, 4), 0);
  assert.ok(Math.abs(morphDesdeProgreso(1.2 / T, 4) - 1) < 1e-9);
});

test('morphDesdeProgreso: entre 1,2 y 1,65 la nube queda en la forma 1', () => {
  assert.ok(Math.abs(morphDesdeProgreso(1.65 / T, 4) - 1) < 1e-9);
  for (let k = 1; k < 100; k++) {
    const p = (1.2 + 0.45 * k / 100) / T;
    assert.equal(morphDesdeProgreso(p, 4), 1, `p = ${p}`);
  }
});

// Rompe si el cambio deja de seguir la curva power2.inOut (t < 0,5 ? 2t² : 1 − (−2t + 2)² / 2).
test('morphDesdeProgreso: cada cambio sigue la curva power2.inOut', () => {
  assert.ok(Math.abs(morphDesdeProgreso((0.3 + 0.9 * 0.25) / T, 4) - 0.125) < 1e-9);
  assert.ok(Math.abs(morphDesdeProgreso((0.3 + 0.9 * 0.5) / T, 4) - 0.5) < 1e-9);
  assert.ok(Math.abs(morphDesdeProgreso((1.65 + 0.9 * 0.75) / T, 4) - 1.875) < 1e-9);
});

// Rompe si la nube retrocede al bajar: con scroll rápido o saltos el valor nunca puede volver atrás.
test('morphDesdeProgreso: no decreciente en 1000 pasos de 0 a 1', () => {
  let antes = morphDesdeProgreso(0, 4);
  for (let i = 1; i <= 1000; i++) {
    const m = morphDesdeProgreso(i / 1000, 4);
    assert.ok(m >= antes, `baja en p = ${i / 1000}: ${antes} > ${m}`);
    antes = m;
  }
});

// Rompe si un salto de scroll (ancla, tecla Fin) deja la nube a mitad de camino o fuera de las formas que existen.
test('morphDesdeProgreso: progresos fuera de rango quedan en los extremos', () => {
  assert.equal(morphDesdeProgreso(-0.5, 4), 0);
  assert.equal(morphDesdeProgreso(1.7, 4), 3);
  assert.equal(morphDesdeProgreso(Number.NaN, 4), 0);
});

test('morphDesdeProgreso: con una forma siempre vale 0', () => {
  for (const p of [-1, 0, 0.3, 0.5, 0.99, 1, 2]) assert.equal(morphDesdeProgreso(p, 1), 0, `p = ${p}`);
});

// Rompe si el paso encendido no corresponde a la forma que se ve. En el medio de un cambio redondea hacia arriba.
test('pasoActivo: redondea al paso más cercano dentro de las formas', () => {
  assert.equal(pasoActivo(1.49, 4), 1);
  assert.equal(pasoActivo(2.5, 4), 3);
  assert.equal(pasoActivo(9, 4), 3);
  assert.equal(pasoActivo(0, 4), 0);
  assert.equal(pasoActivo(-2, 4), 0);
  assert.equal(pasoActivo(Number.NaN, 4), 0);
});

// Rompe si el progreso de la sección fija sale de [0, 1]: 0 cuando su borde superior llega arriba de la ventana y 1
// cuando su borde inferior llega abajo.
test('progresoSeccion: acotado a [0, 1]', () => {
  const top = 1000, alto = 3000, vh = 800;
  assert.equal(progresoSeccion(0, top, alto, vh), 0);
  assert.equal(progresoSeccion(top, top, alto, vh), 0);
  assert.equal(progresoSeccion(top + 1100, top, alto, vh), 0.5);
  assert.equal(progresoSeccion(top + 2200, top, alto, vh), 1);
  assert.equal(progresoSeccion(1e6, top, alto, vh), 1);
  for (let y = -5000; y <= 10000; y += 250) {
    const p = progresoSeccion(y, top, alto, vh);
    assert.ok(p >= 0 && p <= 1, `y = ${y}: ${p}`);
  }
  // Una sección que no es más alta que la ventana no tiene recorrido: pasa de 0 a 1 al llegar arriba.
  assert.equal(progresoSeccion(999, top, 600, vh), 0);
  assert.equal(progresoSeccion(1000, top, 600, vh), 1);
});

// Rompe si la nube no parte bajo el título o no termina en la historia: empieza a bajar con un 10 % de la ventana
// recorrido y llega cuando el scroll alcanza finY, aunque el salto la pase de largo.
test('trasladoNube: 0 bajo el título y 1 en la historia', () => {
  assert.equal(trasladoNube(0, 800, 2000), 0);
  assert.equal(trasladoNube(80, 800, 2000), 0);
  assert.equal(trasladoNube(2000, 800, 2000), 1);
  assert.equal(trasladoNube(1e6, 800, 2000), 1);
  assert.equal(trasladoNube(1040, 800, 2000), 0.5);
});
