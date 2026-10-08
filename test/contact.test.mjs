// Pruebas de functions/contact.js: honeypot → Turnstile → Worker formularios-mcco → acuse → 302 /gracias.
// fetch es un doble que registra cada llamada; el Worker responde lo que diga cada prueba.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { onRequestPost } from '../functions/contact.js';

const WORKER = 'https://formularios-mcco.prueba.workers.dev';
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
function dobleFetch(t, respuestaWorker) {
  const llamadas = [];
  t.mock.method(globalThis, 'fetch', async (url, init = {}) => {
    llamadas.push({ url: String(url), init });
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
