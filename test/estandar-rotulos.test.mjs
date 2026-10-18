// Pruebas de lib/estandar/rotulos.mjs: el rótulo de origen que lleva cada imagen del estándar (R11). Los componentes
// (Producto, Galeria) escriben rotuloDe(origen) sobre cada foto, ilustración, captura o video.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { ROTULOS, rotuloDe } from '../lib/estandar/rotulos.mjs';

// Rompe si cambia el texto de un rótulo o si aparece o se pierde un origen: el texto es el que exige la regla de
// imágenes del grupo y el que lee la gente sobre cada imagen.
test('ROTULOS: los cinco orígenes y su texto visible', () => {
  assert.deepEqual({ ...ROTULOS }, {
    real: 'Foto de faena',
    render: 'Render 3D',
    ilustracion: 'Ilustración',
    esquema: 'Esquema',
    captura: 'Captura de simulación',
  });
});

test('rotuloDe: entrega el rótulo de cada origen', () => {
  assert.equal(rotuloDe('captura'), 'Captura de simulación');
  assert.equal(rotuloDe('ilustracion'), 'Ilustración');
  for (const [origen, rotulo] of Object.entries(ROTULOS)) assert.equal(rotuloDe(origen), rotulo);
});

// Rompe si un origen mal escrito o inventado llega a la página con un rótulo vacío o «undefined»: el build tiene
// que caer. Incluye las claves que todo objeto hereda (toString, constructor) y valores que no son texto.
test('rotuloDe: lanza con un origen que no existe', () => {
  assert.throws(() => rotuloDe('ia'));
  assert.throws(() => rotuloDe('Ilustracion'), /Ilustracion/);
  for (const origen of ['toString', 'constructor', '__proto__', '', undefined, null]) {
    assert.throws(() => rotuloDe(origen), `no lanza con ${String(origen)}`);
  }
});

// Rompe si los tipos de rotulos.d.mts se separan de ROTULOS. Esos tipos hacen que `origen` de Producto y Galeria
// acepte solo los cinco orígenes en el chequeo de tipos del sitio (TypeScript no lee el JS de un paquete).
test('rotulos.d.mts declara los mismos orígenes y textos que ROTULOS', () => {
  const tipos = fs.readFileSync(new URL('../lib/estandar/rotulos.d.mts', import.meta.url), 'utf8');
  const bloque = tipos.match(/ROTULOS\s*:\s*Readonly<\{([^}]*)\}>/);
  assert.ok(bloque, 'rotulos.d.mts no declara ROTULOS como Readonly<{ … }>');
  const declarados = Object.fromEntries([...bloque[1].matchAll(/(\w+)\s*:\s*'([^']*)'/g)].map((m) => [m[1], m[2]]));
  assert.deepEqual(declarados, { ...ROTULOS });
  assert.match(tipos, /export declare function rotuloDe\(origen: string\): string;/);
});
