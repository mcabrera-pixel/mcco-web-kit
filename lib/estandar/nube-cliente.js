// Cliente de muestreo de la nube. El constructor y el respaldo se inyectan para probar el cierre sin DOM ni WebGL.
export const SIN_WORKER = 'sin worker';
export const CANCELADO = 'muestreo cancelado';

async function enPrincipal(pedido) {
  const { formaDeImagen } = await import('./nube-worker.js');
  return formaDeImagen(pedido, () => new Promise((r) => setTimeout(r)));
}

export function crearClienteNube(Worker, {
  disponible = () => typeof OffscreenCanvas !== 'undefined', respaldo = enPrincipal,
} = {}) {
  let trabajador, secuencia = 0;
  let cola = Promise.resolve(), generacion = 0;
  const pendientes = new Map();

  function enWorker(pedido) {
    if (trabajador === false || !disponible()) return Promise.reject(new Error(SIN_WORKER));
    if (!trabajador) {
      try { trabajador = new Worker(new URL('./nube-worker.js', import.meta.url), { type: 'module' }); }
      catch { trabajador = false; return Promise.reject(new Error(SIN_WORKER)); }
      const actual = trabajador;
      trabajador.onmessage = ({ data }) => {
        if (data.error === SIN_WORKER) { actual.onerror(); return; }
        const p = pendientes.get(data.id);
        pendientes.delete(data.id);
        if (data.error) p?.rej(new Error(data.error)); else p?.res(data);
      };
      trabajador.onerror = () => {
        if (trabajador !== actual) return;
        actual.terminate();
        trabajador = false;
        pendientes.forEach((p) => p.rej(new Error(SIN_WORKER)));
        pendientes.clear();
      };
    }
    return new Promise((res, rej) => {
      const id = ++secuencia;
      pendientes.set(id, { res, rej });
      trabajador.postMessage({ ...pedido, id });
    });
  }

  // Un cierre normal permite crear otro Worker. El estado false de onerror conserva el respaldo.
  function cerrarWorker() {
    generacion++;
    if (!trabajador) return;
    trabajador.terminate();
    trabajador = undefined;
    pendientes.forEach((p) => p.rej(new Error(CANCELADO)));
    pendientes.clear();
  }

  async function forma(pedido) {
    const turno = generacion;
    try {
      return await enWorker(pedido);
    } catch (e) {
      // Una imagen inválida o una cancelación no deben volver a muestrearse en el hilo principal.
      if (e.message !== SIN_WORKER) throw e;
      // Una forma por vez: varias continuaciones de 8 ms no deben acumularse en la misma tarea.
      const vigente = () => { if (turno !== generacion) throw new Error(CANCELADO); };
      const tarea = cola.then(async () => {
        vigente();
        const resultado = await respaldo(pedido);
        vigente();
        return resultado;
      });
      cola = tarea.catch(() => {});
      return tarea;
    }
  }

  return { enWorker, cerrarWorker, forma };
}
