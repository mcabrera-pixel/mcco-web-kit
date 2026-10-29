// Render real de Astro: compatibilidad de acciones y nubes, orígenes y seguridad del HTML JSON-LD.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { parse } from 'node-html-parser';

const kit = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dir = fs.mkdtempSync(path.join(kit, '.tmp-prueba-'));
const texto = '</script><script id="inyectado">alert("prueba")</script>< & \u2028\u2029';
let html, dom;
before(() => {
  fs.mkdirSync(path.join(dir, 'src/pages'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'package.json'), '{"type":"module"}');
  fs.writeFileSync(path.join(dir, 'site.yaml'), 'key: prueba\nname: Prueba\ndomain: https://prueba.invalid\ndescription: Sitio de pruebas del kit\nrole: corporativa\ncloudflare:\n  project: prueba\n');
  fs.writeFileSync(path.join(dir, 'src/pages/index.astro'), `---
import Acciones from '${kit}/components/estandar/Acciones.astro';
import NubeAncla from '${kit}/components/estandar/NubeAncla.astro';
import HistoriaNube from '${kit}/components/estandar/HistoriaNube.astro';
import HeroEstandar from '${kit}/components/estandar/HeroEstandar.astro';
const respaldo = {src:'/media/forma.png',width:960,height:540,alt:'Forma de prueba'};
const activos = [{src:respaldo.src,etiqueta:'Forma',alt:respaldo.alt}];
const pasos = [{rotulo:'Paso',titulo:'Forma de prueba'}];
const invalido = process.env.KIT_ORIGEN_INVALIDO;

import Faq from '${kit}/components/Faq.astro';
import Head from '${kit}/components/Head.astro';
import SchemaOrg from '${kit}/components/SchemaOrg.astro';
const texto = ${JSON.stringify(texto)};
---
<html lang="es"><head><Head title="Prueba" description="Prueba de componentes del kit" jsonld={[{'@type': 'Thing', name: texto}]} /><SchemaOrg extra={{description: texto}} /></head><body class="std">
<h1>Prueba</h1>
<div id="ancla-default"><NubeAncla respaldo={respaldo} origen={invalido === 'ancla' ? 'inventado' : undefined} /></div>
<div id="ancla-render"><NubeAncla respaldo={respaldo} origen="render" /></div>
<div id="historia-default"><HistoriaNube titulo="Historia de prueba" activos={activos} pasos={pasos} origen={invalido === 'historia' ? 'inventado' : undefined} /></div>
<div id="historia-render"><HistoriaNube titulo="Historia de prueba" origen="render" activos={activos} pasos={pasos} /></div>
<div id="historia-mixta"><HistoriaNube titulo="Historia de prueba" origen="render" activos={[...activos, {...activos[0], origen: invalido === 'activo' ? 'inventado' : 'ilustracion'}]} pasos={[...pasos, ...pasos]} /></div>
<div id="historia-excepcion"><HistoriaNube titulo="Historia de prueba" activos={[{...activos[0], origen:'render'}]} pasos={pasos} /></div>
<div id="hero-render"><HeroEstandar titulo="Render propio" acciones={[]} nube={{respaldo,origen:'render'}} rotulo="Render 3D" /></div>
<div id="sin"><Acciones acciones={[{href: '/destino', texto: 'Más información'}]} /></div>
<div id="con"><Acciones acciones={['llena','fantasma','mas'].map(variante => ({href:'/destino', texto:'Más información', variante, oculto:' sobre Estructuras mineras'}))} /></div>
<div id="escape"><Acciones acciones={[{href:'/destino', texto:'Más información', oculto:texto}]} /></div>
<Faq items={[{q:texto, a:texto}]} />
</body></html>`);
  // Astro es el peer del kit. La prueba no instala paquetes ni accede a servicios.
  const astro = fileURLToPath(new URL('bin/astro.mjs', import.meta.resolve('astro/package.json')));
  const build = spawnSync(process.execPath, [astro, 'build'], {
    cwd: dir, encoding: 'utf8', env: { ...process.env, ASTRO_TELEMETRY_DISABLED: '1' }, timeout: 60000,
  });
  assert.equal(build.status, 0, build.stdout + build.stderr);
  html = fs.readFileSync(path.join(dir, 'dist/index.html'), 'utf8');
  dom = parse(html);
});
after(() => fs.rmSync(dir, { recursive: true, force: true }));

test('Acciones sin oculto conserva exactamente el HTML anterior', () => {
  assert.equal(dom.querySelector('#sin').innerHTML, '<div class="std-acciones"><a class="std-pildora" href="/destino">Más información</a></div>');
});
test('Acciones suma el texto oculto dentro del enlace en las tres variantes', () => {
  const enlaces = dom.querySelectorAll('#con a');
  assert.equal(enlaces.length, 3);
  for (const enlace of enlaces) {
    assert.equal(enlace.textContent, 'Más información sobre Estructuras mineras');
    const span = enlace.querySelector('.std-oculto');
    assert.ok(span);
    assert.equal(span.tagName, 'SPAN');
    assert.equal(span.getAttribute('aria-hidden'), undefined);
    assert.equal(enlace.getAttribute('aria-label'), undefined);
  }
  assert.equal(dom.querySelector('#escape a').textContent, 'Más información' + texto);
  assert.equal(dom.querySelector('#escape script'), null);
});
test('JSON-LD de Head, SchemaOrg y Faq conserva el texto sin cerrar el script', () => {
  const scripts = dom.querySelectorAll('script[type="application/ld+json"]');
  assert.equal(scripts.length, 3);
  assert.equal(dom.querySelector('#inyectado'), null);
  const datos = scripts.map(s => {
    assert.doesNotMatch(s.rawText, /[<\u2028\u2029]/);
    assert.match(s.rawText, /\\u003c\/script>/);
    return JSON.parse(s.rawText);
  });
  assert.equal(datos[0].name, texto);
  assert.equal(datos[1].description, texto);
  assert.equal(datos[2].mainEntity[0].name, texto);
  assert.equal(datos[2].mainEntity[0].acceptedAnswer.text, texto);
});
test('mcco-check R5 lee los tres JSON-LD construidos por Astro', () => {
  const check = spawnSync(process.execPath, [path.join(kit, 'scripts/check.mjs'), '--dist', 'dist', '--json'], { cwd: dir, encoding: 'utf8' });
  const resultado = JSON.parse(check.stdout);
  assert.deepEqual(resultado.findings.filter(f => f.rule.startsWith('R5-')), []);
});

// Fixtures capturadas del render de 47ce01f (v1.3.0), con los mismos datos de entrada.
for (const [id, selector, fixture] of [
  ['ancla-default', '.std-nube', 'nube-v1.3.0.html'],
  ['historia-default', '.std-historia', 'historia-v1.3.0.html'],
]) {
  test(`${id}: conserva exactamente el HTML de v1.3.0`, () => {
    assert.equal(dom.querySelector(`#${id} ${selector}`).outerHTML,
      fs.readFileSync(path.join(kit, 'test/fixtures', fixture), 'utf8').trimEnd());
  });
}
test('NubeAncla propaga render al respaldo y a noscript, también a través del hero', () => {
  for (const id of ['ancla-render', 'hero-render']) {
    // Parsear noscript como HTML también verifica la copia sin JavaScript.
    const bloque = parse(dom.querySelector(`#${id}`).innerHTML, { blockTextElements: { script: true } });
    const imagenes = bloque.querySelectorAll('img');
    assert.equal(imagenes.length, 2);
    for (const img of imagenes) assert.equal(img.getAttribute('data-origen'), 'render');
  }
  assert.equal(dom.querySelector('#hero-render [data-rotulo]').textContent, 'Render 3D');
});
test('HistoriaNube hereda el origen general y admite excepciones por activo con su rótulo', () => {
  for (const [id, origenes, rotulos] of [
    ['historia-render', ['render'], ['Render 3D']],
    ['historia-mixta', ['render', 'ilustracion'], ['Render 3D', 'Ilustración']],
    ['historia-excepcion', ['render'], ['Render 3D']],
  ]) {
    const bloque = dom.querySelector(`#${id}`);
    assert.deepEqual(bloque.querySelectorAll('[data-std-forma]').map(e => e.getAttribute('data-origen')), origenes);
    assert.deepEqual(bloque.querySelectorAll('.std-rotulo').map(e => e.textContent), rotulos);
  }
  assert.equal(dom.querySelector('#historia-render .std-historia__pie [data-rotulo]').textContent, 'Render 3D');
  assert.equal(dom.querySelector('#historia-render [data-std-nube]').getAttribute('aria-label'), 'Render 3D en nube de puntos: Forma.');
});
for (const caso of ['ancla', 'historia', 'activo']) {
  test(`origen inválido en ${caso} falla al renderizar`, () => {
    const astro = fileURLToPath(new URL('bin/astro.mjs', import.meta.resolve('astro/package.json')));
    const build = spawnSync(process.execPath, [astro, 'build'], {
      cwd: dir, encoding: 'utf8', timeout: 60000,
      env: { ...process.env, ASTRO_TELEMETRY_DISABLED: '1', KIT_ORIGEN_INVALIDO: caso },
    });
    assert.notEqual(build.status, 0);
    assert.match(build.stdout + build.stderr, /rotuloDe: el origen "inventado" no existe/);
  });
}
