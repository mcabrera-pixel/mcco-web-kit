#!/usr/bin/env node
// Verificación nativa: no importa esbuild, Astro ni dependencias del paquete.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { gzipSync } from 'node:zlib';

export const KIT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const ENTRADAS = Object.freeze(Object.fromEntries([
  'menu', 'subnav', 'nube', 'campo', 'pausa', 'nube-worker',
].map(n => [n, `lib/estandar/${n}.js`]).concat([['video', 'lib/visual/video.js']])));
export const OBLIGATORIOS = [
  'styles/estandar.css', 'styles/estandar-componentes.css',
  'styles/fuentes/inter-latin-wght-normal.woff2', 'styles/fuentes/inter-latin-ext-wght-normal.woff2',
  'styles/fuentes/OFL-Inter.txt', ...Object.values(ENTRADAS),
];
export const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
export const gzip = bytes => gzipSync(bytes, { level: 9 }).length;
export function listar(raiz, dir = '') {
  return fs.readdirSync(path.join(raiz, dir), { withFileTypes: true }).sort((a,b) => a.name < b.name ? -1 : 1)
    .flatMap(e => {
      const rel = path.posix.join(dir, e.name);
      if (e.isSymbolicLink()) throw new Error(`No se admite enlace simbólico: ${rel}`);
      return e.isDirectory() ? listar(raiz, rel) : [rel];
    });
}
function rutaSegura(rel) {
  if (typeof rel !== 'string' || !rel || rel.includes('\\') || rel.startsWith('/') || rel.split('/').some(p => p === '..' || p === '.' || !p)) {
    throw new Error(`Ruta inválida: ${rel}`);
  }
  return rel;
}
// El formato emitido por esbuild usa referencias literales; también se incluyen import() y new URL del Worker.
// No se confía solo en el grafo declarado: se reconstruye de cada recurso verificado.
export function dependencias(rel, bytes) {
  const s = bytes.toString(), refs = [];
  if (rel.endsWith('.js')) {
    for (const [, ref] of s.matchAll(/["']([^"'\s]+\.js)["']/g)) refs.push(ref);
  } else if (rel.endsWith('.css')) {
    for (const [, , ref] of s.matchAll(/url\(\s*(["']?)([^"')\s]+)\1\s*\)/g)) refs.push(ref);
  }
  return [...new Set(refs.map(ref => {
    if (!ref.startsWith('./') && !ref.startsWith('../')) throw new Error(`Dependencia no local: ${rel}: ${ref}`);
    return rutaSegura(path.posix.normalize(path.posix.join(path.posix.dirname(rel), ref)));
  }))].sort();
}
export function grafo(archivos, entrada) {
  const vistos = new Set();
  function visitar(rel) {
    if (vistos.has(rel)) return;
    if (!archivos[rel]) throw new Error(`Falta dependencia: ${rel}`);
    vistos.add(rel);
    archivos[rel].dependencias.forEach(visitar);
  }
  visitar(entrada);
  return [...vistos].sort();
}
export function verificar(raiz = path.join(KIT, 'dist/estandar'), version = JSON.parse(fs.readFileSync(path.join(KIT, 'package.json'))).version) {
  const m = JSON.parse(fs.readFileSync(path.join(raiz, 'manifest.json')));
  const exigir = (si, texto) => { if (!si) throw new Error(texto); };
  exigir(m.formato === 1 && m.version === version, 'Versión o formato de manifiesto incorrecto');
  exigir(m.archivos && m.entradas, 'Manifiesto incompleto');
  for (const rel of OBLIGATORIOS) exigir(m.archivos[rel], `Falta recurso obligatorio: ${rel}`);
  const disco = listar(raiz).filter(r => r !== 'manifest.json');
  exigir(JSON.stringify(disco.slice().sort()) === JSON.stringify(Object.keys(m.archivos).sort()), 'Archivos y manifiesto no coinciden');
  for (const [rel, registro] of Object.entries(m.archivos)) {
    rutaSegura(rel);
    const bytes = fs.readFileSync(path.join(raiz, rel));
    exigir(/^[a-f0-9]{64}$/.test(registro.sha256 ?? '') && registro.sha256 === sha256(bytes), `Hash incorrecto o ausente: ${rel}`);
    exigir(registro.bytes === bytes.length && registro.gzip === gzip(bytes), `Tamaño incorrecto: ${rel}`);
    exigir(JSON.stringify(registro.dependencias) === JSON.stringify(dependencias(rel, bytes)), `Grafo incorrecto: ${rel}`);
    registro.dependencias.forEach(dep => exigir(m.archivos[dep], `Falta dependencia: ${dep}`));
  }
  for (const [nombre, rel] of Object.entries(ENTRADAS)) {
    exigir(m.entradas[nombre]?.ruta === rel, `Falta entrada: ${nombre}`);
    exigir(JSON.stringify(m.entradas[nombre].recursos) === JSON.stringify(grafo(m.archivos, rel)), `Grafo de entrada incorrecto: ${nombre}`);
  }
  const medir = (recursos, limite = null) => {
    const archivos = Object.fromEntries([...new Set(recursos)].sort().map(r => [r, m.archivos[r].gzip]));
    const total = Object.values(archivos).reduce((a,b) => a+b, 0);
    return { total, limite, cumple: limite === null || total <= limite, archivos };
  };
  const presupuesto = Object.fromEntries(Object.keys(ENTRADAS).map(n => [n,
    medir([...m.entradas[n].recursos, ...(['nube', 'campo'].includes(n) ? m.entradas.pausa.recursos : [])], n === 'nube' ? 12000 : n === 'campo' ? 5000 : null)]));
  presupuesto.pagina = medir(Object.values(m.entradas).flatMap(e => e.recursos));
  return { manifest: m, presupuesto };
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const { presupuesto } = verificar(process.argv[2] && path.resolve(process.argv[2]));
    console.log(JSON.stringify(presupuesto, null, 2));
    if (Object.values(presupuesto).some(p => !p.cumple)) process.exitCode = 1;
  } catch (e) { console.error(`estandar-verificar: ${e.message}`); process.exitCode = 1; }
}
