#!/usr/bin/env node
// mcco-estandar-copiar: capa base sin Astro de rc.1, con fuentes sin minificar. No monta los componentes ni cumple
// por sí sola el presupuesto de JS. Copia a <destino>/ la hoja con sus fuentes (styles/estandar.css y styles/fuentes/*) y el runtime
// (lib/estandar/*.js y lib/visual/comun.js) con las mismas rutas relativas, así siguen resolviendo los import, el Worker
// de la nube y los url() de la hoja. La web lo corre en su deploy, desde la tag del kit que fija, nunca a mano.
// Uso: mcco-estandar-copiar <destino>
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const KIT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const USO = 'Uso: mcco-estandar-copiar <destino>';

const destino = process.argv[2];
if (!destino || destino.startsWith('-')) {
  console.error(`mcco-estandar-copiar: ${destino ? `no conozco la opción ${destino}` : 'falta el destino'}. ${USO}`);
  process.exit(1);
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
