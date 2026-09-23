#!/usr/bin/env node
// mcco-check — verificador ejecutable del Estándar Web MCCO v2 sobre dist/ (salida de `astro build`).
// Uso: mcco-check [--dist dist] [--strict] [--verbose] [--json]
// Sale con código 1 si hay errores. Las reglas están numeradas igual que en el estándar (R1…R10).
import fs from 'node:fs';
import path from 'node:path';
import { parse } from 'node-html-parser';
import { loadSite, loadEntity, loadBlacklist } from '../lib/site.mjs';
import { distFileToRoute, routeToDistCandidates } from '../lib/routes.mjs';

const argv = process.argv.slice(2);
const opt = (name, def) => {
  const i = argv.indexOf(`--${name}`);
  if (i === -1) return def;
  const v = argv[i + 1];
  return v === undefined || v.startsWith('--') ? true : v;
};
const DIST = path.resolve(String(opt('dist', 'dist')));
const STRICT = !!opt('strict', false);
const VERBOSE = !!opt('verbose', false);
const AS_JSON = !!opt('json', false);

const site = loadSite();
const entity = loadEntity();
const blacklist = loadBlacklist();
const findings = [];
const err = (rule, file, msg) => findings.push({ level: 'ERROR', rule, file, msg });
const warn = (rule, file, msg) => findings.push({ level: STRICT ? 'ERROR' : 'WARN', rule, file, msg });

if (!fs.existsSync(DIST)) {
  console.error(`mcco-check: no existe ${DIST}. Corre "astro build" primero.`);
  process.exit(2);
}

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out); else out.push(p);
  }
  return out;
}
const files = walk(DIST);
const rel = (p) => path.relative(DIST, p).split(path.sep).join('/');
const exists = (r) => fs.existsSync(path.join(DIST, String(r).replace(/^\//, '')));

// ── R1 archivos obligatorios ──────────────────────────────────────────────────────────────
for (const f of ['index.html', '404.html', 'robots.txt', 'sitemap.xml', 'llms.txt', '_headers']) {
  if (!exists(f)) err('R1-archivos', f, 'archivo obligatorio ausente');
}
if (site.indexnow_key && !exists(`${site.indexnow_key}.txt`)) {
  err('R1-archivos', `${site.indexnow_key}.txt`, 'clave IndexNow declarada en site.yaml pero no servida');
}

// ── páginas ───────────────────────────────────────────────────────────────────────────────
const pages = [];
for (const f of files.filter((x) => x.endsWith('.html'))) {
  const r = rel(f);
  const html = fs.readFileSync(f, 'utf8');
  const root = parse(html, { comment: false });
  const robots = root.querySelector('meta[name="robots"]')?.getAttribute('content') ?? '';
  pages.push({ file: r, route: distFileToRoute(r), html, root, is404: r === '404.html', noindex: /noindex/i.test(robots) });
}

// ── R2 cabecera por página ────────────────────────────────────────────────────────────────
for (const p of pages) {
  const { file, root, html } = p;
  const q = (s) => root.querySelector(s);
  const qa = (s) => root.querySelectorAll(s);
  if (!/<html[^>]*\slang=/i.test(html)) err('R2-lang', file, '<html> sin atributo lang');
  const titles = qa('title');
  if (titles.length !== 1) err('R2-title', file, `${titles.length} <title> (debe ser exactamente 1)`);
  else {
    const t = titles[0].text.trim();
    if (!t) err('R2-title', file, 'title vacío');
    else if (t.length > 65) warn('R2-title', file, `title de ${t.length} caracteres (≤60 recomendado)`);
  }
  const desc = q('meta[name="description"]')?.getAttribute('content')?.trim() ?? '';
  if (!desc) err('R2-description', file, 'sin meta description');
  else if (desc.length < 70 || desc.length > 160) warn('R2-description', file, `description de ${desc.length} caracteres (70-160)`);
  if (!q('meta[name="viewport"]')) err('R2-viewport', file, 'sin meta viewport');
  if (!p.is404) {
    const canon = qa('link[rel="canonical"]');
    if (canon.length !== 1) err('R2-canonical', file, `${canon.length} canonical (debe ser exactamente 1)`);
    else {
      const href = canon[0].getAttribute('href');
      const expected = site.domain + p.route;
      if (href !== expected) err('R2-canonical', file, `canonical "${href}" ≠ esperado "${expected}"`);
    }
    const h1 = qa('h1');
    if (h1.length === 0) warn('R2-h1', file, 'sin H1');
    else if (h1.length > 1) warn('R2-h1', file, `${h1.length} H1 (debe ser 1)`);
    if (!q('meta[property="og:title"]')) warn('R2-og', file, 'sin Open Graph (og:title)');
  }
}

// ── R3 sitemap ↔ páginas indexables ───────────────────────────────────────────────────────
if (exists('sitemap.xml')) {
  const xml = fs.readFileSync(path.join(DIST, 'sitemap.xml'), 'utf8');
  const locs = new Set([...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim()));
  const expected = new Set(pages.filter((p) => !p.is404 && !p.noindex).map((p) => site.domain + p.route));
  for (const l of locs) {
    if (!l.startsWith(site.domain + '/')) err('R3-sitemap', 'sitemap.xml', `loc fuera del dominio: ${l}`);
    else if (!expected.has(l)) err('R3-sitemap', 'sitemap.xml', `loc sin página o con noindex: ${l}`);
  }
  for (const e of expected) if (!locs.has(e)) err('R3-sitemap', 'sitemap.xml', `página indexable fuera del sitemap: ${e}`);
  if (/\.html<\/loc>/.test(xml)) warn('R3-sitemap', 'sitemap.xml', 'hay <loc> con .html (la URL canónica es la limpia)');
}

// ── R4 enlaces y recursos internos ────────────────────────────────────────────────────────
function checkInternal(p, raw) {
  const clean = raw.split('#')[0].split('?')[0];
  if (!clean) return;
  let target = clean.startsWith('/') ? clean : path.posix.normalize(path.posix.join(path.posix.dirname('/' + p.file), clean));
  try { target = decodeURIComponent(target); } catch { /* ruta rara: se evalúa tal cual */ }
  const ok = routeToDistCandidates(target).some((c) => exists(c)) || exists(target);
  if (!ok) err('R4-enlaces', p.file, `enlace o recurso interno roto: ${raw}`);
}
for (const p of pages) {
  const nodes = p.root.querySelectorAll('a[href], link[href], img[src], script[src], source[src], video[src], video[poster], iframe[src]');
  for (const n of nodes) {
    const raw = n.getAttribute('href') ?? n.getAttribute('src') ?? n.getAttribute('poster');
    if (!raw) continue;
    if (/^http:\/\//i.test(raw)) warn('R4-mixed', p.file, `recurso http:// (contenido mixto): ${raw.slice(0, 90)}`);
    if (raw.startsWith(site.domain + '/')) { checkInternal(p, raw.slice(site.domain.length)); continue; }
    if (/^(#|mailto:|tel:|javascript:|data:|https?:\/\/|\/\/|wa\.me)/i.test(raw)) continue;
    checkInternal(p, raw);
  }
}

// ── R5 JSON-LD ────────────────────────────────────────────────────────────────────────────
for (const p of pages) {
  const types = [];
  for (const b of p.root.querySelectorAll('script[type="application/ld+json"]')) {
    try {
      const d = JSON.parse(b.rawText || b.text);
      const items = Array.isArray(d) ? d : d['@graph'] ?? [d];
      for (const it of items) {
        const t = it['@type'];
        for (const x of Array.isArray(t) ? t : [t]) types.push({ t: x, it });
      }
    } catch (e) {
      err('R5-jsonld', p.file, `JSON-LD inválido: ${String(e.message).slice(0, 70)}`);
    }
  }
  if (p.route === '/') {
    const org = types.find((x) => ['Organization', 'ProfessionalService', 'LocalBusiness'].includes(x.t));
    if (!org) err('R5-organization', p.file, 'home sin JSON-LD Organization');
    else {
      if (!org.it.taxID) warn('R5-organization', p.file, 'Organization sin taxID');
      else if (org.it.taxID !== entity.taxID) err('R5-organization', p.file, `taxID "${org.it.taxID}" ≠ entidad ${entity.taxID}`);
      if (site.role !== 'corporativa' && !org.it.parentOrganization) err('R5-organization', p.file, 'Organization sin parentOrganization (MCCO Group)');
      if (org.it.aggregateRating) err('R5-organization', p.file, 'aggregateRating en Organization (prohibido: no hay reseñas verificables)');
    }
  }
  if (/^\/(blog|guias)\/[^/]+$/.test(p.route) && !types.some((x) => ['BlogPosting', 'Article', 'TechArticle'].includes(x.t))) {
    err('R5-post', p.file, 'artículo sin JSON-LD BlogPosting/Article');
  }
  if (types.some((x) => x.t === 'Review' || x.t === 'AggregateRating')) {
    warn('R5-reviews', p.file, 'Review/AggregateRating presente: solo con reseñas reales y verificables');
  }
}

// ── R6 prohibidos: NDA + verdad del sitio + placeholders ─────────────────────────────────
const forbidden = [
  ...blacklist.terms.map((t) => ({ t, k: 'NDA' })),
  ...site.forbidden.map((t) => ({ t, k: 'verdad' })),
];
const placeholders = ['lorem ipsum', 'TODO:', 'EDITAR:', 'TBD', 'XXXX', 'PLACEHOLDER', 'tupagina', 'example.com', 'YOUR_'];
for (const p of pages) {
  const low = p.html.toLowerCase();
  for (const f of forbidden) if (low.includes(f.t.toLowerCase())) err(`R6-${f.k}`, p.file, `término prohibido (${f.k}): "${f.t}"`);
  for (const ph of placeholders) if (p.html.includes(ph)) err('R6-placeholder', p.file, `placeholder en producción: "${ph}"`);
}
for (const f of ['llms.txt', 'llms-full.txt', 'sitemap.xml', 'robots.txt']) {
  if (!exists(f)) continue;
  const low = fs.readFileSync(path.join(DIST, f), 'utf8').toLowerCase();
  for (const b of blacklist.terms) if (low.includes(b.toLowerCase())) err('R6-NDA', f, `término NDA: "${b}"`);
}

// ── R7 huella de entidad (RUT + dirección) en toda página indexable ──────────────────────
const street = entity.address.streetAddress.toLowerCase().split(',')[0];
for (const p of pages) {
  if (p.is404) continue;
  const low = p.html.toLowerCase();
  const hasRut = low.includes(entity.taxID.toLowerCase());
  const hasAddr = low.includes(street);
  if (!hasRut || !hasAddr) {
    const falta = [!hasRut && 'RUT', !hasAddr && 'dirección'].filter(Boolean).join(' ni ');
    (site.legacy_pages ? warn : err)('R7-entidad', p.file, `sin ${falta} de la entidad (bloque Grupo MCCO)`);
  }
}

// ── R8 _headers: seguridad + CSP coherente con los scripts externos ──────────────────────
if (exists('_headers')) {
  const h = fs.readFileSync(path.join(DIST, '_headers'), 'utf8');
  for (const need of ['Content-Security-Policy', 'Strict-Transport-Security', 'X-Content-Type-Options']) {
    if (!h.includes(need)) err('R8-headers', '_headers', `falta ${need}`);
  }
  const csp = (h.match(/Content-Security-Policy:\s*([^\n]+)/) ?? [])[1] ?? '';
  const scriptSrc = (csp.match(/script-src([^;]*)/) ?? [])[1] ?? (csp.match(/default-src([^;]*)/) ?? [])[1] ?? '';
  const allowed = scriptSrc.split(/\s+/).filter(Boolean);
  const originOk = (o) => allowed.includes('https:') || allowed.some((a) =>
    a === o || (a.startsWith('https://*.') && o.endsWith(a.slice('https://*'.length))));
  const seen = new Set();
  for (const p of pages) {
    for (const s of p.root.querySelectorAll('script[src]')) {
      const m = (s.getAttribute('src') ?? '').match(/^(https?:\/\/[^/]+)/);
      if (!m || seen.has(m[1])) continue;
      seen.add(m[1]);
      if (!originOk(m[1])) err('R8-csp', p.file, `script externo ${m[1]} no permitido por script-src de _headers`);
    }
  }
  if (/unsafe-eval/.test(csp) && !site.csp.unsafe_eval) warn('R8-csp', '_headers', "CSP con 'unsafe-eval' sin justificar (site.yaml csp.unsafe_eval)");
}

// ── R9 peso de assets ────────────────────────────────────────────────────────────────────
const IMG = /\.(png|jpe?g|webp|avif|gif)$/i;
const VID = /\.(mp4|webm|mov)$/i;
for (const f of files) {
  const s = fs.statSync(f).size;
  const r = rel(f);
  if (IMG.test(r)) {
    if (s > 2_000_000) err('R9-assets', r, `imagen de ${(s / 1e6).toFixed(1)} MB (>2 MB)`);
    else if (s > 300_000) warn('R9-assets', r, `imagen de ${(s / 1e3).toFixed(0)} KB (>300 KB; hero ≤150 KB WebP)`);
  }
  if (VID.test(r) && s > 10_000_000) err('R9-video', r, `video de ${(s / 1e6).toFixed(1)} MB en el repo (>10 MB: usar Cloudflare R2)`);
}
const ogRel = String(site.seo.og_image ?? '/og.webp').replace(/^\//, '');
if (exists(ogRel)) {
  const s = fs.statSync(path.join(DIST, ogRel)).size;
  if (s > 600_000) warn('R9-og', ogRel, `og:image de ${(s / 1e3).toFixed(0)} KB (>600 KB)`);
} else if (site.seo.og_image) warn('R9-og', ogRel, 'og:image declarada en site.yaml pero no existe en dist');

// ── R10 hreflang en páginas EN ───────────────────────────────────────────────────────────
for (const p of pages.filter((x) => x.route === '/en' || x.route.startsWith('/en/'))) {
  if (!p.root.querySelector('link[rel="alternate"][hreflang]')) warn('R10-hreflang', p.file, 'página EN sin hreflang recíproco');
}

// ── salida ───────────────────────────────────────────────────────────────────────────────
const byRule = {};
for (const f of findings) {
  byRule[f.rule] ??= { ERROR: 0, WARN: 0, items: [] };
  byRule[f.rule][f.level]++;
  byRule[f.rule].items.push(f);
}
const errors = findings.filter((f) => f.level === 'ERROR').length;
const warns = findings.length - errors;
if (AS_JSON) {
  console.log(JSON.stringify({ site: site.key, dist: DIST, pages: pages.length, errors, warns, findings }, null, 2));
} else {
  console.log(`\nmcco-check · ${site.name} (${site.domain}) · ${pages.length} páginas · dist=${path.relative(process.cwd(), DIST) || '.'}\n`);
  const rules = Object.keys(byRule).sort();
  if (!rules.length) console.log('  ✓ sin hallazgos');
  for (const r of rules) {
    const g = byRule[r];
    console.log(`  ${g.ERROR ? '✗' : '!'} ${r.padEnd(18)} ${g.ERROR} error(es) · ${g.WARN} aviso(s)`);
    const show = VERBOSE ? g.items : g.items.slice(0, 8);
    for (const it of show) console.log(`      ${it.level === 'ERROR' ? 'E' : 'W'} ${it.file}: ${it.msg}`);
    if (!VERBOSE && g.items.length > 8) console.log(`      … ${g.items.length - 8} más (--verbose)`);
  }
  console.log(`\n  Resultado: ${errors} error(es), ${warns} aviso(s) → ${errors ? 'NO CUMPLE' : 'CUMPLE'} el Estándar Web MCCO v2${STRICT ? ' (strict)' : ''}.\n`);
}
process.exit(errors ? 1 : 0);
