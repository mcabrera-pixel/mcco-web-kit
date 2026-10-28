// Render real de Astro: compatibilidad de Acciones y seguridad del HTML JSON-LD.
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
import Faq from '${kit}/components/Faq.astro';
import Head from '${kit}/components/Head.astro';
import SchemaOrg from '${kit}/components/SchemaOrg.astro';
const texto = ${JSON.stringify(texto)};
---
<html lang="es"><head><Head title="Prueba" description="Prueba de componentes del kit" jsonld={[{'@type': 'Thing', name: texto}]} /><SchemaOrg extra={{description: texto}} /></head><body class="std">
<h1>Prueba</h1>
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
