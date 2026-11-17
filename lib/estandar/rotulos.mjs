// Rótulos de origen del estándar: el texto visible que dice de dónde viene cada imagen (regla de imágenes del grupo y
// mcco-check R11). Producto y Galeria lo escriben en un chip sobre cada foto, ilustración, captura o video.

/** Texto del rótulo para cada origen de imagen. */
export const ROTULOS = Object.freeze({
  real: 'Foto de faena',
  render: 'Render 3D',
  ilustracion: 'Ilustración',
  esquema: 'Esquema',
  captura: 'Captura de simulación',
});

/** Texto del rótulo de un origen. Lanza si el origen no existe: una imagen sin origen válido no llega a la página. */
export function rotuloDe(origen) {
  if (typeof origen !== 'string' || !Object.hasOwn(ROTULOS, origen)) {
    throw new Error(`rotuloDe: el origen "${String(origen)}" no existe (${Object.keys(ROTULOS).join(', ')}).`);
  }
  return ROTULOS[origen];
}

/** Rótulo de un video: «Video de faena» si es real (no es una foto, como en VideoBanda); si no, el de su origen. */
export function rotuloDeVideo(origen) {
  return origen === 'real' ? 'Video de faena' : rotuloDe(origen);
}
