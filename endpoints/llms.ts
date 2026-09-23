// llms.txt y llms-full.txt generados desde site.yaml + colecciones. No son palanca GEO comprobada
// (Ahrefs 2026: 97 % de los dominios sin una petición) pero mantenidos así cuestan cero.
// Uso: src/pages/llms.txt.ts       →  export { GET } from '@mcco/web-kit/endpoints/llms';
//      src/pages/llms-full.txt.ts  →  export { GETFull as GET } from '@mcco/web-kit/endpoints/llms';
import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { loadSite, loadSites, loadEntity } from '../lib/site.mjs';

async function posts(): Promise<any[]> {
  try {
    const list = await getCollection('blog' as any, ({ data }: any) => !data.draft);
    return list.sort((a: any, b: any) => +b.data.date - +a.data.date);
  } catch {
    return [];
  }
}

export const GET: APIRoute = async () => {
  const site = loadSite();
  const sites = loadSites();
  const entity = loadEntity();
  const list = await posts();
  const pages: { title: string; url: string }[] = site.llms?.pages ?? [];
  const out = [
    `# ${site.name}`,
    '',
    `> ${site.description.trim()}`,
    '',
    `Empresa: ${entity.legalName} (RUT ${entity.taxID}), ${entity.addressText}, Chile. Parte de MCCO Group.`,
    `Contacto: ${[site.contact.email, site.contact.whatsapp].filter(Boolean).join(' · ')}`,
    '',
    ...(pages.length ? ['## Páginas principales', ...pages.map((p) => `- [${p.title}](${site.domain}${p.url})`), ''] : []),
    ...(list.length ? ['## Artículos', ...list.map((p: any) => `- [${p.data.title}](${site.domain}/blog/${p.id}): ${p.data.description}`), ''] : []),
    '## Grupo MCCO',
    ...sites.filter((s: any) => s.domain !== site.domain).map((s: any) => `- [${s.name}](${s.domain}/): ${s.tagline}`),
    '',
    '## Opcional',
    `- [Sitemap](${site.domain}/sitemap.xml)`,
    `- [Versión completa](${site.domain}/llms-full.txt)`,
    '',
  ];
  return new Response(out.join('\n'), { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};

export const GETFull: APIRoute = async () => {
  const site = loadSite();
  const list = await posts();
  const out = [`# ${site.name} — contenido completo`, '', `> ${site.description.trim()}`, ''];
  for (const p of list) {
    out.push(`## ${p.data.title}`, `URL: ${site.domain}/blog/${p.id}`, `Fecha: ${p.data.date.toISOString().slice(0, 10)}`, '', p.data.capsule, '', p.body ?? '', '');
    if (p.data.faq?.length) out.push('### Preguntas frecuentes', ...p.data.faq.map((f: any) => `- **${f.q}** ${f.a}`), '');
  }
  return new Response(out.join('\n'), { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
