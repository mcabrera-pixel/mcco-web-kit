// Sub-navegación del estándar: pasa a su versión oscura (clase is-oscura en .std-subnav) cuando tiene debajo un bloque
// negro a todo el ancho ([data-std-oscuro]), como en apple.com. Se mide con el scroll y al cambiar el tamaño de la
// ventana, con un solo requestAnimationFrame por ráfaga. Un salto (ancla, tecla Fin, scroll muy rápido) queda en el
// tono correcto porque cada medición lee las posiciones finales.

/** true si la fila y (px de la ventana) cae en alguno de los rectángulos: el borde superior cuenta y el inferior no. */
export function seccionBajo(y, rects) {
  return rects.some((r) => r.top <= y && r.bottom > y);
}

function iniciar(subnav) {
  let pedido = 0;
  const medir = () => {
    pedido = 0;
    // Solo los bloques a todo el ancho: un bloque negro dentro de una grilla no oscurece la barra.
    const ancho = document.documentElement.clientWidth;
    const rects = [...document.querySelectorAll('[data-std-oscuro]')]
      .map((el) => el.getBoundingClientRect())
      .filter((r) => r.width >= ancho - 1);
    subnav.classList.toggle('is-oscura', seccionBajo(subnav.getBoundingClientRect().bottom - 1, rects));
  };
  const alMover = () => { if (!pedido) pedido = requestAnimationFrame(medir); };
  addEventListener('scroll', alMover, { passive: true });
  addEventListener('resize', alMover, { passive: true });
  medir();
}

// En el navegador arranca solo. En Node (pruebas) solo se exporta seccionBajo.
if (typeof document !== 'undefined') document.querySelectorAll('.std-subnav').forEach(iniciar);
