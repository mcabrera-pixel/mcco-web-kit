// JSON válido dentro de <script>: ningún texto puede cerrar el elemento HTML.
export function serializarJsonLd(valor) {
  return JSON.stringify(valor)
    .replace(/</g, '\\u003c')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}
