// Worker de HeroParticulas: el muestreo de la imagen corre fuera del hilo principal.
import { muestrear } from './muestreo.js';

self.onmessage = async ({ data }) => {
  try {
    const r = await muestrear({ ...data, tramos: false });
    self.postMessage({ id: data.id, ...r }, [r.datos]);
  } catch (e) {
    self.postMessage({ id: data.id, error: String(e?.message ?? e) });
  }
};
