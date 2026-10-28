import{a as te,c as k}from"./chunks/chunk-HUFLIRKM.js";import{a as Q,c as V,d as P,e as Z,f as ee}from"./chunks/chunk-YKE6NFK2.js";function oe(e){return{r0:46,dr:e?24:28,paso:e?26:30,rmax:e?760:1180,banda:e?[110,280,500]:[150,400,680],alfa:[.13,.85],largo:[2,7],ancho:[2,2.4],giro:.012,tau:.7}}function ae(e,o){let n=[];for(let d=0;e.r0+e.dr*d<e.rmax;d++)n.push(Math.max(6,Math.floor(2*Math.PI*(e.r0+e.dr*d)/e.paso)));let l=new Float32Array(3*n.reduce((d,I)=>d+I,0)),s=o>>>0,S=0,q=()=>(s=s*1664525+1013904223>>>0)/4294967296;return n.forEach((d,I)=>{let he=q()*Math.PI*2;for(let U=0;U<d;U++)l[S++]=I,l[S++]=he+(U+(q()-.5)*.5)/d*Math.PI*2,l[S++]=q()}),l}function Y(e,o,n,l){let s=1-Math.exp(-n/l);return[e[0]+(o[0]-e[0])*s,e[1]+(o[1]-e[1])*s]}var ge=`#version 300 es
layout(location=0) in vec3 aPolar;
uniform vec2 uCentro, uRes, uAnillo, uOpacidad, uLargo, uAncho;
uniform float uTiempo, uDpr, uAlfa, uGiro;
uniform vec3 uBanda, uC0, uC1, uC2, uC3;
uniform vec4 uNube;
out float vAlfa, vLargo, vAncho;
out vec2 vDir;
out vec3 vColor;
vec3 conico(float a) {
float t = fract(a / 6.28318 + 1.) * 4.;
vec3 c = mix(uC0, uC1, smoothstep(0., 1., t));
c = mix(c, uC2, smoothstep(1., 2., t));
c = mix(c, uC3, smoothstep(2., 3., t));
return mix(c, uC0, smoothstep(3., 4., t));
}
vec3 srgb(vec3 c) { return mix(pow(c, vec3(.41666)) * 1.055 - .055, c * 12.92, vec3(lessThanEqual(c, vec3(.0031308)))); }
void main() {
float k = aPolar.x, semilla = aPolar.z;
float r = uAnillo.x + k * uAnillo.y + sin(uTiempo * .32 - k * .42) * 4. + (semilla - .5) * 7.;
float a = aPolar.y + (mod(k, 2.) < .5 ? 1. : -1.) * uTiempo * uGiro * (1. + semilla * .25);
vec2 dir = vec2(cos(a), sin(a));
vec2 p = uCentro + dir * r;
float banda = smoothstep(uBanda.x * .55, uBanda.x, r) * (1. - smoothstep(uBanda.y, uBanda.z, r));
float al = mix(uOpacidad.x, uOpacidad.y, banda) * (.7 + semilla * .3);
al *= 1. - smoothstep(uRes.y - 70., uRes.y - 6., p.y);
vec2 c = (uNube.xy + uNube.zw) * .5, h = max((uNube.zw - uNube.xy) * .5, vec2(1.));
al *= mix(.32, 1., smoothstep(.7, 1.12, length((p - c) / h)));
float largo = mix(uLargo.x, uLargo.y, banda) * (.85 + semilla * .3);
float lado = largo + 2.;
gl_Position = vec4(p.x / uRes.x * 2. - 1., 1. - p.y / uRes.y * 2., 0., 1.);
gl_PointSize = lado * uDpr;
vLargo = largo / lado;
vAncho = mix(uAncho.x, uAncho.y, banda) / lado;
vDir = dir;
vAlfa = al * uAlfa;
vColor = srgb(mix(uC3, conico(atan(dir.y, dir.x)), banda * .85 + .15));
}`,xe=`#version 300 es
precision mediump float;
in float vAlfa, vLargo, vAncho;
in vec2 vDir;
in vec3 vColor;
out vec4 color;
void main() {
if (vAlfa < .01) discard;
vec2 q = gl_PointCoord - .5;
vec2 d = vec2(dot(q, vDir), dot(q, vec2(-vDir.y, vDir.x)));
float x = max(abs(d.x) - (vLargo - vAncho) * .5, 0.);
float a = 1. - smoothstep(-.03, .03, length(vec2(x, d.y)) - vAncho * .5);
if (a <= 0.) discard;
a *= vAlfa;
color = vec4(vColor * a, a);
}`,be=["uCentro","uRes","uAnillo","uOpacidad","uLargo","uAncho","uTiempo","uDpr","uAlfa","uGiro","uBanda","uC0","uC1","uC2","uC3","uNube"],Ae=e=>e<=.04045?e/12.92:((e+.055)/1.055)**2.4,Ce=[72/255,72/255,74/255],i=document.querySelector("[data-std-campo]"),_=i?.closest(".std-hero")??i?.parentElement,$=Q(),A=$.matches,ne=matchMedia("(min-width: 901px) and (min-height: 700px)"),re,r,t,f,g,x,a={},u,w,B,G,z=!1,j=!1,J=!1,c=!1,C=!1,X=!1,m=0,p=0,W=0,M=0,K=0,v=0,y=0,F=1,O=te(),b=[0,0],D=[0,0],E=[0,0],h=null,ie=new Float32Array([-1e4,-1e4,-1e4,-1e4]);function ue(){w=!ne.matches,u=oe(w);let e=ae(u,777);K=e.length/3,t.bindBuffer(t.ARRAY_BUFFER,x),t.bufferData(t.ARRAY_BUFFER,e,t.STATIC_DRAW),t.useProgram(f),t.uniform2f(a.uAnillo,u.r0,u.dr),t.uniform3fv(a.uBanda,u.banda),t.uniform2fv(a.uOpacidad,u.alfa),t.uniform2fv(a.uLargo,u.largo),t.uniform2fv(a.uAncho,u.ancho),t.uniform1f(a.uGiro,u.giro)}function ye(){let e=[P(i,"--accion-boton","#0071e3"),P(i,"--campo-claro","#2997ff"),P(i,"--campo-oscuro","#0066cc"),Ce];t.useProgram(f),e.forEach((o,n)=>t.uniform3fv(a[`uC${n}`],o.map(Ae)))}function R(){if(c)return;let e=i.getBoundingClientRect();if(!e.width||!e.height)return;w!==!ne.matches&&ue(),v=e.width,y=e.height,F=Math.min(devicePixelRatio||1,w?1.35:1.65);let o=Math.round(v*F),n=Math.round(y*F);(r.width!==o||r.height!==n)&&(r.width=o,r.height=n,X=!1),t.viewport(0,0,o,n);let l=_.querySelector('[data-std-nube="hero"]');if(l){let s=l.getBoundingClientRect();ie.set([s.left-e.left,s.top-e.top,s.right-e.left,s.bottom-e.top])}L()}var Ee=e=>[v*(.5+.2*Math.sin(.07*e)),y*(.56+.12*Math.sin(.1*e+1.3))];function Le(){t.clearColor(0,0,0,0),t.clear(t.COLOR_BUFFER_BIT),t.useProgram(f),t.bindVertexArray(g),t.enable(t.BLEND),t.blendFunc(t.ONE,t.ONE_MINUS_SRC_ALPHA),t.uniform2f(a.uCentro,E[0],E[1]),t.uniform2f(a.uRes,v,y),t.uniform1f(a.uTiempo,W),t.uniform1f(a.uDpr,F),t.uniform1f(a.uAlfa,M),t.uniform4fv(a.uNube,ie),t.drawArrays(t.POINTS,0,K)}function H(e){if(m=0,c||document.hidden||A||!C||!v)return;if(X&&e-p<(w?32:15)){m=requestAnimationFrame(H);return}let o=p?Math.min((e-p)/1e3,.05):0;p=e,O?M=1:(W+=o,h||(b=Ee(W)),D=Y(D,b,o,u.tau),E=Y(E,D,o,u.tau),M=Math.min(1,M+o/1.6)),Le(),X=!0,O?p=0:m=requestAnimationFrame(H)}function L(){!m&&J&&!c&&C&&!document.hidden&&!A&&(m=requestAnimationFrame(H))}function N(){cancelAnimationFrame(m),m=0,p=0}function T(){c||(c=!0,N(),re?.(),B?.disconnect(),G?.disconnect(),removeEventListener("resize",R),removeEventListener("pointermove",se),removeEventListener("std-pausa",de),document.documentElement.removeEventListener("pointerleave",le),document.removeEventListener("visibilitychange",fe),$.removeEventListener("change",pe),r?.removeEventListener("webglcontextlost",ce),r?.remove(),t&&!t.isContextLost()&&(x&&t.deleteBuffer(x),g&&t.deleteVertexArray(g),f&&(t.useProgram(null),t.deleteProgram(f)),t.getExtension("WEBGL_lose_context")?.loseContext()),a={},x=g=f=t=r=null,i.dataset.estado="apagado",k(_,"campo",!1))}async function Re(){if(r=document.createElement("canvas"),t=r.getContext("webgl2",{alpha:!0,antialias:!1,depth:!1,stencil:!1,premultipliedAlpha:!0,powerPreference:"low-power"}),!t)return T();r.addEventListener("webglcontextlost",ce);let e=await ee(t,ge,xe,()=>c);if(c)return;if(f=e,t.isContextLost()||!f)return T();for(let n of be)a[n]=t.getUniformLocation(f,n);g=t.createVertexArray(),x=t.createBuffer(),t.bindVertexArray(g),t.bindBuffer(t.ARRAY_BUFFER,x),t.enableVertexAttribArray(0),t.vertexAttribPointer(0,3,t.FLOAT,!1,0,0),ue(),ye(),r.setAttribute("aria-hidden","true"),r.style.cssText="display:block;width:100%;height:100%",i.append(r),i.dataset.estado="activo",k(_,"campo",!0),J=!0,R(),b=[v/2,y*.56],D=[...b],E=[...b],B=new ResizeObserver(R),B.observe(i);let o=_.querySelector('[data-std-nube="hero"]');o&&B.observe(o),addEventListener("resize",R,{passive:!0}),re=Z(R),addEventListener("pointermove",se,{passive:!0}),document.documentElement.addEventListener("pointerleave",le),document.addEventListener("visibilitychange",fe)}function ce(e){e.preventDefault(),T()}function se(e){if(e.pointerType==="touch"||h&&e.clientX===h[0]&&e.clientY===h[1])return;h=[e.clientX,e.clientY];let o=i.getBoundingClientRect();b=[e.clientX-o.left,e.clientY-o.top],O||L()}function le(){h=null}function fe(){document.hidden?N():L()}function de(e){O=e.detail.pausa,L()}function me(){z||A||c||(z=!0,Re().catch(()=>T()))}function ve(){j||c||(j=!0,G=new IntersectionObserver(e=>{c||(C=e[e.length-1].isIntersecting,C?z?L():me():N())}),G.observe(i))}function pe(e){A=e.matches,A?N():j?z?L():C&&me():V(ve)}i&&(window.__mccoCampo={get state(){return{puntos:J&&!c?K:0,center:E.map(Math.round),visible:C,running:!!m,size:[v,y]}}},addEventListener("std-pausa",de),$.addEventListener("change",pe),A||V(ve));
