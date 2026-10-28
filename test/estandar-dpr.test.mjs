import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as comun from '../lib/visual/comun.js';

test('el cambio de DPR rearma la consulta y su cierre quita el último oyente', t => {
  const anteriores = ['matchMedia','devicePixelRatio'].map(k=>[k,Object.getOwnPropertyDescriptor(globalThis,k)]);
  t.after(()=>anteriores.forEach(([k,d])=>d?Object.defineProperty(globalThis,k,d):delete globalThis[k]));
  const consultas=[];
  globalThis.devicePixelRatio=1;
  globalThis.matchMedia=query=>{
    const m={ query, oyentes:new Set(), addEventListener(_,fn){this.oyentes.add(fn)},removeEventListener(_,fn){this.oyentes.delete(fn)} };
    consultas.push(m); return m;
  };
  let cambios=0;
  const cerrar=comun.observarDpr(()=>cambios++);
  for (const dpr of [1.25,2,1]) {
    const anterior=consultas.at(-1);
    globalThis.devicePixelRatio=dpr;
    [...anterior.oyentes][0]();
    assert.equal(anterior.oyentes.size,0);
    assert.equal(consultas.at(-1).query,`(resolution: ${dpr}dppx)`);
    assert.equal(consultas.at(-1).oyentes.size,1);
  }
  assert.equal(cambios,3);
  cerrar(); cerrar();
  assert.equal(consultas.at(-1).oyentes.size,0);
});
