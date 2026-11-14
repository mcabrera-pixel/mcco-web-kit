// Enlace «Saltar al contenido» (v1.4.2): render Astro real de Estandar, Post y Base en es, es-CL y en.
// Estandar y Post emiten como primer hijo del <body> (y primer elemento enfocable) un enlace al id de su <main>, con el
// texto en el idioma de la página. Estandar usa la clase std-saltar y el id std-contenido; Post, que no carga la hoja
// del estándar, usa mcco-saltar y mcco-contenido, con su estilo en el <style> del layout. Los id llevan prefijo del
// kit porque hay sitios con su propio id="contenido" dentro de la página. Base no tiene <main> y no emite enlace.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { parse } from 'node-html-parser';

const kit = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'kit-saltar-'));
const idiomas = { es: 'Saltar al contenido', 'es-CL': 'Saltar al contenido', en: 'Skip to content' };
const layouts = {
  Estandar: { clase: 'std-saltar', id: 'std-contenido' },
  Post: { clase: 'mcco-saltar', id: 'mcco-contenido' },
};
// Cada página trae un enlace propio del sitio en el contenido; Post, además, su barra en el slot nav (como los sitios
// que lo usan). Así el enlace del kit tiene que ganarles el primer lugar del orden de tabulación.
const pagina = (layout, lang) => `---
import Layout from '${dir}/kit/layouts/${layout}.astro';
const post = { data: { title: 'Título', description: 'Descripción', date: new Date('2026-10-29T00:00:00Z'), category: 'Guías', capsule: 'Resumen', faq: [], related: [] }, body: 'Texto' };
const nav = { logo: { src: '/logo.svg', alt: 'Prueba', width: 32, height: 32 }, enlaces: [{ href: '/', texto: 'Inicio' }] };
const subnav = { titulo: 'Prueba', enlaces: [], accion: { href: '/contacto', texto: 'Contactar' } };
---
<Layout title="Título" description="Descripción" lang=${JSON.stringify(lang)} post={post} nav={nav} subnav={subnav}>
  <nav slot="nav" aria-label="Sitio"><a href="/">Inicio del sitio</a></nav>
  <h1>Prueba</h1><p><a href="/otra/">Enlace del contenido</a></p>
</Layout>`;
const paginas = {};
for (const layout of ['Estandar', 'Post', 'Base']) for (const lang of Object.keys(idiomas)) paginas[`${layout}-${lang}`.toLowerCase()] = pagina(layout, lang);

const html = new Map();
const css = new Map();
const dom = (layout, lang) => parse(html.get(`${layout}-${lang}`.toLowerCase()));
before(() => {
  fs.mkdirSync(path.join(dir, 'src/pages'), { recursive: true });
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
  for (const nombre of Object.keys(paginas)) {
    const texto = fs.readFileSync(path.join(dir, 'dist', nombre, 'index.html'), 'utf8');
    html.set(nombre, texto);
    // Las hojas que enlaza la página, concatenadas: lo que el navegador aplica.
    css.set(nombre, parse(texto).querySelectorAll('link[rel="stylesheet"]')
      .map(l => fs.readFileSync(path.join(dir, 'dist', l.getAttribute('href')), 'utf8')).join('\n'));
  }
});
after(() => fs.rmSync(dir, { recursive: true, force: true }));

// Elementos que entran al orden de tabulación por sí mismos (sin tabindex negativo, sin hidden, fuera de noscript y
// template, que no se muestran con JS activo).
const ENFOCABLES = 'a[href], area[href], button, input, select, textarea, iframe, summary, [tabindex], [contenteditable], audio[controls], video[controls]';
function enfocables(raiz) {
  return raiz.querySelectorAll(ENFOCABLES).filter((e) => {
    if (e.getAttribute('tabindex')?.trim().startsWith('-')) return false;
    if (e.tagName === 'INPUT' && e.getAttribute('type') === 'hidden') return false;
    for (let n = e; n && n !== raiz; n = n.parentNode) {
      if (n.hasAttribute?.('hidden') || ['NOSCRIPT', 'TEMPLATE'].includes(n.tagName)) return false;
    }
    return true;
  });
}
const limpio = (t) => t.replace(/\s+/g, ' ').trim();

for (const [layout, { clase, id }] of Object.entries(layouts)) {
  for (const [lang, texto] of Object.entries(idiomas)) {
    test(`${layout} lang=${lang}: el primer hijo del body es el enlace «${texto}» al <main>`, () => {
      const d = dom(layout, lang);
      assert.equal(d.querySelector('html').getAttribute('lang'), lang);
      const body = d.querySelector('body');
      const enlace = body.childNodes.find((n) => n.nodeType === 1);
      assert.ok(enlace, 'body sin hijos');
      assert.equal(enlace.tagName, 'A', `el primer hijo del body es <${enlace.tagName.toLowerCase()}>`);
      assert.ok(enlace.classList.contains(clase), `sin la clase ${clase}: ${enlace.outerHTML}`);
      assert.equal(enlace.getAttribute('href'), `#${id}`);
      assert.equal(limpio(enlace.text), texto);
      assert.equal(enlace.getAttribute('lang'), undefined, 'el enlace hereda el idioma de la página');
    });
    test(`${layout} lang=${lang}: el enlace es el primer elemento enfocable y apunta al único <main>`, () => {
      const d = dom(layout, lang);
      const body = d.querySelector('body');
      const [primero] = enfocables(body);
      assert.ok(primero?.classList.contains(clase), `el primer enfocable es ${primero?.outerHTML}`);
      const mains = d.querySelectorAll('main');
      assert.equal(mains.length, 1);
      assert.equal(mains[0].getAttribute('id'), id);
      assert.equal(d.querySelectorAll(`[id="${id}"]`).length, 1, `id ${id} repetido`);
      assert.equal(d.querySelectorAll(`.${clase}`).length, 1, 'un solo enlace de salto');
      // El enlace del sitio en el contenido queda dentro del <main> y después del enlace del kit.
      assert.ok(mains[0].querySelector('a[href="/otra/"]'));
    });
  }
}

// La hoja que aplica cada layout trae el estilo de su enlace: fuera de la vista y visible con foco. Post no carga la
// hoja del estándar, así que su regla viene en su propia hoja y no depende de std-saltar.
for (const [layout, { clase }] of Object.entries(layouts)) {
  test(`${layout}: la hoja de la página posiciona .${clase} y lo muestra con foco`, () => {
    const hojas = css.get(`${layout}-es`.toLowerCase());
    assert.match(hojas, new RegExp(`\\.${clase}(\\[[^\\]]+\\])?\\{[^}]*position:fixed`), `sin regla .${clase} con position:fixed`);
    assert.match(hojas, new RegExp(`\\.${clase}(\\[[^\\]]+\\])?:focus\\b`), `sin regla .${clase}:focus`);
  });
}
test('Post: no carga la hoja del estándar ni usa std-saltar', () => {
  const d = dom('Post', 'es');
  assert.equal(d.querySelectorAll('.std-saltar').length, 0);
  assert.doesNotMatch(css.get('post-es'), /\.std-saltar|\.std-pildora/);
});

for (const lang of Object.keys(idiomas)) {
  test(`Base lang=${lang}: sin <main> no emite enlace de salto`, () => {
    const d = dom('Base', lang);
    assert.equal(d.querySelectorAll('main').length, 0);
    assert.equal(d.querySelectorAll('.std-saltar, .mcco-saltar, a[href="#std-contenido"], a[href="#mcco-contenido"]').length, 0);
    // El primer enfocable sigue siendo lo que pone el sitio.
    assert.equal(enfocables(d.querySelector('body'))[0]?.getAttribute('href'), '/otra/');
  });
}
