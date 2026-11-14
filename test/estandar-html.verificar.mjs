#!/usr/bin/env node
// Contrato real sin Astro: copia nativa servida por HTTP y Chrome mediante el arnés CDP del kit.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { navegador, dormir } from './fixtures/navegador.mjs';
import { KIT, verificar, sha256 } from '../scripts/estandar-verificar.mjs';
const salida = path.resolve(process.env.ESTANDAR_EVIDENCIA || path.join(KIT,'.tmp-prueba-html'));
fs.mkdirSync(salida,{recursive:true});
// Chromium crea un socket Unix: mantener corta la ruta temporal y dentro del workspace.
process.env.TMPDIR ||= KIT;
process.env.ASTRO_TELEMETRY_DISABLED = '1';
const sitio = path.join(salida,'html'), astro = path.join(salida,'astro');
fs.rmSync(sitio,{recursive:true,force:true}); fs.rmSync(astro,{recursive:true,force:true});
fs.cpSync(path.join(KIT,'test/fixtures/estandar-html'),sitio,{recursive:true});
function ejecutar(script,args=[],opciones={}) {
  const r=spawnSync(process.execPath,[script,...args],{encoding:'utf8',timeout:120000,...opciones});
  assert.equal(r.status,0,r.stdout+r.stderr); return r.stdout;
}
ejecutar(path.join(KIT,'scripts/estandar-copiar.mjs'),[path.join(sitio,'estandar'),'--completo']);
const { presupuesto } = verificar(path.join(sitio,'estandar'));
fs.writeFileSync(path.join(salida,'presupuesto.json'),JSON.stringify(presupuesto,null,2));
const astroBin=fileURLToPath(new URL('bin/astro.mjs',import.meta.resolve('astro/package.json')));
const build=ejecutar(astroBin,['build'],{cwd:path.join(KIT,'test/fixtures/estandar-astro'),env:{...process.env,ESTANDAR_ASTRO_SALIDA:astro}});
fs.writeFileSync(path.join(salida,'astro-build.log'),build);
fs.cpSync(path.join(sitio,'media'),path.join(astro,'media'),{recursive:true});
// Variantes del mismo contrato: nube sola y campo con pausa sin nube.
const html=fs.readFileSync(path.join(sitio,'index.html'),'utf8');
// Un 404 real afecta al DOM y al Worker; Network.setBlockedURLs de la página no bloquea al Worker.
fs.writeFileSync(path.join(sitio,'historia-activo-caido.html'),html.replaceAll('/media/forma2.png','/media/forma-ausente.png'));
fs.writeFileSync(path.join(sitio,'nube-sola.html'),html.replace(/<section class="std-historia"[\s\S]*?<\/section>/,'').replace(/<div class="std-campo"[^>]*><\/div>/,'').replace(/<script[^>]+campo.js[^>]*><\/script>/,''));
fs.writeFileSync(path.join(sitio,'campo-solo.html'),html.replace(/<section class="std-historia"[\s\S]*?<\/section>/,'').replace(/<figure class="std-hero__nube">[\s\S]*?<\/figure>/,'').replace(/<script[^>]+nube.js[^>]*><\/script>/,''));
if (!process.env.CHROME) throw new Error('Falta CHROME: ruta al ejecutable de Chrome/Chromium. Se usa CDP, sin Playwright.');
const headers = {'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; media-src 'self'; worker-src 'self'; connect-src 'self'",'X-Content-Type-Options':'nosniff'};
const opciones={headers,temporales:salida,chromeArgs:process.env.ESTANDAR_SWIFTSHADER==='1'?['--enable-unsafe-swiftshader','--use-angle=swiftshader']:[]};
let browser, comparador;
const resultados=[];
function ok(nombre,valor,detalle) { resultados.push({nombre,ok:!!valor,detalle}); console.log(`${valor?'OK':'FALLA'} ${nombre}${detalle===undefined?'':': '+JSON.stringify(detalle)}`); }
const visible = sel => `(()=>{const e=document.querySelector(${JSON.stringify(sel)});return e && getComputedStyle(e).display!=='none' && e.getBoundingClientRect().height>0})()`;
async function caso(nombre,antes,fn,fallosEsperados=[]) {
  const p=await browser.pagina(antes);
  try {
    await fn(p);
    ok(`${nombre}: excepciones`,p.errores.length===0,p.errores);
    const fallos=p.red.filter(r=>r.status>=400||r.fallo).filter(r=>!fallosEsperados.some(s=>JSON.stringify(r).includes(s)));
    const logs=p.consola.filter(r=>r.level==='error').filter(r=>!fallosEsperados.some(s=>JSON.stringify(r).includes(s)));
    ok(`${nombre}: recursos, MIME y CSP`,fallos.length===0&&logs.length===0,{fallos,logs});
  } catch(e) {ok(nombre,false,e.message);} finally { await p.cerrar(); }
}
const medidas=async(p,w,h)=>p.send('Emulation.setDeviceMetricsOverride',{width:w,height:h,deviceScaleFactor:1,mobile:false});
const reducir=async p=>p.send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
const listo=async p=>p.hasta('window.__mccoNube?.state.frames>2 && window.__mccoCampo?.state.puntos>0',30000);
const estilos=`(()=>{const props=['display','position','color','backgroundColor','fontSize','fontWeight','lineHeight','paddingTop','paddingBottom','borderRadius','gridTemplateColumns','minHeight','height','width'];
 const clases=[...new Set([...document.querySelectorAll('[class]')].flatMap(e=>[...e.classList]).filter(c=>c.startsWith('std-')))];
 return Object.fromEntries(clases.sort().map(c=>{const e=document.querySelector('.'+c),s=getComputedStyle(e);return[c,Object.fromEntries(props.map(p=>[p,s[p]]))]}));})()`;
try {
  browser=await navegador(sitio,KIT,opciones); comparador=await navegador(astro,KIT,opciones);
  const { manifest }=verificar(path.join(sitio,'estandar'));
  for(const [rel,registro] of Object.entries(manifest.archivos)) {
    const respuesta=await fetch(`${browser.base}/estandar/${rel}`), bytes=Buffer.from(await respuesta.arrayBuffer());
    const tipo=respuesta.headers.get('content-type');
    ok(`HTTP íntegro ${rel}`,respuesta.status===200&&sha256(bytes)===registro.sha256&&(!rel.endsWith('.js')||tipo==='text/javascript')&&(!rel.endsWith('.css')||tipo==='text/css'));
  }
  for (const [w,h] of [[390,844],[844,390],[901,700],[1366,650]]) {
    await caso(`paridad ${w}x${h}`,'',async p=>{
      const a=await comparador.pagina();
      try {
        for(const q of [p,a]) {await medidas(q,w,h);await reducir(q);await q.ir('/index.html');await q.ev('document.fonts.ready');}
        const n=await p.ev(estilos), r=await a.ev(estilos);
        const diferencias=[];
        for(const [clase,props] of Object.entries(n)) for(const [prop,v] of Object.entries(props)) if(r[clase]?.[prop]!==v && !(/^[-\d.]+px$/.test(v) && /^[-\d.]+px$/.test(r[clase]?.[prop]??'') && Math.abs(parseFloat(v)-parseFloat(r[clase][prop]))<=.05)) diferencias.push({clase,prop,html:v,astro:r[clase]?.[prop]});
        ok(`CSS calculado ${w}x${h}`,diferencias.length===0,diferencias);
        ok(`sin desborde ${w}x${h}`,await p.ev('document.documentElement.scrollWidth<=innerWidth'));
        for(const [zona,selector] of [['hero','.std-hero'],['historia','.std-historia'],['galeria','#galeria'],['pie','#pie']]) {
          for(const q of [p,a]) {await q.ev(`document.querySelector('${selector}').scrollIntoView();`);await dormir(120);}
          const uno=await p.captura(path.join(salida,`html-${w}-${h}-${zona}.png`));
          const dos=await a.captura(path.join(salida,`astro-${w}-${h}-${zona}.png`));
          const diferencia=await p.ev(`(async()=>{const leer=async data=>{const i=new Image();i.src='data:image/png;base64,'+data;await i.decode();const c=document.createElement('canvas');c.width=i.width;c.height=i.height;const x=c.getContext('2d');x.drawImage(i,0,0);return x.getImageData(0,0,c.width,c.height).data;};const a=await leer('${uno}'),b=await leer('${dos}');let n=0;for(let i=0;i<a.length;i+=4)if(Math.max(...[0,1,2].map(j=>Math.abs(a[i+j]-b[i+j])))>30)n++;return n/(a.length/4);})()`);
          ok(`captura ${w}x${h} ${zona}`,diferencia<.02,{fraccionPixelesDistintos:diferencia,limite:.02});
        }
        ok(`Astro sin errores ${w}`,a.errores.length===0&&a.red.every(r=>!r.fallo&&r.status<400)&&a.consola.every(r=>r.level!=='error'),{errores:a.errores,consola:a.consola.filter(r=>r.level==='error')});
      } finally {await a.cerrar();}
    });
  }
  await caso('color del texto de acción', '', async p => {
    const a = await comparador.pagina();
    try {
      for (const [nombre, q] of [['HTML', p], ['Astro', a]]) {
        await reducir(q); await q.ir('/index.html');
        const medir = `(() => {
          const botones = [...document.querySelectorAll('.std-pildora:not(.std-pildora--fantasma)')];
          return botones.map(e => { const s = getComputedStyle(e); return {html:e.outerHTML,color:s.color,fondo:s.backgroundColor}; });
        })()`;
        const original = await q.ev(medir);
        ok(`${nombre}: blanco sobre azul por defecto (v1.3.0)`, original.length > 0 && original.every(b => b.color === 'rgb(255, 255, 255)' && b.fondo === 'rgb(0, 113, 227)'));
        const fantasmas = await q.ev(`[...document.querySelectorAll('.std-pildora--fantasma')].map(e => getComputedStyle(e).color)`);
        await q.ev(`document.documentElement.style.setProperty('--accion-boton','#ffdf00');document.documentElement.style.setProperty('--accion-texto','#000')`);
        // La transición preexistente del fondo tarda 0,2 s.
        await dormir(250);
        const cambiado = await q.ev(medir);
        ok(`${nombre}: amarillo con texto negro, sin cambiar HTML`, cambiado.every((b,i) => b.html === original[i].html && b.color === 'rgb(0, 0, 0)' && b.fondo === 'rgb(255, 223, 0)'));
        ok(`${nombre}: fantasma conserva el color de enlace`, JSON.stringify(fantasmas) === JSON.stringify(await q.ev(`[...document.querySelectorAll('.std-pildora--fantasma')].map(e => getComputedStyle(e).color)`)));
        const contraste = await q.ev(`(() => {
          const canales = [255,223,0].map(v => {const s=v/255;return s<=.04045?s/12.92:((s+.055)/1.055)**2.4});
          return (canales[0]*.2126+canales[1]*.7152+canales[2]*.0722+.05)/.05;
        })()`);
        ok(`${nombre}: contraste de texto ≥ 4,5:1`, contraste >= 4.5, {contraste});
        ok(`${nombre}: puente v1.1 hereda el texto de acción`, await q.ev(`getComputedStyle(document.body).getPropertyValue('--color-on-accent').trim()==='#000'`));
      }
    } finally { await a.cerrar(); }
  });
  await caso('menú y teclado','',async p=>{
    await medidas(p,390,844);await reducir(p);await p.ir('/index.html');
    await p.ev('document.querySelector("[data-std-menu]").focus()');
    await p.send('Input.dispatchKeyEvent',{type:'keyDown',key:'Enter',code:'Enter',text:'\r',unmodifiedText:'\r',windowsVirtualKeyCode:13});await p.send('Input.dispatchKeyEvent',{type:'keyUp',key:'Enter',code:'Enter',windowsVirtualKeyCode:13});
    ok('Enter abre el menú',await p.ev('document.querySelector("[data-std-menu]").getAttribute("aria-expanded")==="true"'));
    await p.send('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});
    ok('Escape cierra y devuelve el foco',await p.ev('document.activeElement.matches("[data-std-menu]") && document.activeElement.getAttribute("aria-expanded")==="false"'));
    await p.ev('document.querySelector("[data-std-menu]").click();document.querySelector(".std-subnav__accion").focus()');
    ok('foco exterior cierra',await p.ev('!document.querySelector(".std-gnav").classList.contains("is-abierta")'));
    await p.ev('document.querySelector("[data-std-menu]").click()');await medidas(p,901,700);
    await p.hasta('document.querySelector("[data-std-menu]").getAttribute("aria-expanded")==="false"');
    ok('giro cierra el menú',true);
    await p.ev('scrollTo(0,document.querySelector("#historia").offsetTop)');await p.hasta('document.querySelector(".std-subnav").classList.contains("is-oscura")');
    ok('subnav oscura en historia',true);
    await p.ev('scrollTo(0,0)');await p.hasta('!document.querySelector(".std-subnav").classList.contains("is-oscura")');
    ok('subnav clara al inicio',true);
  });
  for(const [nombre,patron] of [['menú bloqueado','*lib/estandar/menu.js'],['nube bloqueada','*lib/estandar/nube.js']]) await caso(nombre,'',async p=>{
    await medidas(p,390,844);await p.send('Network.setBlockedURLs',{urls:[patron]});await p.ir('/index.html');
    if(nombre.startsWith('menú')) ok(nombre,await p.ev(visible('.std-gnav__enlaces'))&&!await p.ev(visible('.std-gnav__menu')));
    else ok(nombre,await p.ev(visible('.std-nube__respaldo'))&&await p.ev(visible('.std-historia__fijas')));
  },['net::ERR_BLOCKED_BY_CLIENT']);
  await caso('sin JavaScript','',async p=>{
    await medidas(p,390,844);await p.send('Emulation.setScriptExecutionDisabled',{value:true});await p.ir('/index.html');
    ok('sin JS: navegación, imagen, historia y contenido',await p.ev(`${visible('.std-gnav__enlaces')} && ${visible('.std-nube__respaldo--sin-js')} && ${visible('.std-historia__fijas')} && document.querySelector('h1').textContent.length>0`));
  });
  await caso('reduced-motion','',async p=>{
    await reducir(p);await p.ir('/index.html');await dormir(500);
    ok('sin lienzos y respaldo visible',await p.ev('!document.querySelector(".std-nube-lienzo") && !document.querySelector("[data-std-campo] canvas")')&&await p.ev(visible('.std-nube__respaldo')));
    await p.ev('document.querySelector("video").scrollIntoView()');await dormir(300);
    ok('video mantiene poster sin autoplay',await p.ev('document.querySelector("video").paused && document.querySelector("video").readyState===0 && document.querySelector("[data-video-boton]").dataset.accion==="reproducir"'));
  });
  await caso('sin WebGL',`const get=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(t,...a){return t==='webgl2'?null:get.call(this,t,...a)}`,async p=>{
    await p.ir('/index.html');await p.hasta('document.querySelector("[data-std-nube=hero]").dataset.estado==="fijo"');
    ok('WebGL ausente: texto e imágenes',await p.ev(visible('.std-nube__respaldo'))&&await p.ev(visible('.std-historia__fijas')));
  });
  for(const modo of ['worker-rechazado','sin-offscreen']) await caso(modo,modo==='worker-rechazado'?`window.Worker=class{constructor(){throw Error('Worker rechazado por prueba')}}`:'window.OffscreenCanvas=undefined;',async p=>{
    await p.ir('/index.html');await listo(p);ok(`${modo}: muestreo alternativo termina`,await p.ev('__mccoNube.state.webgl && __mccoNube.state.points===26000'));
  });
  await caso('contexto perdido durante muestreo',`
    const get=HTMLCanvasElement.prototype.getContext;window.__gl=[];window.__perdida=false;
    HTMLCanvasElement.prototype.getContext=function(t,...a){const g=get.call(this,t,...a);if(t==='webgl2'&&g)__gl.push(g);return g};
    const W=Worker;window.Worker=class extends W{postMessage(...a){super.postMessage(...a);if(!__perdida){__perdida=true;__gl.forEach(g=>g.getExtension('WEBGL_lose_context').loseContext())}}};`,async p=>{
    await p.ir('/index.html');await p.hasta('window.__perdida && document.querySelector("[data-std-nube=hero]").dataset.estado==="fijo"');await dormir(400);
    ok('muestreo cancelado sin revivir ni ocultar respaldo',await p.ev('!__mccoNube.state.webgl && !document.querySelector(".std-nube-lienzo")')&&await p.ev(visible('.std-nube__respaldo')));
  });
  await caso('imagen caída',`window.Worker=class{constructor(){throw Error('respaldo')}};const f=fetch;window.fetch=(src,...a)=>String(src).endsWith('/forma.png')?Promise.resolve(new Response('',{status:404})):f(src,...a);`,async p=>{
    await p.ir('/index.html');await p.hasta('document.querySelector("[data-std-nube=hero]").dataset.estado==="fijo"');
    ok('muestreo fallido conserva imagen DOM y contenido',await p.ev(visible('.std-nube__respaldo'))&&await p.ev('document.querySelector(".std-nube__respaldo").naturalWidth>0'));
  });
  await caso('activo de historia caído','',async p=>{
    await p.ir('/historia-activo-caido.html');await listo(p);
    await p.hasta('document.querySelector("img[src*=forma-ausente]").complete && document.querySelector("img[src*=forma-ausente]").naturalWidth===0');
    ok('segundo activo caído conserva historia y texto alternativo',await p.ev(visible('.std-historia__fijas'))&&await p.ev('[...document.querySelectorAll("[data-std-forma]")].every(i=>i.alt.length>0) && document.querySelectorAll("[data-std-paso]").length===2'));
  },['404']);
  await caso('pausa compartida','',async p=>{
    await p.ir('/index.html');await listo(p);
    await p.ev('document.querySelector("[data-std-pausa]").click()');await dormir(200);
    const frames=await p.ev('__mccoNube.state.frames');await dormir(250);
    ok('un clic detiene nube y campo',await p.ev(`__mccoNube.state.paused && __mccoNube.state.frames===${frames} && !__mccoCampo.state.running`));
    ok('dos botones sincronizados sin aria-pressed',await p.ev('[...document.querySelectorAll("[data-std-pausa]")].every(b=>b.textContent==="Reanudar movimiento"&&!b.hasAttribute("aria-pressed"))'));
    await p.ev(`(async()=>{const api=await import('/estandar/lib/estandar/pausa.js');if(!api.pausado())throw Error('singleton duplicado');api.fijarPausa(false)})()`);
    await p.hasta(`__mccoNube.state.frames>${frames}`);ok('API pública comparte instancia con ambos runtimes',true);
    await p.ev('document.querySelectorAll("[data-std-pausa]")[1].click()');await dormir(150);
    ok('botón historia pausa también el campo',await p.ev('__mccoNube.state.paused && !__mccoCampo.state.running'));
    await p.ev(`(async()=>{(await import('/estandar/lib/estandar/pausa.js')).fijarPausa(false);document.querySelector('#pie').scrollIntoView()})()`);await dormir(400);
    const fuera=await p.ev('__mccoNube.state.frames');await dormir(200);
    ok('fuera de pantalla no dibuja',await p.ev(`__mccoNube.state.frames===${fuera} && !__mccoCampo.state.running`));
    await p.ev('scrollTo(0,0)');await listo(p);
    await p.ev('Object.defineProperty(document,"hidden",{configurable:true,get:()=>true});document.dispatchEvent(new Event("visibilitychange"))');await dormir(150);
    const oculta=await p.ev('__mccoNube.state.frames');await dormir(200);
    ok('pestaña oculta detiene ambos runtimes',await p.ev(`__mccoNube.state.frames===${oculta} && !__mccoCampo.state.running`));
  });
  for(const [ruta,nube] of [['nube-sola',true],['campo-solo',false]]) await caso(ruta,'',async p=>{
    await p.ir(`/${ruta}.html`);await p.hasta(nube?'window.__mccoNube?.state.frames>2':'window.__mccoCampo?.state.puntos>0');
    await p.ev('document.querySelector("[data-std-pausa]").click()');await dormir(200);
    ok(`${ruta}: pausa sin la otra pieza`,await p.ev(nube?'__mccoNube.state.paused && !window.__mccoCampo':'!__mccoCampo.state.running && !window.__mccoNube'));
  });
  await caso('video Save-Data',`Object.defineProperty(navigator,'connection',{value:{saveData:true}})`,async p=>{
    await p.ir('/index.html');await p.ev('document.querySelector("video").scrollIntoView()');await dormir(300);
    ok('Save-Data no descarga video',await p.ev('document.querySelector("video").paused && document.querySelector("video").readyState===0')&&!p.red.some(r=>r.url?.endsWith('.mp4')));
    await p.ev('document.querySelector("[data-video-boton]").click()');await p.hasta('!document.querySelector("video").paused && document.querySelector("video").currentTime>0');
    ok('video se reproduce a pedido',true);
    await p.ev('document.querySelector("[data-video-boton]").click()');ok('control pausa video',await p.ev('document.querySelector("video").paused'));
  });
  for(const [w,h] of [[390,844],[844,390],[901,700],[1366,650]]) await caso(`runtime ${w}x${h}`,'',async p=>{
    await medidas(p,w,h);await p.ir('/index.html');await listo(p);
    ok(`presupuesto puntos ${w}x${h}`,await p.ev(`__mccoNube.state.points===${w>=901&&h>=700?26000:11000} && __mccoCampo.state.puntos===${w>=901&&h>=700?5184:2841}`));
    // En móvil el visual puede estar a la vista: el runtime espera antes de cambiarlo.
    await p.ev('document.querySelector("#pie").scrollIntoView()');
    await p.hasta('document.querySelector("[data-std-historia]").dataset.estado==="nube"');
    await p.ev('scrollTo(0,0)');await dormir(200);
    if(w<901||h<700) ok(`historia en flujo ${w}x${h}`,await p.ev('!document.querySelector("[data-std-historia]").hasAttribute("data-std-fija")'));
    const f=await p.ev('__mccoNube.state.frames'), t=Date.now();await dormir(1100);
    const fps=(await p.ev('__mccoNube.state.frames')-f)*1000/(Date.now()-t);
    resultados.push({nombre:`FPS ${w}x${h}`,ok:true,pendientePC:fps< (w>=901&&h>=700?50:24),fps});console.log(`MEDICIÓN FPS ${w}x${h}: ${fps.toFixed(1)} (repetir en PC con GPU)`);
    await p.ev(`document.querySelectorAll('h1,h2,h3,p,li,button,a').forEach(e=>e.style.fontSize=parseFloat(getComputedStyle(e).fontSize)*2+'px')`);await dormir(250);
    ok(`texto 200% ${w}x${h}: historia fluye y contenido visible`,await p.ev('!document.querySelector("[data-std-historia]").hasAttribute("data-std-fija") && document.querySelector("h1").getBoundingClientRect().height>0'));
    await p.captura(path.join(salida,`texto-200-${w}-${h}.png`));
  });
} finally {
  await browser?.cerrar();await comparador?.cerrar();
  fs.writeFileSync(path.join(salida,'resultados.json'),JSON.stringify(resultados,null,2)+'\n');
}
console.log(`${resultados.filter(r=>r.ok).length}/${resultados.length} comprobaciones; evidencia: ${salida}`);
process.exitCode=resultados.some(r=>!r.ok)?1:0;
