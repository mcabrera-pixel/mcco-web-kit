// Configuración Astro estándar MCCO. Uso en astro.config.mjs del sitio:
//   import { defineConfig } from 'astro/config';
//   import { mccoConfig } from '@mcco/web-kit/config';
//   export default defineConfig(mccoConfig());
import { loadSite } from '../lib/site.mjs';

export function mccoConfig(overrides = {}) {
  const site = loadSite();
  const base = {
    site: site.domain,
    trailingSlash: 'ignore',
    build: { format: 'preserve' },
    vite: { ssr: { noExternal: ['@mcco/web-kit'] } },
  };
  return deepMerge(base, overrides);
}

function deepMerge(a, b) {
  const out = { ...a };
  for (const [k, v] of Object.entries(b ?? {})) {
    const both = v && typeof v === 'object' && !Array.isArray(v) && a[k] && typeof a[k] === 'object' && !Array.isArray(a[k]);
    out[k] = both ? deepMerge(a[k], v) : v;
  }
  return out;
}
