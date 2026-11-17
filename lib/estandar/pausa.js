// Pausa del movimiento del estándar (WCAG 2.2.2): un solo estado para todo el documento. Es el único dueño de los
// botones [data-std-pausa] (el del hero y el de la historia): todos dicen «Pausar movimiento» o «Reanudar movimiento»
// y cualquiera de ellos pausa o reanuda todo. Sin aria-pressed: el texto ya dice lo que hace el botón, y el patrón de
// botón de WAI-ARIA no lo usa cuando el texto cambia con el estado. Cada cambio avisa con el evento std-pausa en window
// (detail: { pausa }), que escuchan la nube (nube.js) y el campo (campo.js); una página con el campo y sin la nube
// también se pausa. El botón de la historia lo muestra nube.js; el del hero se ve mientras el hero lleve
// data-std-movimiento, que marcan los mismos runtimes con marcarMovimiento.

let pausa = false;
// Los scripts de módulo corren con el documento ya leído: aquí están todos los botones.
const botones = typeof document === 'undefined' ? [] : [...document.querySelectorAll('[data-std-pausa]')];

/** true si el movimiento está en pausa. */
export const pausado = () => pausa;

/** Pausa (true) o reanuda (false) todo el movimiento. Si el estado cambia, actualiza los botones y avisa con std-pausa. */
export function fijarPausa(valor) {
  if (Boolean(valor) === pausa) return;
  pausa = Boolean(valor);
  pintar();
  dispatchEvent(new CustomEvent('std-pausa', { detail: { pausa } }));
}

/**
 * Marca (activo true) o desmarca que `fuente` ('nube' o 'campo') mueve algo dentro de `el`, el hero: su atributo
 * data-std-movimiento lleva una palabra por fuente y desaparece cuando no queda ninguna. Así una fuente que se apaga
 * no esconde el botón de pausa mientras la otra siga moviéndose.
 */
export function marcarMovimiento(el, fuente, activo) {
  if (!el) return;
  const fuentes = new Set((el.dataset.stdMovimiento ?? '').split(' ').filter(Boolean));
  if (activo) fuentes.add(fuente); else fuentes.delete(fuente);
  if (fuentes.size) el.dataset.stdMovimiento = [...fuentes].join(' ');
  else delete el.dataset.stdMovimiento;
}

function pintar() {
  for (const b of botones) b.textContent = pausa ? 'Reanudar movimiento' : 'Pausar movimiento';
}

for (const b of botones) b.addEventListener('click', () => fijarPausa(!pausa));
pintar();
