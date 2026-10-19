// Campo antigravity del hero: parámetros, anillos de guiones y suavizado (funciones puras, sin DOM:
// test/estandar-campo). Son los valores de la prueba aprobada (scripts/campo.js). lib/estandar/campo.js los dibuja.

/**
 * Parámetros del campo en computador o en celular (el corte lo decide campo.js). Distancias en píxeles CSS:
 * radio del primer anillo (r0), separación entre anillos (dr) y entre guiones (paso), radio máximo (rmax) y banda de
 * guiones [aparece, plena hasta, se apaga en]. alfa: opacidad de los puntos lejanos y de la banda. largo y ancho del
 * guion: fuera y dentro de la banda. giro: rad/s de los anillos. tau: segundos de cada suavizado del centro.
 * atenuacionNube: fracción de opacidad que conservan los guiones sobre la nube (0,32 es «a un tercio»).
 * `ajuste` (opcional) cambia solo las claves que trae; una clave que el campo no tiene lanza un Error, para que
 * un sitio no pierda un ajuste por un error de tipeo. Los tipos están en
 * campo-anillos.d.ts.
 */
export function parametrosCampo(movil, ajuste) {
  const p = {
    r0: 46,
    dr: movil ? 24 : 28,
    paso: movil ? 26 : 30,
    rmax: movil ? 760 : 1180,
    banda: movil ? [110, 280, 500] : [150, 400, 680],
    alfa: [0.13, 0.85],
    largo: [2, 7],
    ancho: [2, 2.4],
    giro: 0.012,
    tau: 0.7,
    atenuacionNube: 0.32,
  };
  for (const [clave, valor] of Object.entries(ajuste ?? {})) {
    if (!Object.hasOwn(p, clave)) throw new Error(`parametrosCampo: clave desconocida ${clave}`);
    p[clave] = Array.isArray(valor) ? [...valor] : valor;
  }
  return p;
}

/**
 * Guiones del campo como tríos (k, ángulo, semilla): k es el anillo, de radio r0 + dr·k < rmax, con
 * max(6, ⌊2π·r/paso⌋) guiones parejos, cada uno corrido a lo más un cuarto de su lugar. La semilla (0 a 1) varía el
 * radio, el largo, la opacidad y el giro de cada guion en el shader. Misma semilla, mismo campo.
 */
export function anillos(p, semilla) {
  const porAnillo = [];
  for (let k = 0; p.r0 + p.dr * k < p.rmax; k++) porAnillo.push(Math.max(6, Math.floor((2 * Math.PI * (p.r0 + p.dr * k)) / p.paso)));
  const trios = new Float32Array(3 * porAnillo.reduce((t, n) => t + n, 0));
  let s = semilla >>> 0, i = 0;
  const azar = () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296;
  porAnillo.forEach((n, k) => {
    const inicio = azar() * Math.PI * 2;
    for (let j = 0; j < n; j++) {
      trios[i++] = k;
      trios[i++] = inicio + ((j + (azar() - 0.5) * 0.5) / n) * Math.PI * 2;
      trios[i++] = azar();
    }
  });
  return trios;
}

/** Un paso de dt segundos del suavizado exponencial de actual hacia objetivo: en tau segundos recorre 1 − e^(−1). */
export function seguir(actual, objetivo, dt, tau) {
  const k = 1 - Math.exp(-dt / tau);
  return [actual[0] + (objetivo[0] - actual[0]) * k, actual[1] + (objetivo[1] - actual[1]) * k];
}
