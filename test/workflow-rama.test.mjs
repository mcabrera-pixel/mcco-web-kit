import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import YAML from 'yaml';

const ci = YAML.parse(fs.readFileSync(new URL('../.github/workflows/site-ci.yml', import.meta.url), 'utf8'));
const steps = ci.jobs.check.steps;
test('CI pasa la rama por env y command consume solo la salida saneada', () => {
  const rama = steps.find(s => s.id === 'rama');
  assert.ok(rama);
  assert.equal(rama.env.RAMA, '${{ github.head_ref || github.ref_name }}');
  assert.doesNotMatch(rama.run, /\$\{\{/);
  const deploy = steps.find(s => s.id === 'deploy');
  assert.match(deploy.with.command, /--branch=\$\{\{ steps\.rama\.outputs\.branch \}\}/);
  assert.doesNotMatch(deploy.with.command, /github\.(head_ref|ref_name)/);
  assert.ok(steps.indexOf(rama) < steps.indexOf(deploy));
});
test('la normalización real del workflow acepta solo a-z, 0-9 y guion', () => {
  const rama = steps.find(s => s.id === 'rama');
  assert.ok(rama);
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'kit-rama-'));
  try {
    for (const [entrada, esperado] of [['feat/Kit_v1.2.0', 'feat-kit-v1-2-0'], ["A'\";$(echo sorpresa)`x`\nINJECT=1", 'a-echo-sorpresa-x-inject-1'], ['---ABC---', 'abc'], ['///', 'preview'], ['Main', 'rama-main'], ['MAIN', 'rama-main'], ['main-', 'rama-main'], ['main_', 'rama-main'], ['main', 'rama-main']]) {
      const salida = path.join(dir, 'output');
      fs.writeFileSync(salida, '');
      const r = spawnSync('bash', ['-e', '-c', rama.run], { cwd: dir, encoding: 'utf8', env: { PATH: process.env.PATH, RAMA: entrada, GITHUB_OUTPUT: salida } });
      assert.equal(r.status, 0, r.stderr);
      assert.equal(fs.readFileSync(salida, 'utf8'), `branch=${esperado}\n`);
      assert.equal(r.stdout, '');
    }
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
test('la normalización de preview nunca devuelve main', () => {
  const rama = steps.find(s => s.id === 'rama');
  assert.ok(rama);
  const entradas = ['feat/Kit_v1.2.0', "A'\";$(echo sorpresa)`x`\nINJECT=1", '---ABC---', '///', 'Main', 'MAIN', 'main-', 'main_', 'main', 'main/main', 'main--main', '_main_', 'main\nmain'];
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'kit-rama-'));
  try {
    for (const entrada of entradas) {
      const salida = path.join(dir, 'output');
      fs.writeFileSync(salida, '');
      const r = spawnSync('bash', ['-e', '-c', rama.run], { cwd: dir, encoding: 'utf8', env: { PATH: process.env.PATH, RAMA: entrada, GITHUB_OUTPUT: salida } });
      assert.equal(r.status, 0, r.stderr);
      assert.doesNotMatch(fs.readFileSync(salida, 'utf8'), /^branch=main\n$/);
    }
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
test('el deploy de producción conserva main', () => {
  const deploy = YAML.parse(fs.readFileSync(new URL('../.github/workflows/site-deploy.yml', import.meta.url), 'utf8'));
  assert.match(deploy.jobs.deploy.steps.find(s => s.uses?.startsWith('cloudflare/wrangler-action')).with.command, /--branch=main\b/);
});
