#!/usr/bin/env node
// mcco-headers — genera public/_headers y public/_redirects desde site.yaml (correr en "prebuild").
// La CSP base es la que as-built.cl tiene verificada en producción; el sitio agrega orígenes en site.yaml → csp.*
// Las líneas propias del sitio se conservan bajo el marcador "# --- reglas del sitio ---" en cada archivo.
import fs from 'node:fs';
import path from 'node:path';
import { loadSite } from '../lib/site.mjs';

const site = loadSite();
const PUB = path.resolve('public');
fs.mkdirSync(PUB, { recursive: true });
const MARK = '# --- reglas del sitio ---';
const csp = site.csp;
const tracking = Boolean(site.analytics.ga4 || site.analytics.ads);

const src = {
  script: ["'self'", "'unsafe-inline'", 'https://challenges.cloudflare.com', 'https://static.cloudflareinsights.com'],
  style: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
  font: ["'self'", 'data:', 'https://fonts.gstatic.com'],
  img: ["'self'", 'data:', 'blob:'],
  media: ["'self'"],
  connect: ["'self'", 'https://challenges.cloudflare.com', 'https://cloudflareinsights.com'],
  frame: ['https://challenges.cloudflare.com'],
  form: ["'self'", 'https://api.web3forms.com'],
};
if (tracking) {
  src.script.push('https://www.googletagmanager.com', 'https://www.googleadservices.com', 'https://googleads.g.doubleclick.net', 'https://www.google.com');
  src.img.push('https://www.google.com', 'https://www.google.cl', 'https://www.googletagmanager.com', 'https://googleads.g.doubleclick.net', 'https://ad.doubleclick.net', 'https://www.googleadservices.com');
  src.connect.push('https://www.google-analytics.com', 'https://analytics.google.com', 'https://*.analytics.google.com', 'https://*.google-analytics.com', 'https://www.google.com', 'https://www.google.cl', 'https://www.googletagmanager.com', 'https://googleads.g.doubleclick.net', 'https://ad.doubleclick.net', 'https://www.googleadservices.com', 'https://stats.g.doubleclick.net');
  src.frame.push('https://td.doubleclick.net', 'https://www.googletagmanager.com');
}
if (csp.unsafe_eval) src.script.push("'unsafe-eval'");
for (const [k, key] of [['script', 'script_src'], ['style', 'style_src'], ['font', 'font_src'], ['img', 'img_src'], ['media', 'media_src'], ['connect', 'connect_src'], ['frame', 'frame_src'], ['form', 'form_action']]) {
  for (const o of csp[key] ?? []) if (!src[k].includes(o)) src[k].push(o);
}
const policy = [
  `default-src 'self'`,
  `script-src ${src.script.join(' ')}`,
  `style-src ${src.style.join(' ')}`,
  `font-src ${src.font.join(' ')}`,
  `img-src ${src.img.join(' ')}`,
  `media-src ${src.media.join(' ')}`,
  `connect-src ${src.connect.join(' ')}`,
  `frame-src ${src.frame.join(' ')}`,
  `form-action ${src.form.join(' ')}`,
  `object-src 'none'`,
  `base-uri 'self'`,
  `frame-ancestors 'none'`,
  `upgrade-insecure-requests`,
].join('; ');

const headers = `# Generado por mcco-headers desde site.yaml (Estándar Web MCCO v2 §8). No editar a mano: agrega orígenes en site.yaml → csp.
/*
  Content-Security-Policy: ${policy}
  Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
  X-Content-Type-Options: nosniff
  X-Frame-Options: DENY
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=()

# HTML: siempre revalidar
/*.html
  Cache-Control: no-cache, must-revalidate

# Assets con hash de Astro: inmutables
/_astro/*
  Cache-Control: public, max-age=31536000, immutable

# Imágenes y videos propios: 1 día
/assets/*
  Cache-Control: public, max-age=86400, must-revalidate

# CSS/JS sin hash: 1 hora
/*.css
  Cache-Control: public, max-age=3600, must-revalidate
/*.js
  Cache-Control: public, max-age=3600, must-revalidate

# SEO/GEO: 1 día
/robots.txt
  Cache-Control: public, max-age=86400
/sitemap.xml
  Cache-Control: public, max-age=86400
/llms.txt
  Cache-Control: public, max-age=86400
/llms-full.txt
  Cache-Control: public, max-age=86400
`;

const host = site.domain.replace('https://', '');
const hosts = [...(site.redirects?.www_to_apex === false ? [] : [`www.${host}`]), ...(site.redirects?.extra_hosts ?? [])];
const redirects = `# Generado por mcco-headers desde site.yaml (Estándar Web MCCO v2 §2). Hosts alternativos → canónico, 301.
${hosts.map((h) => `https://${h}/* ${site.domain}/:splat 301`).join('\n')}
`;

function writeKeepingCustom(file, generated) {
  let custom = '';
  if (fs.existsSync(file)) {
    const cur = fs.readFileSync(file, 'utf8');
    const i = cur.indexOf(MARK);
    if (i !== -1) custom = cur.slice(i + MARK.length).replace(/^\s+/, '');
  }
  fs.writeFileSync(file, `${generated}\n${MARK}\n${custom}`, 'utf8');
  console.log(`mcco-headers: ${path.relative(process.cwd(), file)} generado${custom ? ' (reglas del sitio conservadas)' : ''}`);
}
writeKeepingCustom(path.join(PUB, '_headers'), headers);
writeKeepingCustom(path.join(PUB, '_redirects'), redirects);
