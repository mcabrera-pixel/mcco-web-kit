// Uso: source ~/pwlibs/entorno.sh; CHROME=... TMPDIR=... node test/task-rc2-verificacion.mjs <dist> <salida>
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { navegador, dormir } from './fixtures/navegador.mjs';
const [dist, salida] = process.argv.slice(2);
fs.mkdirSync(salida, { recursive: true });
const kit = process.env.KIT ?? path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const resultados = [];
function ok(nombre, valor, detalle) { resultados.push({ nombre, ok: !!valor, detalle }); console.log(`${valor ? 'OK' : 'FALLA'} ${nombre} ${detalle === undefined ? '' : JSON.stringify(detalle)}`); }
let browser;
const vigia = setTimeout(() => { console.error('Vigía rc.2'); browser?.cerrar().finally(() => process.exit(1)); }, Number(process.env.LIMITE_MS ?? 280000));
async function caso(nombre, antes, fn) {
  if (process.env.SOLO && !new RegExp(process.env.SOLO).test(nombre)) return;
  const p = await browser.pagina(antes);
  try { await fn(p); ok(`${nombre}: sin excepciones JS`, p.errores.length === 0, p.errores); }
  catch (e) { ok(nombre, false, e.message); }
  finally { await p.cerrar(); }
}
const instrumentos = `
window.__campoRecursos = { oyentes: [], observadores: [] };
const propio = () => /CampoAntigravity/.test(new Error().stack);
for (const nombre of ['ResizeObserver','IntersectionObserver']) {
  const Original = window[nombre];
  window[nombre] = class extends Original {
    constructor(...args) { super(...args); this.campo = propio(); if (this.campo) __campoRecursos.observadores.push(this); }
    disconnect() { this.desconectado = true; return super.disconnect(); }
  };
}
const agregar = EventTarget.prototype.addEventListener, quitar = EventTarget.prototype.removeEventListener;
EventTarget.prototype.addEventListener = function(tipo, fn, opciones) {
  if (propio() && !opciones?.once) __campoRecursos.oyentes.push({ destino:this, tipo, fn, quitado:false });
  return agregar.call(this,tipo,fn,opciones);
};
EventTarget.prototype.removeEventListener = function(tipo,fn,opciones) {
  for (const r of __campoRecursos.oyentes) if (r.destino===this && r.tipo===tipo && r.fn===fn) r.quitado=true;
  return quitar.call(this,tipo,fn,opciones);
};`;
try {
  browser = await navegador(path.resolve(dist), kit);
  for (const modo of ['sin-offscreen', 'worker-roto']) await caso(`I4 ${modo}`, '', async p => {
    await p.send('Emulation.setCPUThrottlingRate', { rate: 6 });
    await p.ir('/muestreo.html');
    const datos = await p.ev(`(async () => {
      ${modo === 'sin-offscreen' ? 'window.OffscreenCanvas=undefined;' : 'window.Worker=class {constructor(){throw new Error("Worker bloqueado")}};'}
      const {crearClienteNube}=await import('/__kit/lib/estandar/nube-cliente.js');
      const html=await (await fetch('/demo-estandar')).text();
      const dom=new DOMParser().parseFromString(html,'text/html');
      const src=dom.querySelector('[data-std-forma]').getAttribute('src');
      const largos=[], intervalos=[];
      const obs=new PerformanceObserver(l=>largos.push(...l.getEntries().map(e=>e.duration)));
      obs.observe({type:'longtask'});
      let ultimo=performance.now(); const reloj=setInterval(()=>{ const ahora=performance.now(); intervalos.push(ahora-ultimo); ultimo=ahora; },16);
      const c=crearClienteNube(window.Worker);
      const formas=await Promise.all([0,1,2].map(i=>c.forma({src, ancho:720,puntos:26000,semilla:9001+i})));
      await new Promise(r=>setTimeout(r,50)); clearInterval(reloj); obs.disconnect(); c.cerrarWorker();
      return {maximo:Math.max(0,...largos),largos,pulsos:intervalos.length,maxIntervalo:Math.max(...intervalos),puntos:formas.map(f=>f.lum.length)};
    })()`);
    ok(`I4 ${modo}: ninguna tarea > 100 ms a CPU 6×`, datos.maximo <= 100, datos);
    ok(`I4 ${modo}: responde entre lotes y completa tres formas`, datos.pulsos > 10 && datos.puntos.every(n => n === 26000));
  });
  await caso('DPR', `window.__resoluciones=[];const mm=window.matchMedia;window.matchMedia=q=>{const m=mm(q);if(q.includes('resolution:'))__resoluciones.push(m);return m;}`, async p => {
    await p.ir(); await p.hasta('window.__mccoNube?.state.frames > 10 && window.__mccoCampo?.state.puntos > 0');
    await p.ev('window.__resizes=0; addEventListener("resize",()=>__resizes++); window.dispatchEvent(new CustomEvent("std-pausa",{detail:{pausa:true}}))');
    for (const dpr of [1.25, 2, 1]) {
      await p.send('Emulation.setDeviceMetricsOverride', { width:1280, height:800, deviceScaleFactor:dpr, mobile:false });
      await dormir(100);
      // CDP cambia devicePixelRatio pero Chrome headless no emite el aviso de pantalla. Se entrega ese aviso
      // a las consultas reales; los runtimes deben suscribirse, rearmarlas y redimensionar sin evento resize.
      await p.ev(`__resoluciones.filter(m=>!m.matches).forEach(m=>m.dispatchEvent(new Event('change')))`);
      await dormir(200);
      const medidas = await p.ev(`[document.querySelector('.std-nube-lienzo'),document.querySelector('[data-std-campo] canvas')].map(c=>({width:c.width,height:c.height,w:c.getBoundingClientRect().width,h:c.getBoundingClientRect().height}))`);
      ok(`DPR ${dpr}: ambos buffers siguen la resolución en pausa`, medidas.every(m => m.width === Math.round(m.w*Math.min(dpr,1.65)) && m.height === Math.round(m.h*Math.min(dpr,1.65))), medidas);
    }
    ok('DPR: no se necesitó un evento resize', await p.ev('__resizes===0'));
  });
  await caso('apagado y marcas', instrumentos, async p => {
    await p.ir(); await p.hasta('window.__mccoNube?.state.frames > 10 && window.__mccoCampo?.state.puntos > 0');
    ok('ambas fuentes marcan el hero', await p.ev('document.querySelector(".std-hero").hasAttribute("data-std-movimiento")'));
    await p.ev(`document.querySelector('.std-nube-lienzo').getContext('webgl2').getExtension('WEBGL_lose_context').loseContext()`);
    await p.hasta('!window.__mccoNube.state.webgl');
    ok('fijo quita la fuente nube, campo conserva la marca', await p.ev('document.querySelector(".std-hero").getAttribute("data-std-movimiento")==="campo"'));
    await p.ev(`document.querySelector('[data-std-campo] canvas').getContext('webgl2').getExtension('WEBGL_lose_context').loseContext()`);
    await p.hasta('window.__mccoCampo.state.puntos===0');
    ok('ambas fuentes apagadas eliminan el atributo', await p.ev('!document.querySelector(".std-hero").hasAttribute("data-std-movimiento")'));
    const recursos = await p.ev(`({observadores:__campoRecursos.observadores.map(o=>o.desconectado===true),oyentes:__campoRecursos.oyentes.filter(o=>!o.quitado).map(o=>o.tipo)})`);
    ok('campo desconecta observadores y quita todos sus oyentes', recursos.observadores.length >= 2 && recursos.observadores.every(Boolean) && recursos.oyentes.length === 0, recursos);
    await p.ev('dispatchEvent(new Event("resize")); dispatchEvent(new PointerEvent("pointermove",{clientX:20,clientY:30})); dispatchEvent(new CustomEvent("std-pausa",{detail:{pausa:false}}))');
    await dormir(100);
    ok('campo apagado no revive', await p.ev('!__mccoCampo.state.running && !document.querySelector("[data-std-campo] canvas")'));
  });
  await caso('apagado definitivo', instrumentos, async p => {
    await p.ir(); await p.hasta('window.__mccoCampo?.state.puntos>0');
    const cierre=await p.ev(`(()=>{
      const c=document.querySelector('[data-std-campo] canvas'),gl=c.getContext('webgl2');
      const vivo=!gl.isContextLost();
      c.dispatchEvent(new Event('webglcontextlost',{cancelable:true}));
      return {vivo,perdido:gl.isContextLost(),conectado:c.isConnected,marca:document.querySelector('.std-hero').getAttribute('data-std-movimiento'),
        observadores:__campoRecursos.observadores.every(o=>o.desconectado),oyentes:__campoRecursos.oyentes.filter(o=>!o.quitado).map(o=>o.tipo)};
    })()`);
    ok('apagar con contexto vivo lo libera y desmonta sus recursos',cierre.vivo&&cierre.perdido&&!cierre.conectado&&cierre.observadores&&cierre.oyentes.length===0,cierre);
  });
  await caso('galeria', '', async p => {
    await p.ir();
    const aspecto=await p.ev(`(()=>{const propiedades=['backgroundColor','color','backdropFilter','webkitBackdropFilter'];const estilo=s=>{const c=getComputedStyle(document.querySelector(s));return Object.fromEntries(propiedades.map(k=>[k,c[k]]))};return{rotulo:estilo('.std-galeria .std-rotulo'),boton:estilo('.std-galeria__boton')}})()`);
    ok('rótulo y video conservan la misma superficie',JSON.stringify(aspecto.rotulo)===JSON.stringify(aspecto.boton),aspecto);
  });
  await caso('grilla', '', async p => {
    await p.send('Emulation.setEmulatedMedia', { features:[{name:'prefers-reduced-motion',value:'reduce'}] });
    await p.ir();
    await p.ev(`window.__activos=[...document.querySelector('.std-historia__fijas').children].map(e=>e.cloneNode(true))`);
    for (const ancho of [1280,390]) {
      await p.send('Emulation.setDeviceMetricsOverride', {width:ancho,height:800,deviceScaleFactor:1,mobile:false});
      for (const n of [1,2,3,4]) {
        const columnas=await p.ev(`(()=>{const h=document.querySelector('[data-std-historia]');h.style.setProperty('--formas','${n}');const ul=h.querySelector('.std-historia__fijas');ul.replaceChildren(...__activos.slice(0,${n}).map(e=>e.cloneNode(true)));return getComputedStyle(ul).gridTemplateColumns.split(' ').length})()`);
        ok(`grilla ${n} activos a ${ancho}px`,columnas===(ancho===390?1:n===4?2:n),columnas);
      }
    }
  });
  await caso('respaldo', `window.OffscreenCanvas=undefined; const originalFetch=window.fetch; window.fetch=(src,...args)=>String(src).includes('hero-chancado')?Promise.resolve(new Response('',{status:404})):originalFetch(src,...args);`, async p => {
    await p.ir(); await p.hasta('document.querySelector("[data-std-nube=hero]").dataset.estado==="fijo" && window.__mccoCampo?.state.puntos>0');
    await p.ev(`dispatchEvent(new CustomEvent('std-pausa',{detail:{pausa:true}})); document.querySelector('[data-std-nube=hero]').scrollIntoView({block:'center'});`);
    await dormir(300); await p.captura(path.join(salida,'respaldo-campo.png'));
    // Una banda sólida en la capa del campo permite medir objetivamente si el blanco del respaldo la oculta.
    await p.ev(`document.querySelector('[data-std-campo]').style.background='rgb(80,160,200)';`);
    const data = await p.captura(path.join(salida,'respaldo-contraste.png'));
    const medicion = await p.ev(`(async()=>{
      const i=new Image();i.src='data:image/png;base64,${data}';await i.decode();
      const c=document.createElement('canvas'); c.width=i.width;c.height=i.height;const ctx=c.getContext('2d');ctx.drawImage(i,0,0);
      const r=document.querySelector('[data-std-nube=hero] img').getBoundingClientRect();
      const colores=[];for(let y=Math.ceil(r.top)+5;y<Math.min(innerHeight,r.bottom)-5;y+=4)for(let x=Math.ceil(r.left)+5;x<r.right-5;x+=4){const p=ctx.getImageData(x,y,1,1).data;colores.push([...p]);}
      return {blancos:colores.filter(p=>p[0]>240&&p[1]>240&&p[2]>240).length,total:colores.length};
    })()`);
    ok('el respaldo no pinta un rectángulo blanco sobre el campo', medicion.total > 0 && medicion.blancos/medicion.total < .01, medicion);
  });
} finally {
  clearTimeout(vigia); await browser?.cerrar();
  fs.writeFileSync(path.join(salida,'resultados.json'), JSON.stringify(resultados,null,2));
}
console.log(`${resultados.filter(r=>r.ok).length}/${resultados.length} comprobaciones`);
process.exitCode = resultados.some(r=>!r.ok) ? 1 : 0;
