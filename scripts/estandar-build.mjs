#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build, version as esbuild } from 'esbuild';
import { KIT, ENTRADAS, listar, sha256, gzip, dependencias, grafo, verificar } from './estandar-verificar.mjs';

// GLSL compacto con los mismos tokens: sin comentarios ni espacios, salvo el que separa dos palabras (o números) y el
// que separa dos operadores (a - -b no puede volverse a--b). Cada directiva, como la línea obligatoria #version,
// conserva su propia línea.
const PALABRA = /[\w.]/, OPERADOR = /[-+*/%<>=!&|^]/;
export function glsl(fuente) {
  return fuente.replace(/\/\/[^\n]*/g, '').split('\n').map(s => s.trim().replace(/\s+/g, ' ')).filter(Boolean)
    .map(s => (s[0] === '#' ? `${s}\n` : `${s} `)).join('')
    .replace(/ +/g, (m, i, t) => [PALABRA, OPERADOR].some(c => c.test(t[i - 1] ?? '') && c.test(t[i + m.length] ?? '')) ? ' ' : '');
}

export async function construir(salida = path.join(KIT, 'dist/estandar')) {
  fs.rmSync(salida, { recursive: true, force: true });
  fs.mkdirSync(salida, { recursive: true });
  await build({
    absWorkingDir: KIT,
    entryPoints: Object.fromEntries(Object.values(ENTRADAS).map(rel => [rel.slice(0, -3), rel])),
    outdir: salida, bundle: true, splitting: true, format: 'esm', platform: 'browser', target: 'es2022',
    // esbuild no minifica el contenido GLSL de las plantillas: lo compacta glsl(), sin cambiar el programa. Sus
    // instrucciones y constantes siguen viniendo de los runtimes de Astro.
    plugins: [{ name: 'glsl-estandar', setup(build) {
      build.onLoad({ filter: /lib[\\/]estandar[\\/](nube|campo)\.js$/ }, args => ({
        loader: 'js', contents: fs.readFileSync(args.path, 'utf8').replace(/const (VS|FS) = `([^`]+)`;/g,
          (_, nombre, fuente) => `const ${nombre} = \`${glsl(fuente)}\`;`),
      }));
    } }],
    minify: true, charset: 'utf8', legalComments: 'none', chunkNames: 'lib/estandar/chunks/[name]-[hash]',
    // nube-cliente queda en nube.js; su new URL('./nube-worker.js', import.meta.url) apunta a la entrada explícita.
  });
  fs.mkdirSync(path.join(salida, 'styles'), { recursive: true });
  for (const rel of ['styles/estandar.css', 'styles/estandar-componentes.css', 'styles/fuentes']) {
    fs.cpSync(path.join(KIT, rel), path.join(salida, rel), { recursive: true });
  }
  const archivos = Object.fromEntries(listar(salida).map(rel => {
    const bytes = fs.readFileSync(path.join(salida, rel));
    return [rel, { bytes: bytes.length, gzip: gzip(bytes), sha256: sha256(bytes), dependencias: dependencias(rel, bytes) }];
  }));
  const manifest = {
    formato: 1, version: JSON.parse(fs.readFileSync(path.join(KIT, 'package.json'))).version,
    generador: `esbuild@${esbuild}`, compresion: 'gzip nivel 9; bytes por respuesta', archivos,
    entradas: Object.fromEntries(Object.entries(ENTRADAS).map(([n, ruta]) => [n, { ruta, recursos: grafo(archivos, ruta) }])),
  };
  fs.writeFileSync(path.join(salida, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  verificar(salida);
  console.log(`estandar-build: ${Object.keys(archivos).length} recursos reproducibles en dist/estandar`);

  return manifest;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await construir();
