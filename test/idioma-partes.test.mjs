// Idioma de las partes (WCAG 3.1.2): render Astro real de NavGlobal, SubNav y FooterGrupo a través de los layouts.
// En una página que no está en español, los aria-label del kit salen en inglés y todo texto que el kit deja en
// español queda bajo un ancestro con lang="es". En español (subtag primario «es») el HTML de las tres piezas es el
// de v1.4.0, que para ellas es el mismo de la referencia literal v1.3.1 de metadatos-html.test.mjs.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { parse } from 'node-html-parser';

const kit = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'kit-idioma-'));
const referencia = (layout) => parse(fs.readFileSync(path.join(kit, 'test/fixtures/metadatos-v1.3.1', `${layout}.html`), 'utf8'));
const piezas = { nav: 'header.std-gnav', subnav: 'div.std-subnav', grupo: 'section.mcco-grupo' };

// Las mismas props que las variantes «default» de metadatos-html.test.mjs: así la referencia v1.3.1 sirve tal cual.
const navEs = { logo: { src: '/logo.svg', alt: 'Prueba', width: 32, height: 32 }, enlaces: [] };
const subnavEs = { titulo: 'Prueba', enlaces: [], accion: { href: '/contacto', texto: 'Contactar' } };
// Props de una página inglesa: todo lo que pone la página está en inglés.
const navEn = { logo: { src: '/logo.svg', alt: 'Test Co', width: 32, height: 32 },
  enlaces: [{ href: '/en/', texto: 'Home' }, { href: '/en/faq/', texto: 'Technical FAQ' }] };
const subnavEn = { titulo: 'Test Co', enlaces: [{ href: '#questions', texto: 'Questions' }],
  accion: { href: '/en/contact/', texto: 'Talk to an engineer', textoCorto: 'Contact' } };
const textosDeLaPagina = new Set(['Test Co', 'Home', 'Technical FAQ', 'Questions', 'Talk to an engineer', 'Contact']);

// «esu» (yupik central) empieza con «es» pero su subtag primario no es «es»: usa las etiquetas en inglés. El kit solo
// tiene etiquetas en español y en inglés: en pt-BR y esu son inglés bajo el lang de la página, un límite documentado
// en docs/ESTANDAR.md (solo es correcto en inglés).
const noEspanol = ['en', 'en-US', 'pt-BR', 'esu'];
const espanol = ['es', 'ES-cl', 'es-419'];
const paginas = {};
const layout = (nombre, props, contenido = '<h1>Prueba</h1>') => `---
import Layout from '${dir}/kit/layouts/${nombre}.astro';
const props = ${JSON.stringify(props)};
---
<Layout title="Título SEO" description="Descripción SEO" {...props}>${contenido}</Layout>`;
for (const lang of noEspanol) paginas[`en-${lang.toLowerCase()}`] = layout('Estandar', { lang, nav: navEn, subnav: subnavEn }, '<h1>Technical FAQ</h1>');
for (const lang of espanol) paginas[`es-${lang.toLowerCase()}`] = layout('Estandar', { lang, nav: navEs, subnav: subnavEs });
paginas['base-en'] = layout('Base', { lang: 'en' }, '<h1>Technical FAQ</h1>');
paginas['base-es'] = layout('Base', { lang: 'es' });
// Un lang que la web ya pone en nav o subnav manda sobre el de la página.
paginas.prioridad = layout('Estandar', { lang: 'en', nav: { ...navEs, lang: 'es' }, subnav: { ...subnavEs, lang: 'es-CL' } });
// Sin la prop lang, las piezas usadas sueltas conservan su HTML de siempre.
paginas.sueltas = `---
import NavGlobal from '${dir}/kit/components/estandar/NavGlobal.astro';
import SubNav from '${dir}/kit/components/estandar/SubNav.astro';
import FooterGrupo from '${dir}/kit/components/FooterGrupo.astro';
---
<html lang="en"><head><title>Loose parts</title></head><body>
<NavGlobal {...${JSON.stringify(navEs)}} /><SubNav {...${JSON.stringify(subnavEs)}} /><FooterGrupo />
</body></html>`;

const html = new Map();
const dom = (pagina) => parse(html.get(pagina));
before(() => {
  fs.mkdirSync(path.join(dir, 'src/pages'), { recursive: true });
  // Mismo árbol que metadatos-html.test.mjs: los IDs de estilos (data-astro-cid-*) dependen de la ruta bajo la raíz.
  for (const carpeta of ['components', 'layouts', 'lib', 'styles', 'data']) {
    fs.cpSync(path.join(kit, carpeta), path.join(dir, 'kit', carpeta), { recursive: true });
  }
  fs.symlinkSync(path.join(kit, 'node_modules'), path.join(dir, 'node_modules'), 'dir');
  fs.writeFileSync(path.join(dir, 'package.json'), '{"type":"module"}');
  fs.writeFileSync(path.join(dir, 'site.yaml'), 'key: prueba\nname: Prueba\ndomain: https://prueba.invalid\ndescription: Sitio de pruebas\nrole: corporativa\nlang: es-CL\ncloudflare:\n  project: prueba\n');
  fs.writeFileSync(path.join(dir, 'astro.config.mjs'), "export default { build: { inlineStylesheets: 'never' } };\n");
  for (const [nombre, fuente] of Object.entries(paginas)) fs.writeFileSync(path.join(dir, 'src/pages', `${nombre}.astro`), fuente);
  const astro = fileURLToPath(new URL('bin/astro.mjs', import.meta.resolve('astro/package.json')));
  const build = spawnSync(process.execPath, [astro, 'build'], { cwd: dir, encoding: 'utf8', timeout: 60000, env: { ...process.env, ASTRO_TELEMETRY_DISABLED: '1', TZ: 'UTC' } });
  assert.equal(build.status, 0, build.stdout + build.stderr);
  for (const nombre of Object.keys(paginas)) html.set(nombre, fs.readFileSync(path.join(dir, 'dist', nombre, 'index.html'), 'utf8'));
});
after(() => fs.rmSync(dir, { recursive: true, force: true }));

// Idioma efectivo de un nodo: el lang del ancestro más cercano que lo declara (el propio elemento incluido).
function idiomaDe(nodo) {
  for (let n = nodo; n; n = n.parentNode) {
    const lang = n.getAttribute?.('lang');
    if (lang != null) return lang;
  }
  return null;
}
const esEs = (lang) => String(lang).split('-')[0].toLowerCase() === 'es';
const textos = (nodo) => nodo.nodeType === 3 ? (nodo.text.trim() ? [nodo] : []) : nodo.childNodes.flatMap(textos);
const conEtiqueta = (pieza) => [pieza, ...pieza.querySelectorAll('[aria-label]')].filter(e => e.hasAttribute('aria-label'));
const limpio = (t) => t.replace(/\s+/g, ' ').trim();

for (const lang of noEspanol) {
  const pagina = `en-${lang.toLowerCase()}`;
  test(`lang=${lang}: los cinco aria-label del kit salen en inglés, sin lang propio (heredan el de la página)`, () => {
    const d = dom(pagina);
    assert.equal(d.querySelector('html').getAttribute('lang'), lang);
    const etiquetas = Object.values(piezas).flatMap(s => conEtiqueta(d.querySelector(s)));
    assert.deepEqual(etiquetas.map(e => e.getAttribute('aria-label')), ['Main', 'Test Co, home', 'Menu', 'Sections', 'MCCO Group']);
    for (const e of etiquetas) assert.equal(idiomaDe(e), lang, `aria-label «${e.getAttribute('aria-label')}» bajo un lang distinto del de la página`);
  });
  test(`lang=${lang}: el texto del kit en español queda bajo lang="es" y el de la página no`, () => {
    const d = dom(pagina);
    // Sin excepciones: ni nombres propios ni separadores quedan fuera de lang="es" si no vienen de la página.
    const delKit = [];
    for (const s of Object.values(piezas)) {
      for (const t of textos(d.querySelector(s))) {
        if (textosDeLaPagina.has(t.text.trim())) assert.equal(idiomaDe(t), lang, `«${t.text.trim()}» es de la página`);
        else { delKit.push(t.text.trim()); assert.ok(esEs(idiomaDe(t)), `«${t.text.trim()}» sin lang="es" (está en ${idiomaDe(t)})`); }
      }
    }
    assert.ok(delKit.includes('es parte de'), 'la prueba revisa el bloque Grupo');
    assert.ok(delKit.some(t => t.includes('RUT 77.715.147-9')), 'la prueba revisa la entidad legal');
  });
  test(`lang=${lang}: el bloque Grupo no traduce datos, solo los marca`, () => {
    assert.equal(limpio(dom(pagina).querySelector(piezas.grupo).text), limpio(referencia('Estandar').querySelector(piezas.grupo).text));
  });
}

test('Base con lang=en: el bloque Grupo se etiqueta en inglés y su texto va bajo lang="es"', () => {
  const grupo = dom('base-en').querySelector(piezas.grupo);
  assert.equal(grupo.getAttribute('aria-label'), 'MCCO Group');
  assert.equal(idiomaDe(grupo), 'en');
  for (const t of textos(grupo)) assert.ok(esEs(idiomaDe(t)), `«${t.text.trim()}» sin lang="es"`);
});

for (const lang of espanol) {
  test(`lang=${lang}: NavGlobal, SubNav y FooterGrupo conservan el HTML de v1.4.0`, () => {
    const d = dom(`es-${lang.toLowerCase()}`);
    assert.equal(d.querySelector('html').getAttribute('lang'), lang);
    for (const s of Object.values(piezas)) assert.equal(d.querySelector(s).outerHTML, referencia('Estandar').querySelector(s).outerHTML);
  });
}
test('Base con lang=es: FooterGrupo conserva el HTML de v1.4.0', () => {
  assert.equal(dom('base-es').querySelector(piezas.grupo).outerHTML, referencia('Base').querySelector(piezas.grupo).outerHTML);
});
test('el lang de nav y subnav manda sobre el de la página', () => {
  const d = dom('prioridad');
  for (const s of [piezas.nav, piezas.subnav]) assert.equal(d.querySelector(s).outerHTML, referencia('Estandar').querySelector(s).outerHTML);
  assert.equal(d.querySelector(piezas.grupo).getAttribute('aria-label'), 'MCCO Group');
});
test('sin la prop lang, las piezas sueltas conservan el HTML de v1.4.0', () => {
  const d = dom('sueltas');
  for (const s of Object.values(piezas)) assert.equal(d.querySelector(s).outerHTML, referencia('Estandar').querySelector(s).outerHTML);
});
