// Datos de un artículo del blog (v1.5.0): fechas, autor, lectura, BlogPosting y BreadcrumbList. Los usan el layout Post
// y el componente ArticuloBlog, y cabeceraArticulo da las props de <head> que el layout de un sitio pasa a Base o a
// Estandar (type article, imagen y fechas de Open Graph).
import { loadSite } from './site.mjs';
import { canonicalFor } from './routes.mjs';

export const ZONA_ARTICULO = 'America/Santiago';

// Una fecha sin hora (`date: 2026-11-16` en el frontmatter) llega como medianoche UTC: es un día de calendario y se lee
// en UTC. Con hora, el día es el de la zona del sitio. Así ninguna de las dos cae en el día anterior.
const zonaDe = (fecha, zona) => {
  const soloDia = fecha.getUTCHours() === 0 && fecha.getUTCMinutes() === 0 && fecha.getUTCSeconds() === 0 && fecha.getUTCMilliseconds() === 0;
  return soloDia ? 'UTC' : zona;
};

/** Día del artículo como AAAA-MM-DD. */
export function diaArticulo(fecha, zona = ZONA_ARTICULO) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: zonaDe(fecha, zona), year: 'numeric', month: '2-digit', day: '2-digit' }).format(fecha);
}

/** Día del artículo en texto, en español de Chile («16 de noviembre de 2026»). */
export function fechaArticulo(fecha, zona = ZONA_ARTICULO) {
  return fecha.toLocaleDateString('es-CL', { year: 'numeric', month: 'long', day: 'numeric', timeZone: zonaDe(fecha, zona) });
}

/**
 * Todo lo que el artículo calcula a partir de la entrada de la colección.
 * @param {any} post entrada de la colección blog
 * @param {{ pathname: string, lang?: string, section?: string, sectionTitle?: string, wordCount?: number, zona?: string }} opciones
 */
export function datosArticulo(post, { pathname, lang, section = 'blog', sectionTitle = 'Blog', wordCount, zona = ZONA_ARTICULO }) {
  const site = loadSite();
  const d = post.data;
  const idioma = lang ?? site.lang;
  const url = canonicalFor(pathname, site.domain);
  const author = d.author ?? site.content?.author ?? { name: 'MCCO Group', role: '' };
  const published = diaArticulo(d.date, zona);
  const modified = diaArticulo(d.updated ?? d.date, zona);
  const words = wordCount ?? (post.body ? post.body.split(/\s+/).filter(Boolean).length : undefined);
  const minutes = words ? Math.max(1, Math.round(words / 200)) : undefined;
  const hero = new URL(d.hero?.src ?? site.seo?.og_image ?? '/og.webp', site.domain).href;
  const logo = new URL(site.seo?.logo ?? '/logo.png', site.domain).href;

  const blogPosting = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: d.title,
    description: d.description,
    image: hero,
    datePublished: published,
    dateModified: modified,
    inLanguage: idioma,
    author: { '@type': 'Person', name: author.name, jobTitle: author.role, worksFor: { '@id': `${site.domain}/#organization` } },
    publisher: { '@type': 'Organization', name: site.name, url: `${site.domain}/`, logo: { '@type': 'ImageObject', url: logo } },
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
  };
  if (words) blogPosting.wordCount = words;
  if (d.sources?.length) blogPosting.citation = d.sources.map((s) => s.url);

  const breadcrumb = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Inicio', item: `${site.domain}/` },
      { '@type': 'ListItem', position: 2, name: sectionTitle, item: `${site.domain}/${section}/` },
      { '@type': 'ListItem', position: 3, name: d.title, item: url },
    ],
  };
  return { url, author, published, modified, words, minutes, hero, fecha: fechaArticulo(d.date, zona), blogPosting, breadcrumb };
}

/**
 * Props de <head> del artículo para el layout del sitio: <Sitio {...cabeceraArticulo(post, Astro.url)}>.
 * El JSON-LD no va aquí: lo emite ArticuloBlog.
 */
export function cabeceraArticulo(post, url, opciones = {}) {
  const { published, modified, hero } = datosArticulo(post, { ...opciones, pathname: url.pathname ?? String(url) });
  const d = post.data;
  return { title: d.seo_title ?? d.title, description: d.description, type: 'article', ogImage: hero, published, modified };
}
