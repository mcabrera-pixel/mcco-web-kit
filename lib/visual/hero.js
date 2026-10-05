// Hero de partículas: WebGL2 propio, un solo shader de puntos, sin Three.js.
// Generaliza el renderizador de as-built.cl (28-sep-2026): los puntos se muestrean por brillo desde imágenes
// del sitio (silueta o nube sobre fondo negro); no son coordenadas de un levantamiento.
// Colores: por defecto salen de los tokens del sitio (--mcco-color-text y --mcco-color-accent).
import { movimientoReducido, alArrancar, colorDe } from './comun.js';

const ASSEMBLE = 2, LEAVE = .8;

const VS = `#version 300 es
layout(location=0) in vec3 aPos;
layout(location=1) in vec4 aColor;
uniform vec2 uRes, uMouse, uRot;
uniform vec3 uInk, uAccent;
uniform float uScale, uReveal, uLeave, uStrength, uPulse, uMotion, uTime, uScan, uSize, uRadius, uTheme, uAlpha;
out vec4 vColor; out float vBand;
float hash(float n){ return fract(sin(n * 12.9898) * 43758.5453); }
void main(){
  float seed = hash(float(gl_VertexID) + .5);
  vec3 p = aPos * vec3(1., 1., .32);
  // Ensamblado: cada punto sube desde abajo con un retardo propio.
  float t = clamp((uReveal - seed * .45) / .55, 0., 1.);
  float e = 1. - pow(1. - t, 3.);
  vec3 from = vec3(sin(seed * 91.) * .35, -1.1 - seed * .7, cos(seed * 37.) * .4);
  p = mix(p + from, p, e);
  // Salida: la nube se desarma hacia arriba antes del siguiente activo.
  float l = uLeave * uLeave;
  p += vec3(sin(seed * 53.) * .45, .5 + seed * 1.2, cos(seed * 17.) * .3) * l;
  // Giro leve con el cursor; la profundidad viene del brillo.
  float cy = cos(uRot.x), sy = sin(uRot.x), cx = cos(uRot.y), sx = sin(uRot.y);
  p = vec3(p.x * cy + p.z * sy, p.y, -p.x * sy + p.z * cy);
  p = vec3(p.x, p.y * cx - p.z * sx, p.y * sx + p.z * cx);
  vec2 px = p.xy * uScale;
  vec2 d = px - uMouse;
  float force = exp(-dot(d, d) / (uRadius * uRadius)) * uStrength * uMotion;
  px += normalize(d + vec2(.001)) * force * (34. + uPulse * 40.);
  px += vec2(sin(uTime * .7 + seed * 31.), cos(uTime * .6 + seed * 41.)) * force * 5.;
  // Barrido de luz como el haz del escáner.
  vBand = exp(-pow((aPos.x - uScan) * 9., 2.)) * uMotion;
  float lum = dot(aColor.rgb, vec3(.2126, .7152, .0722));
  // Tema: tinta del sitio y acento en las zonas más claras de la imagen. Imagen: colores propios del archivo.
  vec3 themed = mix(uInk, uAccent, smoothstep(.45, .9, lum) * .85);
  vec3 c = mix(aColor.rgb, themed, uTheme);
  vColor = vec4(c, aColor.a * e * (1. - l) * uAlpha);
  gl_Position = vec4(px / (uRes * .5), 0., 1.);
  gl_PointSize = uSize * (1. + force * .3 + vBand * .5);
}`;
const FS = `#version 300 es
precision mediump float;
in vec4 vColor; in float vBand;
uniform highp vec3 uAccent; // misma precisión que en el vertex shader, si no el enlace falla
out vec4 color;
void main(){
  float edge = 1. - smoothstep(.3, .5, length(gl_PointCoord - .5));
  vec3 c = mix(vColor.rgb, uAccent, min(1., vBand * .9));
  float a = min(1., vColor.a * edge * (1. + vBand * .8));
  color = vec4(c * a, a);
}`;

function iniciar(root) {
  const canvas = root.querySelector('canvas');
  const marco = root.querySelector('[data-hero-marco]');
  const fijo = root.querySelector('[data-hero-fijo]');
  const pausa = root.querySelector('[data-hero-pausa]');
  const pista = root.querySelector('[data-hero-pista]');
  const botones = [...root.querySelectorAll('[data-hero-activo]')];
  const activos = JSON.parse(root.dataset.activos || '[]');
  const ciclo = Math.max(4, Number(root.dataset.intervalo) || 8);
  const [densEscritorio, densMovil] = (root.dataset.densidad || '90000,30000').split(',').map(Number);
  const modoTema = root.dataset.colores !== 'imagen';
  const reduced = movimientoReducido();
  if (!canvas || !activos.length) return;

  function mostrarFijo() {
    if (fijo) fijo.hidden = false;
    canvas.hidden = true;
    if (pausa) pausa.hidden = true;
    botones.forEach((b) => { b.closest('[data-hero-selector]').hidden = true; });
    if (pista) pista.textContent = '';
    root.dataset.estado = 'fijo';
  }

  let gl;
  const boot = () => {
    gl = canvas.getContext('webgl2', { alpha: true, antialias: false, premultipliedAlpha: true, powerPreference: 'low-power' });
    if (gl) start().catch(mostrarFijo); else mostrarFijo();
  };
  // Tampoco arranca mientras el lienzo está fuera de pantalla (en móvil queda bajo el texto).
  alArrancar(() => {
    const visto = new IntersectionObserver((entries) => {
      if (!entries.some((e) => e.isIntersecting)) return;
      visto.disconnect(); (window.requestIdleCallback || setTimeout)(boot, { timeout: 1500 });
    }, { threshold: .25 });
    visto.observe(canvas);
  });

  async function start() {
    const mobile = matchMedia('(max-width: 760px)').matches;
    const target = mobile ? densMovil : densEscritorio;
    const dpr = Math.min(devicePixelRatio || 1, mobile ? 1.25 : 1.75);
    const program = await link(VS, FS);
    if (!program) { mostrarFijo(); return; }
    const u = {};
    for (const n of ['uRes', 'uMouse', 'uRot', 'uInk', 'uAccent', 'uScale', 'uReveal', 'uLeave', 'uStrength', 'uPulse', 'uMotion', 'uTime', 'uScan', 'uSize', 'uRadius', 'uTheme', 'uAlpha']) u[n] = gl.getUniformLocation(program, n);
    const vao = gl.createVertexArray();
    const buffer = gl.createBuffer();
    let count = 0, aspect = .5625;
    let tinta = [0, 0, 0], acento = [1, .5, .2], alfa = 1;
    const leerColores = () => {
      tinta = colorDe(root, '--mcco-color-text', '#1a1a1a'); acento = colorDe(root, '--mcco-color-accent', '#b8542a');
      // Sobre fondo claro los puntos oscuros se acumulan y empastan: se bajan de opacidad.
      const [r, g, b] = colorDe(root, '--mcco-color-bg', '#ffffff');
      alfa = modoTema && r * .2126 + g * .7152 + b * .0722 > .5 ? .62 : 1;
    };
    leerColores();
    // Si el sitio cambia de tema (clase o data-theme en <html>), la nube toma los colores nuevos.
    new MutationObserver(() => { leerColores(); draw(); }).observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'data-theme', 'style'] });

    const cache = new Map();
    let activo = 0, pendiente = null;
    let paused = reduced.matches, visible = true, raf = 0, last = 0, time = 0;
    let phase = 'wait', phaseTime = 0, reveal = 0, leave = 0, pulse = 0, scan = -1.4;
    let strength = 0, targetStrength = 0, touchTimer;
    const mouse = [1e4, 1e4], mouseTarget = [1e4, 1e4], rot = [0, 0], rotTarget = [0, 0];
    let width = 1, height = 1, scale = 1, frames = 0, fpsStamp = 0;

    // Con KHR_parallel_shader_compile el enlace ocurre fuera del hilo principal y solo se consulta al terminar.
    async function link(v, f) {
      const make = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return s; };
      const p = gl.createProgram();
      gl.attachShader(p, make(gl.VERTEX_SHADER, v)); gl.attachShader(p, make(gl.FRAGMENT_SHADER, f)); gl.linkProgram(p);
      const parallel = gl.getExtension('KHR_parallel_shader_compile');
      if (parallel) while (!gl.getProgramParameter(p, parallel.COMPLETION_STATUS_KHR)) await new Promise((r) => setTimeout(r, 16));
      return gl.getProgramParameter(p, gl.LINK_STATUS) ? p : null;
    }

    // Decodifica la imagen fuera del hilo principal; las SVG (siluetas) pasan por <img>.
    async function decodificar(src) {
      const res = await fetch(src);
      if (!res.ok) throw new Error(res.status);
      const blob = await res.blob();
      if (!/svg/.test(blob.type)) return createImageBitmap(blob);
      const img = new Image(); img.src = URL.createObjectURL(blob); await img.decode();
      return createImageBitmap(img, { resizeWidth: 960, resizeHeight: Math.round(960 * (img.naturalHeight || 540) / (img.naturalWidth || 960)) });
    }

    // Densidad según brillo: más puntos donde la imagen tiene estructura clara.
    function sample(i) {
      if (cache.has(i)) return cache.get(i);
      const { src, invertir } = activos[i];
      const task = (async () => {
        const source = await decodificar(src);
        const w = mobile ? 520 : 960, h = Math.round(w * source.height / source.width);
        const read = async (rw, rh) => {
          const bitmap = await createImageBitmap(source, { resizeWidth: rw, resizeHeight: rh, resizeQuality: 'high' });
          const c = document.createElement('canvas'); c.width = rw; c.height = rh;
          const ctx = c.getContext('2d', { willReadFrequently: true });
          ctx.drawImage(bitmap, 0, 0); bitmap.close();
          const d = ctx.getImageData(0, 0, rw, rh).data;
          // Silueta oscura sobre fondo claro: se invierte para muestrear igual que una nube sobre negro.
          if (invertir) for (let k = 0; k < d.length; k += 4) { d[k] = 255 - d[k]; d[k + 1] = 255 - d[k + 1]; d[k + 2] = 255 - d[k + 2]; }
          return d;
        };
        const px = await read(w, h);
        // Brillo a baja resolución para la profundidad: superficies continuas, no ruido por píxel.
        const sw = 60, sh = Math.round(60 * h / w);
        const sp = await read(sw, sh);
        source.close?.();
        const lum = new Float32Array(w * h), weight = new Float32Array(w * h);
        let total = 0;
        // El recorrido se parte en tramos para no bloquear el hilo principal.
        const respiro = () => new Promise((r) => setTimeout(r));
        // Imágenes oscuras: el brillo se normaliza al percentil 98.
        const histogram = new Uint32Array(256);
        for (let k = 0; k < w * h; k++) histogram[(px[k * 4] * .2126 + px[k * 4 + 1] * .7152 + px[k * 4 + 2] * .0722) | 0]++;
        let lit = 0, acc = 0, p98 = 255;
        for (let v = 8; v < 256; v++) lit += histogram[v];
        for (let v = 255; v >= 8; v--) { acc += histogram[v]; if (acc >= lit * .02) { p98 = v; break; } }
        const gain = Math.min(2.6, Math.max(1, 200 / Math.max(p98, 1)));
        for (let k = 0; k < w * h; k++) {
          if ((k & 65535) === 65535) await respiro();
          const l = Math.min(1, (px[k * 4] * .2126 + px[k * 4 + 1] * .7152 + px[k * 4 + 2] * .0722) / 255 * gain);
          lum[k] = l;
          const s = Math.min(1, Math.max(0, (l - .07) / .55));
          weight[k] = s * s * (3 - 2 * s);
          total += weight[k];
        }
        const factor = target / Math.max(total, 1);
        let seed = 1234567;
        const rand = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;
        const pos = new Int16Array(target * 3 + 3), col = new Uint8Array(target * 4 + 4);
        let n = 0;
        for (let y = 0; y < h && n < target; y++) {
          if ((y & 63) === 63) await respiro();
          for (let x = 0; x < w && n < target; x++) {
            const k = y * w + x;
            if (rand() >= weight[k] * factor) continue;
            const nx = ((x + rand()) / w) * 2 - 1, ny = (1 - (y + rand()) / h) * 2 - 1;
            const si = (Math.min(sh - 1, (y / h * sh) | 0) * sw + Math.min(sw - 1, (x / w * sw) | 0)) * 4;
            const smooth = Math.min(1, (sp[si] * .2126 + sp[si + 1] * .7152 + sp[si + 2] * .0722) / 255 * gain);
            const z = Math.max(-1, Math.min(1, (smooth - .22) * 2.6 + (lum[k] - smooth) * .6 + (rand() - .5) * .08));
            pos[n * 3] = nx * 32767; pos[n * 3 + 1] = ny * (h / w) * 32767; pos[n * 3 + 2] = z * 32767;
            const boost = 1.15 * gain;
            col[n * 4] = Math.min(255, px[k * 4] * boost); col[n * 4 + 1] = Math.min(255, px[k * 4 + 1] * boost); col[n * 4 + 2] = Math.min(255, px[k * 4 + 2] * boost);
            col[n * 4 + 3] = Math.min(255, 90 + lum[k] * 330);
            n++;
          }
        }
        return { pos: pos.subarray(0, n * 3), col: col.subarray(0, n * 4), count: n, aspect: h / w };
      })();
      cache.set(i, task);
      task.catch(() => cache.delete(i));
      return task;
    }

    function upload(data) {
      // Una sola geometría en GPU: posición Int16 normalizada (6 B) + color RGBA8 (4 B) por punto.
      const stride = 10, bytes = new ArrayBuffer(data.count * stride), view = new DataView(bytes);
      for (let i = 0; i < data.count; i++) {
        const o = i * stride;
        view.setInt16(o, data.pos[i * 3], true); view.setInt16(o + 2, data.pos[i * 3 + 1], true); view.setInt16(o + 4, data.pos[i * 3 + 2], true);
        for (let k = 0; k < 4; k++) view.setUint8(o + 6 + k, data.col[i * 4 + k]);
      }
      gl.bindVertexArray(vao);
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(gl.ARRAY_BUFFER, bytes, gl.STATIC_DRAW);
      gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.SHORT, true, stride, 0);
      gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 4, gl.UNSIGNED_BYTE, true, stride, 6);
      count = data.count; aspect = data.aspect;
      canvas.dataset.puntos = String(count);
      resize();
    }

    function resize() {
      const rect = canvas.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      width = rect.width; height = rect.height;
      canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
      gl.viewport(0, 0, canvas.width, canvas.height);
      // Coordenadas normalizadas por la mitad del ancho de la imagen; se ajusta a la caja completa.
      scale = Math.min(width * .48, height * .5 / aspect);
      draw();
    }

    function draw() {
      gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
      if (!count) return;
      gl.useProgram(program);
      gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      const motion = paused ? 0 : 1;
      gl.uniform2f(u.uRes, width, height);
      gl.uniform2f(u.uMouse, mouse[0], mouse[1]);
      gl.uniform2f(u.uRot, rot[0] * motion, rot[1] * motion);
      gl.uniform3f(u.uInk, ...tinta);
      gl.uniform3f(u.uAccent, ...acento);
      gl.uniform1f(u.uTheme, modoTema ? 1 : 0);
      gl.uniform1f(u.uAlpha, alfa);
      gl.uniform1f(u.uScale, scale);
      gl.uniform1f(u.uReveal, paused ? 1 : reveal);
      gl.uniform1f(u.uLeave, paused ? 0 : leave);
      gl.uniform1f(u.uStrength, strength);
      gl.uniform1f(u.uPulse, pulse);
      gl.uniform1f(u.uMotion, motion);
      gl.uniform1f(u.uTime, time);
      gl.uniform1f(u.uScan, scan);
      gl.uniform1f(u.uSize, Math.max(1.5, Math.min(2.6, scale / 260)) * dpr);
      gl.uniform1f(u.uRadius, Math.min(110, width * .16));
      gl.bindVertexArray(vao);
      gl.drawArrays(gl.POINTS, 0, count);
    }

    function select(i) {
      activo = i;
      botones.forEach((b) => b.setAttribute('aria-pressed', String(Number(b.dataset.heroActivo) === i)));
      canvas.setAttribute('aria-label', `${activos[i].etiqueta}: imagen animada formada por puntos`);
      canvas.dataset.activo = String(i);
    }

    async function show(i) {
      select(i);
      try {
        const data = await sample(i);
        if (activo !== i) return;
        upload(data);
        root.dataset.estado = 'listo';
        phase = 'assemble'; phaseTime = 0; reveal = paused ? 1 : 0; leave = 0;
        draw(); play();
        // Prepara el siguiente activo sin competir con el primer ensamblado.
        if (activos.length > 1) (window.requestIdleCallback || setTimeout)(() => sample((i + 1) % activos.length).catch(() => {}), { timeout: 4000 });
      } catch { if (activo === i) mostrarFijo(); }
    }

    function go(i) {
      if (paused || phase === 'wait') { show(i); return; }
      pendiente = i; select(i); phase = 'leave'; phaseTime = 0; play();
    }

    const canAnimate = () => count && !paused && visible && !document.hidden;
    function play() { if (!raf && canAnimate()) { last = performance.now(); raf = requestAnimationFrame(frame); } }
    function stop() { cancelAnimationFrame(raf); raf = 0; }

    function frame(stamp) {
      raf = 0;
      if (!canAnimate()) return;
      const elapsed = stamp - last;
      // En móvil se limita a 30 fps: basta para la animación y ahorra batería.
      if (mobile && elapsed < 30) { raf = requestAnimationFrame(frame); return; }
      const dt = Math.min(elapsed / 1000, .07); last = stamp; time += dt; phaseTime += dt;
      if (phase === 'assemble') {
        reveal = Math.min(1, phaseTime / ASSEMBLE);
        if (activos.length > 1 && phaseTime >= ciclo - LEAVE) { phase = 'leave'; phaseTime = 0; pendiente = (activo + 1) % activos.length; select(pendiente); }
      } else if (phase === 'leave') {
        leave = Math.min(1, phaseTime / LEAVE);
        if (leave >= 1) { phase = 'wait'; const i = pendiente; pendiente = null; show(i); }
      }
      scan = scan > 1.5 ? -1.5 : scan + dt * .75;
      pulse = Math.max(0, pulse - dt * 1.5);
      const k = 1 - Math.exp(-dt * 9);
      strength += (targetStrength - strength) * k;
      mouse[0] += (mouseTarget[0] - mouse[0]) * k * 1.1; mouse[1] += (mouseTarget[1] - mouse[1]) * k * 1.1;
      rot[0] += (rotTarget[0] - rot[0]) * k * .5; rot[1] += (rotTarget[1] - rot[1]) * k * .5;
      draw();
      canvas.dataset.fase = phase;
      frames++;
      if (stamp - fpsStamp > 1000) { canvas.dataset.fps = String(Math.round(frames * 1000 / (stamp - fpsStamp))); frames = 0; fpsStamp = stamp; }
      raf = requestAnimationFrame(frame);
    }

    function updatePause() {
      if (!pausa) return;
      pausa.hidden = false;
      pausa.setAttribute('aria-pressed', String(paused));
      pausa.innerHTML = paused ? 'Reanudar movimiento <span aria-hidden="true">▷</span>' : 'Pausar movimiento <span aria-hidden="true">Ⅱ</span>';
      if (pista) pista.textContent = paused ? 'Movimiento en pausa.' : mobile ? 'Toca la nube para dispersar los puntos.' : 'Mueve el cursor sobre la nube.';
      root.dataset.pausa = String(paused);
    }
    function setPaused(value) {
      paused = value;
      if (paused) {
        stop(); strength = targetStrength = 0;
        if (phase === 'leave' && pendiente !== null) { const i = pendiente; pendiente = null; show(i); }
        reveal = 1; leave = 0; draw();
      } else { phase = count ? 'assemble' : phase; phaseTime = ASSEMBLE; play(); }
      updatePause();
    }
    function point(event) {
      const rect = canvas.getBoundingClientRect();
      mouseTarget[0] = event.clientX - rect.left - rect.width / 2;
      mouseTarget[1] = rect.height / 2 - (event.clientY - rect.top);
      rotTarget[0] = Math.max(-1, Math.min(1, mouseTarget[0] / rect.width * 2)) * .22;
      rotTarget[1] = Math.max(-1, Math.min(1, -mouseTarget[1] / rect.height * 2)) * .12;
    }

    root.addEventListener('pointermove', (event) => {
      if (paused || event.pointerType === 'touch') return;
      point(event); targetStrength = 1;
      if (mouse[0] === 1e4) { mouse[0] = mouseTarget[0]; mouse[1] = mouseTarget[1]; }
    });
    root.addEventListener('pointerleave', () => { targetStrength = 0; rotTarget[0] = rotTarget[1] = 0; });
    marco.addEventListener('pointerdown', (event) => {
      if (paused || event.target.closest('button,a')) return;
      point(event); mouse[0] = mouseTarget[0]; mouse[1] = mouseTarget[1]; targetStrength = 1; pulse = 1;
      if (event.pointerType === 'touch') { clearTimeout(touchTimer); touchTimer = setTimeout(() => { targetStrength = 0; }, 900); }
    });
    botones.forEach((b) => b.addEventListener('click', () => {
      const i = Number(b.dataset.heroActivo);
      if (i !== activo || phase === 'wait') go(i); else phaseTime = Math.min(phaseTime, ASSEMBLE);
    }));
    pausa?.addEventListener('click', () => setPaused(!paused));
    reduced.addEventListener('change', () => setPaused(reduced.matches));
    document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); else play(); });
    new IntersectionObserver((entries) => { visible = entries[0].isIntersecting; if (visible) play(); else stop(); }, { threshold: .15 }).observe(canvas);
    new ResizeObserver(resize).observe(canvas);
    canvas.addEventListener('webglcontextlost', (event) => { event.preventDefault(); stop(); mostrarFijo(); });
    botones.forEach((b) => { b.closest('[data-hero-selector]').hidden = false; });
    updatePause();
    show(0);
  }
}

document.querySelectorAll('[data-mcco-hero]').forEach(iniciar);
