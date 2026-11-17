// glsl() de scripts/estandar-build.mjs compacta el GLSL de la nube y del campo para dist/estandar sin cambiar el
// programa: mismos tokens que la fuente sin comentarios, y la línea #version sola, como exige GLSL ES 3.00.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { glsl } from '../scripts/estandar-build.mjs';

// Tokens de GLSL ES 3.00, con los operadores de dos caracteres: a - -b y a--b no dan los mismos.
const tokens = s => s.replace(/\/\/[^\n]*/g, '').match(/#\w+|[A-Za-z_]\w*|(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?|\+\+|--|&&|\|\||\^\^|<<=?|>>=?|[-+*/%<>=!&|^]=?|\S/g);
const fuentes = ['nube', 'campo'].flatMap(n => [...fs.readFileSync(new URL(`../lib/estandar/${n}.js`, import.meta.url), 'utf8')
  .matchAll(/const (VS|FS) = `([^`]+)`;/g)].map(([, nombre, fuente]) => [`${n} ${nombre}`, fuente]));

test('glsl: los shaders de nube y campo conservan sus tokens y la línea #version', () => {
  assert.equal(fuentes.length, 4);
  for (const [nombre, fuente] of fuentes) {
    const compacto = glsl(fuente);
    assert.deepStrictEqual(tokens(compacto), tokens(fuente), nombre);
    assert.ok(compacto.startsWith('#version 300 es\n'), nombre);
    assert.equal(compacto.split('\n').length, 2, `${nombre}: solo la directiva lleva su línea`);
    assert.ok(compacto.length < fuente.length * 0.85, `${nombre}: ${compacto.length} de ${fuente.length} caracteres`);
  }
});

test('glsl: sin comentarios ni espacios sobrantes, sin pegar palabras ni operadores', () => {
  assert.equal(glsl('#version 300 es\nprecision mediump float;\n// nota\nfloat a = b - -c; // otra\n  if (x <= .5) discard;\n'),
    '#version 300 es\nprecision mediump float;float a=b- -c;if(x<=.5)discard;');
  assert.equal(glsl('vec2 p = q\n  + r * 2.;'), 'vec2 p=q+r*2.;');
  assert.equal(glsl('float\nx = 1.;'), 'float x=1.;');
});
