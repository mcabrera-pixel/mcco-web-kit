// Prueba de la regla R8-csp de mcco-check: 'wasm-unsafe-eval' (WebAssembly) no es 'unsafe-eval' y no pide
// justificación; 'unsafe-eval' sin csp.unsafe_eval en site.yaml sí da aviso.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const CHECK = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'scripts', 'check.mjs');

function correr(scriptSrc) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mcco-check-csp-'));
  fs.writeFileSync(path.join(dir, 'site.yaml'),
    'key: prueba\nname: Prueba\ndomain: https://prueba.example\ndescription: Sitio de prueba de la regla R8.\nrole: corporativa\ncloudflare:\n  project: prueba\n');
  const dist = path.join(dir, 'dist');
  fs.mkdirSync(dist);
  fs.writeFileSync(path.join(dist, 'index.html'), '<!doctype html><html lang="es"><head><title>Prueba</title></head><body><h1>Prueba</h1></body></html>');
  fs.writeFileSync(path.join(dist, '_headers'),
    `/*\n  Strict-Transport-Security: max-age=31536000\n  X-Content-Type-Options: nosniff\n  Content-Security-Policy: default-src 'self'; script-src 'self' ${scriptSrc}\n`);
  let salida;
  try {
    salida = execFileSync(process.execPath, [CHECK, '--dist', dist, '--json'], { cwd: dir, encoding: 'utf8' });
  } catch (e) {
    salida = e.stdout; // con errores de otras reglas el proceso sale con 1; aquí solo importa R8-csp
  }
  fs.rmSync(dir, { recursive: true, force: true });
  return JSON.parse(salida).findings.filter((f) => f.rule === 'R8-csp');
}

test("'wasm-unsafe-eval' no da aviso de unsafe-eval", () => {
  assert.deepEqual(correr("'wasm-unsafe-eval'"), []);
});

test("'unsafe-eval' sin justificar da aviso", () => {
  const r8 = correr("'unsafe-eval'");
  assert.equal(r8.length, 1);
  assert.match(r8[0].msg, /unsafe-eval/);
});
