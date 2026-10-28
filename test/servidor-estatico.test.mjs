import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { servidor } from './fixtures/servidor-estatico.mjs';

const kit = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const raiz = fs.mkdtempSync(path.join(kit, '.tmp-prueba-'));
const hermano = fs.mkdtempSync(path.join(kit, '.tmp-prueba-'));
let instancia;

before(async () => {
  fs.mkdirSync(path.join(raiz, 'carpeta'), { recursive: true });
  fs.writeFileSync(path.join(raiz, 'carpeta', 'index.html'), '<h1>carpeta</h1>');
  fs.writeFileSync(path.join(raiz, 'pagina.html'), '<h1>pagina</h1>');
  fs.writeFileSync(path.join(raiz, 'normal.txt'), 'hola');
  fs.writeFileSync(path.join(hermano, 'marca.txt'), 'secreto');
  fs.symlinkSync(path.join(hermano, 'marca.txt'), path.join(raiz, 'fuera.lnk'));
  instancia = await servidor(raiz);
});

after(() => {
  instancia?.s.close();
  for (const dir of [raiz, hermano]) {
    try { fs.rmSync(dir, { recursive: true, force: true }); } catch {}
  }
});

async function fetchRuta(ruta) {
  return fetch(`${instancia.base}${ruta}`);
}

test('archivo normal da 200', async () => {
  const r = await fetchRuta('/normal.txt');
  assert.equal(r.status, 200);
  assert.equal(await r.text(), 'hola');
});

test('carpeta entrega su index.html', async () => {
  const r = await fetchRuta('/carpeta');
  assert.equal(r.status, 200);
  assert.match(await r.text(), /<h1>carpeta<\/h1>/);
});

test('/pagina entrega pagina.html', async () => {
  const r = await fetchRuta('/pagina');
  assert.equal(r.status, 200);
  assert.match(await r.text(), /<h1>pagina<\/h1>/);
});

test('/..%2fmarca.txt da 403 y no entrega el marcador hermano', async () => {
  const r = await fetchRuta('/..%2fmarca.txt');
  assert.equal(r.status, 403);
  assert.doesNotMatch(await r.text(), /secreto/);
});

test('enlace simbólico que apunta fuera da 403', async () => {
  const r = await fetchRuta('/fuera.lnk');
  assert.equal(r.status, 403);
});

test('una raíz que es un enlace simbólico sirve sus páginas y sigue sin salir de ella', async () => {
  const enlace = path.join(kit, `.tmp-prueba-enlace-${process.pid}`);
  fs.symlinkSync(raiz, enlace, 'dir');
  const otra = await servidor(enlace);
  try {
    const r = await fetch(`${otra.base}/normal.txt`);
    assert.equal(r.status, 200);
    assert.equal(await r.text(), 'hola');
    assert.equal((await fetch(`${otra.base}/..%2fmarca.txt`)).status, 403);
  } finally {
    otra.s.close();
    fs.rmSync(enlace, { force: true });
  }
});
