// Pruebas de la capa base sin Astro: hoja, fuentes y runtimes sin minificar. Cada referencia debe apuntar a un archivo
// dentro del destino, sin certificar el montaje de los componentes ni el presupuesto del build de Astro.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { verificar } from '../scripts/estandar-verificar.mjs';

const KIT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SCRIPT = path.join(KIT, 'scripts', 'estandar-copiar.mjs');
const correr = (...args) => spawnSync(process.execPath, [SCRIPT, ...args], { encoding: 'utf8', timeout: 10000 });

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

// Cada caso negativo usa una copia propia para no alterar las demás pruebas.
function conImport(fuente) {
  const raiz = fs.mkdtempSync(path.join(os.tmpdir(), 'kit referencias '));
  carpetas.push(raiz);
  const d = path.join(raiz, 'destino');
  fs.cpSync(copia(), d, { recursive: true });
  fs.writeFileSync(path.join(d, 'lib/estandar/caso.js'), fuente);
  return { raiz, d };
}

test('rechaza un import estático multilínea a un archivo ausente', () => {
  const { d } = conImport("import {\n  ausente,\n} from './modulo-inexistente.js';\n");
  assert.throws(() => verificarReferencias(d), /modulo-inexistente\.js.*no está en la copia/);
});

test('rechaza una referencia que escapa del destino aunque el archivo exista', () => {
  const { raiz, d } = conImport("import '../../../externo.js';\n");
  fs.writeFileSync(path.join(raiz, 'externo.js'), 'export const dato = 1;\n');
  assert.throws(() => verificarReferencias(d), /externo\.js.*sale del destino/);
});

test('rechaza una referencia a una carpeta que existe', () => {
  const { d } = conImport("import './carpeta';\n");
  fs.mkdirSync(path.join(d, 'lib/estandar/carpeta'));
  assert.throws(() => verificarReferencias(d), /carpeta.*no es un archivo/);
});

test('analiza imports y reexports multilínea sin confundir comentarios ni cadenas con imports', () => {
  const { d } = conImport(`
    import principal,
      { dato as alias } from './a.js';
    import
      * as espacio from './b.js';
    import /* comentario con 'comillas' */ './c.js';
    export {
      dato,
    } from './d.js';
    export *
      from './e.js';
    export * as grupo from './f.js';
    // import './no-existe.js';
    const texto = "import './tampoco.js'";
  `);
  for (const nombre of ['a', 'b', 'c', 'd', 'e', 'f']) {
    fs.writeFileSync(path.join(d, `lib/estandar/${nombre}.js`), 'export const dato = 1; export default dato;');
  }
  assert.deepEqual(verificarReferencias(d).filter((r) => r.startsWith('lib/estandar/caso.js ')),
    ['a', 'b', 'c', 'd', 'e', 'f'].map((n) => `lib/estandar/caso.js importa ./${n}.js`));
});

function archivoDeCopia(d, rel, especificador) {
  const etiqueta = `${rel} importa "${especificador}"`;
  assert.ok(especificador.startsWith('./') || especificador.startsWith('../'), `${etiqueta}, que no es relativo y no viaja con la copia`);
  const archivo = fileURLToPath(new URL(especificador, pathToFileURL(path.join(d, rel))));
  const dentro = (raiz, f) => {
    const r = path.relative(raiz, f);
    return r !== '..' && !r.startsWith(`..${path.sep}`) && !path.isAbsolute(r);
  };
  assert.ok(dentro(d, archivo), `${etiqueta} y sale del destino`);
  assert.ok(fs.existsSync(archivo), `${etiqueta} y no está en la copia`);
  assert.ok(fs.statSync(archivo).isFile(), `${etiqueta} y no es un archivo`);
  assert.ok(dentro(fs.realpathSync(d), fs.realpathSync(archivo)), `${etiqueta} y sale del destino mediante un enlace`);
}

// El parser de Node reconoce toda la gramática de imports estáticos, sin ejecutar ni enlazar el código.
// SourceTextModule requiere esta opción experimental solo en el subproceso de prueba, sin dependencias del kit.
function importsEstaticos(fuentes) {
  const r = spawnSync(process.execPath, ['--experimental-vm-modules', '--no-warnings', '--input-type=module', '-e', `
    import { SourceTextModule } from 'node:vm';
    import { readFileSync } from 'node:fs';
    const fuentes = JSON.parse(readFileSync(0, 'utf8'));
    console.log(JSON.stringify(fuentes.map((f) => new SourceTextModule(f).dependencySpecifiers)));
  `], { input: JSON.stringify(fuentes), encoding: 'utf8', timeout: 10000 });
  assert.equal(r.status, 0, r.stderr || r.error?.message);
  return JSON.parse(r.stdout);
}

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
function verificarReferencias(d) {
  const refs = [];
  const archivos = listar(d).filter((f) => f.endsWith('.js'));
  const fuentes = archivos.map((rel) => fs.readFileSync(path.join(d, rel), 'utf8'));
  const estaticos = importsEstaticos(fuentes);
  for (const [i, rel] of archivos.entries()) {
    const fuente = fuentes[i];
    const especificadores = [
      ...estaticos[i],
      ...[...fuente.matchAll(/\bimport\(\s*['"]([^'"]+)['"]\s*\)/g)].map((m) => m[1]),
      ...[...fuente.matchAll(/new\s+URL\(\s*['"]([^'"]+)['"]\s*,\s*import\.meta\.url\s*\)/g)].map((m) => m[1]),
    ];
    for (const e of especificadores) {
      archivoDeCopia(d, rel, e);
      refs.push(`${rel} importa ${e}`);
    }
  }
  return refs;
}

test('cada referencia relativa de los JS copiados resuelve a un archivo de la copia', () => {
  const refs = verificarReferencias(copia());
  // La prueba no pasa en vacío: estas referencias existen hoy.
  for (const r of ['lib/estandar/nube.js importa ../visual/comun.js', 'lib/estandar/campo.js importa ./campo-anillos.js',
    'lib/estandar/nube-worker.js importa ./nube-muestreo.js']) assert.ok(refs.includes(r), `no encontré ${r}`);
  assert.equal(refs.filter((r) => r === 'lib/estandar/nube-cliente.js importa ./nube-worker.js').length, 2, 'nube-cliente.js carga el Worker por new URL() y por import()');
});

test('cada url() de la hoja copiada resuelve a un archivo de la copia', () => {
  const d = copia();
  const hoja = fs.readFileSync(path.join(d, 'styles/estandar.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  const urls = [...hoja.matchAll(/url\(\s*(['"]?)([^'")]+)\1\s*\)/g)].map((m) => m[2]);
  assert.ok(urls.length >= 2, 'la hoja no declara sus fuentes');
  for (const u of urls) archivoDeCopia(d, 'styles/estandar.css', u);
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

// Rompe si una actualización sobre un destino existente deja recursos de la versión anterior: el manifiesto y el disco
// deben coincidir exactamente después de copiar.
test('copiar: actualizar desde una versión anterior retira los recursos viejos y verifica', () => {
  const raiz = fs.mkdtempSync(path.join(os.tmpdir(), 'kit completo '));
  carpetas.push(raiz);
  const d = path.join(raiz, 'destino');
  assert.equal(correr(d, '--completo').status, 0, 'primera copia debe salir bien');
  verificar(d);
  // Simular un recurso viejo que ya no está en la nueva distribución.
  fs.mkdirSync(path.join(d, 'lib/estandar/chunks'), { recursive: true });
  fs.writeFileSync(path.join(d, 'lib/estandar/chunks/chunk-viejo-de-version-anterior.js'), 'export const viejo = 1;\n');
  assert.throws(() => verificar(d), /Archivos y manifiesto no coinciden/);
  assert.equal(correr(d, '--completo').status, 0, 'actualización debe salir bien');
  assert.equal(fs.existsSync(path.join(d, 'lib/estandar/chunks/chunk-viejo-de-version-anterior.js')), false, 'el recurso viejo debe desaparecer');
  verificar(d);
});
