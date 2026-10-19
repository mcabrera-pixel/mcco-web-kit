// Pruebas de lib/estandar/subnav.js: cuándo la sub-navegación tiene debajo un bloque negro a todo el ancho.
// seccionBajo(y, rects) recibe la última fila de píxeles de la sub-navegación (bottom − 1) y los rectángulos de los
// bloques [data-std-oscuro]. El borde superior del bloque cuenta y el inferior no.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { seccionBajo } from '../lib/estandar/subnav.js';

// Rompe si cambia el criterio del borde: la sub-navegación pasa a oscura justo cuando el bloque llega a su última
// fila y vuelve a clara apenas el bloque termina, sin un píxel de desfase en ningún sentido.
test('seccionBajo: el bloque cuenta desde su borde superior hasta antes del inferior', () => {
  assert.equal(seccionBajo(51, [{ top: 52, bottom: 900 }]), false);
  assert.equal(seccionBajo(51, [{ top: 0, bottom: 900 }]), true);
  assert.equal(seccionBajo(51, [{ top: -500, bottom: 51 }]), false);
  assert.equal(seccionBajo(51, [{ top: 51, bottom: 900 }]), true);
  assert.equal(seccionBajo(51, []), false);
});

// Rompe si solo se mira el primer bloque: después de un salto (ancla, tecla Fin) el que queda debajo puede ser
// cualquiera de la lista, y los demás pueden estar muy arriba o muy abajo.
test('seccionBajo: basta con que un bloque de la lista quede bajo la línea', () => {
  const bloques = [{ top: -4000, bottom: -3200 }, { top: -300, bottom: 400 }, { top: 2600, bottom: 3400 }];
  assert.equal(seccionBajo(51, bloques), true);
  assert.equal(seccionBajo(1200, bloques), false);
});
