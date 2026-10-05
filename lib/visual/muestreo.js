// Muestreo de una imagen en nube de puntos para HeroParticulas. Corre en un Worker (muestreo-worker.js) cuando
// el navegador tiene OffscreenCanvas; si no, en el hilo principal, partido en tramos para no bloquearlo.
// Devuelve la geometría lista para la GPU: por punto, posición Int16 normalizada (6 B) + color RGBA8 (4 B).
export const STRIDE = 10;

const lienzo = (w, h) => {
  if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(w, h);
  const c = document.createElement('canvas'); c.width = w; c.height = h; return c;
};

async function decodificar(src) {
  const res = await fetch(src);
  if (!res.ok) throw new Error(`${res.status} ${src}`);
  const blob = await res.blob();
  if (!/svg/.test(blob.type)) return createImageBitmap(blob);
  // Las SVG (siluetas) no se decodifican con createImageBitmap: pasan por <img> (solo hilo principal).
  const img = new Image(); img.src = URL.createObjectURL(blob); await img.decode();
  const w = 960, h = Math.round(960 * (img.naturalHeight || 540) / (img.naturalWidth || 960));
  return createImageBitmap(img, { resizeWidth: w, resizeHeight: h });
}

/** @param {{ src: string, invertir?: boolean, ancho: number, puntos: number, tramos?: boolean }} o */
export async function muestrear({ src, invertir = false, ancho, puntos, tramos = true }) {
  const respiro = tramos ? () => new Promise((r) => setTimeout(r)) : () => null;
  const source = await decodificar(src);
  const w = ancho, h = Math.round(w * source.height / source.width);
  const leer = async (rw, rh) => {
    const bitmap = await createImageBitmap(source, { resizeWidth: rw, resizeHeight: rh, resizeQuality: 'high' });
    const ctx = lienzo(rw, rh).getContext('2d', { willReadFrequently: true });
    ctx.drawImage(bitmap, 0, 0); bitmap.close();
    const d = ctx.getImageData(0, 0, rw, rh).data;
    // Silueta oscura sobre fondo claro: se invierte para muestrear igual que una nube sobre negro.
    if (invertir) for (let k = 0; k < d.length; k += 4) { d[k] = 255 - d[k]; d[k + 1] = 255 - d[k + 1]; d[k + 2] = 255 - d[k + 2]; }
    return d;
  };
  const px = await leer(w, h);
  // Brillo a baja resolución para la profundidad: superficies continuas, no ruido por píxel.
  const sw = 60, sh = Math.round(60 * h / w);
  const sp = await leer(sw, sh);
  source.close?.();
  const n0 = w * h;
  const lum = new Float32Array(n0), weight = new Float32Array(n0);
  // Imágenes oscuras: el brillo se normaliza al percentil 98.
  const histogram = new Uint32Array(256);
  for (let k = 0; k < n0; k++) {
    if ((k & 131071) === 131071) await respiro();
    histogram[(px[k * 4] * .2126 + px[k * 4 + 1] * .7152 + px[k * 4 + 2] * .0722) | 0]++;
  }
  let lit = 0, acc = 0, p98 = 255, total = 0;
  for (let v = 8; v < 256; v++) lit += histogram[v];
  for (let v = 255; v >= 8; v--) { acc += histogram[v]; if (acc >= lit * .02) { p98 = v; break; } }
  const gain = Math.min(2.6, Math.max(1, 200 / Math.max(p98, 1)));
  for (let k = 0; k < n0; k++) {
    if ((k & 32767) === 32767) await respiro();
    const l = Math.min(1, (px[k * 4] * .2126 + px[k * 4 + 1] * .7152 + px[k * 4 + 2] * .0722) / 255 * gain);
    lum[k] = l;
    const s = Math.min(1, Math.max(0, (l - .07) / .55));
    weight[k] = s * s * (3 - 2 * s);
    total += weight[k];
  }
  const factor = puntos / Math.max(total, 1);
  let seed = 1234567;
  const rand = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;
  const datos = new ArrayBuffer(puntos * STRIDE);
  const view = new DataView(datos);
  let n = 0;
  for (let y = 0; y < h && n < puntos; y++) {
    if ((y & 31) === 31) await respiro();
    for (let x = 0; x < w && n < puntos; x++) {
      const k = y * w + x;
      if (rand() >= weight[k] * factor) continue;
      const nx = ((x + rand()) / w) * 2 - 1, ny = (1 - (y + rand()) / h) * 2 - 1;
      const si = (Math.min(sh - 1, (y / h * sh) | 0) * sw + Math.min(sw - 1, (x / w * sw) | 0)) * 4;
      const smooth = Math.min(1, (sp[si] * .2126 + sp[si + 1] * .7152 + sp[si + 2] * .0722) / 255 * gain);
      const z = Math.max(-1, Math.min(1, (smooth - .22) * 2.6 + (lum[k] - smooth) * .6 + (rand() - .5) * .08));
      const o = n * STRIDE, boost = 1.15 * gain;
      view.setInt16(o, nx * 32767, true); view.setInt16(o + 2, ny * (h / w) * 32767, true); view.setInt16(o + 4, z * 32767, true);
      view.setUint8(o + 6, Math.min(255, px[k * 4] * boost)); view.setUint8(o + 7, Math.min(255, px[k * 4 + 1] * boost));
      view.setUint8(o + 8, Math.min(255, px[k * 4 + 2] * boost)); view.setUint8(o + 9, Math.min(255, 90 + lum[k] * 330));
      n++;
    }
  }
  return { datos: datos.slice(0, n * STRIDE), count: n, aspect: h / w };
}
