import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { KIT, ENTRADAS, OBLIGATORIOS, verificar, sha256, gzip } from '../scripts/estandar-verificar.mjs';
const dist = path.join(KIT, 'dist/estandar');
const ejecutar = (script, args = [], cwd = KIT) => spawnSync(process.execPath, [script, ...args], { cwd, encoding: 'utf8', timeout: 60000 });
function aislado(fn) {
  const dir = fs.mkdtempSync(path.join(KIT, '.tmp-prueba-distribucion-'));
  try {
    fs.cpSync(dist, path.join(dir, 'dist/estandar'), { recursive: true });
    fs.mkdirSync(path.join(dir, 'scripts'));
    for (const n of ['estandar-copiar.mjs', 'estandar-verificar.mjs']) fs.copyFileSync(path.join(KIT, 'scripts', n), path.join(dir, 'scripts', n));
    fs.copyFileSync(path.join(KIT, 'package.json'), path.join(dir, 'package.json'));
    fn(dir, path.join(dir, 'dist/estandar'));
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
}
function escribir(dir, m) { fs.writeFileSync(path.join(dir, 'manifest.json'), JSON.stringify(m)); }
test('distribución íntegra, grafo completo y presupuestos con pausa pública', () => {
  const { manifest: m, presupuesto: p } = verificar();
  assert.equal(m.generador, `esbuild@${JSON.parse(fs.readFileSync(path.join(KIT,'package.json'))).devDependencies.esbuild}`);
  assert.ok(p.nube.cumple && p.campo.cumple);
  assert.ok(p.nube.archivos[ENTRADAS['nube-worker']]);
  for (const n of ['nube','campo']) assert.ok(p[n].archivos[ENTRADAS.pausa]);
  const comunes = Object.keys(p.nube.archivos).filter(r => p.campo.archivos[r]);
  assert.ok(comunes.length >= 2);
  assert.equal(p.pagina.total, Object.values(p.pagina.archivos).reduce((a,b)=>a+b,0));
});
test('copia completa funciona con Node sin node_modules en el paquete ni el destino', () => aislado((dir) => {
  // El temporal está dentro del repo: bloquear resolución de terceros demuestra que tampoco toma node_modules
  // de un ancestro. Solo se permiten el entrypoint, el helper nativo y módulos node:.
  const cargador=path.join(dir,'solo-node.mjs');
  fs.writeFileSync(cargador, `export async function resolve(s,c,next){if(!s.startsWith('node:') && !s.endsWith('/estandar-copiar.mjs') && s!=='./estandar-verificar.mjs')throw Error('Dependencia externa prohibida: '+s);return next(s,c)}`);
  const r = spawnSync(process.execPath,['--experimental-loader',cargador,path.join(dir,'scripts/estandar-copiar.mjs'),path.join(dir,'sitio/kit'),'--completo'],{cwd:dir,encoding:'utf8'});
  assert.equal(r.status, 0, r.stderr);
  assert.deepEqual(verificar(path.join(dir,'sitio/kit')), verificar());
  assert.ok(!fs.existsSync(path.join(dir,'sitio/node_modules')));
}));
for (const rel of [...OBLIGATORIOS, ...Object.keys(verificar().manifest.archivos).filter(r => r.includes('/chunks/'))]) {
  test(`copia rechaza recurso ausente: ${rel}`, () => aislado((dir, artefacto) => {
    fs.rmSync(path.join(artefacto, rel));
    const r = ejecutar(path.join(dir,'scripts/estandar-copiar.mjs'), [path.join(dir,'copia'),'--completo']);
    assert.notEqual(r.status,0); assert.ok(!fs.existsSync(path.join(dir,'copia')));
  }));
}
for (const tipo of ['hash ausente','hash cambiado','grafo omitido','entrada omitida','ruta externa','obligatorio omitido']) {
  test(`verificador rechaza ${tipo}`, () => aislado((dir, artefacto) => {
    const m = JSON.parse(fs.readFileSync(path.join(artefacto,'manifest.json'))), n = ENTRADAS.nube;
    if (tipo === 'hash ausente') delete m.archivos[n].sha256;
    if (tipo === 'hash cambiado') fs.appendFileSync(path.join(artefacto,n),'// alterado');
    if (tipo === 'grafo omitido') m.archivos[n].dependencias = [];
    if (tipo === 'entrada omitida') delete m.entradas.video;
    if (tipo === 'ruta externa') m.archivos['../fuera.js'] = m.archivos[n];
    if (tipo === 'obligatorio omitido') { delete m.archivos[ENTRADAS.video]; fs.rmSync(path.join(artefacto,ENTRADAS.video)); }
    escribir(artefacto,m);
    assert.throws(()=>verificar(artefacto));
  }));
}
for (const nombre of ['nube','campo']) test(`check falla por exceso real de ${nombre}, aun con hashes y tamaños válidos`, () => aislado((dir, artefacto) => {
  const m = JSON.parse(fs.readFileSync(path.join(artefacto,'manifest.json'))), rel = ENTRADAS[nombre];
  fs.appendFileSync(path.join(artefacto,rel), `\n/*${randomBytes(15000).toString('hex')}*/`);
  const bytes = fs.readFileSync(path.join(artefacto,rel));
  Object.assign(m.archivos[rel], {sha256:sha256(bytes),bytes:bytes.length,gzip:gzip(bytes)});
  escribir(artefacto,m);
  const r=ejecutar(path.join(dir,'scripts/estandar-verificar.mjs'),[artefacto]);
  assert.equal(r.status,1,r.stderr); assert.equal(JSON.parse(r.stdout)[nombre].cumple,false);
}));
test('todos los componentes y el layout importan la única hoja de estilos', () => {
  for (const n of fs.readdirSync(path.join(KIT,'components/estandar'))) {
    const s=fs.readFileSync(path.join(KIT,'components/estandar',n),'utf8');
    assert.match(s,/import '..\/..\/styles\/estandar-componentes.css'/); assert.doesNotMatch(s,/<style/);
  }
  assert.match(fs.readFileSync(path.join(KIT,'layouts/Estandar.astro'),'utf8'),/estandar-componentes.css/);
  assert.doesNotMatch(fs.readFileSync(path.join(KIT,'styles/estandar-componentes.css'),'utf8'),/:global\(/);
});

test('dos builds limpios tienen los mismos bytes y coinciden con el artefacto versionado', async () => {
  const { construir } = await import('../scripts/estandar-build.mjs');
  const { listar } = await import('../scripts/estandar-verificar.mjs');
  const tmp = fs.mkdtempSync(path.join(KIT,'.tmp-prueba-repro-'));
  try {
    const a=path.join(tmp,'a'),b=path.join(tmp,'b');
    await construir(a); await construir(b);
    assert.deepEqual(listar(a),listar(b));assert.deepEqual(listar(a),listar(dist));
    for(const rel of listar(a)) {
      assert.deepEqual(fs.readFileSync(path.join(a,rel)),fs.readFileSync(path.join(b,rel)),rel);
      assert.deepEqual(fs.readFileSync(path.join(a,rel)),fs.readFileSync(path.join(dist,rel)),`Versionado desactualizado: ${rel}`);
    }
  } finally { fs.rmSync(tmp,{recursive:true,force:true}); }
});
test('un chunk común excedido hace fallar ambos presupuestos aislados', () => aislado((dir, artefacto) => {
  const {manifest:m,presupuesto:p}=verificar(artefacto);
  const rel=Object.keys(p.nube.archivos).find(r=>r.includes('/chunks/')&&p.campo.archivos[r]);
  assert.ok(rel);
  fs.appendFileSync(path.join(artefacto,rel),`\n/*${randomBytes(18000).toString('hex')}*/`);
  const bytes=fs.readFileSync(path.join(artefacto,rel));
  Object.assign(m.archivos[rel],{sha256:sha256(bytes),bytes:bytes.length,gzip:gzip(bytes)});
  escribir(artefacto,m);
  const r=ejecutar(path.join(dir,'scripts/estandar-verificar.mjs'),[artefacto]);
  assert.equal(r.status,1);const medido=JSON.parse(r.stdout);
  assert.equal(medido.nube.cumple,false);assert.equal(medido.campo.cumple,false);
}));
