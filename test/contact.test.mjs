// Pruebas de functions/contact.js: honeypot → Turnstile → Worker formularios-mcco → acuse → 302 /gracias.
// fetch es un doble que registra cada llamada; el Worker responde lo que diga cada prueba.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { onRequestPost } from '../functions/contact.js';

const WORKER = 'https://formularios-mcco.prueba.workers.dev';
const TURNSTILE = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
const RESEND = 'https://api.resend.com/emails';
const ENV = { FORMULARIOS_URL: WORKER, FORMULARIOS_CLAVE: 'clave-de-prueba', MARCA: 'mcco' };
const DATOS_PERSONALES = /ana@minera\.cl|Ana Pérez|1234 5678/;

// Formulario de mcco.cl/contacto, con un campo repetido, un archivo y los campos que no deben llegar al Worker.
function formulario({ honeypot = '' } = {}) {
  const f = new FormData();
  f.append('subject', 'Consulta desde mcco.cl');
  f.append('from_name', 'MCCO Group');
  f.append('website_url', honeypot);
  f.append('nombre', 'Ana Pérez');
  f.append('empresa', 'Minera Ejemplo');
  f.append('email', 'ana@minera.cl');
  f.append('telefono', '+56 9 1234 5678');
  f.append('tema', 'Estructuras mineras');
  f.append('tema', 'Fundiciones');
  f.append('mensaje', 'Corrosión en la estructura del chancador.\r\nNecesitamos inspección en noviembre.'); // CRLF, como el navegador
  f.append('access_key', 'clave-web3forms-antigua');
  f.append('botcheck', '');
  f.append('cf-turnstile-response', 'token-turnstile');
  f.append('adjunto', new Blob(['%PDF-1.7'], { type: 'application/pdf' }), 'plano.pdf');
  return f;
}

function solicitud(form, { referer = 'https://mcco.cl/contacto/' } = {}) {
  return new Request('https://mcco.cl/api/contact', { method: 'POST', body: form, headers: referer ? { referer } : {} });
}

// Contexto de Pages Functions; waitUntil guarda las promesas (el acuse) para esperarlas.
function contexto(request, env) {
  const pendientes = [];
  return { request, env, waitUntil: (p) => pendientes.push(p), pendientes };
}

// Doble de fetch: registra { url, init } y responde según la URL. Una llamada a otra URL lanza.
function dobleFetch(t, respuestaWorker, respuestaTurnstile = () => Response.json({ success: true })) {
  const llamadas = [];
  t.mock.method(globalThis, 'fetch', async (url, init = {}) => {
    llamadas.push({ url: String(url), init });
    if (String(url) === TURNSTILE) return respuestaTurnstile();
    if (String(url) === WORKER) return respuestaWorker();
    if (String(url) === RESEND) return Response.json({ id: 'acuse-prueba' });
    throw new Error(`fetch inesperado a ${url}`);
  });
  return llamadas;
}

// Silencia console.error y console.warn y devuelve lo registrado, para revisar que no lleve datos personales.
function capturarLogs(t) {
  const logs = [];
  for (const nivel of ['error', 'warn']) t.mock.method(console, nivel, (...args) => logs.push({ nivel, texto: args.join(' ') }));
  return logs;
}

const workerOk = () => Response.json({ ok: true });

// Rompe si: cambia la URL o la cabecera de clave, marca no sale de env.MARCA, viajan access_key, website_url,
// botcheck, el token de Turnstile o un archivo, se pierde un valor de un campo repetido o no redirige a /gracias.
test('éxito: el lead llega al Worker con la clave, la marca y solo los campos de texto, y redirige a /gracias', async (t) => {
  const llamadas = dobleFetch(t, workerOk);
  const r = await onRequestPost(contexto(solicitud(formulario()), ENV));
  assert.equal(r.status, 302);
  assert.equal(r.headers.get('location'), 'https://mcco.cl/gracias');
  assert.equal(llamadas.length, 1);
  const { url, init } = llamadas[0];
  assert.equal(url, WORKER);
  assert.equal(init.method, 'POST');
  const cabeceras = new Headers(init.headers);
  assert.equal(cabeceras.get('content-type'), 'application/json');
  assert.equal(cabeceras.get('x-formularios-clave'), 'clave-de-prueba');
  assert.ok(init.signal instanceof AbortSignal, 'la llamada al Worker debe llevar un timeout');
  assert.deepEqual(JSON.parse(init.body), {
    marca: 'mcco',
    origen: 'https://mcco.cl/contacto/',
    campos: {
      subject: 'Consulta desde mcco.cl',
      from_name: 'MCCO Group',
      nombre: 'Ana Pérez',
      empresa: 'Minera Ejemplo',
      email: 'ana@minera.cl',
      telefono: '+56 9 1234 5678',
      tema: 'Estructuras mineras, Fundiciones',
      mensaje: 'Corrosión en la estructura del chancador.\r\nNecesitamos inspección en noviembre.',
    },
  });
});

// Rompe si falta la validación de alguna de las tres variables, si sin ellas se llama a Turnstile o al Worker
// (el formulario trae token y el sitio tiene TURNSTILE_SECRET) o si el log del error trae datos del lead.
for (const falta of ['FORMULARIOS_URL', 'FORMULARIOS_CLAVE', 'MARCA']) {
  test(`sin ${falta}: reason=config sin llamar a fetch`, async (t) => {
    const logs = capturarLogs(t);
    const llamadas = dobleFetch(t, workerOk);
    const { [falta]: _, ...resto } = ENV;
    const env = { ...resto, TURNSTILE_SECRET: 'secreto-turnstile' };
    const r = await onRequestPost(contexto(solicitud(formulario()), env));
    assert.equal(r.status, 302);
    assert.equal(r.headers.get('location'), 'https://mcco.cl/contacto-error?reason=config');
    assert.equal(llamadas.length, 0);
    assert.ok(logs.some((l) => l.nivel === 'error'), 'debe quedar un console.error');
    assert.doesNotMatch(logs.map((l) => l.texto).join('\n'), DATOS_PERSONALES);
  });
}

// Rompe si el éxito se decide solo con r.ok, si un JSON inválido o un timeout terminan en reason=exception,
// si sale el acuse aunque el Worker falló o si el log trae datos del lead.
const FALLOS_DEL_WORKER = [
  ['502 y { ok: false }', () => Response.json({ ok: false, error: 'send falló' }, { status: 502 })],
  ['200 y { ok: false }', () => Response.json({ ok: false })],
  ['200 con HTML en vez de JSON', () => new Response('<html>Error</html>', { headers: { 'content-type': 'text/html' } })],
  ['timeout', () => Promise.reject(new DOMException('The operation was aborted due to timeout', 'TimeoutError'))],
];
for (const [caso, respuestaWorker] of FALLOS_DEL_WORKER) {
  test(`Worker con ${caso}: reason=correo y sin acuse`, async (t) => {
    const logs = capturarLogs(t);
    const llamadas = dobleFetch(t, respuestaWorker);
    const ctx = contexto(solicitud(formulario()), { ...ENV, RESEND_API_KEY: 're_prueba' });
    const r = await onRequestPost(ctx);
    assert.equal(r.status, 302);
    assert.equal(r.headers.get('location'), 'https://mcco.cl/contacto-error?reason=correo');
    assert.deepEqual(llamadas.map((l) => l.url), [WORKER]);
    assert.equal(ctx.pendientes.length, 0);
    assert.doesNotMatch(logs.map((l) => l.texto).join('\n'), DATOS_PERSONALES);
  });
}

// Rompe si se quita el honeypot o si queda después de la llamada al Worker.
test('honeypot lleno: reason=spam sin llamar a fetch', async (t) => {
  capturarLogs(t);
  const llamadas = dobleFetch(t, workerOk);
  const r = await onRequestPost(contexto(solicitud(formulario({ honeypot: 'https://spam.example' })), ENV));
  assert.equal(r.status, 302);
  assert.equal(r.headers.get('location'), 'https://mcco.cl/contacto-error?reason=spam');
  assert.equal(llamadas.length, 0);
});

// Rompe si falta el valor por defecto de origen cuando el navegador no manda Referer.
test('sin Referer, el origen del lead es /contacto/', async (t) => {
  const llamadas = dobleFetch(t, workerOk);
  await onRequestPost(contexto(solicitud(formulario(), { referer: null }), ENV));
  const alWorker = llamadas.find((l) => l.url === WORKER);
  assert.ok(alWorker, 'no hubo llamada al Worker');
  assert.equal(JSON.parse(alWorker.init.body).origen, '/contacto/');
});

// Rompe si el acuse se pierde del camino de éxito, sale antes que el Worker, va a otro correo o vuelve la raya.
test('tras el éxito, el acuse va por Resend al correo del lead con el asunto sin raya', async (t) => {
  const llamadas = dobleFetch(t, workerOk);
  const ctx = contexto(solicitud(formulario()), { ...ENV, RESEND_API_KEY: 're_prueba' });
  await onRequestPost(ctx);
  await Promise.all(ctx.pendientes);
  assert.deepEqual(llamadas.map((l) => l.url), [WORKER, RESEND]);
  const acuse = JSON.parse(llamadas[1].init.body);
  assert.deepEqual(acuse.to, ['ana@minera.cl']);
  assert.equal(acuse.subject, 'Recibimos tu solicitud: te respondemos dentro de 24 horas hábiles');
});

for (const token of [null, '']) {
  test(`Turnstile configurado, token ${token === null ? 'ausente' : 'vacío'}: sin Worker ni acuse`, async (t) => {
    capturarLogs(t);
    const llamadas = dobleFetch(t, workerOk);
    const form = formulario();
    if (token === null) form.delete('cf-turnstile-response');
    else form.set('cf-turnstile-response', token);
    const ctx = contexto(solicitud(form), { ...ENV, TURNSTILE_SECRET: 'secreto-prueba', RESEND_API_KEY: 're_prueba' });
    const r = await onRequestPost(ctx);
    assert.equal(r.status, 302);
    assert.equal(r.headers.get('location'), 'https://mcco.cl/contacto-error?reason=turnstile');
    assert.deepEqual(llamadas, []);
    assert.equal(ctx.pendientes.length, 0);
  });
}
for (const success of [false, true, 'true']) {
  test(`Turnstile success=${JSON.stringify(success)}: solo true admite el lead y el acuse`, async (t) => {
    capturarLogs(t);
    const llamadas = dobleFetch(t, workerOk, () => Response.json({ success }));
    const ctx = contexto(solicitud(formulario()), { ...ENV, TURNSTILE_SECRET: 'secreto-prueba', RESEND_API_KEY: 're_prueba' });
    const r = await onRequestPost(ctx);
    await Promise.all(ctx.pendientes);
    assert.equal(r.status, 302);
    assert.equal(r.headers.get('location'), success === true ? 'https://mcco.cl/gracias' : 'https://mcco.cl/contacto-error?reason=turnstile');
    assert.deepEqual(llamadas.map(l => l.url), success === true ? [TURNSTILE, WORKER, RESEND] : [TURNSTILE]);
    assert.deepEqual(JSON.parse(llamadas[0].init.body), { secret: 'secreto-prueba', response: 'token-turnstile', remoteip: null });
    assert.equal(ctx.pendientes.length, success === true ? 1 : 0);
    if (success === true) assert.equal(JSON.parse(llamadas[1].init.body).campos['cf-turnstile-response'], undefined);
  });
}
for (const token of [null, 'token-prueba']) {
  test(`sin secreto, con token ${token}: conserva el envío sin Siteverify`, async (t) => {
    const llamadas = dobleFetch(t, workerOk);
    const form = formulario();
    if (token === null) form.delete('cf-turnstile-response');
    else form.set('cf-turnstile-response', token);
    const r = await onRequestPost(contexto(solicitud(form), ENV));
    assert.equal(r.headers.get('location'), 'https://mcco.cl/gracias');
    assert.deepEqual(llamadas.map(l => l.url), [WORKER]);
  });
}
for (const [caso, respuesta] of [
  ['error de red', () => { throw new Error('red de prueba'); }],
  ['JSON inválido', () => new Response('sin JSON')],
]) {
  test(`Turnstile ${caso}: conserva reason=exception sin Worker ni acuse`, async (t) => {
    capturarLogs(t);
    const llamadas = dobleFetch(t, workerOk, respuesta);
    const ctx = contexto(solicitud(formulario()), { ...ENV, TURNSTILE_SECRET: 'secreto-prueba', RESEND_API_KEY: 're_prueba' });
    const r = await onRequestPost(ctx);
    assert.equal(r.headers.get('location'), 'https://mcco.cl/contacto-error?reason=exception');
    assert.deepEqual(llamadas.map(l => l.url), [TURNSTILE]);
    assert.equal(ctx.pendientes.length, 0);
  });
}

const TAMANO_MAX = 32 * 1024;
function solicitudBytes(body, headers = {}) {
  return new Request('https://mcco.cl/api/contact', {
    method: 'POST', body, headers: { 'content-type': 'application/x-www-form-urlencoded', ...headers },
    ...(body instanceof ReadableStream ? { duplex: 'half' } : {}),
  });
}

// Rechaza por la cabecera sin consumir el cuerpo ni llamar a servicios.
test('Content-Length mayor que 32 KiB corta antes de leer', async (t) => {
  const llamadas = dobleFetch(t, workerOk);
  const request = solicitudBytes('nombre=Ana', { 'content-length': String(TAMANO_MAX + 1) });
  const ctx = contexto(request, { ...ENV, TURNSTILE_SECRET: 'secreto-prueba', RESEND_API_KEY: 're_prueba' });
  const r = await onRequestPost(ctx);
  assert.equal(r.headers.get('location'), 'https://mcco.cl/contacto-error?reason=tamano');
  assert.equal(request.bodyUsed, false);
  assert.deepEqual(llamadas, []);
  assert.equal(ctx.pendientes.length, 0);
});

for (const length of [undefined, '1']) {
  test(`cuerpo leído de 32 KiB + 1 con Content-Length ${length}: sin llamadas externas`, async (t) => {
    const llamadas = dobleFetch(t, workerOk);
    const headers = length === undefined ? {} : { 'content-length': length };
    const r = await onRequestPost(contexto(solicitudBytes('x=' + 'a'.repeat(TAMANO_MAX - 1), headers), ENV));
    assert.equal(r.headers.get('location'), 'https://mcco.cl/contacto-error?reason=tamano');
    assert.deepEqual(llamadas, []);
  });
}

test('32 KiB exactos se admiten, aunque el valor se recorta a 5000', async (t) => {
  const llamadas = dobleFetch(t, workerOk);
  const r = await onRequestPost(contexto(solicitudBytes('x=' + 'a'.repeat(TAMANO_MAX - 2), { 'content-length': String(TAMANO_MAX) }), ENV));
  assert.equal(r.headers.get('location'), 'https://mcco.cl/gracias');
  assert.deepEqual(JSON.parse(llamadas[0].init.body).campos, { x: 'a'.repeat(5000) });
});

test('el límite cuenta bytes UTF-8 y cancela el stream al excederse', async (t) => {
  const llamadas = dobleFetch(t, workerOk);
  let cancelado = false, leidos = 0;
  const trozos = ['x=', 'á'.repeat(8192), 'á'.repeat(8192), 'no debe leerse'];
  const body = new ReadableStream({
    pull(c) { c.enqueue(new TextEncoder().encode(trozos[leidos++])); },
    cancel() { cancelado = true; },
  }, { highWaterMark: 0 });
  const r = await onRequestPost(contexto(solicitudBytes(body), ENV));
  assert.equal(r.headers.get('location'), 'https://mcco.cl/contacto-error?reason=tamano');
  assert.equal(cancelado, true);
  assert.equal(leidos, 3);
  assert.deepEqual(llamadas, []);
});

for (const repetidos of [false, true]) {
  for (const cantidad of [40, 41]) {
    test(`${cantidad} entradas ${repetidos ? 'repetidas' : 'distintas'}: máximo 40`, async (t) => {
      const llamadas = dobleFetch(t, workerOk);
      const form = new FormData();
      for (let i = 0; i < cantidad; i++) form.append(repetidos ? 'tema' : `campo${i}`, 'sí');
      const r = await onRequestPost(contexto(solicitud(form), ENV));
      assert.equal(r.headers.get('location'), cantidad === 40 ? 'https://mcco.cl/gracias' : 'https://mcco.cl/contacto-error?reason=tamano');
      assert.equal(llamadas.length, cantidad === 40 ? 1 : 0);
    });
  }
}

test('el máximo de 40 incluye campos excluidos y archivos', async (t) => {
  const llamadas = dobleFetch(t, workerOk);
  const form = new FormData();
  for (let i = 0; i < 39; i++) form.append(`campo${i}`, 'dato');
  form.append('access_key', 'no viaja');
  form.append('archivo', new Blob(['dato']), 'prueba.txt');
  const r = await onRequestPost(contexto(solicitud(form), ENV));
  assert.equal(r.headers.get('location'), 'https://mcco.cl/contacto-error?reason=tamano');
  assert.deepEqual(llamadas, []);
});

for (const cantidad of [4999, 5000, 5001]) {
  test(`valor de ${cantidad} caracteres: máximo 5000`, async (t) => {
    const llamadas = dobleFetch(t, workerOk);
    const form = new FormData();
    form.append('mensaje', 'ñ'.repeat(cantidad));
    const r = await onRequestPost(contexto(solicitud(form), ENV));
    assert.equal(r.headers.get('location'), 'https://mcco.cl/gracias');
    assert.deepEqual(JSON.parse(llamadas[0].init.body).campos, { mensaje: 'ñ'.repeat(Math.min(cantidad, 5000)) });
  });
}

test('valores repetidos se juntan sin exceder 5000 caracteres', async (t) => {
  const llamadas = dobleFetch(t, workerOk);
  const form = new FormData();
  form.append('tema', 'a'.repeat(3000));
  form.append('tema', 'b'.repeat(3000));
  form.append('tema', 'c'.repeat(3000));
  await onRequestPost(contexto(solicitud(form), ENV));
  assert.deepEqual(JSON.parse(llamadas[0].init.body).campos, { tema: 'a'.repeat(3000) + ', ' + 'b'.repeat(1998) });
});

for (const fase of ['fetch', 'JSON']) {
  test(`Turnstile vence durante ${fase}: timeout de 10000 ms, token rechazado y sin Worker ni acuse`, async (t) => {
    const ctrl = new AbortController();
    const plazos = [];
    t.mock.method(AbortSignal, 'timeout', ms => { plazos.push(ms); return ctrl.signal; });
    const vencer = () => {
      ctrl.abort(new DOMException('Venció la prueba', 'TimeoutError'));
      throw ctrl.signal.reason;
    };
    const llamadas = dobleFetch(t, workerOk, fase === 'fetch' ? vencer : () => ({ json: vencer }));
    const ctx = contexto(solicitud(formulario()), { ...ENV, TURNSTILE_SECRET: 'secreto-prueba', RESEND_API_KEY: 're_prueba' });
    const r = await onRequestPost(ctx);
    assert.equal(r.status, 302);
    assert.equal(r.headers.get('location'), 'https://mcco.cl/contacto-error?reason=turnstile');
    assert.deepEqual(plazos, [10000]);
    assert.deepEqual(llamadas.map(l => l.url), [TURNSTILE]);
    assert.equal(llamadas[0].init.signal, ctrl.signal);
    assert.equal(ctx.pendientes.length, 0);
  });
}
