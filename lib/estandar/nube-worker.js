// Worker de la nube antigravity: decodifica una ilustración con createImageBitmap y OffscreenCanvas, calcula su
// luminancia y la convierte en una forma con las funciones puras de nube-muestreo.js, fuera del hilo principal.
// Sin OffscreenCanvas (o si el Worker falla), nube.js importa formaDeImagen y hace el mismo cálculo en el hilo
// principal, con un respiro entre cada tramo para no bloquearlo.
import { muestrearExacto, formaOrdenada } from './nube-muestreo.js';

/**
 * Forma de la ilustración `src` decodificada a `ancho` píxeles: `{ pos, lum }` con exactamente `puntos` puntos.
 * Lanza si la imagen no carga o no tiene nada claro.
 * @param {{ src: string, ancho: number, puntos: number, semilla: number }} pedido
 * @param {() => unknown} [respiro] pausa entre tramos (en el hilo principal)
 */
export async function formaDeImagen({ src, ancho, puntos, semilla }, respiro = () => null) {
  const res = await fetch(src);
  if (!res.ok) throw new Error(`${res.status} ${src}`);
  const imagen = await createImageBitmap(await res.blob());
  const w = Math.round(ancho), h = Math.max(1, Math.round((w * imagen.height) / imagen.width));
  const lienzo = typeof OffscreenCanvas !== 'undefined'
    ? new OffscreenCanvas(w, h)
    : Object.assign(document.createElement('canvas'), { width: w, height: h });
  const ctx = lienzo.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(imagen, 0, 0, w, h);
  imagen.close();
  const px = ctx.getImageData(0, 0, w, h).data;
  await respiro();
  const lum = new Float32Array(w * h);
  for (let k = 0; k < lum.length; k++) lum[k] = (px[k * 4] * 0.2126 + px[k * 4 + 1] * 0.7152 + px[k * 4 + 2] * 0.0722) / 255;
  await respiro();
  const muestra = muestrearExacto(lum, w, h, puntos, semilla);
  await respiro();
  return formaOrdenada(muestra, w, h);
}

// Solo dentro de un Worker: en el hilo principal el módulo únicamente exporta formaDeImagen.
if (typeof WorkerGlobalScope !== 'undefined' && self instanceof WorkerGlobalScope) {
  self.onmessage = async ({ data }) => {
    try {
      const forma = await formaDeImagen(data);
      self.postMessage({ id: data.id, ...forma }, [forma.pos.buffer, forma.lum.buffer]);
    } catch (e) {
      self.postMessage({ id: data.id, error: String(e?.message ?? e) });
    }
  };
}
