// Revelado al entrar en pantalla y contadores animados, por atributos:
//   data-revelar            el elemento sube y aparece una vez
//   data-revelar-grupo      cada hijo directo aparece con un desfase de 70 ms
//   data-contar="45"        la cifra cuenta desde 0 (data-decimales="1" para decimales)
// Solo cambia opacity y transform: el layout no se mueve (CLS). Sin JS, sin IntersectionObserver o con
// movimiento reducido, todo queda visible y con la cifra final, que es la que viene en el HTML.
import { movimientoReducido, alArrancar } from './comun.js';

alArrancar(() => {
  if (movimientoReducido().matches || !('IntersectionObserver' in window)) return;
  const enPantalla = (el) => { const r = el.getBoundingClientRect(); return r.top < innerHeight && r.bottom > 0; };

  const items = [...document.querySelectorAll('[data-revelar], [data-revelar-grupo] > *')];
  const pendientes = new Set();
  const mostrar = (el) => { el.classList.add('is-in'); pendientes.delete(el); io.unobserve(el); };
  const io = new IntersectionObserver((entries) => entries.forEach((e) => { if (e.isIntersecting) mostrar(e.target); }),
    { rootMargin: '0px 0px -8% 0px', threshold: .08 });
  items.forEach((el) => {
    const grupo = el.parentElement?.hasAttribute('data-revelar-grupo');
    if (grupo) el.style.setProperty('--mcco-retardo', `${[...el.parentElement.children].indexOf(el) * 70}ms`);
    // Lo que ya está a la vista no se oculta: así no parpadea al activar el revelado.
    if (enPantalla(el)) el.classList.add('is-in'); else { pendientes.add(el); io.observe(el); }
  });
  document.documentElement.classList.add('mcco-revelar-listo');
  // Un salto (ancla, tecla Fin, scroll muy rápido) puede pasar un elemento entero entre dos cuadros sin que el
  // observador lo vea: todo lo que ya quedó por encima del borde inferior se muestra igual.
  let pedido = 0;
  const repasar = () => {
    pedido = 0;
    for (const el of pendientes) if (el.getBoundingClientRect().top < innerHeight) mostrar(el);
    if (!pendientes.size) removeEventListener('scroll', alMover);
  };
  const alMover = () => { if (!pedido) pedido = requestAnimationFrame(repasar); };
  if (pendientes.size) addEventListener('scroll', alMover, { passive: true });

  // Contadores: el ancho se fija antes de animar para que el texto vecino no se desplace.
  const formato = (v, d) => v.toLocaleString('es-CL', { minimumFractionDigits: d, maximumFractionDigits: d });
  const contar = (el) => {
    const fin = Number(el.dataset.contar), dec = Number(el.dataset.decimales || 0), dur = 1400;
    if (!Number.isFinite(fin)) return;
    el.style.display = 'inline-block';
    el.style.minWidth = `${el.getBoundingClientRect().width}px`;
    const t0 = performance.now();
    const paso = (now) => {
      const t = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - t, 3);
      el.textContent = formato(fin * e, dec);
      if (t < 1) requestAnimationFrame(paso);
    };
    requestAnimationFrame(paso);
  };
  const ioc = new IntersectionObserver((entries) => entries.forEach((e) => {
    if (!e.isIntersecting) return;
    ioc.unobserve(e.target);
    setTimeout(() => contar(e.target), 200);
  }), { threshold: .6 });
  document.querySelectorAll('[data-contar]').forEach((el) => ioc.observe(el));
});
