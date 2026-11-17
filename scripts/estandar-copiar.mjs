#!/usr/bin/env node
// Sin opción: conserva la copia base v1.2 (fuentes JS sin minificar).
// --completo: verifica y copia dist/estandar usando exclusivamente Node nativo.
// Uso: mcco-estandar-copiar <destino> [--completo]
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { verificar } from './estandar-verificar.mjs';

const KIT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const USO = 'Uso: mcco-estandar-copiar <destino> [--completo]';

function listarRel(raiz, dir = '') {
  return fs.readdirSync(path.join(raiz, dir), { withFileTypes: true }).flatMap((e) => {
    const rel = dir ? `${dir}/${e.name}` : e.name;
    if (e.isSymbolicLink()) throw new Error(`${raiz} no es una copia administrada del estándar; usa una carpeta propia`);
    return e.isDirectory() ? listarRel(raiz, rel) : [rel];
  });
}

function destinoAdministrado(raiz) {
  if (!fs.existsSync(raiz)) return true;
  if (!fs.statSync(raiz).isDirectory()) return false;
  const archivos = listarRel(raiz);
  if (archivos.length === 0) return true;
  let manifest;
  try {
    manifest = JSON.parse(fs.readFileSync(path.join(raiz, 'manifest.json'), 'utf8'));
  } catch {
    return false;
  }
  if (manifest.formato !== 1 || !manifest.archivos || typeof manifest.archivos !== 'object') return false;
  const permitidos = new Set([...Object.keys(manifest.archivos), 'manifest.json']);
  return archivos.every(rel => permitidos.has(rel.replace(/\\/g, '/')));
}

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
    // Armar la distribución en un directorio temporal junto al destino, verificarla y reemplazar el directorio
    // administrado de una sola vez. Así una actualización retira los recursos de la versión anterior y no deja
    // artefactos parciales si algo falla. Los archivos del sitio fuera del directorio administrado no se tocan.
    const padre = path.dirname(raiz);
    fs.mkdirSync(padre, { recursive: true });
    const tmp = fs.mkdtempSync(path.join(padre, `.tmp-${path.basename(raiz)}-`));
    let backup = null;
    let instalado = false;
    try {
      for (const rel of [...Object.keys(manifest.archivos), 'manifest.json']) {
        const destinoRel = path.join(tmp, rel);
        fs.mkdirSync(path.dirname(destinoRel), { recursive: true });
        fs.copyFileSync(path.join(origen, rel), destinoRel);
      }
      verificar(tmp);
      if (!destinoAdministrado(raiz)) throw new Error(`${raiz} no es una copia administrada del estándar; usa una carpeta propia`);
      if (fs.existsSync(raiz)) {
        const aleatorio = crypto.randomBytes(4).toString('hex');
        backup = path.join(padre, `.old-${path.basename(raiz)}-${aleatorio}`);
        fs.renameSync(raiz, backup);
      }
      fs.renameSync(tmp, raiz);
      instalado = true;
    } catch (e) {
      if (!instalado && backup && fs.existsSync(backup) && !fs.existsSync(raiz)) {
        try { fs.renameSync(backup, raiz); } catch (e2) { /* el error original ya describe la falla */ }
      }
      throw new Error(`no se pudo instalar la distribución (${e.message})`);
    } finally {
      if (backup && fs.existsSync(backup) && instalado) fs.rmSync(backup, { recursive: true, force: true });
      if (fs.existsSync(tmp)) fs.rmSync(tmp, { recursive: true, force: true });
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
