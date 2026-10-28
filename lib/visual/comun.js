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

/** Sigue cambios de pantalla o zoom sin resize. Devuelve el cierre del oyente de resolución actual. */
export function observarDpr(redimensionar) {
  let consulta;
  const quitar = () => consulta?.removeEventListener('change', cambiar);
  function vigilar() {
    consulta = matchMedia(`(resolution: ${devicePixelRatio || 1}dppx)`);
    consulta.addEventListener('change', cambiar);
  }
  function cambiar() { quitar(); vigilar(); redimensionar(); }
  vigilar();
  return quitar;
}

// Con KHR_parallel_shader_compile el enlace ocurre fuera del hilo principal y solo se consulta al terminar.
export async function enlazar(contexto, VS, FS, cancelado = () => false) {
  const shaders = [], p = contexto.createProgram();
  let enlazado = false;
  try {
    for (const [tipo, fuente] of [[contexto.VERTEX_SHADER, VS], [contexto.FRAGMENT_SHADER, FS]]) {
      const s = contexto.createShader(tipo);
      shaders.push(s); contexto.shaderSource(s, fuente); contexto.compileShader(s); contexto.attachShader(p, s);
    }
    contexto.linkProgram(p);
    const paralelo = contexto.getExtension('KHR_parallel_shader_compile');
    if (paralelo) while (!cancelado() && !contexto.isContextLost() && !contexto.getProgramParameter(p, paralelo.COMPLETION_STATUS_KHR)) {
      await new Promise((r) => setTimeout(r, 16));
    }
    enlazado = !cancelado() && !contexto.isContextLost() && contexto.getProgramParameter(p, contexto.LINK_STATUS);
    return enlazado ? p : null;
  } finally {
    for (const s of shaders) { contexto.detachShader(p, s); contexto.deleteShader(s); }
    if (!enlazado) contexto.deleteProgram(p);
  }
}
