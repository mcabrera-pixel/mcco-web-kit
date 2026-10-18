// Pausa del movimiento del estándar (WCAG 2.2.2): un solo estado para todo el documento. Es el único dueño de los
// botones [data-std-pausa] (el del hero y el de la historia): todos dicen «Pausar movimiento» o «Reanudar movimiento»,
// llevan aria-pressed y cualquiera de ellos pausa o reanuda todo. Cada cambio avisa con el evento std-pausa en window
// (detail: { pausa }), que escuchan la nube (nube.js) y el campo (campo.js); una página con el campo y sin la nube
// también se pausa. Cuándo se ve cada botón lo decide quien lo muestra (la historia, nube.js; el hero, su CSS).

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

function pintar() {
  for (const b of botones) {
    b.textContent = pausa ? 'Reanudar movimiento' : 'Pausar movimiento';
    b.setAttribute('aria-pressed', String(pausa));
  }
}

for (const b of botones) b.addEventListener('click', () => fijarPausa(!pausa));
pintar();
