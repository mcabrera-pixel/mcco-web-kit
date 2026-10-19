// Pruebas de lib/estandar/campo-anillos.js: los parámetros del campo antigravity del hero, los anillos de guiones
// (tríos k, ángulo, semilla) y el suavizado con que el centro persigue al mouse. Son los valores de la prueba aprobada
// (scripts/campo.js): anillos cada 28 px con un guion cada 30 px en computador (24 y 26 en celular), del radio 46 al
// 1180 (760 en celular), y dos suavizados de 0,7 s.
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { parametrosCampo, anillos, seguir } from '../lib/estandar/campo-anillos.js';

const COMPUTADOR = {
  r0: 46, dr: 28, paso: 30, rmax: 1180, banda: [150, 400, 680], alfa: [0.13, 0.85], largo: [2, 7], ancho: [2, 2.4],
  giro: 0.012, tau: 0.7, atenuacionNube: 0.32,
};
const CELULAR = {
  r0: 46, dr: 24, paso: 26, rmax: 760, banda: [110, 280, 500], alfa: [0.13, 0.85], largo: [2, 7], ancho: [2, 2.4],
  giro: 0.012, tau: 0.7, atenuacionNube: 0.32,
};

/** Guiones que espera cada anillo: max(6, ⌊2π·r/paso⌋) para r = r0 + dr·k < rmax. */
function esperados({ r0, dr, paso, rmax }) {
  const porAnillo = [];
  for (let k = 0; r0 + dr * k < rmax; k++) porAnillo.push(Math.max(6, Math.floor((2 * Math.PI * (r0 + dr * k)) / paso)));
  return porAnillo;
}
const suma = (xs) => xs.reduce((t, x) => t + x, 0);

// Rompe si cambia cualquier valor de la prueba aprobada: separación, radios, banda, opacidad, guion, giro o retraso.
test('parametrosCampo: los valores de computador y de celular', () => {
  assert.deepStrictEqual(parametrosCampo(false), COMPUTADOR);
  assert.deepStrictEqual(parametrosCampo(true), CELULAR);
});

// Rompe si dos llamadas comparten el mismo objeto: quien cambie una banda no puede cambiar la del siguiente.
test('parametrosCampo: cada llamada devuelve objetos nuevos', () => {
  const a = parametrosCampo(false);
  a.banda[0] = 1;
  assert.equal(parametrosCampo(false).banda[0], 150);
});

test('anillos: la cantidad de guiones es Σ max(6, ⌊2π·r/30⌋) para r = 46 + 28k < 1180', () => {
  const a = anillos(parametrosCampo(false), 777);
  assert.ok(a instanceof Float32Array);
  assert.equal(a.length % 3, 0);
  assert.equal(a.length / 3, suma(esperados(COMPUTADOR)));
  // En celular, con sus propios valores.
  const celular = anillos(parametrosCampo(true), 777);
  assert.equal(celular.length / 3, suma(esperados(CELULAR)));
  // Los totales escritos a mano: atrapan un cambio de la fórmula que se copie igual en anillos() y en esperados().
  assert.equal(a.length / 3, 5184);
  assert.equal(celular.length / 3, 2841);
});

test('anillos: misma semilla, mismo arreglo; todos los ángulos finitos', () => {
  const a = anillos(parametrosCampo(false), 777), b = anillos(parametrosCampo(false), 777);
  assert.deepStrictEqual(a, b);
  for (let i = 1; i < a.length; i += 3) assert.ok(Number.isFinite(a[i]), `ángulo ${(i - 1) / 3} no es finito: ${a[i]}`);
  // Rompe si la semilla se ignora: otra semilla da otro campo.
  assert.notDeepStrictEqual(anillos(parametrosCampo(false), 778), a);
});

// Rompe si los guiones dejan de ir en orden por anillo (el shader usa k para el radio y el sentido del giro), si las
// semillas salen de [0, 1) o si un anillo queda con huecos: dos guiones seguidos quedan a entre 0,5 y 1,5 veces la
// separación pareja (2π / n), porque cada uno se corre a lo más un cuarto de su lugar.
test('anillos: k en orden, semillas en [0, 1) y guiones parejos en cada anillo', () => {
  const p = parametrosCampo(false), a = anillos(p, 777), porAnillo = esperados(COMPUTADOR);
  let i = 0;
  porAnillo.forEach((n, k) => {
    const sep = (2 * Math.PI) / n;
    for (let j = 0; j < n; j++, i += 3) {
      assert.equal(a[i], k, `guion ${i / 3}: k = ${a[i]}, esperaba ${k}`);
      assert.ok(a[i + 2] >= 0 && a[i + 2] < 1, `semilla fuera de [0, 1): ${a[i + 2]}`);
      if (j > 0) {
        const d = a[i + 1] - a[i - 2];
        assert.ok(d > 0.5 * sep - 1e-5 && d < 1.5 * sep + 1e-5, `anillo ${k}, guiones ${j - 1} y ${j}: ${d} con separación ${sep}`);
      }
    }
  });
  assert.equal(i, a.length);
});

test('seguir: en un tau recorre 1 − e^(−1) del camino', () => {
  const [x, y] = seguir([0, 0], [100, 0], 0.7, 0.7);
  assert.ok(Math.abs(x - 100 * (1 - Math.exp(-1))) <= 1e-9, String(x));
  assert.equal(y, 0);
});

test('seguir: tras 600 pasos de 1/60 s con tau = 0,7 queda a menos de 0,1 px del objetivo', () => {
  let p = [0, 0];
  const objetivo = [640, -320];
  for (let i = 0; i < 600; i++) p = seguir(p, objetivo, 1 / 60, 0.7);
  assert.ok(Math.hypot(objetivo[0] - p[0], objetivo[1] - p[1]) < 0.1, JSON.stringify(p));
});

// Rompe si seguir cambia el punto que recibe (el campo guarda el anterior) o si un cuadro sin tiempo lo mueve.
test('seguir: no modifica sus argumentos y con dt = 0 no se mueve', () => {
  const actual = [10, 20], objetivo = [110, 220];
  assert.deepStrictEqual(seguir(actual, objetivo, 0, 0.7), [10, 20]);
  seguir(actual, objetivo, 1 / 60, 0.7);
  assert.deepStrictEqual(actual, [10, 20]);
  assert.deepStrictEqual(objetivo, [110, 220]);
});

// El centro persigue a un guía que persigue al mouse. Con el mouse a velocidad constante, dos suavizados de 0,7 s
// dejan al centro unos 1,4 s atrás (2 · tau, menos medio cuadro por etapa): el «llega con alrededor de 1,5 s de
// retraso» de la spec. Rompe si queda una sola etapa (0,7 s) o si cambia tau.
test('seguir dos veces: con el mouse a velocidad constante, el centro llega unos 1,4 s tarde', () => {
  const dt = 1 / 60, tau = parametrosCampo(false).tau, v = 100;
  let guia = [0, 0], centro = [0, 0];
  for (let i = 1; i <= 1200; i++) {
    const mouse = [v * i * dt, 0];
    guia = seguir(guia, mouse, dt, tau);
    centro = seguir(centro, guia, dt, tau);
  }
  const retraso = (v * 1200 * dt - centro[0]) / v;
  assert.ok(retraso > 1.35 && retraso < 1.42, `retraso de ${retraso.toFixed(3)} s`);
});

// Parámetros opcionales por sitio: parametrosCampo(movil, ajuste) y su lectura en campo.js y CampoAntigravity.
test('parametrosCampo aplica el ajuste y conserva lo demás', () => {
  const p = parametrosCampo(false, { rmax: 2000, banda: [220, 900, 1500], atenuacionNube: 0.5 });
  assert.equal(p.rmax, 2000); assert.deepEqual(p.banda, [220, 900, 1500]);
  assert.equal(p.atenuacionNube, 0.5); assert.equal(p.dr, 28); assert.equal(p.r0, 46);
});
test('sin ajuste quedan los valores de la prueba aprobada', () => {
  assert.equal(parametrosCampo(true).rmax, 760); assert.equal(parametrosCampo(false).atenuacionNube, 0.32);
  assert.deepStrictEqual(parametrosCampo(false, {}), COMPUTADOR);
  assert.deepStrictEqual(parametrosCampo(true, undefined), CELULAR);
});
test('una clave desconocida falla', () => {
  assert.throws(() => parametrosCampo(false, { radio: 1 }), /desconocida radio/);
  assert.throws(() => parametrosCampo(true, { rmax: 900, radio: 1 }), { message: 'parametrosCampo: clave desconocida radio' });
});
test('el ajuste no queda enlazado al resultado ni cambia los valores por defecto', () => {
  const banda = [220, 900, 1500];
  const p = parametrosCampo(false, { banda });
  banda[0] = 1;
  assert.deepEqual(p.banda, [220, 900, 1500]);
  assert.deepStrictEqual(parametrosCampo(false), COMPUTADOR);
});

const leer = (ruta) => readFileSync(new URL(ruta, import.meta.url), 'utf8');
test('campo.js lee los parámetros del contenedor y usa atenuacionNube en el shader', () => {
  const js = leer('../lib/estandar/campo.js');
  assert.match(js, /JSON\.parse\(host\.dataset\.stdCampoParametros \|\| '\{\}'\)\[movil \? 'celular' : 'computador'\]/);
  assert.match(js, /parametrosCampo\(movil, /);
  assert.match(js, /gl\.uniform1f\(u\.uAtenuacion, p\.atenuacionNube\)/);
  assert.match(js, /mix\(uAtenuacion, 1\., /);
  assert.doesNotMatch(js, /mix\(\.32, 1\./);
});
test('CampoAntigravity y HeroEstandar pasan los parámetros al contenedor del campo', () => {
  const campo = leer('../components/estandar/CampoAntigravity.astro');
  assert.match(campo, /data-std-campo-parametros/);
  const hero = leer('../components/estandar/HeroEstandar.astro');
  assert.match(hero, /campo\?: boolean \| \{ parametros: ParametrosCampoSitio \}/);
  assert.match(hero, /<CampoAntigravity parametros=/);
});
test('campo-anillos.d.ts declara las mismas claves que parametrosCampo', () => {
  const tipos = leer('../lib/estandar/campo-anillos.d.ts');
  const cuerpo = tipos.match(/interface ParametrosCampo \{([^}]*)\}/)[1];
  const claves = [...cuerpo.matchAll(/^\s*(\w+):/gm)].map((m) => m[1]).sort();
  assert.deepEqual(claves, Object.keys(parametrosCampo(false)).sort());
});
