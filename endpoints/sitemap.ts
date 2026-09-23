// sitemap.xml del kit: rutas estáticas de src/pages + colecciones, con la regla de URL limpia y
// lastmod real (frontmatter en contenido; último commit git en páginas). Uso en src/pages/sitemap.xml.ts:
//   import { makeSitemap } from '@mcco/web-kit/endpoints/sitemap';
//   export const GET = makeSitemap(import.meta.glob('/src/pages/**/*.{astro,html,md,mdx}'));
import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { loadSite } from '../lib/site.mjs';
import { staticRouteFiles } from '../lib/routes.mjs';
import { gitLastMod } from '../lib/git.mjs';

type Opts = { collections?: { name: string; base: string }[]; exclude?: string[] };
const DEFAULT_COLLECTIONS = [
  { name: 'blog', base: '/blog/' },
  { name: 'casos', base: '/casos/' },
  { name: 'guias', base: '/guias/' },
];

export function makeSitemap(globbed: Record<string, unknown>, opts: Opts = {}): APIRoute {
  return async () => {
    const site = loadSite();
    const base = site.domain;
    const exclude = new Set(opts.exclude ?? []);
    const urls: { loc: string; lastmod: string | null }[] = [];
    const seen = new Set<string>();
    const push = (route: string, lastmod: string | null) => {
      const loc = base + route;
      if (seen.has(loc)) return;
      seen.add(loc);
      urls.push({ loc, lastmod });
    };

    for (const c of opts.collections ?? DEFAULT_COLLECTIONS) {
      let entries: any[] = [];
      try {
        entries = await getCollection(c.name as any, ({ data }: any) => !data.draft);
      } catch {
        continue; // la colección no existe en este sitio
      }
      if (entries.length === 0) exclude.add(c.base); // índice vacío → fuera del sitemap (la página lleva noindex)
      for (const e of entries) {
        const d = e.data.updated ?? e.data.date;
        push(`${c.base}${e.id}`, d ? new Date(d).toISOString().slice(0, 10) : null);
      }
    }

    for (const [route, file] of [...staticRouteFiles(globbed)].sort()) {
      if (exclude.has(route)) continue;
      push(route, gitLastMod(file));
    }

    urls.sort((a, b) => a.loc.localeCompare(b.loc));
    const body =
      `<?xml version="1.0" encoding="UTF-8"?>\n` +
      `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
      urls.map((u) => `  <url>\n    <loc>${u.loc}</loc>${u.lastmod ? `\n    <lastmod>${u.lastmod}</lastmod>` : ''}\n  </url>`).join('\n') +
      `\n</urlset>\n`;
    return new Response(body, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
  };
}
