// Diagrama de proceso que se arma al bajar: la línea avanza con el scroll y cada paso aparece cuando la
// línea lo alcanza. Solo avanza (no se desarma al subir) y deja de escuchar el scroll al completarse.
// Sin JS o con movimiento reducido el diagrama se ve completo y quieto: el estado oculto solo existe
// bajo [data-activo], que pone este script.
import { movimientoReducido } from './comun.js';

const reduced = movimientoReducido();
document.querySelectorAll('[data-mcco-proceso]').forEach((root) => {
  if (reduced.matches) return;
  const pasos = [...root.querySelectorAll('[data-paso]')];
  const n = pasos.length;
  if (!n) return;
  let max = 0, pedido = 0;
  const medir = () => {
    pedido = 0;
    const r = root.getBoundingClientRect(), vh = innerHeight;
    const p = Math.max(0, Math.min(1, (vh * .85 - r.top) / Math.max(r.height, vh * .5)));
    if (p <= max) return;
    max = p;
    root.style.setProperty('--mcco-avance', max.toFixed(3));
    pasos.forEach((el, i) => { if (max >= (n > 1 ? i / (n - 1) * .96 : 0)) el.classList.add('is-on'); });
    if (max >= 1) { removeEventListener('scroll', alMover); removeEventListener('resize', alMover); }
  };
  const alMover = () => { if (!pedido) pedido = requestAnimationFrame(medir); };
  root.dataset.activo = '';
  root.style.setProperty('--mcco-avance', '0');
  addEventListener('scroll', alMover, { passive: true });
  addEventListener('resize', alMover, { passive: true });
  medir();
  // Si alguien pide movimiento reducido a mitad de camino, se muestra todo.
  reduced.addEventListener('change', () => {
    if (!reduced.matches) return;
    max = 1; root.style.setProperty('--mcco-avance', '1'); pasos.forEach((el) => el.classList.add('is-on'));
  });
});
