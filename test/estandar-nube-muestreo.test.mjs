// Pruebas de lib/estandar/nube-muestreo.js: cómo una ilustración en nube de puntos (fondo negro, los puntos salen de
// lo claro) se convierte en la misma cantidad exacta de puntos para cada forma, centrados en una caja de 12 × 6 y
// ordenados por una curva de Hilbert, para que la nube pase de una forma a otra punto a punto.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hilbert, muestrearExacto, formaOrdenada } from '../lib/estandar/nube-muestreo.js';

// Luminancia sintética de 64 × 36, negra, con un rectángulo brillante de 32 × 8 px en el centro (x 16-47, y 14-21).
const W = 64, H = 36;
function rectangulo() {
  const lum = new Float32Array(W * H);
  for (let y = 14; y < 22; y++) for (let x = 16; x < 48; x++) lum[y * W + x] = 1;
  return lum;
}
const extremos = (pos, eje) => {
  let min = Infinity, max = -Infinity;
  for (let i = eje; i < pos.length; i += 3) { min = Math.min(min, pos[i]); max = Math.max(max, pos[i]); }
  return [min, max];
};

// Rompe si cambia la cantidad de puntos (las formas dejarían de calzar punto a punto) o si salen puntos de lo negro.
test('muestrearExacto: exactamente 500 puntos, todos dentro del rectángulo brillante', () => {
  const m = muestrearExacto(rectangulo(), W, H, 500, 7);
  for (const k of ['xs', 'ys', 'zs', 'ls']) {
    assert.ok(m[k] instanceof Float32Array, `${k} no es Float32Array`);
    assert.equal(m[k].length, 500, k);
  }
  for (let i = 0; i < 500; i++) {
    assert.ok(m.xs[i] >= 16 && m.xs[i] < 48, `x fuera: ${m.xs[i]}`);
    assert.ok(m.ys[i] >= 14 && m.ys[i] < 22, `y fuera: ${m.ys[i]}`);
    assert.ok(m.zs[i] >= -1 && m.zs[i] <= 1, `z fuera: ${m.zs[i]}`);
    assert.ok(m.ls[i] >= 0 && m.ls[i] <= 1, `brillo fuera: ${m.ls[i]}`);
  }
});

// Rompe si dos cargas de la misma página dan nubes distintas: la semilla fija el resultado.
test('muestrearExacto: determinista con la misma semilla', () => {
  const a = muestrearExacto(rectangulo(), W, H, 500, 7);
  const b = muestrearExacto(rectangulo(), W, H, 500, 7);
  assert.deepEqual(a, b);
  assert.notDeepEqual(muestrearExacto(rectangulo(), W, H, 500, 8).xs, a.xs);
});

// Rompe si una imagen que no carga bien (negra o vacía) se convierte en una nube vacía en vez de mostrar el respaldo.
test('muestrearExacto: una luminancia toda negra lanza Error("imagen sin puntos")', () => {
  assert.throws(() => muestrearExacto(new Float32Array(W * H), W, H, 500, 7), { message: 'imagen sin puntos' });
});

// Rompe si la forma no queda centrada y escalada a la caja de 12 × 6: la nube saldría del ancla o quedaría chica.
test('formaOrdenada: 500 puntos centrados en la caja de 12 × 6', () => {
  const f = formaOrdenada(muestrearExacto(rectangulo(), W, H, 500, 7), W, H);
  assert.equal(f.pos.length, 1500);
  assert.equal(f.lum.length, 500);
  for (let i = 0; i < 500; i++) {
    assert.ok(Math.abs(f.pos[i * 3]) <= 6.3, `|x| = ${Math.abs(f.pos[i * 3])}`);
    assert.ok(Math.abs(f.pos[i * 3 + 1]) <= 3.2, `|y| = ${Math.abs(f.pos[i * 3 + 1])}`);
  }
  const [x0, x1] = extremos(f.pos, 0), [y0, y1] = extremos(f.pos, 1);
  assert.ok(x1 - x0 >= 11.5, `ancho en x = ${x1 - x0}`);
  assert.ok(Math.abs(x0 + x1) / 2 < 0.15 && Math.abs(y0 + y1) / 2 < 0.15, 'la forma no queda centrada');
});

// Rompe si se pierde el giro del eje y: en la imagen y crece hacia abajo y en la nube hacia arriba. Un bloque chico
// sobre el rectángulo (32 de 288 px brillantes, un 11 %) tiene que quedar en y > 0.
test('formaOrdenada: lo que está arriba en la imagen queda arriba en la nube', () => {
  const lum = rectangulo();
  for (let y = 2; y < 6; y++) for (let x = 28; x < 36; x++) lum[y * W + x] = 1;
  const f = formaOrdenada(muestrearExacto(lum, W, H, 800, 3), W, H);
  let arriba = 0;
  for (let i = 0; i < 800; i++) if (f.pos[i * 3 + 1] > 0) arriba++;
  assert.ok(arriba / 800 > 0.05 && arriba / 800 < 0.2, `${arriba} de 800 puntos sobre y = 0`);
});

// Rompe si el orden de Hilbert deja de aplicarse: puntos consecutivos tienen que caer cerca, así el punto i de una
// forma y el punto i de la siguiente quedan en la misma zona relativa y el cambio se ve ordenado. Se compara el paso
// medio entre puntos consecutivos, relativo al ancho de la forma, con el del orden del muestreo.
test('formaOrdenada: los puntos consecutivos quedan cerca (orden de Hilbert)', () => {
  const m = muestrearExacto(rectangulo(), W, H, 500, 7);
  const f = formaOrdenada(m, W, H);
  const pasoMedio = (x, y) => { let s = 0; for (let i = 1; i < 500; i++) s += Math.hypot(x(i) - x(i - 1), y(i) - y(i - 1)); return s / 499; };
  const [x0, x1] = extremos(f.pos, 0);
  const ordenado = pasoMedio((i) => f.pos[i * 3], (i) => f.pos[i * 3 + 1]) / (x1 - x0);
  const crudo = pasoMedio((i) => m.xs[i], (i) => m.ys[i]) / 32;
  assert.ok(ordenado < crudo / 4, `paso relativo ordenado ${ordenado.toFixed(4)} contra ${crudo.toFixed(4)}`);
});

// Rompe si la curva deja de recorrer cada celda una sola vez o salta entre celdas que no son vecinas.
test('hilbert: origen en 0, recorre cada celda una vez y entre vecinas', () => {
  assert.equal(hilbert(1024, 0, 0), 0);
  assert.notEqual(hilbert(1024, 1, 0), hilbert(1024, 0, 1));
  const n = 8, celdas = new Array(n * n);
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    const d = hilbert(n, x, y);
    assert.ok(Number.isInteger(d) && d >= 0 && d < n * n, `d = ${d}`);
    assert.equal(celdas[d], undefined, `d = ${d} repetido`);
    celdas[d] = [x, y];
  }
  for (let d = 1; d < n * n; d++) {
    const [[xa, ya], [xb, yb]] = [celdas[d - 1], celdas[d]];
    assert.equal(Math.abs(xb - xa) + Math.abs(yb - ya), 1, `salto entre ${d - 1} y ${d}`);
  }
});
