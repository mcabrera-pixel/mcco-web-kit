// Sub-navegación del estándar: pasa a su versión oscura (clase is-oscura en .std-subnav) cuando tiene debajo un bloque
// negro a todo el ancho ([data-std-oscuro]), como en apple.com. Mide en cada evento scroll y resize (pasivos): el
// navegador ya los despacha una vez por cuadro, así que no hace falta agruparlos. Un salto (ancla, tecla Fin, scroll
// muy rápido) queda en el tono correcto porque cada medición lee las posiciones finales.

/** true si la fila y (px de la ventana) cae en alguno de los rectángulos: el borde superior cuenta y el inferior no. */
export function seccionBajo(y, rects) {
  return rects.some((r) => r.top <= y && r.bottom > y);
}

function iniciar(subnav) {
  const medir = () => {
    // Solo los bloques a todo el ancho: un bloque negro dentro de una grilla no oscurece la barra.
    const ancho = document.documentElement.clientWidth;
    const rects = [...document.querySelectorAll('[data-std-oscuro]')]
      .map((el) => el.getBoundingClientRect())
      .filter((r) => r.width >= ancho - 1);
    subnav.classList.toggle('is-oscura', seccionBajo(subnav.getBoundingClientRect().bottom - 1, rects));
  };
  addEventListener('scroll', medir, { passive: true });
  addEventListener('resize', medir, { passive: true });
  medir();
}

// En el navegador arranca solo. En Node (pruebas) solo se exporta seccionBajo.
if (typeof document !== 'undefined') document.querySelectorAll('.std-subnav').forEach(iniciar);
