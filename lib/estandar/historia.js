// Progreso de la historia en negro y traslado de la nube antigravity (funciones puras, sin DOM: test/estandar-historia).
// La línea de tiempo es la de la prueba aprobada: 0,3 de espera y, por cada forma siguiente, 0,9 de cambio con la curva
// power2.inOut y 0,45 quieta. Con cuatro formas son 0,3 + 3 × 1,35 = 4,35 unidades de recorrido.

const ESPERA = 0.3, CAMBIO = 0.9, QUIETA = 0.45, TRAMO = CAMBIO + QUIETA;
// p · duración no da exacto en los bordes de cada tramo (0,3 / 4,35 · 4,35 > 0,3): este margen deja la forma entera ahí.
const BORDE = 1e-9;
const curva = (t) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);

/** Forma que corresponde a un progreso p de la sección (0 a 1): de 0 a formas − 1, no decreciente. */
export function morphDesdeProgreso(p, formas) {
  const ultima = Math.max(0, Math.floor(formas) - 1);
  if (!(p > 0) || ultima === 0) return 0;
  let t = Math.min(1, p) * (ESPERA + ultima * TRAMO) - ESPERA;
  if (t <= BORDE) return 0;
  const i = Math.floor(t / TRAMO);
  if (i >= ultima) return ultima;
  t -= i * TRAMO;
  if (t <= BORDE) return i;
  return t >= CAMBIO - BORDE ? i + 1 : i + curva(t / CAMBIO);
}

/** Paso encendido para una forma intermedia: el más cercano, hacia arriba en el medio exacto. */
export function pasoActivo(morph, formas) {
  if (!(morph > 0)) return 0;
  return Math.min(Math.max(0, Math.floor(formas) - 1), Math.round(morph));
}

/** Progreso de una sección fija: 0 con su borde superior arriba de la ventana y 1 con el inferior abajo. */
export function progresoSeccion(scrollY, top, alto, vh) {
  const recorrido = alto - vh;
  if (!(recorrido > 0)) return scrollY >= top ? 1 : 0;
  return Math.min(1, Math.max(0, (scrollY - top) / recorrido));
}

/** Traslado de la nube: 0 bajo el título, 1 en la historia. Empieza con 0,1 · vh de scroll y termina en finY. */
export function trasladoNube(scrollY, vh, finY) {
  const inicio = vh * 0.1;
  return Math.min(1, Math.max(0, (scrollY - inicio) / Math.max(1, finY - inicio)));
}
