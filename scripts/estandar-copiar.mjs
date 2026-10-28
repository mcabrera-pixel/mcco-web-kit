#!/usr/bin/env node
// Sin opción: conserva la copia base v1.2 (fuentes JS sin minificar).
// --completo: verifica y copia dist/estandar usando exclusivamente Node nativo.
// Uso: mcco-estandar-copiar <destino> [--completo]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { verificar } from './estandar-verificar.mjs';

const KIT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const USO = 'Uso: mcco-estandar-copiar <destino> [--completo]';

const destino = process.argv[2];
if (!destino || destino.startsWith('-') || process.argv.slice(3).some(a => a !== '--completo') || process.argv.length > 4) {
  console.error(`mcco-estandar-copiar: ${destino ? `no conozco la opción ${destino}` : 'falta el destino'}. ${USO}`);
  process.exit(1);
}

if (process.argv[3] === '--completo') {
  try {
    const origen = path.join(KIT, 'dist/estandar');
    const { manifest, presupuesto } = verificar(origen);
    if (Object.values(presupuesto).some(p => !p.cumple)) throw new Error('Presupuesto JS excedido');
    const raiz = path.resolve(destino);
    // Validar todo antes de crear el destino: un artefacto incompleto no deja una copia parcial.
    for (const rel of [...Object.keys(manifest.archivos), 'manifest.json']) {
      fs.mkdirSync(path.dirname(path.join(raiz, rel)), { recursive: true });
      fs.copyFileSync(path.join(origen, rel), path.join(raiz, rel));
    }
    console.log(`mcco-estandar-copiar: distribución completa ${manifest.version} en ${raiz}`);
  } catch (e) {
    console.error(`mcco-estandar-copiar: ${e.message}`); process.exit(1);
  }
  process.exit(0);
}

// Los ayudantes del build (lib/estandar/rotulos.mjs y sus tipos) no viajan: solo los usan los componentes de Astro.
const archivosDe = (dir, filtro = () => true) => fs.readdirSync(path.join(KIT, dir), { withFileTypes: true })
  .filter((e) => e.isFile() && filtro(e.name)).map((e) => `${dir}/${e.name}`).sort();
const ARCHIVOS = [
  'styles/estandar.css',
  ...archivosDe('styles/fuentes'),
  ...archivosDe('lib/estandar', (nombre) => nombre.endsWith('.js')),
  'lib/visual/comun.js',
];

const raiz = path.resolve(destino);
try {
  for (const rel of ARCHIVOS) {
    const copia = path.join(raiz, rel);
    fs.mkdirSync(path.dirname(copia), { recursive: true });
    fs.copyFileSync(path.join(KIT, rel), copia);
  }
} catch (e) {
  console.error(`mcco-estandar-copiar: no pude copiar a ${raiz} (${e.message}).`);
  process.exit(1);
}
console.log(`mcco-estandar-copiar: ${ARCHIVOS.length} archivos en ${raiz}`);
for (const rel of ARCHIVOS) console.log(`  ${rel}`);
