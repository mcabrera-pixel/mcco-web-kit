// Pruebas de styles/estandar.css: variables que fija cada sitio, valores del estándar Apple y fuentes autoalojadas.
// Se leen las declaraciones sin comentarios, para que un comentario no haga pasar ni fallar ninguna prueba.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ESTILOS = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'styles');
const FUENTES = path.join(ESTILOS, 'fuentes');

let leida;
const hoja = () => (leida ??= fs.readFileSync(path.join(ESTILOS, 'estandar.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, ''));

/** true si la hoja declara la propiedad («--accion: …»), no si solo la usa dentro de var(). */
const declara = (prop) => new RegExp(`(?:^|[{;\\s])${prop}\\s*:`).test(hoja());

/** Declaraciones de la primera regla que tiene `sel` en su lista de selectores ('' si no hay ninguna). */
function regla(sel) {
  for (const [, selectores, cuerpo] of hoja().matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    if (selectores.split(',').some((s) => s.trim() === sel)) return cuerpo;
  }
  return '';
}

// Rompe si falta una variable de acción, si cambian los valores fijos (parchment, tinta, sombra única, píldora
// de 980 px) o si aparece el peso 500, una hoja externa o el desplazamiento suave.
test('variables de acción y valores fijos del estándar', () => {
  for (const prop of ['--accion', '--accion-boton', '--accion-foco', '--accion-oscuro']) {
    assert.ok(declara(prop), `no declara ${prop}`);
  }
  for (const valor of ['#f5f5f7', '#1d1d1f', 'rgba(0,0,0,.22) 3px 5px 30px 0', 'border-radius: 980px']) {
    assert.ok(hoja().includes(valor), `no contiene ${valor}`);
  }
  assert.doesNotMatch(hoja(), /font-weight\s*:\s*500\b/);
  assert.doesNotMatch(hoja(), /\bfont\s*:[^;{}]*\b500\b/, 'peso 500 dentro del atajo font');
  assert.doesNotMatch(hoja(), /@import\s+url\(\s*['"]?http/i);
  assert.doesNotMatch(hoja(), /scroll-behavior\s*:\s*smooth/);
});

// Rompe si una fuente apunta a un CDN, fuera de styles/fuentes/ o a un archivo que no existe: Vite y la salida
// sin Astro resuelven url() relativo a la hoja.
test('cada url() de @font-face apunta a un archivo de styles/fuentes/', () => {
  const urls = (hoja().match(/@font-face\s*\{[^}]*\}/g) ?? [])
    .flatMap((cara) => [...cara.matchAll(/url\(\s*(['"]?)([^'")]+)\1\s*\)/g)].map((m) => m[2]));
  assert.ok(urls.length > 0, 'la hoja no declara fuentes con @font-face');
  for (const url of urls) {
    const archivo = path.resolve(ESTILOS, url);
    assert.equal(path.dirname(archivo), FUENTES, `${url} no está en styles/fuentes/`);
    assert.ok(fs.existsSync(archivo), `${url} no existe`);
  }
});

// Rompe si las fuentes viajan sin su licencia: la OFL 1.1 exige el aviso junto a cada copia.
test('la licencia OFL de Inter acompaña a las fuentes', () => {
  const ofl = fs.readFileSync(path.join(FUENTES, 'OFL-Inter.txt'), 'utf8');
  assert.ok(ofl.includes('Copyright (c) 2016 The Inter Project Authors (https://github.com/rsms/inter)'));
  assert.ok(ofl.includes('SIL OPEN FONT LICENSE Version 1.1'));
});

// Rompe si se renombra o se pierde una pieza que usan los componentes del estándar, o si el campo deja de
// tomar sus tonos del color de acción cuando el sitio no los fija.
const CLASES = ['.std', '.std-h1', '.std-h2', '.std-h3', '.std-lead', '.std-tagline', '.std-fina', '.std-pildora',
  '.std-pildora--fantasma', '.std-pildora--chica', '.std-mas', '.std-acciones', '.std-rotulo'];
test('clases y valores por defecto que consumen los componentes', () => {
  for (const clase of CLASES) assert.notEqual(regla(clase), '', `falta la regla ${clase}`);
  assert.match(regla('.std-mas::after'), /content\s*:/, '.std-mas sin «›» por ::after');
  const rotulo = regla('.std-rotulo');
  assert.ok(rotulo.includes('rgba(210,210,215,.72)'), 'el rótulo no es el chip translúcido');
  assert.match(rotulo, /backdrop-filter\s*:\s*blur\(/);
  assert.match(rotulo, /font-size\s*:\s*11px/);
  assert.match(hoja(), /--campo-claro\s*:\s*var\(--accion-oscuro\)/);
  assert.match(hoja(), /--campo-oscuro\s*:\s*var\(--accion\)/);
});
