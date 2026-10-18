// Pruebas de scripts/estandar-copiar.mjs (mcco-estandar-copiar): la salida sin Astro del estándar para webs sin
// framework. Corre el script hacia una carpeta temporal (con espacios en la ruta, como las de MCCO) y revisa que la copia
// se sostenga sola: cada import, import() y new URL(…, import.meta.url) relativo de los JS copiados, y cada url() de la
// hoja, apunta a un archivo de la copia.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const KIT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SCRIPT = path.join(KIT, 'scripts', 'estandar-copiar.mjs');
const correr = (...args) => spawnSync(process.execPath, [SCRIPT, ...args], { encoding: 'utf8' });

const carpetas = [];
after(() => { for (const c of carpetas) fs.rmSync(c, { recursive: true, force: true }); });
let destino;
/** Carpeta con la copia, hecha una sola vez para todas las pruebas. */
function copia() {
  if (destino) return destino;
  const raiz = fs.mkdtempSync(path.join(os.tmpdir(), 'kit estandar '));
  carpetas.push(raiz);
  const r = correr(path.join(raiz, 'sitio publico'));
  assert.equal(r.status, 0, r.stderr);
  destino = path.join(raiz, 'sitio publico');
  return destino;
}
/** Archivos de una carpeta, relativos a ella y con «/». */
const listar = (dir, base = dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
  (e.isDirectory() ? listar(path.join(dir, e.name), base) : [path.relative(base, path.join(dir, e.name)).split(path.sep).join('/')]));

// Rompe si falta una pieza que la web necesita: la hoja, las fuentes con su licencia, el runtime o comun.js.
test('copia la hoja, las fuentes, el runtime y comun.js con las mismas rutas relativas', () => {
  const d = copia();
  for (const rel of ['styles/estandar.css', 'styles/fuentes/inter-latin-wght-normal.woff2', 'styles/fuentes/OFL-Inter.txt',
    'lib/estandar/nube.js', 'lib/visual/comun.js']) {
    assert.ok(fs.existsSync(path.join(d, rel)), `falta ${rel}`);
  }
});

// Rompe si la copia deja afuera un módulo del runtime, si arrastra los ayudantes del build (rotulos.mjs) o cualquier
// otra cosa del kit, o si cambia algún archivo en el camino.
test('la copia trae exactamente esos archivos, iguales a los del kit', () => {
  const d = copia();
  const esperados = ['styles/estandar.css', ...listar(path.join(KIT, 'styles/fuentes')).map((f) => `styles/fuentes/${f}`),
    ...listar(path.join(KIT, 'lib/estandar')).filter((f) => f.endsWith('.js')).map((f) => `lib/estandar/${f}`),
    'lib/visual/comun.js'].sort();
  assert.deepEqual(listar(d).sort(), esperados);
  for (const rel of esperados) assert.ok(fs.readFileSync(path.join(d, rel)).equals(fs.readFileSync(path.join(KIT, rel))), `${rel} cambió`);
});

// Rompe si un JS copiado importa un archivo que no viaja con la copia: import estático, import() dinámico o el Worker
// de la nube (new Worker(new URL('./nube-worker.js', import.meta.url))).
test('cada referencia relativa de los JS copiados resuelve a un archivo de la copia', () => {
  const d = copia();
  const refs = [];
  for (const rel of listar(d).filter((f) => f.endsWith('.js'))) {
    const fuente = fs.readFileSync(path.join(d, rel), 'utf8');
    const especificadores = [
      // import … from '…', export … from '…' e import '…' (sin confundirlos con un export const que lleva un texto).
      ...[...fuente.matchAll(/^\s*(?:import|export)\s[^'"\n;]*?\bfrom\s*['"]([^'"]+)['"]/gm)].map((m) => m[1]),
      ...[...fuente.matchAll(/^\s*import\s*['"]([^'"]+)['"]/gm)].map((m) => m[1]),
      ...[...fuente.matchAll(/\bimport\(\s*['"]([^'"]+)['"]\s*\)/g)].map((m) => m[1]),
      ...[...fuente.matchAll(/new\s+URL\(\s*['"]([^'"]+)['"]\s*,\s*import\.meta\.url\s*\)/g)].map((m) => m[1]),
    ];
    for (const e of especificadores) {
      assert.ok(e.startsWith('./') || e.startsWith('../'), `${rel} importa "${e}", que no es relativo y no viaja con la copia`);
      refs.push(`${rel} importa ${e}`);
      assert.ok(fs.existsSync(path.resolve(path.dirname(path.join(d, rel)), e)), `${rel} importa "${e}" y no está en la copia`);
    }
  }
  // La prueba no pasa en vacío: estas referencias existen hoy.
  for (const r of ['lib/estandar/nube.js importa ../visual/comun.js', 'lib/estandar/campo.js importa ./campo-anillos.js',
    'lib/estandar/nube-worker.js importa ./nube-muestreo.js']) assert.ok(refs.includes(r), `no encontré ${r}`);
  assert.equal(refs.filter((r) => r === 'lib/estandar/nube.js importa ./nube-worker.js').length, 2, 'nube.js carga el Worker por new URL() y por import()');
});

test('cada url() de la hoja copiada resuelve a un archivo de la copia', () => {
  const d = copia();
  const hoja = fs.readFileSync(path.join(d, 'styles/estandar.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  const urls = [...hoja.matchAll(/url\(\s*(['"]?)([^'")]+)\1\s*\)/g)].map((m) => m[2]);
  assert.ok(urls.length >= 2, 'la hoja no declara sus fuentes');
  for (const u of urls) assert.ok(fs.existsSync(path.resolve(d, 'styles', u)), `${u} no está en la copia`);
});

// Rompe si los módulos copiados no cargan fuera del kit: el del Worker importa nube-muestreo.js por su ruta relativa.
test('los módulos sin DOM de la copia cargan en Node con sus imports relativos', async () => {
  const d = copia();
  const { formaDeImagen } = await import(pathToFileURL(path.join(d, 'lib/estandar/nube-worker.js')).href);
  const { anillos, parametrosCampo } = await import(pathToFileURL(path.join(d, 'lib/estandar/campo-anillos.js')).href);
  assert.equal(typeof formaDeImagen, 'function');
  assert.equal(anillos(parametrosCampo(false), 777).length / 3, 5184);
});

test('sin destino sale con código 1 y un mensaje en español', () => {
  const r = correr();
  assert.equal(r.status, 1);
  assert.match(r.stderr, /mcco-estandar-copiar: falta el destino/);
  assert.match(r.stderr, /Uso: mcco-estandar-copiar <destino>/);
});

// Rompe si una opción mal escrita termina como una carpeta llamada «--help» en la raíz del deploy.
test('una opción en lugar del destino sale con código 1 sin copiar nada', () => {
  const r = correr('--help');
  assert.equal(r.status, 1);
  assert.match(r.stderr, /no conozco la opción --help\. Uso: mcco-estandar-copiar <destino>/);
  assert.equal(fs.existsSync('--help'), false);
});
