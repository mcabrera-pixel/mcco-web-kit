// robots.txt: todo permitido + crawlers de IA y búsqueda nombrados explícitamente (decisión MCCO 2026-09-05:
// permitir TODOS los bots IA). El robots "gestionado" de Cloudflare pisa este archivo si está activo (§9, zona).
// Uso: src/pages/robots.txt.ts →  export { GET } from '@mcco/web-kit/endpoints/robots';
import type { APIRoute } from 'astro';
import { loadSite, loadBots } from '../lib/site.mjs';

export const GET: APIRoute = () => {
  const site = loadSite();
  const bots: { ua: string; owner: string }[] = loadBots();
  const lines = [
    `# ${site.name} — ${site.domain}`,
    'User-agent: *',
    'Allow: /',
    '',
    '# Crawlers de IA y búsqueda permitidos explícitamente (Estándar Web MCCO v2 §9)',
    ...bots.flatMap((b) => [`User-agent: ${b.ua}`, 'Allow: /', '']),
    `Sitemap: ${site.domain}/sitemap.xml`,
    '',
  ];
  return new Response(lines.join('\n'), { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
