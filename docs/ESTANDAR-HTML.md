# Contrato HTML del estándar v1.3

`mcco-estandar-copiar public/estandar --completo` copia el artefacto ya construido. El destino solo necesita Node
para copiar y un servidor estático para servirlo. No hay runtime de Astro ni dependencia de esbuild en la web.
No mezclar fuentes JS del modo base con módulos de `dist`: crearía dos instancias de pausa.

El [ejemplo completo](estandar-ejemplo.html) contiene todas las piezas, incluidos pie del sitio y rótulos. Es HTML
escrito directamente con los selectores públicos, sin atributos generados por Astro. Sus activos `/media/` son
fixtures, reemplazables por medios autorizados del sitio. La fixture ejecutable equivalente está en
`test/fixtures/estandar-html/index.html`; se compara con los componentes reales de la fixture Astro.

## Cabecera y carga

```html
<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width">
  <title>Título del sitio</title>
  <link rel="stylesheet" href="/estandar/styles/estandar.css">
  <link rel="stylesheet" href="/estandar/styles/estandar-componentes.css">
  <link rel="stylesheet" href="/css/theme.css">
  <script type="module" src="/estandar/lib/estandar/menu.js"></script>
  <script type="module" src="/estandar/lib/estandar/subnav.js"></script>
  <script type="module" src="/estandar/lib/estandar/nube.js"></script>
  <script type="module" src="/estandar/lib/estandar/campo.js"></script>
  <script type="module" src="/estandar/lib/visual/video.js"></script>
</head>
<body class="std">
  <!-- NavGlobal, SubNav, main y footer: ver ejemplo completo -->
</body>
</html>
```

Mantener juntas ambas hojas y `styles/fuentes/`, cuya licencia OFL debe acompañarlas. Las URL de las fuentes son
relativas a la hoja; no dependen del directorio de la página. Se puede precargar Inter latina con
`rel="preload" as="font" type="font/woff2" crossorigin` y su ruta copiada, una sola vez. No se requiere CDN.

Cargar solo las entradas que usa la página. `nube.js` incluye hero e historia; no cargar por separado un segundo
runtime de historia. Los módulos se ejecutan después del análisis del HTML. No importarlos antes de insertar el
marcado: el contrato es un documento estático, no un montaje dinámico de SPA.

La CSP permite scripts, estilos, fuentes y Worker de `'self'`; declarar `worker-src 'self'`. Las propiedades CSS
por elemento (`--formas`, `--w`, `--h`, `--logo`) pueden ir en una hoja local si la política prohíbe estilos inline.
Autorizar por separado los orígenes reales de imágenes/video del sitio. Servir `.js` como JavaScript, `.css` como
CSS, `.woff2` como fuente y `.mp4` como video. No abrir el documento como `file://`.

## Piezas y atributos

| Pieza | Contrato público mínimo (estructura completa en el ejemplo) | Runtime |
|---|---|---|
| NavGlobal | `header.std-gnav[data-std-gnav] > nav.std-gnav__in`; logo, botón `[data-std-menu]` con `aria-expanded="false"` y `aria-controls` igual al ID de `ul.std-gnav__enlaces` | `menu.js` |
| SubNav | `.std-subnav > .std-subnav__in`, título y `nav.std-subnav__nav`, enlaces y acción `.std-subnav__accion`; hija directa de body para sticky | `subnav.js` |
| HeroEstandar | `section.std-hero`, H1 `.std-h1`, bajada `.std-lead.std-hero__bajada`, acciones, campo/nube opcionales y pausa | nube/campo según uso |
| NubeAncla | `.std-nube[data-std-nube="hero"][role="img"][aria-label]` con imagen `.std-nube__respaldo`, dimensiones y copia noscript | `nube.js` |
| HistoriaNube | `section.std-historia[data-std-historia][data-std-oscuro]` con `--formas: N`, pin/caja, título, visual, ancla, fijas, pasos y pie | `nube.js` |
| CampoAntigravity | `.std-campo[data-std-campo][aria-hidden="true"]` dentro del hero, y botón de pausa del hero | `campo.js` |
| Bloque | `section.std-bloque.std-bloque--claro`, `--parchment`, `--negro` o `--negro-suave`; los negros llevan `data-std-oscuro` | ninguno |
| Acciones | `.std-acciones` con enlaces `.std-pildora`, `--fantasma`, `--chica` o `.std-mas`; texto adicional `.std-oculto` | ninguno |
| GrillaProductos | `section.std-grilla` con artículos Producto | ninguno |
| Producto | `article.std-producto.std-producto--parchment` (o claro/negro/negro-suave), texto, título, acciones y figura con foto/rótulo; `--ancho` ocupa ambas columnas | ninguno |
| Galeria | `ul.std-galeria.std-galeria--cuadros` o `--mosaico`, li con `--w`/`--h`, figura, marco, imagen/video, rótulo y pie | `video.js` si hay videos |
| Cifras | `.std-cifras > dl.std-cifras__lista > .std-cifras__item > dt.std-cifras__valor + dd.std-cifras__etiqueta`, nota `.std-fina.std-cifras__nota` opcional | ninguno |
| TarjetasMarca | `ul.std-marcas > li > a.std-marca[data-std-oscuro]` (div si no hay enlace), máscara `.std-marca__logo` con `--logo` y altura, frase/pie | ninguno |
| Pie del sitio | `footer` con contenido propio; se puede vestir con `.std-bloque.std-bloque--parchment` | ninguno |

No quitar la lista de enlaces del menú sin JS: el runtime añade `data-std-menu-listo` después de instalar sus
manejadores y solo entonces la hoja colapsa la lista. `is-abierta`, `is-oscura`, `data-estado`, `data-std-fija` y
`data-std-movimiento` son estados administrados por el kit; no se deben fijar en el HTML inicial. Usar IDs únicos.

Historia lleva de una a cuatro imágenes `img[data-std-forma]` con `src`, `alt`, 960 × 540, bajo
`.std-historia__visual[data-std-visual] > ul.std-historia__fijas`. Esa misma zona contiene
`.std-historia__nube[data-std-nube="historia"]` con nombre accesible. Fuera de la zona visual, un
`ol.std-historia__pasos` lleva exactamente un `li.std-historia__paso[data-std-paso]` por activo, con etapa y título.
El pie contiene rótulo y `button.std-historia__pausa[data-std-pausa][hidden]`. El primer activo debe coincidir con
el respaldo del hero. No esconder las imágenes fijas inicialmente: funcionan sin JS, WebGL o módulo descargado.

El pie propio no importa analítica ni `Base.astro`. La salida HTML no incorpora automáticamente `FooterGrupo`:
el sitio conserva su pie y sus enlaces legales/de grupo. Los componentes y layouts Astro siguen teniendo su API.

## Nube sin historia

```html
<section class="std-hero" aria-labelledby="titulo">
  <button type="button" class="std-hero__pausa" data-std-pausa>Pausar movimiento</button>
  <h1 class="std-h1" id="titulo">Título del sitio</h1>
  <figure class="std-hero__nube">
    <div class="std-nube" data-std-nube="hero" role="img" aria-label="Descripción del activo">
      <img class="std-nube__respaldo" src="/media/activo.webp" alt="" width="960" height="540"
        loading="lazy" decoding="async" data-origen="ilustracion">
      <noscript><img class="std-nube__respaldo std-nube__respaldo--sin-js" src="/media/activo.webp"
        alt="" width="960" height="540" data-origen="ilustracion"></noscript>
    </div>
    <figcaption class="std-fina std-hero__rotulo" data-rotulo>Ilustración en nube de puntos.</figcaption>
  </figure>
</section>
<script type="module" src="/estandar/lib/estandar/nube.js"></script>
```

Una sola nube por documento. Sin historia, muestrea la imagen del hero y conserva el control de pausa.

## Campo con pausa, sin nube

```html
<section class="std-hero" aria-labelledby="titulo">
  <div class="std-campo" data-std-campo aria-hidden="true"></div>
  <button type="button" class="std-hero__pausa" data-std-pausa>Pausar movimiento</button>
  <h1 class="std-h1" id="titulo">Título del sitio</h1>
  <p class="std-lead std-hero__bajada">Contenido del hero.</p>
</section>
<script type="module" src="/estandar/lib/estandar/campo.js"></script>
```

Un campo por documento, solo en el hero para esta adopción. El botón se muestra cuando el campo funciona y
siempre conserva la posibilidad de reanudar. No lleva `aria-pressed`; su texto dice la acción.

Para integrar un diálogo del sitio, importar la misma API que usa el runtime:

```js
import { pausado, fijarPausa } from '/estandar/lib/estandar/pausa.js';
let anterior;
function abrir() { anterior = pausado(); fijarPausa(true); }
function cerrar() { fijarPausa(anterior); }
```

Conservar el estado previo; no reanudar una pausa pedida por la persona. Cambiar la pausa emite `std-pausa` con
`detail.pausa`. `marcarMovimiento` también se exporta, para el uso interno del kit. No duplicar los handlers.

## Medios, rótulos y video

El rótulo visible es `.std-rotulo[data-rotulo]` dentro de una figura/marco con `position: relative`. La figura y la
imagen llevan `data-origen`. Textos: `real` → Foto de faena (Video de faena en video), `render` → Render 3D,
`ilustracion` → Ilustración, `esquema` → Esquema, `captura` → Captura de simulación. El rótulo no sustituye `alt`.
En HTML el generador del sitio pone el texto; los helpers de Astro no son un runtime de navegador.

```html
<li class="std-galeria__item" style="--w:1280;--h:720">
  <figure class="std-galeria__figura" data-origen="real">
    <div class="std-galeria__marco" data-mcco-video>
      <video muted playsinline loop preload="none" poster="/media/poster.webp"
        aria-label="Descripción de la toma" width="1280" height="720" data-origen="real">
        <source src="/media/video.mp4" type="video/mp4">
      </video>
      <span class="std-rotulo" data-rotulo>Video de faena</span>
      <button type="button" class="std-galeria__boton" data-video-boton data-accion="pausar" hidden>
        Pausar video <span aria-hidden="true">Ⅱ</span>
      </button>
    </div>
  </figure>
</li>
```

El `li` va dentro de la galería. Sin JS se ve el poster; con Save-Data o movimiento reducido no hay descarga ni
reproducción automática. El botón permite reproducción a pedido. Para medios nuevos del sitio: H.264/faststart,
poster WebP, ≤8 MB y origen R2 autorizado. Las fixtures no son medios para publicar.

## Manifiesto y presupuesto

`manifest.json` declara `formato: 1`, versión del kit, generador exacto, `archivos` con bytes, gzip nivel 9,
SHA-256 y dependencias directas; `entradas` contiene rutas estables y cierre transitivo ordenado. No tiene fecha.
Los nombres de chunks son internos: copiar el directorio completo y no importar chunks desde código del sitio.

La nube incluye historia y muestreo dentro de sus módulos minificados. `nube-worker.js` sirve tanto como Worker
ESM como respaldo del hilo principal, mediante `import()`; sus bytes cuentan aunque no se use el respaldo en una
visita concreta. El campo incluye anillos. Pausa y común cuentan en ambos presupuestos aislados; la API pública
de pausa se cuenta incluso si el sitio no añade un adaptador. En el total de página cada respuesta cuenta una vez.

`check:estandar` valida integridad y límites. La copia completa también rechaza un presupuesto excedido antes de
escribir. Los SHA verifican coherencia, no autentican por sí solos una procedencia: el sitio fija tag y SHA del kit.
No hay instalación, build o descarga de herramientas al copiar.
