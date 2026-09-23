// Reglas de URL del Estándar Web MCCO v2: la URL canónica es la que sirve Cloudflare Pages
// (sin ".html"; carpetas con "/"), sobre archivos físicos que Astro conserva con build.format = "preserve".

/** '/blog/x.html' → '/blog/x' · '/servicio/index.html' → '/servicio/' · '/index.html' → '/' */
export function cleanPath(p) {
  let r = String(p).replace(/\.html$/, '');
  if (r.endsWith('/index')) r = r.slice(0, -'index'.length);
  return r === '' ? '/' : r;
}

export function canonicalFor(pathname, domain) {
  return String(domain).replace(/\/+$/, '') + cleanPath(pathname);
}

/** Clave de import.meta.glob('/src/pages/**') → ruta canónica. */
export function urlFromPagePath(key) {
  let r = String(key).replace(/^.*\/src\/pages/, '').replace(/\.(astro|html|md|mdx)$/, '');
  if (r.endsWith('/index')) r = r.slice(0, -'index'.length);
  return r === '' ? '/' : r;
}

/** Mapa ruta → archivo fuente para las páginas estáticas de src/pages (sin dinámicas, privadas ni 404). */
export function staticRouteFiles(globbed) {
  const map = new Map();
  for (const k of Object.keys(globbed)) {
    const rel = k.replace(/^.*\/src\/pages/, '');
    if (/\/(_|\[)/.test(rel)) continue;
    const route = urlFromPagePath(k);
    if (route === '/404') continue;
    map.set(route, 'src/pages' + rel);
  }
  return map;
}

/** Rutas estáticas declaradas en src/pages, ordenadas. */
export function staticRoutes(globbed, { exclude = [] } = {}) {
  return [...staticRouteFiles(globbed).keys()].filter((r) => !exclude.includes(r)).sort();
}

/** 'blog/x.html' (relativo a dist) → '/blog/x' */
export function distFileToRoute(rel) {
  return cleanPath('/' + String(rel).replace(/\\/g, '/'));
}

/** Archivos de dist que Cloudflare serviría para una ruta interna. */
export function routeToDistCandidates(route) {
  const r = String(route).replace(/^\//, '');
  if (r === '') return ['index.html'];
  if (r.endsWith('/')) return [r + 'index.html', r.slice(0, -1) + '.html'];
  if (/\.[a-z0-9]{2,5}$/i.test(r)) return [r];
  return [r + '.html', r + '/index.html'];
}
