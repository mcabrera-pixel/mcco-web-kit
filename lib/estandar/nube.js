// Nube antigravity del estándar: un solo lienzo fijo a pantalla completa, con WebGL2 propio (sin Three.js). Los puntos
// suben desde abajo y arman el primer activo bajo el título ([data-std-nube="hero"], NubeAncla). Al bajar, la nube
// acompaña el scroll hasta la historia en negro ([data-std-historia], HistoriaNube), que queda fija mientras se
// recorre, y ahí pasa por los demás activos mientras se enciende su paso. Porta scripts/scene.js y motion.js de la
// prueba aprobada: los shaders, el traslado con media opacidad en tránsito y la línea de tiempo (historia.js).
// Arranca después de la carga, en tiempo ocioso y con un ancla a la vista. Se pausa con la pausa común (pausa.js: los
// botones [data-std-pausa] y el evento std-pausa en window), con la pestaña oculta y fuera de pantalla. Sin WebGL2,
// con el contexto perdido, con un activo que no carga o con movimiento reducido quedan las imágenes fijas: el
// respaldo del hero (data-estado="fijo") y las ilustraciones de la historia, que pasa a la nube (data-estado="nube")
// solo con todas sus formas listas. window.__mccoNube.state deja ver el estado para verificar.
import { movimientoReducido, alArrancar, colorDe } from '../visual/comun.js';
import { morphDesdeProgreso, pasoActivo, progresoSeccion, trasladoNube } from './historia.js';
import { pausado, marcarMovimiento } from './pausa.js';
import { crearClienteNube } from './nube-cliente.js';

// Posiciones en unidades de la forma (caja de 12 × 6, y hacia arriba). uFrom y uTo: centro en píxeles de la ventana y
// escala en píxeles por unidad de cada ancla. uRes reemplaza la cámara ortográfica de la prueba.
const VS = `#version 300 es
layout(location=0) in vec3 aP0;
layout(location=1) in vec3 aP1;
layout(location=2) in vec3 aP2;
layout(location=3) in vec3 aP3;
layout(location=4) in float aSeed;
layout(location=5) in float aLum;
uniform float uMorph, uTime, uDpr, uForce, uTravel, uYaw, uGlow, uAssemble, uLight;
uniform vec2 uMouse, uRes;
uniform vec3 uFrom, uTo;
out float vAlpha, vSeed, vScan;
vec2 rot(vec2 v, float a) { float c = cos(a), s = sin(a); return vec2(c * v.x - s * v.y, s * v.x + c * v.y); }
void main() {
  float m = uMorph;
  vec3 p = mix(aP0, aP1, smoothstep(0., 1., m));
  p = mix(p, aP2, smoothstep(1., 2., m));
  p = mix(p, aP3, smoothstep(2., 3., m));
  // En cada cambio de forma los puntos se abren y giran un poco, y vuelven al llegar.
  float w = max(max(sin(clamp(m, 0., 1.) * 3.14159), sin(clamp(m - 1., 0., 1.) * 3.14159)), sin(clamp(m - 2., 0., 1.) * 3.14159));
  p.xy = rot(p.xy, w * (aSeed - .5) * 1.1);
  p.xy *= 1. + w * (.06 + aSeed * .32);
  p.z += w * (aSeed - .5) * 1.8;
  // Antigravedad: cada punto sube desde abajo con su propio retardo y arma la forma.
  float t = clamp((uAssemble - aSeed * .5) / .5, 0., 1.);
  float e = 1. - pow(1. - t, 3.);
  p = mix(p + vec3(sin(aSeed * 91.) * 4., -5.5 - aSeed * 4., cos(aSeed * 37.) * 2.), p, e);
  p.y += sin(uTime * .65 + aSeed * 6.283) * .018;
  p.x += cos(uTime * .4 + aSeed * 4.) * .011;
  float yaw = uYaw + sin(uTime * .17) * .08;
  p.x = p.x * cos(yaw) + p.z * sin(yaw);
  // Barrido de luz y chispas. El cuadrado va escrito: pow() con base negativa no está definido en GLSL.
  float sweep = (p.x - mod(uTime * 1.1, 16.) + 8.) * 1.7;
  float spark = step(.965, aSeed) * pow(.5 + .5 * sin(uTime * 2.2 + aSeed * 97.), 10.);
  float scan = max(exp(-sweep * sweep) * .55, spark) * e;
  float k = uTravel * uTravel * (3. - 2. * uTravel);
  vec2 s = mix(uFrom.xy + vec2(p.x, -p.y) * uFrom.z, uTo.xy + vec2(p.x, -p.y) * uTo.z, k);
  vec2 delta = s - uMouse;
  float force = exp(-dot(delta, delta) / 4200.) * uForce;
  s += normalize(delta + vec2(.001)) * force * 38.;
  gl_Position = vec4(s.x / uRes.x * 2. - 1., 1. - s.y / uRes.y * 2., 0., 1.);
  gl_PointSize = (1.05 + aSeed * .95 + force * .7 + scan * .8) * uDpr * clamp(mix(uFrom.z, uTo.z, k) / 80., .75, 1.3) * (1. + uGlow * .7);
  // En el traslado la nube baja a media opacidad para no tapar lo que cruza.
  vAlpha = (((.26 + aLum * .62) * mix(.8, 1., 1. - uLight) + force * .25) * e + scan * .25) * (1. - .5 * sin(3.14159 * k));
  vSeed = aSeed;
  vScan = scan;
}`;
const FS = `#version 300 es
precision mediump float;
uniform vec3 uInk, uHighlight, uSpark;
uniform highp float uGlow; // misma precisión que en el vertex shader, si no el enlace falla
in float vAlpha, vSeed, vScan;
out vec4 color;
void main() {
  float d = length(gl_PointCoord - .5);
  if (d > .5) discard;
  float crisp = 1. - smoothstep(.2, .5, d);
  float glow = max(1. - smoothstep(.1, .3, d), (1. - smoothstep(0., .5, d)) * .5);
  float a = clamp(mix(crisp, glow, uGlow) * vAlpha, 0., 1.);
  vec3 c = mix(mix(uInk, uHighlight, step(.72, vSeed)), uSpark, clamp(vScan, 0., 1.));
  color = vec4(c * a, a);
}`;
const UNIFORMES = ['uMorph', 'uTime', 'uDpr', 'uAssemble', 'uMouse', 'uForce', 'uFrom', 'uTo', 'uTravel', 'uInk',
  'uHighlight', 'uSpark', 'uYaw', 'uGlow', 'uLight', 'uRes'];
const rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
const mezclar = (par, k) => par[0].map((v, i) => v + (par[1][i] - v) * k);
const ocioso = () => new Promise((r) => (window.requestIdleCallback || setTimeout)(r, { timeout: 2000 }));

const hero = document.querySelector('[data-std-nube="hero"]');
const historia = document.querySelector('[data-std-historia]');
const anclaHistoria = historia?.querySelector('[data-std-nube="historia"]');
const conHistoria = Boolean(anclaHistoria);
// Lo que cambia al pasar de las ilustraciones fijas a la nube empieza aquí: el título y la bajada quedan donde estaban.
const visualHistoria = historia?.querySelector('[data-std-visual]') ?? anclaHistoria?.parentElement;
const pasos = conHistoria ? [...historia.querySelectorAll('[data-std-paso]')] : [];
// El botón de pausa de la historia se ve solo con la nube en la historia. Su texto y su clic son de pausa.js.
const botones = conHistoria ? [...historia.querySelectorAll('[data-std-pausa]')] : [];
// Las formas son las ilustraciones de la historia (hasta cuatro) o, sin historia, el respaldo del hero.
const fuentes = (conHistoria ? [...historia.querySelectorAll('img[data-std-forma]')] : [hero?.querySelector('img')])
  .filter(Boolean).slice(0, 4).map((img) => new URL(img.getAttribute('src'), document.baseURI).href);
const reducido = movimientoReducido();
// Se lee una sola vez y después solo en su evento change: Chrome no avisa el cambio a una lista cuyo .matches se leyó
// entre el cambio y el aviso, y la nube lo consultaría en cada cuadro.
let quieto = reducido.matches;
// El mismo corte de HistoriaNube.astro. Con 901 px de ancho y 700 de alto o más, la historia queda fija mientras se
// recorre y la nube usa el presupuesto de computador (26 000 puntos, DPR 1,65, sin tope de cuadros). En las demás
// ventanas (celulares, celulares girados, laptops bajas) la historia no se fija, porque no cabría, y la nube usa el de
// celular (11 000 puntos, DPR 1,35, 30 cuadros por segundo).
const escritorio = matchMedia('(min-width: 901px) and (min-height: 700px)');
// Chrome y Firefox corrigen solos el scroll cuando cambia el alto de algo que está arriba de la ventana; Safari no.
const anclaje = typeof CSS !== 'undefined' && CSS.supports('overflow-anchor', 'auto');

let lienzo, gl, programa, vao, buffers = [], u = {}, paleta;
let arrancado = false, listo = false, apagada = false, historiaLista = false, esperandoHistoria = false;
let puntos = 0, anchoMuestra = 720;
let raf = 0, ultimo = 0, tiempo = 0, frames = 0, dibujado = false, visible = false;
let traslado = hero ? 0 : 1, morph = 0, ensamble = 0, pausa = pausado(), paso = -1;
let fuerza = 0, fuerzaVel = 0, fuerzaMeta = 0, giro = 0, giroMeta = 0;
let ancho = 1, alto = 1, origenX = 0, origenY = 0, dpr = 1, dentro = false, escritorioAntes = escritorio.matches;
const raton = [-1e4, -1e4], ratonMeta = [-1e4, -1e4];
const desde = new Float32Array(3), hasta = new Float32Array(3);

window.__mccoNube = {
  get state() {
    return { frames, visible, host: traslado < 0.5 ? 'hero' : 'historia', morph, travel: traslado, assemble: ensamble,
      paused: pausa, points: gl ? puntos : 0, webgl: Boolean(gl) && !apagada };
  },
};

// ── Imágenes fijas ───────────────────────────────────────────────────────────────────────────
function cambiarHistoria(modo) {
  if (historia.dataset.estado === modo) return;
  const antes = historia.getBoundingClientRect();
  historia.dataset.estado = modo;
  for (const b of botones) b.hidden = modo !== 'nube';
  // Con la historia ya pasada, lo que se ve no salta aunque ella cambie de alto.
  if (!anclaje && antes.bottom <= 0) scrollBy(0, historia.getBoundingClientRect().height - antes.height);
  else volverAHistoria(antes.top <= 0 && antes.bottom >= innerHeight);
}
// La historia dejó de quedar fija con la ventana adentro (al girar una tableta, achicar la ventana, pedir movimiento
// reducido o perder la nube): con el mismo scroll la página quedaría varias pantallas más abajo, así que se vuelve a
// su inicio.
function volverAHistoria(estabaDentro) {
  if (estabaDentro && historia.getBoundingClientRect().bottom < innerHeight / 2) historia.scrollIntoView();
  dentro = false;
}
// Con todas las formas listas, las ilustraciones fijas pasan a la nube solo si nadie las está mirando: el cambio mueve
// lo que está bajo la bajada. Se espera a que esa parte quede fuera de la ventana, por abajo, o a que la historia entera
// quede arriba, donde el anclaje del scroll (o cambiarHistoria en Safari) deja quieto lo que se ve. Se vuelve a probar
// en cada scroll y resize.
function intentarHistoria() {
  if (!esperandoHistoria) return;
  if (apagada || gl.isContextLost()) { esperandoHistoria = false; fijo(); return; }
  if (visualHistoria.getBoundingClientRect().top < innerHeight && historia.getBoundingClientRect().bottom > 0) return;
  esperandoHistoria = false;
  historiaLista = true;
  paso = -1;
  if (!quieto) cambiarHistoria('nube');
  despertar();
}
// Sin WebGL2, con el contexto perdido o sin el primer activo: imágenes fijas en el hero y en la historia.
function fijo() {
  apagada = true;
  esperandoHistoria = false;
  cerrarWorker();
  detener();
  lienzo?.remove();
  hero?.setAttribute('data-estado', 'fijo');
  marcarMovimiento(hero?.closest('.std-hero'), 'nube', false);
  if (conHistoria) cambiarHistoria('fijo');
}

// ── Muestreo: en el Worker si hay OffscreenCanvas; si no, o si el Worker falla, en el hilo principal por tramos ──
const { forma: muestrearForma, cerrarWorker } = crearClienteNube(globalThis.Worker);
async function forma(i) {
  const pedido = { src: fuentes[i], ancho: anchoMuestra, puntos, semilla: 9001 + i * 7919 };
  return muestrearForma(pedido);
}

// ── WebGL2 ──────────────────────────────────────────────────────────────────────────────────
// Con KHR_parallel_shader_compile el enlace ocurre fuera del hilo principal y solo se consulta al terminar.
async function enlazar() {
  const sombreador = (tipo, src) => { const s = gl.createShader(tipo); gl.shaderSource(s, src); gl.compileShader(s); return s; };
  const p = gl.createProgram();
  gl.attachShader(p, sombreador(gl.VERTEX_SHADER, VS));
  gl.attachShader(p, sombreador(gl.FRAGMENT_SHADER, FS));
  gl.linkProgram(p);
  const paralelo = gl.getExtension('KHR_parallel_shader_compile');
  if (paralelo) while (!gl.getProgramParameter(p, paralelo.COMPLETION_STATUS_KHR)) await new Promise((r) => setTimeout(r, 16));
  return gl.getProgramParameter(p, gl.LINK_STATUS) ? p : null;
}
function subir(i, datos) {
  gl.bindBuffer(gl.ARRAY_BUFFER, buffers[i]);
  gl.bufferData(gl.ARRAY_BUFFER, datos, gl.STATIC_DRAW);
}
// Los cuatro atributos de posición apuntan a las formas listas; los que sobran repiten la última.
function apuntar(listas) {
  gl.bindVertexArray(vao);
  for (let i = 0; i < 4; i++) {
    gl.bindBuffer(gl.ARRAY_BUFFER, buffers[Math.min(i, listas - 1)]);
    gl.enableVertexAttribArray(i);
    gl.vertexAttribPointer(i, 3, gl.FLOAT, false, 0, 0);
  }
}
function atributo(lugar, datos) {
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, datos, gl.STATIC_DRAW);
  gl.enableVertexAttribArray(lugar);
  gl.vertexAttribPointer(lugar, 1, gl.FLOAT, false, 0, 0);
}
// Colores del sitio: sobre blanco, tinta y botón; sobre negro, crema y la variante clara; la chispa, foco y crema.
function leerPaleta() {
  const raiz = document.documentElement;
  paleta = {
    tinta: [rgb('#3a3a3c'), rgb('#e9d6c6')],
    realce: [colorDe(raiz, '--accion-boton', '#0071e3'), colorDe(raiz, '--accion-oscuro', '#2997ff')],
    chispa: [colorDe(raiz, '--accion-foco', '#0071e3'), rgb('#fff1de')],
  };
}

function redimensionar() {
  const r = lienzo.getBoundingClientRect();
  if (!r.width || !r.height) return;
  ancho = r.width; alto = r.height; origenX = r.left; origenY = r.top;
  dpr = Math.min(devicePixelRatio || 1, escritorio.matches ? 1.65 : 1.35);
  const w = Math.round(ancho * dpr), h = Math.round(alto * dpr);
  // El búfer de dibujo sigue al tamaño del lienzo en la pantalla: los puntos nunca se estiran.
  if (lienzo.width !== w || lienzo.height !== h) { lienzo.width = w; lienzo.height = h; dibujado = false; }
  gl.viewport(0, 0, w, h);
  // El evento resize llega antes que los cuadros: `dentro` todavía es del último cuadro con la historia fija.
  if (historiaLista && escritorioAntes && !escritorio.matches) volverAHistoria(dentro);
  escritorioAntes = escritorio.matches;
  intentarHistoria();
  despertar();
}

// ── Anclas, traslado e historia ─────────────────────────────────────────────────────────────
// Centro y escala de un ancla en la ventana: la forma cabe en 12,8 × 6,7 unidades. Devuelve si está a la vista.
function ancla(el, destino) {
  const r = el.getBoundingClientRect();
  destino[0] = r.left - origenX + r.width / 2;
  destino[1] = r.top - origenY + r.height / 2;
  destino[2] = Math.min(r.width / 12.8, r.height / 6.7);
  return r.bottom > origenY && r.top < origenY + alto;
}
function centroHistoria(y) {
  const r = anclaHistoria.getBoundingClientRect();
  return r.top + r.height / 2 + y;
}
// Fin del traslado: arriba de la ventana la historia fija o, sin fijar, el centro de la nube al medio de la ventana.
function metaTraslado(vh, y) {
  if (!hero) return 1;
  if (!historiaLista) return 0;
  return trasladoNube(y, vh, escritorio.matches ? historia.getBoundingClientRect().top + y : centroHistoria(y) - vh / 2);
}
// Sin fijar (celulares y ventanas bajas), el cambio ocurre mientras el centro de la nube pasa del 70 % al 5 % de la
// ventana.
function progreso(vh, y) {
  if (escritorio.matches) {
    const r = historia.getBoundingClientRect();
    dentro = r.top <= 0 && r.bottom >= vh;
    return progresoSeccion(y, r.top + y, r.height, vh);
  }
  dentro = false;
  return progresoSeccion(y, centroHistoria(y) - 0.7 * vh, 1.65 * vh, vh);
}
function marcarPaso(i) {
  if (i === paso) return;
  paso = i;
  pasos.forEach((el, j) => el.classList.toggle('is-activo', j === i));
}
function actualizar(dt) {
  const vh = innerHeight, y = scrollY, meta = metaTraslado(vh, y);
  traslado = pausa || !dt ? meta : traslado + (meta - traslado) * (1 - Math.exp(-dt / 0.12));
  if (Math.abs(meta - traslado) < 5e-4) traslado = meta;
  const enHero = hero ? ancla(hero, desde) : false;
  const enHistoria = historiaLista ? ancla(anclaHistoria, hasta) : false;
  if (!hero) desde.set(hasta);
  if (!historiaLista) hasta.set(desde);
  if (historiaLista) {
    const formas = fuentes.length, metaMorph = morphDesdeProgreso(progreso(vh, y), formas);
    // Suavizado como el scrub de la prueba: llega al 95 % en 0,65 s (0,3 s sin fijar). En pausa la forma no cambia.
    if (!pausa) {
      morph = !dt ? metaMorph : morph + (metaMorph - morph) * (1 - Math.exp((-3 * dt) / (escritorio.matches ? 0.65 : 0.3)));
      if (Math.abs(metaMorph - morph) < 1e-4) morph = metaMorph;
    }
    marcarPaso(pasoActivo(pausa ? metaMorph : morph, formas));
  }
  return traslado === 0 ? enHero : traslado === 1 ? enHistoria : true;
}

// ── Cuadros ─────────────────────────────────────────────────────────────────────────────────
function dibujar() {
  const k = traslado * traslado * (3 - 2 * traslado);
  gl.clearColor(0, 0, 0, 0);
  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.useProgram(programa);
  gl.bindVertexArray(vao);
  gl.enable(gl.BLEND);
  // Colores premultiplicados: mezcla normal sobre blanco y aditiva (brillo) sobre negro.
  gl.blendFunc(gl.ONE, k > 0.5 ? gl.ONE : gl.ONE_MINUS_SRC_ALPHA);
  gl.uniform1f(u.uMorph, morph);
  gl.uniform1f(u.uTime, tiempo);
  gl.uniform1f(u.uDpr, dpr);
  gl.uniform1f(u.uAssemble, ensamble);
  gl.uniform2f(u.uMouse, raton[0], raton[1]);
  gl.uniform1f(u.uForce, fuerza);
  gl.uniform3fv(u.uFrom, desde);
  gl.uniform3fv(u.uTo, hasta);
  gl.uniform1f(u.uTravel, traslado);
  gl.uniform3fv(u.uInk, mezclar(paleta.tinta, k));
  gl.uniform3fv(u.uHighlight, mezclar(paleta.realce, k));
  gl.uniform3fv(u.uSpark, mezclar(paleta.chispa, k));
  gl.uniform1f(u.uYaw, giro);
  gl.uniform1f(u.uGlow, k);
  gl.uniform1f(u.uLight, 1 - k);
  gl.uniform2f(u.uRes, ancho, alto);
  gl.drawArrays(gl.POINTS, 0, puntos);
}
function cuadro(ahora) {
  raf = 0;
  if (apagada || document.hidden || quieto) return;
  // Con el presupuesto de celular, 30 cuadros por segundo como tope.
  if (dibujado && ahora - ultimo < (escritorio.matches ? 15 : 32)) { raf = requestAnimationFrame(cuadro); return; }
  const dt = ultimo ? Math.min((ahora - ultimo) / 1000, 0.05) : 0;
  ultimo = ahora;
  if (!pausa) {
    tiempo += dt;
    ensamble = Math.min(1, ensamble + dt / 2.6);
    const kr = 1 - Math.exp(-dt * 13.4);
    raton[0] += (ratonMeta[0] - raton[0]) * kr;
    raton[1] += (ratonMeta[1] - raton[1]) * kr;
    // Resorte amortiguado: al salir el cursor hay retorno suave y un leve rebote.
    fuerzaVel += ((fuerzaMeta - fuerza) * 95 - fuerzaVel * 13) * dt;
    fuerza += fuerzaVel * dt;
    giro += (giroMeta - giro) * (1 - Math.exp(-dt * 3.7));
  } else ensamble = 1;
  visible = actualizar(dt);
  if (visible) { dibujar(); frames++; dibujado = true; }
  else if (dibujado) { gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT); dibujado = false; }
  if (visible && !pausa) raf = requestAnimationFrame(cuadro);
  else ultimo = 0;
}
function despertar() {
  if (!raf && listo && !apagada && !document.hidden && !quieto) raf = requestAnimationFrame(cuadro);
}
function detener() {
  cancelAnimationFrame(raf);
  raf = 0;
  ultimo = 0;
}
// Se escucha desde que carga el módulo: una pausa pedida antes del arranque (con el botón del hero) también vale.
addEventListener('std-pausa', (e) => {
  pausa = e.detail.pausa;
  if (pausa) fuerza = fuerzaVel = fuerzaMeta = 0;
  despertar();
});

// ── Arranque ────────────────────────────────────────────────────────────────────────────────
async function iniciar() {
  lienzo = document.createElement('canvas');
  gl = lienzo.getContext('webgl2', { alpha: true, antialias: false, depth: false, stencil: false, premultipliedAlpha: true, powerPreference: 'low-power' });
  if (!gl) return fijo();
  // Se escucha desde el primer momento: una pérdida mientras se enlaza o se muestrea también deja las imágenes fijas.
  lienzo.addEventListener('webglcontextlost', (e) => { e.preventDefault(); fijo(); });
  // Después de cada espera: si el contexto se perdió mientras tanto, aunque su evento no haya llegado, imágenes fijas.
  const perdido = () => apagada || gl.isContextLost();
  programa = await enlazar();
  if (perdido() || !programa) return fijo();
  puntos = escritorio.matches ? 26000 : 11000;
  anchoMuestra = escritorio.matches ? 720 : 480;
  const primera = await forma(0);
  if (perdido()) return fijo();
  for (const n of UNIFORMES) u[n] = gl.getUniformLocation(programa, n);
  vao = gl.createVertexArray();
  buffers = fuentes.map(() => gl.createBuffer());
  subir(0, primera.pos);
  apuntar(1);
  const semillas = new Float32Array(puntos);
  for (let i = 0, s = 4242; i < puntos; i++) semillas[i] = (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296;
  atributo(4, semillas);
  atributo(5, primera.lum);
  leerPaleta();

  lienzo.className = 'std-nube-lienzo';
  lienzo.setAttribute('aria-hidden', 'true');
  lienzo.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;display:block;pointer-events:none;z-index:2';
  document.body.append(lienzo);
  hero?.setAttribute('data-estado', 'nube');
  // El hero muestra su botón de pausa mientras la nube se mueva en él (data-std-movimiento, pausa.js).
  marcarMovimiento(hero?.closest('.std-hero'), 'nube', true);
  // Al cambiar el tamaño o la orientación, el lienzo se redimensiona y las anclas y la historia se vuelven a medir.
  new ResizeObserver(redimensionar).observe(lienzo);
  if (conHistoria) new ResizeObserver(() => despertar()).observe(historia);
  addEventListener('resize', redimensionar, { passive: true });
  addEventListener('scroll', () => { intentarHistoria(); despertar(); }, { passive: true });
  addEventListener('pointermove', (e) => {
    if (e.pointerType === 'touch' || pausa) return;
    ratonMeta[0] = e.clientX - origenX;
    ratonMeta[1] = e.clientY - origenY;
    if (raton[0] === -1e4) { raton[0] = ratonMeta[0]; raton[1] = ratonMeta[1]; }
    fuerzaMeta = 1;
    giroMeta = (e.clientX / innerWidth - 0.5) * 0.5;
    despertar();
  }, { passive: true });
  document.documentElement.addEventListener('pointerleave', () => { fuerzaMeta = 0; giroMeta = 0; });
  addEventListener('pointerdown', (e) => { if (e.pointerType !== 'touch' && !pausa) fuerzaVel = 9; }, { passive: true });
  document.addEventListener('visibilitychange', () => (document.hidden ? detener() : despertar()));
  listo = true;
  redimensionar();

  // Sin historia, la del hero es la única forma.
  if (!conHistoria) { cerrarWorker(); return; }
  // Las demás formas, en tiempo ocioso: la historia pasa a la nube cuando están todas (intentarHistoria).
  let resto;
  try {
    await ocioso();
    resto = await Promise.all(fuentes.slice(1).map((_, j) => forma(j + 1)));
  } catch {
    // Sin hero no queda dónde mostrar la nube. Con hero, la nube se queda arriba y la historia, con sus imágenes.
    if (perdido() || !hero) fijo();
    return;
  } finally {
    cerrarWorker();
  }
  if (perdido()) return fijo();
  resto.forEach((f, j) => subir(j + 1, f.pos));
  apuntar(fuentes.length);
  esperandoHistoria = true;
  intentarHistoria();
}
function arrancar() {
  if (arrancado || quieto) return;
  arrancado = true;
  iniciar().catch(() => fijo());
}
// Solo con un ancla cerca de la vista: una página abierta más abajo no hace trabajo de GPU hasta que se llega a ella.
function vigilar() {
  const io = new IntersectionObserver((entradas) => {
    if (!entradas.some((e) => e.isIntersecting)) return;
    io.disconnect();
    arrancar();
  }, { rootMargin: '0px 0px 50% 0px' });
  for (const el of [hero, conHistoria && historia]) if (el) io.observe(el);
}

// Movimiento reducido: la nube se borra y quedan las imágenes fijas; si se vuelve a permitir, la nube sigue.
function alCambiarMovimiento(e) {
  quieto = e.matches;
  if (quieto) {
    detener();
    if (dibujado && !apagada) { gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT); dibujado = false; }
    if (historiaLista && !apagada) cambiarHistoria('fijo');
  } else if (!arrancado) alArrancar(vigilar);
  else if (!apagada) {
    if (historiaLista) cambiarHistoria('nube');
    dibujado = false;
    despertar();
  }
}

if (fuentes.length) {
  reducido.addEventListener('change', alCambiarMovimiento);
  if (!quieto) alArrancar(vigilar);
}
