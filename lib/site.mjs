// Carga del manifiesto site.yaml (única fuente de verdad del sitio) y de los datos del grupo.
// Los JSON del grupo se importan estáticamente: así Vite los empaqueta dentro del build de Astro
// y Node los resuelve igual cuando corren los bins (mcco-check, mcco-headers).
import fs from 'node:fs';
import path from 'node:path';
import YAML from 'yaml';
import entityData from '../data/entity.json' with { type: 'json' };
import sitesData from '../data/sites.json' with { type: 'json' };
import botsData from '../data/ai-bots.json' with { type: 'json' };
import blacklistData from '../data/blacklist.json' with { type: 'json' };

const REQUIRED = ['key', 'name', 'domain', 'description', 'role', 'cloudflare'];
let cache = null;

/** @returns {import('./site-types').SiteConfig} */
export function loadSite(cwd = process.cwd()) {
  if (cache) return cache;
  const file = path.resolve(cwd, 'site.yaml');
  if (!fs.existsSync(file)) {
    throw new Error(`site.yaml no encontrado en ${cwd}. Todo sitio MCCO declara su manifiesto en la raíz del repo (Estándar Web v2 §2).`);
  }
  const raw = YAML.parse(fs.readFileSync(file, 'utf8')) ?? {};
  for (const k of REQUIRED) {
    if (raw[k] === undefined || raw[k] === '') throw new Error(`site.yaml: falta el campo obligatorio "${k}"`);
  }
  if (!raw.cloudflare.project) throw new Error('site.yaml: falta cloudflare.project');
  raw.domain = String(raw.domain).replace(/\/+$/, '');
  if (!/^https:\/\/[a-z0-9.-]+$/.test(raw.domain)) {
    throw new Error(`site.yaml: domain debe ser https://host sin ruta ("${raw.domain}")`);
  }
  raw.lang ??= 'es-CL';
  raw.locales ??= ['es'];
  raw.seo ??= {};
  raw.contact ??= {};
  raw.analytics ??= {};
  raw.csp ??= {};
  raw.forbidden ??= [];
  raw.content ??= {};
  raw.content.blog_dir ??= 'src/content/blog';
  cache = raw;
  return raw;
}

export function resetSiteCache() { cache = null; }

/** Entidad legal del grupo (RUT, dirección, fundación, fundador). */
export function loadEntity() { return entityData; }
/** Red de sitios del grupo (dominio, nombre, rol, tagline). */
export function loadSites() { return sitesData; }
/** Crawlers de IA y búsqueda permitidos explícitamente en robots.txt. */
export function loadBots() { return botsData; }
/** Términos vetados por NDA (triple gate: motor, check, publisher). */
export function loadBlacklist() { return blacklistData; }
