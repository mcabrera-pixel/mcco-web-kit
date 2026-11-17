// Idioma de las piezas del kit (WCAG 3.1.2). Una página es española si el subtag primario de su lang es «es»
// (es, es-CL, ES-cl, es-419); sin lang, las piezas siguen en español, como hasta v1.4.0. El kit solo tiene etiquetas
// en español y en inglés: con otro idioma (pt-BR, por ejemplo) salen en inglés, bajo el lang de la página.

/** true si `lang` es español o no viene; cualquier otro idioma usa las etiquetas en inglés del kit. */
export function esEspanol(lang) {
  if (lang == null || String(lang).trim() === '') return true;
  return String(lang).trim().split(/[-_]/)[0].toLowerCase() === 'es';
}
