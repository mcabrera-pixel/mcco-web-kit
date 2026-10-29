// Render Astro de la API pública de los tres layouts y comparación literal con cfaf658 (v1.3.1).
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { parse } from 'node-html-parser';

const kit = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'kit-metadatos-'));
const layouts = ['Base', 'Estandar', 'Post'];
const casos = {
  default: {},
  lang: { lang: 'en' },
  regional: { lang: 'en-US' },
  ogTitle: { ogTitle: 'Título OG "propio" & distinto' },
  ogDescription: { ogDescription: 'Descripción OG propia <sin etiquetas>' },
  ogUrl: { ogUrl: 'https://prueba.invalid/en/faq.html' },
  robots: { robots: 'noindex, follow' },
  sinRobots: { robots: false },
  juntos: { lang: 'en', ogTitle: 'FAQ', ogDescription: 'English FAQ', ogUrl: 'https://prueba.invalid/en/faq.html', robots: false },
};
const html = new Map();
const clave = (layout, caso) => `${layout.toLowerCase()}-${caso}`;
const dom = (layout, caso) => parse(html.get(clave(layout, caso)));
const meta = (d, nombre) => d.querySelector(`meta[property="${nombre}"],meta[name="${nombre}"]`)?.getAttribute('content');

before(() => {
  fs.mkdirSync(path.join(dir, 'src/pages'), { recursive: true });
  // Las fuentes viven dentro de la raíz Astro: los IDs de CSS no dependen de la ruta del checkout.
  for (const carpeta of ['components', 'layouts', 'lib', 'styles', 'data']) {
    fs.cpSync(path.join(kit, carpeta), path.join(dir, 'kit', carpeta), { recursive: true });
  }
  fs.symlinkSync(path.join(kit, 'node_modules'), path.join(dir, 'node_modules'), 'dir');
  fs.writeFileSync(path.join(dir, 'package.json'), '{"type":"module"}');
  fs.writeFileSync(path.join(dir, 'site.yaml'), 'key: prueba\nname: Prueba\ndomain: https://prueba.invalid\ndescription: Sitio de pruebas\nrole: corporativa\nlang: es-CL\ncloudflare:\n  project: prueba\n');
  fs.writeFileSync(path.join(dir, 'astro.config.mjs'), "export default { build: { inlineStylesheets: 'never' } };\n");
  for (const layout of layouts) {
    const variantes = layout === 'Post' ? casos : { ...casos, noindex: { noindex: true }, prioridad: { noindex: true, robots: 'index, follow' }, omitirNoindex: { noindex: true, robots: false } };
    for (const [caso, props] of Object.entries(variantes)) {
      fs.writeFileSync(path.join(dir, 'src/pages', `${clave(layout, caso)}.astro`), `---
import Layout from '${dir}/kit/layouts/${layout}.astro';
const props = ${JSON.stringify(props)};
const post = { data: { title: 'Título SEO', description: 'Descripción SEO', date: new Date('2026-10-29T00:00:00Z'), category: 'Guías', capsule: 'Resumen', faq: [], related: [] }, body: 'Texto de prueba' };
const nav = { logo: {src:'/logo.svg',alt:'Prueba',width:32,height:32}, enlaces:[] };
const subnav = { titulo:'Prueba', enlaces:[], accion:{href:'/contacto',texto:'Contactar'} };
---
<Layout title="Título SEO" description="Descripción SEO" post={post} nav={nav} subnav={subnav} {...props}><h1>Prueba</h1><p>Contenido estable.</p></Layout>`);
    }
  }
  const astro = fileURLToPath(new URL('bin/astro.mjs', import.meta.resolve('astro/package.json')));
  const build = spawnSync(process.execPath, [astro, 'build'], { cwd: dir, encoding: 'utf8', timeout: 60000, env: { ...process.env, ASTRO_TELEMETRY_DISABLED: '1' } });
  assert.equal(build.status, 0, build.stdout + build.stderr);
  for (const archivo of fs.readdirSync(path.join(dir, 'src/pages'))) {
    const nombre = archivo.replace('.astro', '');
    html.set(nombre, fs.readFileSync(path.join(dir, 'dist', nombre, 'index.html'), 'utf8'));
  }
});
after(() => fs.rmSync(dir, { recursive: true, force: true }));

for (const layout of layouts) {
  test(`${layout}: sin props nuevas conserva el HTML completo de v1.3.1`, () => {
    assert.equal(html.get(clave(layout, 'default')), fs.readFileSync(path.join(kit, 'test/fixtures/metadatos-v1.3.1', `${layout}.html`), 'utf8'));
    const d = dom(layout, 'default');
    assert.equal(d.querySelector('html').getAttribute('lang'), 'es-CL');
    assert.equal(meta(d, 'og:locale'), 'es_CL');
    assert.equal(meta(d, 'og:title'), 'Título SEO');
    assert.equal(meta(d, 'og:description'), 'Descripción SEO');
    assert.equal(meta(d, 'og:url'), d.querySelector('link[rel="canonical"]').getAttribute('href'));
    assert.equal(meta(d, 'robots'), 'index, follow, max-image-preview:large, max-snippet:-1');
  });
  for (const [caso, lang, locale] of [['lang', 'en', 'en'], ['regional', 'en-US', 'en_US']]) {
    test(`${layout}: lang=${lang} llega al documento y a Open Graph`, () => {
      const d = dom(layout, caso);
      assert.equal(d.querySelector('html').getAttribute('lang'), lang);
      assert.equal(meta(d, 'og:locale'), locale);
      if (layout === 'Post') assert.equal(JSON.parse(d.querySelector('script[type="application/ld+json"]').rawText).inLanguage, lang);
    });
  }
  for (const [caso, propiedad] of [['ogTitle', 'og:title'], ['ogDescription', 'og:description'], ['ogUrl', 'og:url']]) {
    test(`${layout}: ${caso} independiente del SEO y Twitter`, () => {
      const d = dom(layout, caso);
      assert.equal(meta(d, propiedad), casos[caso][caso]);
      assert.equal(d.querySelector('title').textContent, 'Título SEO');
      assert.equal(meta(d, 'description'), 'Descripción SEO');
      assert.equal(meta(d, 'twitter:title'), 'Título SEO');
      assert.equal(meta(d, 'twitter:description'), 'Descripción SEO');
      assert.equal(d.querySelector('link[rel="canonical"]').getAttribute('href'), `https://prueba.invalid/${clave(layout, caso)}/`);
    });
  }
  test(`${layout}: robots permite texto propio u omisión`, () => {
    assert.equal(meta(dom(layout, 'robots'), 'robots'), 'noindex, follow');
    assert.equal(dom(layout, 'sinRobots').querySelectorAll('meta[name="robots"]').length, 0);
  });
  test(`${layout}: props combinadas sin metas duplicadas`, () => {
    const d = dom(layout, 'juntos');
    assert.equal(d.querySelector('html').getAttribute('lang'), 'en');
    assert.equal(meta(d, 'og:title'), 'FAQ');
    assert.equal(meta(d, 'og:description'), 'English FAQ');
    assert.equal(meta(d, 'og:url'), casos.juntos.ogUrl);
    assert.equal(meta(d, 'robots'), undefined);
  });
}
for (const layout of ['Base', 'Estandar']) {
  test(`${layout}: robots explícito tiene prioridad sobre noindex; omitir conserva su regla`, () => {
    assert.equal(meta(dom(layout, 'noindex'), 'robots'), 'noindex, nofollow');
    assert.equal(meta(dom(layout, 'prioridad'), 'robots'), 'index, follow');
    assert.equal(meta(dom(layout, 'omitirNoindex'), 'robots'), undefined);
  });
}

function comprobarUnicidad(d) {
  assert.equal(d.querySelectorAll('link[rel="canonical"]').length, 1, 'canonical único');
  const metas = d.querySelectorAll('meta[property^="og:"],meta[name="robots"]');
  const claves = metas.map(m => m.getAttribute('property') ?? m.getAttribute('name'));
  assert.equal(new Set(claves).size, claves.length, 'OG y robots únicos');
  for (const propiedad of ['type', 'site_name', 'locale', 'url', 'title', 'description', 'image']) {
    assert.equal(d.querySelectorAll(`meta[property="og:${propiedad}"]`).length, 1, `og:${propiedad} único`);
  }
}
test('ningún render duplica OG, robots o canonical', () => {
  for (const contenido of html.values()) comprobarUnicidad(parse(contenido));
});
test('el control rechaza duplicados de cada meta OG, robots y canonical', () => {
  const original = html.get(clave('Base', 'default'));
  const d = parse(original);
  for (const etiqueta of d.querySelectorAll('meta[property^="og:"],meta[name="robots"],link[rel="canonical"]')) {
    assert.throws(() => comprobarUnicidad(parse(original.replace('</head>', etiqueta.outerHTML + '</head>'))));
  }
});
