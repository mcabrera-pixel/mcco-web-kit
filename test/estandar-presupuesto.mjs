// Suma cada respuesta JS gzip por separado, incluidos Worker, respaldo dinámico y módulos compartidos.
// Uso: node test/estandar-presupuesto.mjs <dist de la demo>
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
const dir = path.resolve(process.argv[2], '_astro');
const archivos = fs.readdirSync(dir);
function medir(entradas, limite) {
  if (!entradas.length) throw new Error('No se encontró la entrada del componente');
  const vistos = new Map();
  function visitar(nombre) {
    if (vistos.has(nombre)) return;
    const bytes = fs.readFileSync(path.join(dir, nombre));
    vistos.set(nombre, zlib.gzipSync(bytes, { level: 9 }).length);
    for (const [, referencia] of bytes.toString().matchAll(/["'`]((?:\.\/|\/_astro\/)[^"'`]+?\.js)["'`]/g)) visitar(path.basename(referencia));
  }
  entradas.forEach(visitar);
  const total = [...vistos.values()].reduce((a,b)=>a+b,0);
  if (total > limite) process.exitCode = 1;
  return { total, limite, cumple: total <= limite, archivos: Object.fromEntries(vistos) };
}
console.log(JSON.stringify({
  nube: medir(archivos.filter(n=>/^(NubeAncla|HistoriaNube)\./.test(n)), 12000),
  campo: medir(archivos.filter(n=>/^CampoAntigravity\./.test(n)), 5000),
}, null, 2));
