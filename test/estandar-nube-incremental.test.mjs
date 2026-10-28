import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formaDeImagen } from '../lib/estandar/nube-worker.js';
import { muestrearExacto, formaOrdenada } from './fixtures/nube-muestreo-rc1.mjs';

// Referencia congelada de rc.1: también detecta cambios comunes a Worker y respaldo.
for (const [w, h, puntos, semilla] of [[720, 405, 26000, 9001], [480, 270, 11000, 16920], [1, 1, 500, 0]]) {
  test(`Worker y respaldo por lotes conservan rc.1: ${w}×${h}, semilla ${semilla}`, async (t) => {
    const px = new Uint8ClampedArray(w * h * 4), lum = new Float32Array(w * h);
    for (let k = 0; k < lum.length; k++) {
      px[k * 4] = (k * 31 + 128) % 256;
      px[k * 4 + 1] = (k * 17 + 97) % 256;
      px[k * 4 + 2] = (k * 11 + 53) % 256;
      lum[k] = (px[k * 4] * .2126 + px[k * 4 + 1] * .7152 + px[k * 4 + 2] * .0722) / 255;
    }
    const esperado = formaOrdenada(muestrearExacto(lum, w, h, puntos, semilla), w, h);
    t.mock.method(globalThis, 'fetch', async () => ({ ok: true, blob: async () => ({}) }));
    const anteriores = ['OffscreenCanvas', 'createImageBitmap', 'document'].map((k) => [k, Object.getOwnPropertyDescriptor(globalThis, k)]);
    t.after(() => anteriores.forEach(([k, d]) => d ? Object.defineProperty(globalThis, k, d) : delete globalThis[k]));
    const canvas = () => ({ getContext: () => ({ drawImage() {}, getImageData: () => ({ data: px }) }) });
    globalThis.createImageBitmap = async () => ({ width: w, height: h, close() {} });
    globalThis.OffscreenCanvas = class { constructor() { return canvas(); } };
    const pedido = { src: 'prueba', ancho: w, puntos, semilla };
    assert.deepEqual(await formaDeImagen(pedido), esperado, 'camino del Worker');
    globalThis.OffscreenCanvas = undefined;
    globalThis.document = { createElement: canvas };
    let reloj = 0, pausas = 0;
    t.mock.method(performance, 'now', () => reloj += 9);
    const respaldo = await formaDeImagen(pedido, async () => { pausas++; });
    assert.deepEqual(respaldo, esperado, 'respaldo sin OffscreenCanvas, incluidos empates de Hilbert');
    assert.ok(pausas > 10, `el respaldo solo cedió ${pausas} veces`);
  });
}

test('si OffscreenCanvas falta solo dentro del Worker avisa que se use el hilo principal', async t => {
  const claves = ['OffscreenCanvas', 'WorkerGlobalScope', 'self'];
  const anteriores = claves.map(k=>[k,Object.getOwnPropertyDescriptor(globalThis,k)]);
  t.after(()=>anteriores.forEach(([k,d])=>d?Object.defineProperty(globalThis,k,d):delete globalThis[k]));
  globalThis.WorkerGlobalScope = class {};
  globalThis.self = new WorkerGlobalScope();
  globalThis.OffscreenCanvas = undefined;
  const mensajes = [];
  self.postMessage = dato => mensajes.push(dato);
  await import('../lib/estandar/nube-worker.js?sin-offscreen-en-worker');
  await self.onmessage({data:{id:7,src:'no-debe-descargarse'}});
  assert.deepEqual(mensajes,[{id:7,error:'sin worker'}]);
});
