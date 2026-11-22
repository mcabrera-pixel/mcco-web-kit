import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const SMOKE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'scripts', 'smoke.sh');
const API = 'https://api.cloudflare.com/client/v4/accounts/cuenta/pages/projects/';

// Doble de curl: responde desde un mapa URL -> { code, body } y anota cada URL pedida. Una URL que no está en el
// mapa se comporta como un host que no existe (código 000 y salida 6, como curl).
const DOBLE = `import fs from 'node:fs';
const args = process.argv.slice(2);
const url = args.at(-1);
fs.appendFileSync(process.env.DOBLE_REGISTRO, url + '\\n');
const r = JSON.parse(fs.readFileSync(process.env.DOBLE_MAPA, 'utf8'))[url];
const soloCodigo = args.includes('%{http_code}');
if (!r) { if (soloCodigo) process.stdout.write('000'); process.exit(6); }
process.stdout.write(soloCodigo ? String(r.code) : r.body);
`;

const portada = (canonical) => `<!doctype html><html lang="es"><head><link rel="canonical" href="${canonical}"></head><body></body></html>`;
const sitio = (base, canonical) => Object.fromEntries(
  [['/', portada(canonical)], ['/sitemap.xml', '<urlset/>'], ['/robots.txt', 'User-agent: *'], ['/llms.txt', '# sitio']]
    .map(([ruta, body]) => [base + ruta, { code: 200, body }]));
const proyecto = (nombre, result) => ({ [API + nombre]: { code: 200, body: JSON.stringify({ success: true, result }) } });
const CREDENCIALES = { CLOUDFLARE_API_TOKEN: 'token', CLOUDFLARE_ACCOUNT_ID: 'cuenta' };

function correr(mapa, env) {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'kit smoke '));
  const bin = path.join(d, 'bin');
  fs.mkdirSync(bin);
  fs.writeFileSync(path.join(bin, 'curl'), '#!/usr/bin/env bash\nexec "$DOBLE_NODE" "$DOBLE_JS" "$@"\n', { mode: 0o755 });
  fs.writeFileSync(path.join(d, 'doble.mjs'), DOBLE);
  fs.writeFileSync(path.join(d, 'mapa.json'), JSON.stringify(mapa));
  const registro = path.join(d, 'pedidas.txt');
  const resumen = path.join(d, 'resumen.md');
  const base = Object.fromEntries(Object.entries(process.env).filter(([k]) => !/^(path|cloudflare_.*)$/i.test(k)));
  const r = spawnSync('bash', [SMOKE], {
    encoding: 'utf8',
    env: {
      ...base, PATH: bin + path.delimiter + process.env.PATH, SMOKE_ESPERA: '0', GITHUB_STEP_SUMMARY: resumen,
      DOBLE_NODE: process.execPath, DOBLE_JS: path.join(d, 'doble.mjs'), DOBLE_MAPA: path.join(d, 'mapa.json'), DOBLE_REGISTRO: registro,
      ...env,
    },
  });
  const leer = (f) => (fs.existsSync(f) ? fs.readFileSync(f, 'utf8') : '');
  return { r, pedidas: leer(registro).split('\n').filter(Boolean), resumen: leer(resumen) };
}

test('prueba el subdominio real del proyecto cuando no es <proyecto>.pages.dev', () => {
  // Caso de MonitorIA: el proyecto «monitor-ia» publica en monitor-ia-7c6.pages.dev y monitor-ia.pages.dev es de otra cuenta.
  const { r, pedidas, resumen } = correr({
    ...proyecto('monitor-ia', { subdomain: 'monitor-ia-7c6.pages.dev', domains: ['monitor-ia-7c6.pages.dev'] }),
    ...sitio('https://monitor-ia-7c6.pages.dev', 'https://monitor-ia.cl/'),
    ...sitio('https://monitor-ia.pages.dev', 'https://sitio-ajeno.example/'),
  }, { PROYECTO: 'monitor-ia', DOMINIO: 'https://monitor-ia.cl', ...CREDENCIALES });
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.ok(pedidas.includes('https://monitor-ia-7c6.pages.dev/llms.txt'), pedidas.join('\n'));
  assert.deepEqual(pedidas.filter((u) => u.startsWith('https://monitor-ia.pages.dev')), []);
  assert.match(resumen, /pages\.dev: https:\/\/monitor-ia-7c6\.pages\.dev\n/);
});

test('sin credenciales de Cloudflare prueba <proyecto>.pages.dev', () => {
  const { r, pedidas } = correr(sitio('https://prueba-cl.pages.dev', 'https://prueba.cl/'), { PROYECTO: 'prueba-cl', DOMINIO: 'https://prueba.cl' });
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /smoke OK \(no conectado al proyecto\)/);
  assert.ok(pedidas.includes('https://prueba-cl.pages.dev/llms.txt'), pedidas.join('\n'));
});

test('si la API de Cloudflare no responde bien, prueba <proyecto>.pages.dev y deja el aviso', () => {
  const { r, pedidas } = correr({
    [API + 'prueba-cl']: { code: 403, body: JSON.stringify({ success: false, errors: [{ message: 'Authentication error' }] }) },
    ...sitio('https://prueba-cl.pages.dev', 'https://prueba.cl/'),
  }, { PROYECTO: 'prueba-cl', DOMINIO: 'https://prueba.cl', ...CREDENCIALES });
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /::warning::smoke: la API de Cloudflare no respondió success: true para prueba-cl/);
  assert.match(r.stdout, /smoke OK \(sin verificar \(API Cloudflare\)\)/);
  assert.ok(pedidas.includes('https://prueba-cl.pages.dev/llms.txt'), pedidas.join('\n'));
});

test('con el dominio conectado al proyecto prueba también el dominio', () => {
  const { r, pedidas } = correr({
    ...proyecto('prueba-cl', { subdomain: 'prueba-cl.pages.dev', domains: ['prueba-cl.pages.dev', 'prueba.cl'] }),
    ...sitio('https://prueba-cl.pages.dev', 'https://prueba.cl/'),
    ...sitio('https://prueba.cl', 'https://prueba.cl/'),
  }, { PROYECTO: 'prueba-cl', DOMINIO: 'https://prueba.cl', ...CREDENCIALES });
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /smoke OK \(probado\)/);
  assert.ok(pedidas.includes('https://prueba.cl/llms.txt'), pedidas.join('\n'));
});

test('falla si la canonical de la portada no apunta al dominio de site.yaml', () => {
  const { r } = correr(sitio('https://prueba-cl.pages.dev', 'https://otro-dominio.example/'), { PROYECTO: 'prueba-cl', DOMINIO: 'https://prueba.cl' });
  assert.equal(r.status, 1);
  assert.match(r.stdout, /la canonical de la portada no apunta a https:\/\/prueba\.cl\//);
});

test('falla si una ruta del sitio no responde 200', () => {
  const mapa = sitio('https://prueba-cl.pages.dev', 'https://prueba.cl/');
  mapa['https://prueba-cl.pages.dev/llms.txt'].code = 404;
  const { r } = correr(mapa, { PROYECTO: 'prueba-cl', DOMINIO: 'https://prueba.cl' });
  assert.equal(r.status, 1);
  assert.match(r.stdout, /https:\/\/prueba-cl\.pages\.dev\/llms\.txt -> 404/);
});
