// Campo antigravity del hero: guiones cortos en anillos concéntricos alrededor de un centro que persigue al mouse,
// orientados hacia afuera y con el color según el ángulo (los tonos de la marca y un neutro). Porta scripts/campo.js de
// la prueba aprobada con WebGL2 propio (sin Three.js). El lienzo vive dentro del hero ([data-std-campo],
// CampoAntigravity), detrás del texto, que queda despejado: en la caja que ocupa el texto del hero (H1, bajada y
// acciones) no se dibuja ningún guion y el campo se desvanece suave en su borde. La caja se rehace al cambiar el tamaño,
// al cargar una fuente y cuando el contenido cambia de alto; sin ese texto, el campo ocupa todo. Usa coordenadas del
// hero, así el campo sube con la página como cualquier otra parte del hero y nada reacciona al scroll. Sobre la nube
// ([data-std-nube="hero"]) los guiones bajan a un tercio con un borde elíptico difuso, y el borde inferior del hero se
// difumina.
// Arranca después de la carga, en tiempo ocioso, y dibuja solo con el hero a la vista. Se pausa con la pausa común
// (pausa.js, evento std-pausa) y con la pestaña oculta; mientras existe, marca el hero con data-std-movimiento para que
// se vea su botón de pausa. Con movimiento reducido no se crea; sin WebGL2 o con el contexto perdido no queda nada,
// porque es decorativo. window.__mccoCampo.state deja ver el estado para verificar.
import { movimientoReducido, alArrancar, colorDe, enlazar, observarDpr } from '../visual/comun.js';
import { parametrosCampo, anillos, seguir } from './campo-anillos.js';
import { pausado, marcarMovimiento } from './pausa.js';

// Un punto por guion: su posición sale del anillo (k), el ángulo y la semilla. uRes (ancho y alto del hero en píxeles
// CSS) reemplaza la cámara ortográfica de la prueba. Los colores llegan lineales, se mezclan así, como en Three, y
// salen en sRGB. Los comentarios van fuera del GLSL, porque el build de Astro lo envía tal cual. Por línea de main():
// los anillos respiran y giran muy despacio, en sentidos alternos; el borde inferior del hero se difumina (70 px), para
// que el campo no termine en una línea recta; sobre la nube los guiones bajan a un tercio, con un borde elíptico difuso
// (sin recuadro), y sobre el texto (uTexto, su caja) no hay ninguno: alfa 0 hasta 8 px fuera de la caja, más que medio
// guion (hasta unos 5 px de lado a lado del centro), así ninguno vecino pinta dentro, y una rampa suave hasta 56 px.
const VS = `#version 300 es
layout(location=0) in vec3 aPolar;
uniform vec2 uCentro, uRes, uAnillo, uOpacidad, uLargo, uAncho;
uniform float uTiempo, uDpr, uAlfa, uGiro;
uniform vec3 uBanda, uC0, uC1, uC2, uC3;
uniform vec4 uNube, uTexto;
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
  al *= smoothstep(8., 56., length(max(max(uTexto.xy - p, p - uTexto.zw), 0.)));
  float largo = mix(uLargo.x, uLargo.y, banda) * (.85 + semilla * .3);
  float lado = largo + 2.;
  gl_Position = vec4(p.x / uRes.x * 2. - 1., 1. - p.y / uRes.y * 2., 0., 1.);
  gl_PointSize = lado * uDpr;
  vLargo = largo / lado;
  vAncho = mix(uAncho.x, uAncho.y, banda) / lado;
  vDir = dir;
  vAlfa = al * uAlfa;
  vColor = srgb(mix(uC3, conico(atan(dir.y, dir.x)), banda * .85 + .15));
}`;
// El guion es una cápsula orientada hacia afuera dentro del punto, con el borde suavizado. Colores premultiplicados.
const FS = `#version 300 es
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
}`;
const lineal = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const NEUTRO = [0x48 / 255, 0x48 / 255, 0x4a / 255];

const host = document.querySelector('[data-std-campo]');
// El hero es la sección de HeroEstandar aunque la capa no sea su hija directa; fuera de él, el contenedor de la capa.
const hero = host?.closest('.std-hero') ?? host?.parentElement;
const reducido = movimientoReducido();
// Se lee una sola vez y después solo en su evento change: Chrome no avisa el cambio a una lista cuyo .matches se leyó
// entre el cambio y el aviso (ver nube.js).
let quieto = reducido.matches;
// El corte del sistema visual (nube.js, HistoriaNube): con 901 × 700 o más, anillos y presupuesto de computador (DPR
// 1,65); en las demás ventanas, los de celular (DPR 1,35 y 30 cuadros por segundo).
const escritorio = matchMedia('(min-width: 901px) and (min-height: 700px)');

let dejarDpr;
let lienzo, gl, programa, vao, buffer, u = {}, p, movil;
let observadorTamano, observadorVista, ancla;
let arrancado = false, vigilando = false, listo = false, apagado = false, visible = false, dibujado = false;
let raf = 0, ultimo = 0, tiempo = 0, alfa = 0, puntos = 0, ancho = 0, alto = 0, dpr = 1, pausa = pausado();
let objetivo = [0, 0], guia = [0, 0], centro = [0, 0], cursor = null, textos;
const nube = new Float32Array([-1e4, -1e4, -1e4, -1e4]), texto = nube.slice();
// Todos los oyentes del campo se quitan juntos al apagarlo. Ninguno cancela su evento, salvo el de la pérdida de
// contexto, así que los demás van pasivos.
const corte = new AbortController(), { signal } = corte, oye = { passive: true, signal };

// ── WebGL2 ──────────────────────────────────────────────────────────────────────────────────
// Los anillos y sus valores fijos salen del corte: se rehacen si la ventana lo cruza (al girar una tableta, por ejemplo).
function construir() {
  movil = !escritorio.matches;
  p = parametrosCampo(movil);
  const datos = anillos(p, 777);
  puntos = datos.length / 3;
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, datos, gl.STATIC_DRAW);
  gl.uniform2f(u.uAnillo, p.r0, p.dr);
  gl.uniform3fv(u.uBanda, p.banda);
  gl.uniform2fv(u.uOpacidad, p.alfa);
  gl.uniform2fv(u.uLargo, p.largo);
  gl.uniform2fv(u.uAncho, p.ancho);
  gl.uniform1f(u.uGiro, p.giro);
}
// Tonos del sitio (theme.css): el del botón y los dos del campo, más el neutro del estándar.
function leerPaleta() {
  const tonos = [colorDe(host, '--accion-boton', '#0071e3'), colorDe(host, '--campo-claro', '#2997ff'),
    colorDe(host, '--campo-oscuro', '#0066cc'), NEUTRO];
  tonos.forEach((t, i) => gl.uniform3fv(u[`uC${i}`], t.map(lineal)));
}

// El lienzo sigue al tamaño del hero: el búfer de dibujo se rehace (los guiones nunca se estiran) y la nube y el texto
// se vuelven a medir en coordenadas del hero. La caja del texto es la unión de lo que ocupa el contenido del H1, de la
// bajada y de las acciones (un Range: sus líneas y sus píldoras), no la de sus bloques, que van de lado a lado; sin
// texto queda invertida y lejos (±1e4), y el shader no despeja nada.
function redimensionar() {
  if (apagado) return;
  const z = host.getBoundingClientRect();
  if (!z.width || !z.height) return;
  if (movil !== !escritorio.matches) construir();
  ancho = z.width; alto = z.height;
  dpr = Math.min(devicePixelRatio || 1, movil ? 1.35 : 1.65);
  const w = Math.round(ancho * dpr), h = Math.round(alto * dpr);
  if (lienzo.width !== w || lienzo.height !== h) { lienzo.width = w; lienzo.height = h; dibujado = false; }
  gl.viewport(0, 0, w, h);
  if (ancla) {
    const n = ancla.getBoundingClientRect();
    nube.set([n.left - z.left, n.top - z.top, n.right - z.left, n.bottom - z.top]);
  }
  const rango = new Range();
  let a = 1e4, b = 1e4, c = -1e4, d = -1e4;
  for (const e of textos) {
    rango.selectNodeContents(e);
    const r = rango.getBoundingClientRect();
    if (r.width) { a = Math.min(a, r.left); b = Math.min(b, r.top); c = Math.max(c, r.right); d = Math.max(d, r.bottom); }
  }
  texto.set([a - z.left, b - z.top, c - z.left, d - z.top]);
  despertar();
}

// ── Cuadros ─────────────────────────────────────────────────────────────────────────────────
// Sin cursor (celular o antes de moverlo) el centro pasea despacio por el hero.
const paseo = (t) => [ancho * (0.5 + 0.2 * Math.sin(0.07 * t)), alto * (0.56 + 0.12 * Math.sin(0.1 * t + 1.3))];
function dibujar() {
  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.uniform2f(u.uCentro, centro[0], centro[1]);
  gl.uniform2f(u.uRes, ancho, alto);
  gl.uniform1f(u.uTiempo, tiempo);
  gl.uniform1f(u.uDpr, dpr);
  gl.uniform1f(u.uAlfa, alfa);
  gl.uniform4fv(u.uNube, nube);
  gl.uniform4fv(u.uTexto, texto);
  gl.drawArrays(gl.POINTS, 0, puntos);
}
function cuadro(ahora) {
  raf = 0;
  if (apagado || document.hidden || quieto || !visible || !ancho) return;
  // Con el presupuesto de celular, 30 cuadros por segundo como tope.
  if (dibujado && ahora - ultimo < (movil ? 32 : 15)) { raf = requestAnimationFrame(cuadro); return; }
  const dt = ultimo ? Math.min((ahora - ultimo) / 1000, 0.05) : 0;
  ultimo = ahora;
  if (!pausa) {
    tiempo += dt;
    if (!cursor) objetivo = paseo(tiempo);
    // El centro persigue a un guía que persigue al mouse: llega con unos 1,4 s de retraso y sin tirones.
    guia = seguir(guia, objetivo, dt, p.tau);
    centro = seguir(centro, guia, dt, p.tau);
    alfa = Math.min(1, alfa + dt / 1.6);
  } else alfa = 1; // en pausa el campo queda completo y quieto
  dibujar();
  dibujado = true;
  if (!pausa) raf = requestAnimationFrame(cuadro);
  else ultimo = 0;
}
function despertar() {
  if (!raf && listo && !apagado && visible && !document.hidden && !quieto) raf = requestAnimationFrame(cuadro);
}
function detener() {
  cancelAnimationFrame(raf);
  raf = 0;
  ultimo = 0;
}
// Sin WebGL2 o con el contexto perdido el hero queda con su texto sobre blanco.
function apagar() {
  if (apagado) return;
  apagado = true;
  detener();
  dejarDpr?.();
  observadorTamano?.disconnect();
  observadorVista?.disconnect();
  corte.abort();
  lienzo?.remove();
  // Como la nube, una pérdida involuntaria queda en respaldo y nunca intenta restaurarse.
  if (gl && !gl.isContextLost()) {
    // Los delete* de WebGL aceptan null: lo que no llegó a crearse se salta solo.
    gl.deleteBuffer(buffer);
    gl.deleteVertexArray(vao);
    gl.useProgram(null);
    gl.deleteProgram(programa);
    gl.getExtension('WEBGL_lose_context')?.loseContext();
  }
  u = {}; buffer = vao = programa = gl = lienzo = null;
  host.dataset.estado = 'apagado';
  marcarMovimiento(hero, 'campo', false);
}

// ── Arranque ────────────────────────────────────────────────────────────────────────────────
async function iniciar() {
  lienzo = document.createElement('canvas');
  // Con alfa premultiplicada y sin stencil, que son los valores por defecto de WebGL.
  gl = lienzo.getContext('webgl2', { antialias: false, depth: false, powerPreference: 'low-power' });
  if (!gl) return apagar();
  // Se escucha desde el primer momento: una pérdida mientras se enlaza también apaga el campo.
  lienzo.addEventListener('webglcontextlost', alPerderContexto, { signal });
  const enlazado = await enlazar(gl, VS, FS, () => apagado);
  if (apagado) return;
  programa = enlazado;
  if (gl.isContextLost() || !programa) return apagar();
  // Las ubicaciones de todos los uniformes del programa, por nombre (todos se usan; ninguno es un arreglo).
  for (let i = gl.getProgramParameter(programa, gl.ACTIVE_UNIFORMS); i--;) {
    const { name } = gl.getActiveUniform(programa, i);
    u[name] = gl.getUniformLocation(programa, name);
  }
  vao = gl.createVertexArray();
  buffer = gl.createBuffer();
  gl.bindVertexArray(vao);
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
  // Un solo programa, VAO y mezcla (colores premultiplicados) en todo el contexto: se fijan una vez. El color de borrado
  // es el transparente por defecto.
  gl.useProgram(programa);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
  ancla = hero.querySelector('[data-std-nube="hero"]');
  textos = hero.querySelectorAll('h1,.std-hero__bajada,.std-acciones');
  construir();
  leerPaleta();
  lienzo.setAttribute('aria-hidden', 'true');
  lienzo.style.cssText = 'display:block;width:100%;height:100%';
  host.append(lienzo);
  host.dataset.estado = 'activo';
  marcarMovimiento(hero, 'campo', true);
  listo = true;
  redimensionar();
  objetivo = [ancho / 2, alto * 0.56];
  guia = [...objetivo];
  centro = [...objetivo];
  // Al cambiar el tamaño u orientación de la ventana, el alto del hero, el de la nube o el de un texto (también al
  // cargar una fuente), el lienzo se redimensiona y la nube y el texto se vuelven a medir.
  observadorTamano = new ResizeObserver(redimensionar);
  [host, ancla, ...textos].forEach((e) => e && observadorTamano.observe(e));
  document.fonts?.addEventListener('loadingdone', redimensionar, oye);
  addEventListener('resize', redimensionar, oye);
  dejarDpr = observarDpr(redimensionar);
  addEventListener('pointermove', alMover, oye);
  document.documentElement.addEventListener('pointerleave', alSalir, oye);
  document.addEventListener('visibilitychange', alCambiarVisibilidad, oye);
}
function alPerderContexto(e) { e.preventDefault(); apagar(); }
function alMover(e) {
  // Safari puede mandar un evento sin desplazamiento después de un scroll.
  if (e.pointerType === 'touch' || (cursor && e.clientX === cursor[0] && e.clientY === cursor[1])) return;
  cursor = [e.clientX, e.clientY];
  const z = host.getBoundingClientRect();
  objetivo = [e.clientX - z.left, e.clientY - z.top];
  if (!pausa) despertar();
}
function alSalir() { cursor = null; }
function alCambiarVisibilidad() { document.hidden ? detener() : despertar(); }
function alPausar(e) { pausa = e.detail.pausa; despertar(); }
function arrancar() {
  if (arrancado || quieto || apagado) return;
  arrancado = true;
  iniciar().catch(() => apagar());
}
// Un solo observador decide el arranque (el hero a la vista) y si se dibuja: fuera de pantalla no gasta GPU.
function vigilar() {
  if (vigilando || apagado) return;
  vigilando = true;
  observadorVista = new IntersectionObserver((entradas) => {
    if (apagado) return;
    visible = entradas[entradas.length - 1].isIntersecting;
    if (!visible) detener();
    else if (!arrancado) arrancar();
    else despertar();
  });
  observadorVista.observe(host);
}

// Movimiento reducido: el CSS esconde la capa y el campo se detiene; si se vuelve a permitir, sigue (o arranca).
function alCambiarMovimiento(e) {
  quieto = e.matches;
  if (quieto) detener();
  else if (!vigilando) alArrancar(vigilar);
  else if (!arrancado) { if (visible) arrancar(); }
  else despertar();
}

if (host) {
  window.__mccoCampo = {
    get state() {
      return { puntos: listo && !apagado ? puntos : 0, center: centro.map(Math.round), visible, running: Boolean(raf), size: [ancho, alto] };
    },
  };
  // Al pausar, el cuadro pendiente dibuja el campo completo y ya no pide otro (como el ensamble de la nube).
  addEventListener('std-pausa', alPausar, oye);
  reducido.addEventListener('change', alCambiarMovimiento, oye);
  if (!quieto) alArrancar(vigilar);
}
