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

let leidaComponentes;
const hojaComponentes = () => (leidaComponentes ??= fs.readFileSync(path.join(ESTILOS, 'estandar-componentes.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, ''));

/** Comparación lexicográfica de especificidades [a, b, c]. */
function compararEspecificidad(x, y) {
  for (let i = 0; i < 3; i++) {
    const d = x[i] - y[i];
    if (d !== 0) return d;
  }
  return 0;
}

/** true si la hoja declara la propiedad («--accion: …»), no si solo la usa dentro de var(). */
const declara = (prop) => new RegExp(`(?:^|[{;\\s])${prop}\\s*:`).test(hoja());

/** Declaraciones de las reglas que incluyen `sel` en su lista de selectores. */
function regla(sel) {
  const cuerpos = [];
  for (const [, selectores, cuerpo] of hoja().matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    if (selectores.split(',').some((s) => s.trim() === sel)) cuerpos.push(cuerpo);
  }
  return cuerpos.join(';');
}

// Rompe si falta una variable de acción, si cambian los valores fijos (parchment, tinta, sombra única, píldora
// de 980 px) o si aparece el peso 500, una hoja externa o el desplazamiento suave.
test('variables de acción y valores fijos del estándar', () => {
  for (const prop of ['--accion', '--accion-boton', '--accion-texto', '--accion-foco', '--accion-oscuro']) {
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

// Rompe si el anillo de foco no pasa a la variante clara dentro de un bloque negro: el foco cobre de mcco.cl (#ba521a)
// da 2,94:1 sobre #2a2a2c, bajo el 3:1 de WCAG 1.4.11. También si la píldora chica pierde su ancho mínimo: con un
// texto corto quedaría bajo los 44 px de área táctil.
test('foco claro sobre negro y píldora chica de 44 px de ancho mínimo', () => {
  assert.match(regla(':where(.std [data-std-oscuro]) :focus-visible'), /outline-color\s*:\s*var\(--accion-oscuro\)/);
  assert.match(regla('.std-pildora--chica'), /min-width\s*:\s*44px/);
});

// Estas reglas ya existían en rc.1: se fija su contenido exacto y su baja especificidad.
test('el enlace mas conserva el signo Unicode y la variante decorativa', () => {
  const contenidos = [...regla('.std-mas::after').matchAll(/content\s*:\s*([^;]+)/g)].map(m => m[1]);
  assert.deepEqual(contenidos, ['"\\00a0\\203a"', '"\\00a0\\203a" / ""']);
});
test('los colores del sitio se declaran en :where(:root) y sobre negro usan variantes claras', () => {
  for (const prop of ['--accion', '--accion-boton', '--accion-texto', '--accion-foco', '--accion-oscuro', '--campo-claro', '--campo-oscuro']) {
    assert.match(regla(':where(:root)'), new RegExp(`${prop}\\s*:`));
    assert.doesNotMatch(regla(':root'), new RegExp(`${prop}\\s*:`));
  }
  for (const selector of ['[data-std-oscuro] .std-mas', '[data-std-oscuro] .std-pildora--fantasma']) {
    assert.match(regla(selector), /color\s*:\s*var\(--accion-oscuro\)/);
  }
  assert.match(regla('[data-std-oscuro] .std-pildora--fantasma'), /border-color\s*:\s*var\(--accion-oscuro\)/);
  assert.match(regla('[data-std-oscuro] .std-fina'), /color\s*:\s*var\(--std-gris-claro\)/);
  assert.match(regla('[data-std-oscuro] .std-tagline'), /color\s*:\s*#d2d2d7/);
});
test('ninguna variante de @import descarga hojas externas', () => {
  assert.doesNotMatch(hoja(), /@import\s+(?:url\(\s*)?['"]?(?:https?:)?\/\//i);
});

test('Galeria comparte con el rótulo la superficie del control de video', () => {
  for (const selector of ['.std-rotulo', '.std-galeria__boton']) {
    const css = regla(selector);
    assert.match(css, /background\s*:\s*rgba\(210,210,215,\.72\)/);
    assert.match(css, /-webkit-backdrop-filter\s*:\s*blur\(10px\)/);
    assert.match(css, /(?:^|[;\s])backdrop-filter\s*:\s*blur\(10px\)/);
    assert.match(css, /color\s*:\s*var\(--std-tinta\)/);
  }
});

test('std-oculto recorta visualmente sin display:none ni visibility:hidden', () => {
  const css = regla('.std-oculto');
  for (const patron of [/position\s*:\s*absolute/, /width\s*:\s*1px/, /height\s*:\s*1px/,
    /padding\s*:\s*0/, /margin\s*:\s*-1px/, /overflow\s*:\s*hidden/, /clip-path\s*:\s*inset\(50%\)/,
    /white-space\s*:\s*nowrap/, /border\s*:\s*0/]) assert.match(css, patron);
  assert.doesNotMatch(css, /display\s*:\s*none|visibility\s*:\s*hidden/);
});

// --- Helpers para evaluar la cascada de .std-nube__respaldo sin depender de un navegador. ---

function findClosing(s, openIdx) {
  let depth = 1;
  let i = openIdx + 1;
  while (i < s.length && depth > 0) {
    if (s[i] === '(') depth++;
    else if (s[i] === ')') depth--;
    i++;
  }
  return i - 1;
}

function splitSelector(sel) {
  const partes = [];
  let actual = '';
  let depth = 0;
  for (let i = 0; i < sel.length; i++) {
    const c = sel[i];
    if (c === '(') depth++;
    else if (c === ')') depth--;
    else if (depth === 0 && (c === '>' || c === '+' || c === '~')) {
      if (actual.trim()) partes.push(actual.trim());
      partes.push(c);
      actual = '';
      continue;
    } else if (depth === 0 && c === ' ') {
      if (actual.trim()) {
        partes.push(actual.trim());
        partes.push(' ');
        actual = '';
      }
      continue;
    }
    actual += c;
  }
  if (actual.trim()) partes.push(actual.trim());
  return partes;
}

function sumEsp(a, b) {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}

function especificidadParte(parte) {
  let s = parte;
  let total = [0, 0, 0];
  // :where(...) aporta 0; se elimina.
  while (true) {
    const idx = s.indexOf(':where(');
    if (idx === -1) break;
    const fin = findClosing(s, idx + 6);
    s = s.slice(0, idx) + s.slice(fin + 1);
  }
  // :not(...) aporta la especificidad de su argumento.
  while (true) {
    const idx = s.indexOf(':not(');
    if (idx === -1) break;
    const fin = findClosing(s, idx + 4);
    const arg = s.slice(idx + 5, fin);
    total = sumEsp(total, especificidadParte(arg));
    s = s.slice(0, idx) + s.slice(fin + 1);
  }
  for (const m of s.matchAll(/#[A-Za-z0-9_-]+/g)) total[0]++;
  for (const m of s.matchAll(/\.[A-Za-z0-9_-]+/g)) total[1]++;
  for (const m of s.matchAll(/\[[^\]]+\]/g)) total[1]++;
  for (const m of s.matchAll(/:([a-z-]+)/gi)) total[1]++;
  for (const m of s.matchAll(/::[a-z-]+/gi)) total[2]++;
  return total;
}

function especificidad(sel) {
  const partes = splitSelector(sel).filter(p => ![' ', '>', '+', '~'].includes(p));
  return partes.reduce((acc, p) => sumEsp(acc, especificidadParte(p)), [0, 0, 0]);
}

function matcheaParte(parte, el) {
  let s = parte;
  while (true) {
    const idx = s.indexOf(':where(');
    if (idx === -1) break;
    const fin = findClosing(s, idx + 6);
    const arg = s.slice(idx + 7, fin);
    if (!matcheaParte(arg, el)) return false;
    s = s.slice(0, idx) + s.slice(fin + 1);
  }
  while (true) {
    const idx = s.indexOf(':not(');
    if (idx === -1) break;
    const fin = findClosing(s, idx + 4);
    const arg = s.slice(idx + 5, fin);
    if (matcheaParte(arg, el)) return false;
    s = s.slice(0, idx) + s.slice(fin + 1);
  }
  for (const m of s.matchAll(/\.([A-Za-z0-9_-]+)/g)) {
    if (!el.clases.has(m[1])) return false;
  }
  for (const m of s.matchAll(/\[([A-Za-z0-9_-]+)(?:=['"]([^'"]+)['"])?\]/g)) {
    const val = el.attrs[m[1]];
    if (m[2] !== undefined && val !== m[2]) return false;
    if (m[2] === undefined && val === undefined) return false;
  }
  return true;
}

function matchea(sel, padre, el) {
  const partes = splitSelector(sel);
  const simples = partes.filter(p => ![' ', '>', '+', '~'].includes(p));
  const elementos = padre ? [padre, el] : [el];
  if (simples.length > elementos.length) return false;
  for (let i = 0; i < simples.length; i++) {
    const parte = simples[simples.length - 1 - i];
    const elemento = elementos[elementos.length - 1 - i];
    if (!matcheaParte(parte, elemento)) return false;
  }
  return true;
}

function* reglasDisplaySimples(body, media) {
  let i = 0;
  while (i < body.length) {
    if (/\s/.test(body[i])) { i++; continue; }
    const brace = body.indexOf('{', i);
    if (brace === -1) break;
    const selectors = body.slice(i, brace).trim();
    let depth = 1;
    let j = brace + 1;
    while (j < body.length && depth > 0) {
      if (body[j] === '{') depth++;
      else if (body[j] === '}') depth--;
      j++;
    }
    const b = body.slice(brace + 1, j - 1);
    const display = b.match(/display\s*:\s*([^;]+)/);
    if (display) {
      yield { selectors: selectors.split(',').map(s => s.trim()), media, valor: display[1].trim() };
    }
    i = j;
  }
}

function* reglasDisplay(css) {
  let i = 0;
  while (i < css.length) {
    if (/\s/.test(css[i])) { i++; continue; }
    if (css[i] === '@') {
      const brace = css.indexOf('{', i);
      const header = css.slice(i, brace).trim();
      let depth = 1;
      let j = brace + 1;
      while (j < css.length && depth > 0) {
        if (css[j] === '{') depth++;
        else if (css[j] === '}') depth--;
        j++;
      }
      const body = css.slice(brace + 1, j - 1);
      const mediaMatch = header.match(/@media\s*\(([^)]+)\)/);
      const media = mediaMatch ? mediaMatch[1].trim() : null;
      for (const r of reglasDisplaySimples(body, media)) yield r;
      i = j;
    } else {
      const brace = css.indexOf('{', i);
      if (brace === -1) break;
      const selectors = css.slice(i, brace).trim();
      let depth = 1;
      let j = brace + 1;
      while (j < css.length && depth > 0) {
        if (css[j] === '{') depth++;
        else if (css[j] === '}') depth--;
        j++;
      }
      const body = css.slice(brace + 1, j - 1);
      const display = body.match(/display\s*:\s*([^;]+)/);
      if (display) {
        yield { selectors: selectors.split(',').map(s => s.trim()), media: null, valor: display[1].trim() };
      }
      i = j;
    }
  }
}

function resolver(caso, sujeto) {
  const css = hojaComponentes();
  const mediaValidas = caso === 'sin-js' ? [null, 'scripting: none'] : [null];
  const padre = { clases: new Set(['std-nube']), attrs: { 'data-estado': caso === 'js-nube' ? 'nube' : 'fijo' } };
  const el = { clases: new Set(['std-nube__respaldo']), attrs: {} };
  if (sujeto === '.std-nube__respaldo--sin-js') el.clases.add('std-nube__respaldo--sin-js');
  const candidatas = [];
  let orden = 0;
  for (const r of reglasDisplay(css)) {
    if (!mediaValidas.includes(r.media)) { orden++; continue; }
    for (const sel of r.selectors) {
      if (!sel.includes('.std-nube__respaldo')) continue;
      if (matchea(sel, padre, el)) {
        candidatas.push({ valor: r.valor, especificidad: especificidad(sel), orden });
      }
    }
    orden++;
  }
  assert.ok(candidatas.length > 0, `ninguna regla display aplica a ${sujeto} en caso ${caso}`);
  candidatas.sort((a, b) => {
    const d = compararEspecificidad(a.especificidad, b.especificidad);
    return d !== 0 ? d : a.orden - b.orden;
  });
  const mayor = candidatas[candidatas.length - 1].especificidad;
  const delMayor = candidatas.filter(c => compararEspecificidad(c.especificidad, mayor) === 0);
  return delMayor[delMayor.length - 1].valor;
}

// Con JS habilitado y prefers-reduced-motion: no-preference, la nube sin WebGL (o con muestreo fallido o contexto
// perdido) pone data-estado="fijo" y debe mostrar la imagen de respaldo normal.
test('css: con JS y sin WebGL la imagen de respaldo se ve', () => {
  assert.equal(resolver('js-fijo', '.std-nube__respaldo'), 'block', 'con data-estado="fijo" debe verse el respaldo');
  assert.equal(resolver('js-nube', '.std-nube__respaldo'), 'none', 'con data-estado="nube" no debe verse el respaldo');
});

// Sin JS solo la copia de <noscript> permanece visible: la excepción @media (scripting: none) oculta la imagen normal
// con mayor especificidad, y la copia --sin-js gana por orden sobre la regla base.
test('css: sin JS solo una imagen de respaldo queda visible', () => {
  assert.equal(resolver('sin-js', '.std-nube__respaldo'), 'none', 'la imagen normal debe ocultarse sin JS');
  assert.equal(resolver('sin-js', '.std-nube__respaldo--sin-js'), 'block', 'la copia de <noscript> debe verse sin JS');
});
