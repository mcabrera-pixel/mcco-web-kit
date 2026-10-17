// Menú de la barra global en celular. El botón [data-std-menu] abre y cierra la bandeja (aria-controls), que es la
// misma lista de enlaces del computador mostrada como bandeja bajo los 834 px. aria-expanded y la clase is-abierta de
// la barra llevan el estado. La cierran Escape, un clic fuera del botón y de la bandeja, un enlace de la bandeja y el
// foco que sale de ellos (así la bandeja nunca tapa lo que sigue en el orden del teclado). Con Escape el foco vuelve
// al botón.
document.querySelectorAll('[data-std-gnav]').forEach((barra) => {
  const boton = barra.querySelector('[data-std-menu]');
  const bandeja = boton && document.getElementById(boton.getAttribute('aria-controls'));
  if (!bandeja) return;
  const abierta = () => boton.getAttribute('aria-expanded') === 'true';
  const dentro = (el) => el instanceof Node && (boton.contains(el) || bandeja.contains(el));
  const fijar = (abrir) => {
    boton.setAttribute('aria-expanded', String(abrir));
    barra.classList.toggle('is-abierta', abrir);
  };
  const cerrar = (devolverFoco = false) => {
    if (!abierta()) return;
    fijar(false);
    if (devolverFoco) boton.focus();
  };

  boton.addEventListener('click', () => (abierta() ? cerrar() : fijar(true)));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && abierta()) cerrar(true); });
  document.addEventListener('click', (e) => { if (!dentro(e.target)) cerrar(); });
  // Sin devolver el foco: el enlace navega (o salta a su ancla) y el foco sigue al destino.
  bandeja.addEventListener('click', (e) => { if (e.target instanceof Element && e.target.closest('a')) cerrar(); });
  // relatedTarget es null al hacer clic en una zona sin foco de la propia bandeja; ese caso lo resuelve el clic.
  barra.addEventListener('focusout', (e) => { if (e.relatedTarget && !dentro(e.relatedTarget)) cerrar(); });
});
