// Videos en banda: se cargan y reproducen solo en pantalla. Sin autoplay con movimiento reducido ni con
// ahorro de datos (Save-Data): queda el poster y el botón para reproducir a pedido.
import { movimientoReducido, ahorroDatos } from './comun.js';

const reduced = movimientoReducido();
document.querySelectorAll('[data-mcco-video]').forEach((root) => {
  const video = root.querySelector('video');
  const boton = root.querySelector('[data-video-boton]');
  if (!video || !boton) return;
  let pausadoPorUsuario = reduced.matches || ahorroDatos(), enPantalla = false;
  // Sin aria-pressed: el texto dice lo que hace el botón y cambia con el estado (patrón de botón de WAI-ARIA). El CSS
  // dibuja el ícono según data-accion.
  const rotular = () => {
    boton.dataset.accion = pausadoPorUsuario ? 'reproducir' : 'pausar';
    boton.innerHTML = pausadoPorUsuario ? 'Reproducir video <span aria-hidden="true">▷</span>' : 'Pausar video <span aria-hidden="true">Ⅱ</span>';
  };
  const sync = () => {
    if (enPantalla && !pausadoPorUsuario && !document.hidden) {
      video.play().catch((e) => { if (e.name === 'NotAllowedError') { pausadoPorUsuario = true; rotular(); } });
    } else video.pause();
    root.dataset.estado = video.paused && !(enPantalla && !pausadoPorUsuario) ? 'pausa' : 'play';
  };
  boton.hidden = false; rotular();
  boton.addEventListener('click', () => { pausadoPorUsuario = !pausadoPorUsuario; rotular(); sync(); });
  if ('IntersectionObserver' in window) {
    new IntersectionObserver((entries) => { enPantalla = entries[0].isIntersecting; sync(); }, { rootMargin: '120px 0px' }).observe(video);
  }
  document.addEventListener('visibilitychange', sync);
  reduced.addEventListener('change', () => { if (reduced.matches) { pausadoPorUsuario = true; rotular(); sync(); } });
});
