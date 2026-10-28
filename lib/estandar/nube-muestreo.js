// Muestreo de una ilustración en nube de puntos para la nube antigravity (funciones puras, sin DOM:
// test/estandar-nube-muestreo). La ilustración va sobre negro y los puntos salen de lo claro. Cada forma entrega
// exactamente la misma cantidad de puntos, centrados en una caja de 12 × 6 y ordenados por una curva de Hilbert: el
// punto i de una forma y el punto i de la siguiente caen en la misma zona relativa y el cambio de forma se ve ordenado.
// No son coordenadas de un levantamiento: la geometría sale del brillo de la imagen. nube-worker.js decodifica la
// imagen, calcula la luminancia y llama a estas funciones.

/** Posición de la celda (x, y) en la curva de Hilbert de una grilla de n × n (n potencia de 2). */
export function hilbert(n, x, y) {
  let d = 0;
  for (let s = n >> 1; s > 0; s >>= 1) {
    const rx = (x & s) > 0 ? 1 : 0, ry = (y & s) > 0 ? 1 : 0;
    d += s * s * ((3 * rx) ^ ry);
    if (ry === 0) {
      if (rx === 1) { x = s - 1 - x; y = s - 1 - y; }
      const t = x; x = y; y = t;
    }
  }
  return d;
}

/**
 * Exactamente `puntos` muestras de una luminancia de w × h (0 a 1, fila por fila), sorteadas con su distribución
 * acumulada: lo claro pesa y lo negro no. Devuelve la posición en píxeles (con un sorteo dentro del píxel), la
 * profundidad z (−1 a 1, del brillo a baja resolución) y el brillo de cada punto. Lanza si la imagen no tiene nada claro.
 */
// Un tramo tiene como máximo 256 elementos. El consumidor decide si sigue (Worker) o cede el hilo.
export function* lotes(n, fn) {
  for (let i = 0; i < n;) {
    const fin = Math.min(n, i + 256);
    for (; i < fin; i++) fn(i);
    yield;
  }
}
function completar(pasos) {
  let paso;
  do { paso = pasos.next(); } while (!paso.done);
  return paso.value;
}
export function muestrearExacto(...args) { return completar(muestrearPorLotes(...args)); }
export function* muestrearPorLotes(lum, w, h, puntos, semilla) {
  const n0 = w * h;
  let max = 0;
  yield* lotes(n0, (k) => { if (lum[k] > max) max = lum[k]; });
  // Imágenes oscuras: el brillo sube hasta 2,6 veces para que el máximo llegue a 0,8.
  const gain = Math.min(2.6, Math.max(1, 0.8 / Math.max(max, 0.01)));
  const acum = new Float64Array(n0);
  let total = 0;
  yield* lotes(n0, (k) => {
    const s = Math.min(1, Math.max(0, (lum[k] * gain - 0.08) / 0.55));
    total += s * s * (3 - 2 * s);
    acum[k] = total;
  });
  if (!(total > 0)) throw new Error('imagen sin puntos');
  // Brillo a baja resolución (48 columnas) para la profundidad: superficies continuas, no ruido por píxel.
  const sw = Math.min(48, w), sh = Math.max(1, Math.min(h, Math.round((sw * h) / w)));
  const celda = (x, y) => Math.min(sh - 1, ((y / h) * sh) | 0) * sw + Math.min(sw - 1, ((x / w) * sw) | 0);
  const suave = new Float32Array(sw * sh), cuenta = new Uint32Array(sw * sh);
  yield* lotes(n0, (k) => { const j = celda(k % w, (k / w) | 0); suave[j] += lum[k]; cuenta[j]++; });
  yield* lotes(suave.length, (j) => { suave[j] = cuenta[j] ? Math.min(1, (suave[j] / cuenta[j]) * gain) : 0; });

  let seed = semilla >>> 0;
  const rand = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;
  const xs = new Float32Array(puntos), ys = new Float32Array(puntos), zs = new Float32Array(puntos), ls = new Float32Array(puntos);
  yield* lotes(puntos, (i) => {
    // u en (0, total]: el primer píxel con acumulado ≥ u siempre tiene peso.
    const u = (1 - rand()) * total;
    let lo = 0, hi = n0 - 1;
    while (lo < hi) { const mid = (lo + hi) >> 1; if (acum[mid] < u) lo = mid + 1; else hi = mid; }
    const x = lo % w, y = (lo / w) | 0, liso = suave[celda(x, y)], l = lum[lo] * gain;
    xs[i] = x + rand();
    ys[i] = y + rand();
    zs[i] = Math.max(-1, Math.min(1, (liso - 0.22) * 2.6 + (l - liso) * 0.6 + (rand() - 0.5) * 0.1));
    ls[i] = Math.min(1, l);
  });
  return { xs, ys, zs, ls };
}

// Bordes de los percentiles 0,5 % y 99,5 % de coordenadas en píxeles, en un eje de `tam` píxeles: un histograma de una
// casilla por píxel, sin ordenar copias de la muestra.
function* percentiles(v, tam) {
  const hist = new Uint32Array(tam);
  yield* lotes(v.length, (i) => { hist[Math.min(tam - 1, Math.max(0, v[i] | 0))]++; });
  const bajo = 0.005 * (v.length - 1), alto = 0.995 * (v.length - 1);
  let acum = 0, a = 0, b = tam;
  for (let c = 0; c < tam; c++) {
    if (!(c % 256)) yield;
    const antes = acum;
    acum += hist[c];
    if (antes <= bajo && acum > bajo) a = c;
    if (antes <= alto && acum > alto) { b = c + 1; break; }
  }
  return [a, b];
}

/**
 * La muestra de una imagen de w × h centrada en `caja` (unidades de la nube) según su caja de percentiles 0,5 % y
 * 99,5 % (sin los puntos sueltos), con y hacia arriba, y ordenada por la curva de Hilbert de orden 1024 sobre esa caja.
 * Devuelve las posiciones (x, y, z por punto) y el brillo de cada punto, en el mismo orden.
 */
export function formaOrdenada(...args) { return completar(ordenarPorLotes(...args)); }
export function* ordenarPorLotes(muestra, w, h, caja = [12, 6]) {
  const { xs, ys, zs, ls } = muestra, n = xs.length, N = 1024;
  const [x0, x1] = yield* percentiles(xs, w), [y0, y1] = yield* percentiles(ys, h);
  const bw = Math.max(1, x1 - x0), bh = Math.max(1, y1 - y0), cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
  const escala = Math.min(caja[0] / bw, caja[1] / bh);
  const clave = new Uint32Array(n);
  let orden = new Uint32Array(n), auxiliar = new Uint32Array(n);
  yield* lotes(n, (i) => {
    const hx = Math.max(0, Math.min(N - 1, (((xs[i] - x0) / bw) * (N - 1)) | 0));
    const hy = Math.max(0, Math.min(N - 1, (((ys[i] - y0) / bh) * (N - 1)) | 0));
    clave[i] = hilbert(N, hx, hy);
    orden[i] = i;
  });
  // Radix estable: tres pasadas de 8 bits cubren los 20 bits de Hilbert. Los empates conservan el orden de rc.1.
  for (let bit = 0; bit < 24; bit += 8) {
    const cuenta = new Uint32Array(256);
    yield* lotes(n, (i) => { cuenta[(clave[orden[i]] >>> bit) & 255]++; });
    let suma = 0;
    for (let j = 0; j < 256; j++) { const cantidad = cuenta[j]; cuenta[j] = suma; suma += cantidad; }
    yield* lotes(n, (i) => { const k = orden[i]; auxiliar[cuenta[(clave[k] >>> bit) & 255]++] = k; });
    [orden, auxiliar] = [auxiliar, orden];
  }
  const pos = new Float32Array(n * 3), lum = new Float32Array(n);
  yield* lotes(n, (i) => {
    const k = orden[i];
    pos[i * 3] = (xs[k] - cx) * escala;
    pos[i * 3 + 1] = -(ys[k] - cy) * escala;
    pos[i * 3 + 2] = zs[k] * 0.9;
    lum[i] = ls[k];
  });
  return { pos, lum };
}
