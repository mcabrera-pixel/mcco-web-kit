import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as comun from '../lib/visual/comun.js';

function contexto({ enlaza = true, paralelo = false, perdido = false } = {}) {
  const llamadas = [], programa = {}, shaders = [];
  const gl = {
    VERTEX_SHADER: 1, FRAGMENT_SHADER: 2, LINK_STATUS: 3,
    createProgram: () => programa,
    createShader: (tipo) => { const s = { tipo }; shaders.push(s); return s; },
    shaderSource() {}, compileShader() {}, attachShader() {}, linkProgram() {},
    getExtension: () => paralelo ? { COMPLETION_STATUS_KHR: 4 } : null,
    getProgramParameter: (_, p) => p === 3 ? enlaza : false,
    isContextLost: () => perdido,
    detachShader: (_, s) => llamadas.push(['detach', s]),
    deleteShader: (s) => llamadas.push(['shader', s]),
    deleteProgram: (p) => llamadas.push(['programa', p]),
  };
  return { gl, llamadas, programa, shaders };
}
for (const [nombre, opciones, cancelado] of [
  ['correcto', {}, false], ['fallido', { enlaza: false }, false],
  ['contexto perdido', { paralelo: true, perdido: true }, false],
  ['cancelado', { paralelo: true }, true],
]) {
  test(`enlace ${nombre}: libera shaders y conserva solo un programa utilizable`, async () => {
    const c = contexto(opciones);
    const resultado = await comun.enlazar(c.gl, 'vertex', 'fragment', () => cancelado);
    const valido = nombre === 'correcto';
    assert.equal(resultado, valido ? c.programa : null);
    for (const s of c.shaders) {
      assert.ok(c.llamadas.some(([tipo, shader]) => tipo === 'detach' && shader === s));
      assert.ok(c.llamadas.some(([tipo, shader]) => tipo === 'shader' && shader === s));
    }
    assert.equal(c.llamadas.filter(([tipo]) => tipo === 'programa').length, valido ? 0 : 1);
  });
}
test('un fallo de compilación también libera los recursos ya creados', async () => {
  const c = contexto();
  c.gl.compileShader = () => { throw new Error('compilación interrumpida'); };
  await assert.rejects(comun.enlazar(c.gl, '', ''), /compilación interrumpida/);
  assert.equal(c.llamadas.filter(([tipo]) => tipo === 'shader').length, 1);
  assert.equal(c.llamadas.filter(([tipo]) => tipo === 'programa').length, 1);
});
