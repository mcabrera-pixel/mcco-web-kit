import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const SCRIPT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'scripts', 'sitio-ci.mjs');
const YAML = 'key: prueba\nname: Prueba\ndomain: https://prueba.cl\ndescription: Sitio de prueba del kit\nrole: corporativa\ncloudflare:\n  project: prueba-cl\n';

function correr(proyectoInput) {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'kit sitio '));
  fs.writeFileSync(path.join(d, 'site.yaml'), YAML);
  const out = path.join(d, 'salida.txt');
  const r = spawnSync(process.execPath, [SCRIPT], { cwd: d, encoding: 'utf8', env: { ...process.env, GITHUB_OUTPUT: out, PROYECTO_INPUT: proyectoInput } });
  return { r, salida: fs.existsSync(out) ? fs.readFileSync(out, 'utf8') : '' };
}

test('entrega proyecto y dominio desde site.yaml', () => {
  const { r, salida } = correr('');
  assert.equal(r.status, 0, r.stderr);
  assert.equal(salida, 'project=prueba-cl\ndomain=https://prueba.cl\n');
});

test('acepta el mismo proyecto si el workflow lo pasa', () => {
  assert.equal(correr('prueba-cl').r.status, 0);
});

test('falla con el motivo si el workflow pide otro proyecto', () => {
  const { r, salida } = correr('plantilla-mcco');
  assert.equal(r.status, 1);
  assert.match(r.stderr, /pide el proyecto "plantilla-mcco" pero site\.yaml dice "prueba-cl"/);
  assert.equal(salida, '');
});
