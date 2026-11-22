// Artículo del blog con el cromo del sitio (v1.5.0): render Astro real de ArticuloBlog dentro del layout de un sitio
// y de Post con nav, favicon y pie del sitio. Cada tipo de JSON-LD sale una vez, la fecha es la del día del artículo
// (también en un build con TZ de Chile) y el mailto del Cta va entre <!--email_off--> y <!--/email_off-->.
// Rutas con barras normales y node_modules por junction: la prueba corre igual en Windows y en Linux.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { parse } from 'node-html-parser';

const kit = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'kit-articulo-'));
const kitDir = `${dir.replace(/\\/g, '/')}/kit`;

const AUTORA = `author: { name: 'Ana Pérez', role: 'Ingeniera de pruebas' },`;
const post = (fecha, extra = '') => `{ data: { title: 'Título del artículo', description: 'Descripción', date: new Date('${fecha}'), ${extra}
  category: 'Guías', capsule: 'Resumen', faq: [{ q: '¿Pregunta?', a: 'Respuesta.' }], related: [{ url: '/servicio/', anchor: 'Servicio' }] },
  body: 'uno dos tres' }`;

// Layout de un sitio cualquiera: Base sin el bloque Grupo, con favicon, barra y pie propios.
const sitio = `---
import Base from '${kitDir}/layouts/Base.astro';
const props = Astro.props;
---
<Base {...props} footer={false}>
  <link slot="head" rel="icon" href="/favicon.ico" sizes="any" />
  <a class="saltar-sitio" href="#contenido">Saltar al contenido</a>
  <nav class="nav-sitio" aria-label="Sitio"><a href="/">Inicio del sitio</a></nav>
  <main id="contenido"><slot /></main>
  <footer class="pie-sitio"><a href="/privacidad/">Privacidad</a></footer>
</Base>`;

const conSitio = (fecha, extra) => `---
import Sitio from '../Sitio.astro';
import ArticuloBlog from '${kitDir}/components/ArticuloBlog.astro';
import { cabeceraArticulo } from '${kitDir}/lib/articulo.mjs';
const post = ${post(fecha, extra)};
---
<Sitio {...cabeceraArticulo(post, Astro.url)}>
  <ArticuloBlog post={post} claseTitulo="std-h1"><p>Contenido del artículo.</p></ArticuloBlog>
</Sitio>`;

const paginas = {
  'sitio-mediodia': conSitio('2026-11-16T12:00:00-03:00'),
  'sitio-noche': conSitio('2026-11-16T22:30:00-03:00', AUTORA),
  'sitio-solo-dia': conSitio('2026-11-16'),
  'post-sitio': `---
import Post from '${kitDir}/layouts/Post.astro';
const post = ${post('2026-11-16T12:00:00-03:00')};
---
<Post post={post} footer={false}>
  <link slot="head" rel="icon" href="/favicon.ico" sizes="any" />
  <nav slot="nav" class="nav-sitio" aria-label="Sitio"><a href="/">Inicio del sitio</a></nav>
  <p>Contenido del artículo.</p>
  <footer slot="footer" class="pie-sitio"><a href="/privacidad/">Privacidad</a></footer>
</Post>`,
};

const html = new Map();
before(() => {
  fs.mkdirSync(path.join(dir, 'src/pages'), { recursive: true });
  for (const carpeta of ['components', 'layouts', 'lib', 'styles', 'data']) {
    fs.cpSync(path.join(kit, carpeta), path.join(dir, 'kit', carpeta), { recursive: true });
  }
  fs.symlinkSync(path.join(kit, 'node_modules'), path.join(dir, 'node_modules'), 'junction');
  fs.writeFileSync(path.join(dir, 'package.json'), '{"type":"module"}');
  fs.writeFileSync(path.join(dir, 'site.yaml'), 'key: prueba\nname: Prueba\ndomain: https://prueba.invalid\ndescription: Sitio de pruebas\nrole: corporativa\nlang: es-CL\ncontact:\n  email: hola@prueba.invalid\n  whatsapp: "+56 9 1234 5678"\ncloudflare:\n  project: prueba\n');
  fs.writeFileSync(path.join(dir, 'astro.config.mjs'), 'export default {};\n');
  fs.writeFileSync(path.join(dir, 'src/Sitio.astro'), sitio);
  for (const [nombre, fuente] of Object.entries(paginas)) fs.writeFileSync(path.join(dir, 'src/pages', `${nombre}.astro`), fuente);
  const astro = fileURLToPath(new URL('bin/astro.mjs', import.meta.resolve('astro/package.json')));
  // TZ de Chile: con ella, una fecha sin hora (medianoche UTC) caía en el día anterior.
  const build = spawnSync(process.execPath, [astro, 'build'], { cwd: dir, encoding: 'utf8', timeout: 120000, env: { ...process.env, ASTRO_TELEMETRY_DISABLED: '1', TZ: 'America/Santiago' } });
  assert.equal(build.status, 0, build.stdout + build.stderr);
  for (const nombre of Object.keys(paginas)) html.set(nombre, fs.readFileSync(path.join(dir, 'dist', nombre, 'index.html'), 'utf8'));
});
after(() => fs.rmSync(dir, { recursive: true, force: true }));

const jsonld = (d) => d.querySelectorAll('script[type="application/ld+json"]').map((s) => JSON.parse(s.rawText));
const tipos = (d) => jsonld(d).map((j) => j['@type']).sort();

for (const nombre of Object.keys(paginas)) {
  test(`${nombre}: nav, favicon y pie del sitio, sin el bloque Grupo`, () => {
    const d = parse(html.get(nombre));
    assert.equal(d.querySelectorAll('nav.nav-sitio').length, 1);
    assert.equal(d.querySelectorAll('footer.pie-sitio').length, 1);
    assert.equal(d.querySelectorAll('head link[rel="icon"][href="/favicon.ico"]').length, 1);
    assert.equal(d.querySelectorAll('[data-mcco="grupo"]').length, 0);
    assert.equal(d.querySelectorAll('h1').length, 1);
    assert.equal(d.querySelector('h1').text, 'Título del artículo');
    assert.ok(d.querySelector('[data-mcco="post"] .mcco-post__content p'), 'el contenido va dentro del artículo');
  });

  test(`${nombre}: BlogPosting, BreadcrumbList y FAQPage una vez cada uno`, () => {
    assert.deepEqual(tipos(parse(html.get(nombre))), ['BlogPosting', 'BreadcrumbList', 'FAQPage']);
  });

  test(`${nombre}: el mailto del Cta va dentro de email_off`, () => {
    const texto = html.get(nombre);
    const region = texto.match(/<!--email_off-->([\s\S]*?)<!--\/email_off-->/);
    assert.ok(region, 'falta la región email_off');
    assert.match(region[1], /href="mailto:hola@prueba\.invalid"/);
    assert.equal(texto.split('mailto:').length - 1, 1, 'un solo mailto en la página');
  });

  test(`${nombre}: fecha del día del artículo en el texto, el datetime, el JSON-LD y Open Graph`, () => {
    const d = parse(html.get(nombre));
    const time = d.querySelector('[data-mcco="post"] time');
    assert.equal(time.getAttribute('datetime'), '2026-11-16');
    assert.equal(time.text, '16 de noviembre de 2026');
    const posting = jsonld(d).find((j) => j['@type'] === 'BlogPosting');
    assert.equal(posting.datePublished, '2026-11-16');
    assert.equal(posting.dateModified, '2026-11-16');
    assert.equal(d.querySelector('meta[property="article:published_time"]').getAttribute('content'), '2026-11-16');
    assert.equal(d.querySelector('meta[property="og:type"]').getAttribute('content'), 'article');
  });
}

// La línea de autor se lee con un espacio a cada lado del punto medio. En v1.5.1 la fecha salía pegada al cargo
// («Ingeniera de pruebas· 16 de noviembre»): el salto de línea de la plantilla se perdía al compilar.
const lineaDeAutor = (nombre) => parse(html.get(nombre)).querySelector('.mcco-post__meta').text.replace(/\s+/g, ' ').trim();

test('línea de autor con cargo: un espacio separa el cargo de la fecha', () => {
  assert.match(lineaDeAutor('sitio-noche'), /^Por Ana Pérez, Ingeniera de pruebas · 16 de noviembre de 2026( · \d+ min de lectura)?$/);
});

test('línea de autor sin cargo: un espacio separa el nombre de la fecha', () => {
  assert.match(lineaDeAutor('sitio-mediodia'), /^Por MCCO Group · 16 de noviembre de 2026( · \d+ min de lectura)?$/);
});

test('ArticuloBlog dentro del sitio: título con la clase del sitio y JSON-LD con la URL canónica', () => {
  const d = parse(html.get('sitio-mediodia'));
  assert.ok(d.querySelector('h1').classList.contains('std-h1'));
  const posting = jsonld(d).find((j) => j['@type'] === 'BlogPosting');
  assert.equal(posting.mainEntityOfPage['@id'], 'https://prueba.invalid/sitio-mediodia/');
  assert.equal(posting.headline, 'Título del artículo');
  assert.equal(d.querySelector('link[rel="canonical"]').getAttribute('href'), 'https://prueba.invalid/sitio-mediodia/');
});

test('Post con el cromo del sitio: el enlace de salto del kit sigue primero en el body', () => {
  const d = parse(html.get('post-sitio'));
  const primero = d.querySelector('body').childNodes.find((n) => n.nodeType === 1);
  assert.equal(primero.getAttribute('class').split(' ')[0], 'mcco-saltar');
  assert.ok(d.querySelector('main#mcco-contenido [data-mcco="post"]') || d.querySelector('main#mcco-contenido[data-mcco="post"]'));
});
