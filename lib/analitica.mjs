// Script en línea de gtag (GA4 y Google Ads) que emite components/Analytics.astro.
// gtag.js no se descarga al cargar la página: se pide con la primera interacción o a los 4 s, lo que ocurra primero y
// una sola vez. Mientras tanto la configuración y los eventos esperan en dataLayer, y gtag.js los envía al cargar.
// Es el patrón que as-built.cl usa desde octubre de 2026. Con la etiqueta en el <head>, la portada de condron.cl pasó
// de un LCP de 1,4 s a 4,4 s en Lighthouse móvil (mediana de 3, 22-nov-2026).
const EVENTOS = ['pointerdown', 'keydown', 'touchstart', 'scroll'];

export function gtagDiferido(ids, { espera = 4000 } = {}) {
  if (!ids.length) return '';
  const config = ids.map((id) => `gtag('config','${id}');`).join('');
  const src = `https://www.googletagmanager.com/gtag/js?id=${ids[0]}`;
  return `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());${config}`
    + `(function(){var pedido=false,reloj,ev=${JSON.stringify(EVENTOS)};`
    + `function cargar(){if(pedido)return;pedido=true;clearTimeout(reloj);ev.forEach(function(n){window.removeEventListener(n,cargar)});`
    + `var s=document.createElement('script');s.async=true;s.src='${src}';document.head.appendChild(s)}`
    + `ev.forEach(function(n){window.addEventListener(n,cargar,{once:true,passive:true})});reloj=setTimeout(cargar,${espera})})();`;
}
