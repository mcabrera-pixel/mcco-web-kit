#!/usr/bin/env node
// mcco-parity — gate de migración: compara la web en producción con el build nuevo, ruta por ruta.
// Uso:
//   mcco-parity --old https://3d-ultra.cl --new dist                      (build local)
//   mcco-parity --old https://3d-ultra.cl --new https://abc.3d-ultra.pages.dev   (preview)
//   [--routes rutas.txt]  lista propia (una ruta por línea); por defecto usa el sitemap.xml de --old
//   [--strict]            cualquier diferencia (también canonical y conteos) falla
// Falla si cambia el status, el <title> o el H1 de alguna ruta. Canonical y conteos (a/img/h2) se reportan.
import fs from 'node:fs';
import path from 'node:path';
import { parse } from 'node-html-parser';
import { routeToDistCandidates, cleanPath } from '../lib/routes.mjs';

const argv = process.argv.slice(2);
const opt = (n, d) => { const i = argv.indexOf(`--${n}`); if (i === -1) return d; const v = argv[i + 1]; return v === undefined || v.startsWith('--') ? true : v; };
const OLD = String(opt('old', '')).replace(/\/+$/, '');
const NEW = String(opt('new', 'dist'));
const STRICT = !!opt('strict', false);
if (!OLD) { console.error('mcco-parity: falta --old https://dominio'); process.exit(2); }
const newIsUrl = /^https?:\/\//.test(NEW);
const UA = 'Mozilla/5.0 (compatible; mcco-parity/1.0)';

async function fetchText(url) {
  const r = await fetch(url, { redirect: 'follow', headers: { 'User-Agent': UA } });
  return { status: r.status, url: r.url, text: r.ok ? await r.text() : '' };
}
function readNew(route) {
  if (newIsUrl) return fetchText(NEW.replace(/\/+$/, '') + route);
  for (const c of routeToDistCandidates(route)) {
    const f = path.join(NEW, c);
    if (fs.existsSync(f)) return { status: 200, url: f, text: fs.readFileSync(f, 'utf8') };
  }
  return { status: 404, url: route, text: '' };
}
function summarize(html) {
  if (!html) return null;
  const root = parse(html);
  const t = (s) => root.querySelector(s)?.text?.replace(/\s+/g, ' ').trim() ?? '';
  return {
    title: t('title'),
    h1: t('h1'),
    canonical: root.querySelector('link[rel="canonical"]')?.getAttribute('href') ?? '',
    a: root.querySelectorAll('a[href]').length,
    img: root.querySelectorAll('img').length,
    h2: root.querySelectorAll('h2').length,
  };
}
async function routes() {
  const file = opt('routes', '');
  if (file) return fs.readFileSync(String(file), 'utf8').split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
  const sm = await fetchText(`${OLD}/sitemap.xml`);
  if (sm.status !== 200) { console.error(`mcco-parity: ${OLD}/sitemap.xml respondió ${sm.status}; usa --routes`); process.exit(2); }
  return [...sm.text.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => cleanPath(new URL(m[1].trim()).pathname));
}

const list = [...new Set(await routes())];
let fails = 0;
const rows = [];
for (const route of list) {
  const [o, n] = await Promise.all([fetchText(OLD + route), readNew(route)]);
  const so = summarize(o.text), sn = summarize(n.text);
  const diffs = [];
  if (o.status !== n.status) diffs.push(`status ${o.status}→${n.status}`);
  if (so && sn) {
    if (so.title !== sn.title) diffs.push('title');
    if (so.h1 !== sn.h1) diffs.push('h1');
    if (so.canonical !== sn.canonical) diffs.push(`canonical(${so.canonical || '∅'}→${sn.canonical || '∅'})`);
    for (const k of ['a', 'img', 'h2']) if (so[k] !== sn[k]) diffs.push(`${k} ${so[k]}→${sn[k]}`);
  }
  const hard = diffs.some((d) => d.startsWith('status') || d === 'title' || d === 'h1');
  if (hard || (STRICT && diffs.length)) fails++;
  rows.push({ route, status: `${o.status}/${n.status}`, diffs: diffs.join(', ') || '=', hard });
}
const w = Math.max(20, ...rows.map((r) => r.route.length));
console.log(`\nmcco-parity · ${OLD} → ${NEW} · ${rows.length} rutas\n`);
for (const r of rows) console.log(`  ${r.hard ? '✗' : r.diffs === '=' ? '✓' : '~'} ${r.route.padEnd(w)} ${r.status.padEnd(8)} ${r.diffs}`);
console.log(`\n  ${fails ? `${fails} ruta(s) con diferencias duras → NO pasa` : 'paridad OK'}${STRICT ? ' (strict)' : ''}.\n`);
process.exit(fails ? 1 : 0);
