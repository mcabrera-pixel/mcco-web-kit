import { test } from 'node:test';
import assert from 'node:assert/strict';
import { crearClienteNube, SIN_WORKER, CANCELADO } from '../lib/estandar/nube-cliente.js';

function entorno(opciones = {}) {
  const workers = [], respaldos = [];
  class WorkerFalso {
    pedidos = [];
    cierres = 0;
    constructor(url, opciones) { this.url = url; this.opciones = opciones; workers.push(this); }
    postMessage(pedido) { this.pedidos.push(pedido); }
    terminate() { this.cierres++; }
    responder(indice, datos = {}) { this.onmessage({ data: { id: this.pedidos[indice].id, ...datos } }); }
  }
  const cliente = crearClienteNube(WorkerFalso, {
    disponible: () => true,
    respaldo: async (pedido) => { respaldos.push(pedido); return { principal: pedido.src }; },
    ...opciones,
  });
  return { ...cliente, workers, respaldos };
}

// La espera acotada distingue un rechazo de una promesa abandonada sin colgar la suite.
async function resultados(promesas) {
  let reloj;
  try {
    return await Promise.race([
      Promise.allSettled(promesas),
      new Promise((resolve) => { reloj = setTimeout(() => resolve('promesas pendientes tras cerrar'), 100); }),
    ]);
  } finally { clearTimeout(reloj); }
}
const cancelacion = () => ({ status: 'rejected', reason: new Error(CANCELADO) });

test('cerrar durante la primera forma la rechaza por cancelación sin respaldo', async () => {
  const c = entorno();
  const fin = resultados([c.forma({ src: 'primera' })]);
  c.cerrarWorker();
  assert.deepEqual(await fin, [cancelacion()]);
  assert.notEqual(CANCELADO, SIN_WORKER);
  assert.equal(c.workers[0].cierres, 1);
  assert.deepEqual(c.respaldos, []);
});

test('cerrar durante las formas restantes cancela todas sin respaldo', async () => {
  const c = entorno();
  const primera = c.forma({ src: 'primera' });
  c.workers[0].responder(0, { pos: [1] });
  await primera;
  const fin = resultados(['segunda', 'tercera', 'cuarta'].map((src) => c.forma({ src })));
  c.cerrarWorker();
  c.cerrarWorker();
  assert.deepEqual(await fin, [cancelacion(), cancelacion(), cancelacion()]);
  assert.equal(c.workers[0].cierres, 1);
  assert.deepEqual(c.respaldos, []);
});

test('una forma fallida rechaza y el cierre cancela las hermanas de Promise.all', async () => {
  const c = entorno();
  const formas = ['rota', 'hermana'].map((src) => c.forma({ src }));
  const fin = resultados(formas);
  const grupo = Promise.all(formas).finally(c.cerrarWorker);
  c.workers[0].responder(0, { error: 'imagen inválida' });
  await assert.rejects(grupo, /imagen inválida/);
  assert.deepEqual(await fin, [{ status: 'rejected', reason: new Error('imagen inválida') }, cancelacion()]);
  assert.deepEqual(c.respaldos, []);
});

test('onerror rechaza todos los pedidos con SIN_WORKER y conserva el respaldo después del cierre', async () => {
  const c = entorno();
  const rechazo = assert.rejects(c.enWorker({ src: 'directa' }), { message: SIN_WORKER });
  const formas = ['una', 'otra'].map((src) => c.forma({ src }));
  c.workers[0].onerror();
  await rechazo;
  assert.deepEqual(await Promise.all(formas), [{ principal: 'una' }, { principal: 'otra' }]);
  c.cerrarWorker();
  assert.deepEqual(await c.forma({ src: 'posterior' }), { principal: 'posterior' });
  assert.equal(c.workers.length, 1);
  assert.deepEqual(c.respaldos.map((p) => p.src), ['una', 'otra', 'posterior']);
});

test('después del cierre crea otro Worker y solo entrega la respuesta del pedido correspondiente', async () => {
  const c = entorno();
  const primera = c.enWorker({ src: 'primera' });
  c.workers[0].responder(0, { pos: [1] });
  assert.deepEqual((await primera).pos, [1]);
  c.cerrarWorker();
  const siguientes = [c.enWorker({ src: 'segunda' }), c.enWorker({ src: 'tercera' })];
  const w = c.workers[1];
  assert.equal(c.workers.length, 2);
  assert.ok(w.pedidos[0].id > c.workers[0].pedidos[0].id);
  assert.equal(w.url.pathname.endsWith('/nube-worker.js'), true);
  assert.deepEqual(w.opciones, { type: 'module' });
  c.workers[0].responder(0, { pos: [99] });
  w.responder(1, { pos: [3] });
  w.responder(0, { pos: [2] });
  assert.deepEqual((await Promise.all(siguientes)).map((r) => r.pos), [[2], [3]]);
  c.cerrarWorker();
});

test('sin OffscreenCanvas usa el respaldo sin construir un Worker', async () => {
  const c = entorno({ disponible: () => false });
  assert.deepEqual(await c.forma({ src: 'una' }), { principal: 'una' });
  assert.equal(c.workers.length, 0);
});

test('si el constructor falla mantiene el respaldo para los pedidos posteriores', async () => {
  let intentos = 0;
  const c = crearClienteNube(class { constructor() { intentos++; throw new Error('bloqueado'); } }, {
    disponible: () => true, respaldo: async (p) => p.src,
  });
  assert.equal(await c.forma({ src: 'una' }), 'una');
  c.cerrarWorker();
  assert.equal(await c.forma({ src: 'otra' }), 'otra');
  assert.equal(intentos, 1);
});

test('el respaldo serializa las formas concurrentes y sigue después de una imagen fallida', async () => {
  let activos = 0, maximo = 0;
  const c = entorno({ disponible: () => false, respaldo: async ({ src }) => {
    maximo = Math.max(maximo, ++activos);
    await new Promise((r) => setTimeout(r, 2));
    activos--;
    if (src === 'rota') throw new Error('imagen inválida');
    return src;
  } });
  const fin = await Promise.allSettled(['una', 'rota', 'tres'].map((src) => c.forma({ src })));
  assert.equal(maximo, 1, 'varias formas compiten por el presupuesto del hilo principal');
  assert.deepEqual(fin.map((r) => r.status), ['fulfilled', 'rejected', 'fulfilled']);
  assert.equal(fin[2].value, 'tres');
});

test('cerrar antes de iniciar el respaldo cancela los pedidos en espera', async () => {
  const c = entorno({ disponible: () => false });
  const fin = resultados([c.forma({ src: 'una' }), c.forma({ src: 'otra' })]);
  c.cerrarWorker();
  assert.deepEqual(await fin, [cancelacion(), cancelacion()]);
  assert.deepEqual(c.respaldos, []);
});

test('un Worker averiado se termina antes de pasar al respaldo', async () => {
  const c = entorno();
  const fin = c.forma({ src: 'una' });
  c.workers[0].onerror();
  await fin;
  assert.equal(c.workers[0].cierres, 1);
});

test('un Worker sin OffscreenCanvas se cierra y todos sus pedidos pasan a respaldo', async () => {
  const c = entorno();
  const fin = Promise.all(['una','otra'].map(src=>c.forma({src})));
  c.workers[0].responder(0,{error:SIN_WORKER});
  assert.deepEqual(await fin,[{principal:'una'},{principal:'otra'}]);
  assert.equal(c.workers[0].cierres,1);
  assert.equal(c.workers.length,1);
});
