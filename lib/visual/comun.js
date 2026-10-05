// Utilidades compartidas por el JS del sistema visual (sin dependencias).
// Toda animación del kit pasa por movimientoReducido(): mcco-check R13 busca esta consulta en los scripts de la página.
export const movimientoReducido = () => matchMedia('(prefers-reduced-motion: reduce)');

/** true si el navegador pidió ahorro de datos (Save-Data). */
export const ahorroDatos = () => navigator.connection?.saveData === true;

/** Corre fn después de la carga y en tiempo ocioso: el primer render y el LCP van primero. */
export function alArrancar(fn, timeout = 1200) {
  const idle = () => (window.requestIdleCallback || setTimeout)(fn, { timeout });
  if (document.readyState === 'complete') idle(); else addEventListener('load', idle, { once: true });
}

/** Lee un color CSS (token) y lo devuelve como [r, g, b] en 0-1. Acepta cualquier sintaxis que entienda canvas. */
let lienzo;
export function colorDe(el, token, respaldo = '#888') {
  const valor = getComputedStyle(el).getPropertyValue(token).trim() || respaldo;
  lienzo ??= document.createElement('canvas').getContext('2d', { willReadFrequently: true });
  lienzo.clearRect(0, 0, 1, 1);
  lienzo.fillStyle = respaldo; lienzo.fillStyle = valor;
  lienzo.fillRect(0, 0, 1, 1);
  const [r, g, b] = lienzo.getImageData(0, 0, 1, 1).data;
  return [r / 255, g / 255, b / 255];
}
