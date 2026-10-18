# Estándar visual MCCO: Apple + antigravity (kit v1.2)

Las webs del grupo usan el lenguaje de apple.com, tal como lo describe `design-md/apple/DESIGN.md` del repositorio VoltAgent/awesome-design-md (licencia MIT), y le suman antigravity: una nube de puntos que arma un activo y acompaña el scroll, y un campo de guiones que se mueve detrás del texto del hero. El kit fija el estándar. Cada sitio pone su color de acción, sus activos y su contenido. mcco.cl es el piloto y después vienen as-built.cl, condron.cl y 3d-ultra.cl.

- Hoja: `styles/estandar.css`, con Inter autoalojada en `styles/fuentes/` y su licencia en `OFL-Inter.txt`.
- Componentes Astro: `layouts/Estandar.astro` y `components/estandar/*.astro`. El JS va en `lib/estandar/`.
- Sin Three.js, GSAP ni CDN. La nube y el campo corren sobre WebGL2 propio, con IntersectionObserver y CSS.
- Con `prefers-reduced-motion` todo queda completo y quieto, y sin WebGL2 se ven imágenes fijas.
- Demo: `src/pages/demo-estandar.astro` en `mcco-web-template`.
- El sistema visual v1.1 ([`SISTEMA-VISUAL.md`](SISTEMA-VISUAL.md)) sigue funcionando en las webs que todavía no migran.

## Lo que pone cada sitio

El color de acción va en el `:root` de `src/styles/theme.css`, en cuatro variantes, y el sitio puede fijar además los dos tonos del campo. La hoja declara sus valores por defecto con `:where(:root)`, que no pesa, así que el `:root` del sitio gana sin importar el orden de las hojas. Si el sitio no los fija, queda el azul de Apple.

| Variable | Para qué | Por defecto |
|---|---|---|
| `--accion` | Texto y enlaces sobre blanco | `#0066cc` |
| `--accion-boton` | Relleno de la píldora, con texto blanco | `#0071e3` |
| `--accion-foco` | Anillo de foco | `#0071e3` |
| `--accion-oscuro` | Texto, enlaces y anillo de foco dentro de un bloque negro | `#2997ff` |
| `--campo-claro` | Un tono del campo antigravity | `var(--accion-oscuro)` |
| `--campo-oscuro` | El otro tono del campo | `var(--accion)` |

Cada variante pasa AA en su uso: 4,5:1 para el texto y el botón y 3:1 para el anillo de foco. El azul de condron.cl (`#5B85AA`), por ejemplo, da 3,9:1 sobre blanco, así que para texto y botones necesita una variante más oscura. La nube toma `--accion-boton` para sus realces sobre blanco y `--accion-oscuro` sobre negro, y `--accion-foco` para las chispas sobre blanco. El campo mezcla `--accion-boton`, `--campo-claro`, `--campo-oscuro` y un neutro (`#48484a`).

```css
/* src/styles/theme.css de mcco.cl */
:root {
  --accion: #a74716;
  --accion-boton: #ae4713;
  --accion-foco: #ba521a;
  --accion-oscuro: #f08b50;
  --campo-claro: #e0892d;
  --campo-oscuro: #7c2d10;
}
```

El sitio pone también sus activos, que son de una a cuatro ilustraciones en nube de puntos sobre negro para la nube, el logo en claro para la barra global y las fotos de cada bloque.

## Lo que fija el kit

| Token | Valor | Uso |
|---|---|---|
| `--std-blanco`, `--std-parchment` | `#ffffff`, `#f5f5f7` | Superficies claras |
| `--std-negro`, `--std-negro-1`, `--std-negro-2`, `--std-negro-3` | `#000000`, `#272729`, `#2a2a2c`, `#161617` | Superficies oscuras |
| `--std-tinta`, `--std-tinta-80` | `#1d1d1f`, `#333336` | Texto, y bajadas y enlaces de 12 px |
| `--std-gris`, `--std-gris-claro` | `#6e6e73`, `#a1a1a6` | Letra fina sobre claro y sobre oscuro |
| `--std-linea` | `#d2d2d7` | Líneas finas |
| `--std-sombra` | `rgba(0,0,0,.22) 3px 5px 30px 0` | La única sombra, solo en imágenes de producto |
| `--std-radio-tarjeta` | `18px` | Tarjetas. Los bloques no se redondean y las píldoras usan 980 px |
| `--std-fuente`, `--std-fuente-display` | SF Pro Text y SF Pro Display, y fuera de equipos Apple, Inter | Texto y titulares |
| `--std-subnav` | `52px`, 48 en ≤ 640 px | Alto de la sub-navegación |

La escala tipográfica es de 56, 48, 40, 34, 28, 24, 21, 17, 14 y 12 px, con pesos 300, 400, 600 y 700 (nunca 500) y el cuerpo en 17 px.

La hoja trae las clases `.std-h1` (56 px), `.std-h2` (48), `.std-h3` (40), `.std-lead` (28), `.std-tagline` (24) y `.std-fina` (12), y en ≤ 640 px los titulares y las bajadas se achican. También trae las píldoras `.std-pildora`, `.std-pildora--fantasma` y `.std-pildora--chica`, el enlace con «›» `.std-mas`, la fila `.std-acciones` y el rótulo de origen `.std-rotulo`. Todo elemento con `data-std-oscuro` es un fondo negro, y las piezas que lleva dentro usan su variante clara.

## Layout

```astro
---
import Estandar from '@mcco/web-kit/layouts/Estandar.astro';
const nav = {
  logo: { src: '/favicon.svg', alt: 'Plantilla MCCO', width: 32, height: 32 },
  enlaces: [{ href: '#claro', texto: 'Bloques' }, { href: '/demo-estandar', texto: 'Estándar' }],
};
const subnav = {
  titulo: 'Estándar MCCO',
  enlaces: [{ href: '#historia', texto: 'Historia' }],
  accion: { href: '/#contacto', texto: 'Hablar con un ingeniero', textoCorto: 'Contactar' },
};
---
<Estandar title="…" description="…" nav={nav} subnav={subnav}>
  <link slot="head" rel="icon" href="/favicon.svg" type="image/svg+xml" />
  <!-- bloques de la página -->
  <footer slot="pie">…</footer>
</Estandar>
```

Es el `Base` del kit con `<body class="std">`, la barra global, la sub-navegación, la página dentro de `<main>` y el pie propio del sitio (slot `pie`) antes del bloque Grupo MCCO, que se quita con `footer={false}`. El slot `head` suma a la cabecera lo del sitio, como el favicon o una precarga. El layout precarga Inter latina para que el H1, que es el LCP, no cambie de letra cuando llega la fuente.

`NavGlobal` es la barra negra de 44 px con el logo en claro y enlaces de 12 px. Bajo los 834 px quedan el logo y un botón de menú que abre los mismos enlaces como bandeja, y la bandeja se cierra con Escape, con un clic afuera, cuando el foco sale o al cruzar los 833 px. Sin JS, los enlaces se quedan en la barra. El enlace a la página actual lleva `aria-current="page"`.

`SubNav` es la barra esmerilada de 52 px (48 en ≤ 640 px) que queda fija arriba al bajar, con el título del sitio, enlaces de 12 px y la acción principal siempre a la vista. En ≤ 833 px quedan el título y la acción, y en ≤ 640 px la acción usa su `textoCorto`. Pasa a su versión oscura cuando tiene debajo un bloque negro a todo el ancho.

Si a `NavGlobal` o a `SubNav` les falta una prop, el build cae con un mensaje que la nombra. Si un enlace no trae `href` o `texto`, el mensaje dice su número. `logo.alt` tampoco puede ir vacío, porque es el nombre del enlace al inicio.

## Componentes

### Bloque

```astro
<Bloque tono="negro" id="negro" aria-labelledby="negro-titulo">
  <h2 class="std-h2" id="negro-titulo">Bloque negro.</h2>
  <p class="std-tagline">La sub-navegación pasa a su versión oscura cuando este bloque queda debajo.</p>
</Bloque>
```

Una sección a todo el ancho, sin redondeo, con el texto centrado y 80 px de aire arriba y abajo (56 en ≤ 640 px). `tono` es `claro`, `parchment`, `negro` o `negro-suave`, y los dos negros llevan `data-std-oscuro`. Los bloques alternan tono y el cambio de color hace de separador. Para que una foto llegue a los bordes, el contenido usa `--std-bloque-pad` y `--std-bloque-aire` con signo negativo. Acepta cualquier atributo de `<section>`.

### HeroEstandar

```astro
<HeroEstandar titulo="Un solo estándar para las webs MCCO."
  bajada="Barra global, sub-navegación, bloques a todo el ancho y acciones en píldora. Cada sitio pone su color."
  acciones={[
    { href: '#claro', texto: 'Ver los bloques' },
    { href: '/demo-visual', texto: 'Ver el sistema visual', variante: 'fantasma' },
  ]}
  nube={{ respaldo: { src: '/media/ilustracion/hero-chancado-960.webp', width: 960, height: 540,
    alt: 'Edificio de chancado con su correa, en nube de puntos' } }}
  campo />
```

| Prop | Por defecto | Para qué |
|---|---|---|
| `titulo` o slot `titulo` | (obligatorio) | El H1, que es el LCP. El slot sirve para cortes de línea o énfasis |
| `bajada` | | Bajada de 28 px |
| `acciones` | (obligatorio) | Las de `Acciones` |
| `nube` | | `{ respaldo: { src, width, height, alt } }`, la imagen fija del primer activo |
| `rotulo` | `'Ilustración en nube de puntos.'` | Rótulo de origen bajo la nube |
| `campo` | `false` | El campo antigravity detrás del texto |

El respaldo de la nube se ve sin WebGL2, con movimiento reducido y sin JS. Con `nube` o `campo` el hero lleva su propio botón «Pausar movimiento» (WCAG 2.2.2), arriba a la derecha y antes del H1 en el orden del foco. Se ve mientras algo se mueve en el hero.

### Acciones

```astro
<Acciones acciones={[
  { href: '#negro', texto: 'Píldora llena' },
  { href: '#parchment', texto: 'Píldora fantasma', variante: 'fantasma' },
  { href: '/demo-visual', texto: 'Enlace de texto', variante: 'mas' },
]} tamano="chica" />
```

`variante` es `llena` (por defecto), `fantasma` o `mas`, el enlace con «›». Con `tamano="chica"` las píldoras se ven de 12 px y conservan su área táctil de 44 × 44 px. Las píldoras se achican a `scale(.95)` al presionarlas.

### HistoriaNube

```astro
<HistoriaNube id="historia" titulo="Historia en nube de puntos."
  bajada="La nube baja desde el hero y, mientras recorres esta sección, pasa de un activo al siguiente."
  activos={[
    { src: '/media/ilustracion/hero-chancado-960.webp', etiqueta: 'Edificio de chancado', alt: 'Edificio de chancado con su correa, en nube de puntos' },
    { src: '/media/ilustracion/hero-espesador-960.webp', etiqueta: 'Espesador', alt: 'Espesador en nube de puntos' },
  ]}
  pasos={[
    { rotulo: 'Chancado', titulo: 'Edificio y correa' },
    { rotulo: 'Concentradora', titulo: 'Espesador' },
  ]} />
```

Una sección negra con título, bajada, la nube, un paso por activo y el botón de pausa. Lleva de uno a cuatro activos, que son ilustraciones en nube de puntos sobre negro de 960 × 540, y el primero debería ser el respaldo del hero, porque es lo que la nube arma arriba. Por defecto, `rotulo` dice `'Ilustraciones en nube de puntos.'` e `id` vale `'historia'`.

Cuando la nube tiene todas sus formas, y nadie está mirando la parte que cambia, la sección pasa a la nube. La nube llega bajando desde el hero y, mientras se recorre la sección, pasa por los activos y enciende el paso de cada uno. Con 901 px de ancho y 700 de alto o más, la sección queda fija mientras se recorre, y en las demás ventanas la nube cambia mientras cruza la pantalla.

Sin JS, sin WebGL2, con movimiento reducido o si un activo no carga, se ven las ilustraciones fijas con su rótulo y todos los pasos encendidos.

### GrillaProductos y Producto

```astro
<GrillaProductos id="productos" aria-label="Grilla de productos">
  <Producto titulo="Tarjeta ancha" nivel={2} tono="parchment" ancho
    bajada="Ocupa las dos columnas, con un título más grande y la foto abajo."
    acciones={[{ href: '#galeria', texto: 'Más información' }, { href: '/#contacto', texto: 'Consultar', variante: 'fantasma' }]}
    foto={{ src: '/media/video/dron-faena-poster.webp', width: 1280, height: 720, encuadre: '50% 45%', origen: 'real',
      alt: 'Aisladores de una línea de alta tensión vistos desde un dron' }} />
</GrillaProductos>
```

La grilla pone las tarjetas en dos columnas iguales, con 12 px entre ellas, y en una sola columna en ≤ 833 px.

Cada `Producto` lleva el título, la bajada y las acciones centrados arriba, y la foto abajo, a sangre, con su rótulo de origen. Mide 640 px de alto con la foto de 320. Con `ancho` ocupa las dos columnas, mide 700 px, su foto mide 378 y el título sube de 40 a 48 px. En ≤ 640 px la tarjeta toma el alto de su contenido y la foto va en 4:3 bajo el texto.

`tono` es `parchment`, `claro`, `negro` o `negro-suave`. `nivel` elige `h3` (por defecto) o `h2`, y `foto.encuadre` es el `object-position` del recorte. `foto.srcset` y `foto.sizes` son opcionales.

### Galeria

```astro
<Galeria items={[
  { tipo: 'imagen', src: '/media/real/faro-closeup-800.webp', width: 800, height: 600, origen: 'real',
    alt: 'Escáner láser FARO Focus en primer plano, dentro de una nave industrial', pie: 'Escáner láser en terreno.' },
  { tipo: 'video', src: '/media/video/faro-terreno.mp4', poster: '/media/video/faro-terreno-poster.webp',
    width: 1280, height: 720, origen: 'real', alt: 'Tomas de un levantamiento con escáner FARO en faena' },
]} />
```

Cada ítem va en una tarjeta de 18 px de radio con su rótulo de origen y un pie opcional.

Hay dos formatos. `cuadros`, el de por defecto, recorta todo en 4:3 al centro, tres por fila, dos en ≤ 833 px y uno en ≤ 640 px, y sirve para fotos e ilustraciones. `mosaico` deja cada imagen en su proporción y sin recorte, en filas de unos 240 px de alto (320 como tope), y nunca más ancha que su archivo: es el formato para capturas chicas o de tamaños distintos, que así no se estiran.

Un video necesita `poster`, y su `alt` dice qué muestra. Va `muted`, `playsinline`, `loop` y con `preload="none"`. `lib/visual/video.js` lo descarga y lo reproduce solo cuando está a la vista, y no lo hace con movimiento reducido ni con ahorro de datos (Save-Data), donde queda el poster con el botón para reproducirlo. El botón dice «Pausar video» o «Reproducir video» y su `data-accion` (`pausar` o `reproducir`) elige el ícono. Un video real lleva el rótulo «Video de faena».

### Cifras

```astro
<Cifras items={[
  { valor: 44, etiqueta: 'píxeles de área táctil, como mínimo' },
  { valor: '4,5:1', etiqueta: 'de contraste mínimo para el texto' },
]} nota="Son valores del propio estándar. En un sitio, cada cifra sale de un dato verificado." />
```

Cada valor va en 56 px (48 en ≤ 640 px) y en el color de acción, con su etiqueta debajo y entre líneas finas. La nota es opcional y va en letra fina. Un número se agrupa como en Chile (1.500) y se redondea a dos decimales, así que un año o un código va como texto: `valor: '2011'`, porque `2011` saldría como «2.011». La alineación la pone el contenedor.

### TarjetasMarca

```astro
<TarjetasMarca marcas={[
  { nombre: 'As-Built 3D', logo: { src: '/media/logos/marcas/asbuilt.svg', alto: 40 },
    frase: 'Escaneo láser 3D y planos de lo construido', href: 'https://as-built.cl' },
  { nombre: 'MonitorIA', logo: { src: '/media/logos/marcas/monitoria.svg', alto: 60 },
    frase: 'Monitoreo continuo de activos con sensores, visión e IA' },
]} />
```

Tarjetas oscuras (`#1d1d1f`) de 18 px de radio, tres por fila, dos en ≤ 900 px y una en ≤ 640 px. El logo se pinta en un solo tono claro con una máscara CSS, así que solo cuenta su forma: sirve un SVG o un PNG con transparencia, y `alto` va en píxeles (48 por defecto).

Con colores forzados el logo se pinta en el color del texto del sistema. Con `href` la tarjeta entera es el enlace y al pie va el dominio con «›», o «Más información» si el enlace es interno. Sin `href` va el aviso `pronto`, que por defecto dice «Sitio en preparación».

### CampoAntigravity fuera del hero

`HeroEstandar` lo pone con `campo`, junto con su botón de pausa. Fuera del hero, el campo necesita un contenedor con `position: relative` y la página tiene que poner su propio botón `[data-std-pausa]` (WCAG 2.2.2). `pausa.js` le da el texto y el clic, y `campo.js` marca el contenedor con `data-std-movimiento` mientras el campo se mueve, para mostrar el botón solo entonces.

## Nube, campo y pausa

La nube usa un solo lienzo fijo. Después del primer pintado, los puntos suben desde abajo y en unos 2,6 s arman el primer activo bajo el título. Al bajar, la nube acompaña el scroll a media opacidad hasta la historia. El cursor dispersa los puntos y un barrido de luz los recorre.

La nube arranca después de la carga, en tiempo ocioso y con un ancla cerca de la vista, y se detiene con la pestaña oculta o fuera de pantalla. Las formas se muestrean en un Worker con OffscreenCanvas, o por tramos en el hilo principal si no hay, y el Worker se cierra cuando llega la última. `window.__mccoNube.state` deja ver el estado para verificar.

El campo vive solo en el hero, detrás del texto, y sus guiones pasan entre las letras sin recuadros blancos. Usa los valores de la prueba aprobada: en computador, anillos cada 28 px y un guion cada 30, del radio 46 al 1180 (5184 guiones). En celular son 24 y 26 px, hasta el radio 760 (2841 guiones).

El centro del campo persigue al mouse con unos 1,4 s de retraso, sin cursor pasea despacio, los anillos giran a 0,012 rad/s y el scroll no los mueve. Sobre la nube los guiones bajan a un tercio. Con movimiento reducido no se crea, y sin WebGL2 no queda nada porque es decorativo. `window.__mccoCampo.state` deja ver su estado.

La pausa es una sola para todo el documento (`lib/estandar/pausa.js`). Los botones `[data-std-pausa]` del hero y de la historia dicen siempre lo mismo y cualquiera pausa o reanuda todo. Cada cambio avisa con el evento `std-pausa` en `window`, con `detail.pausa`.

Con 901 × 700 px o más, la nube usa 26 000 puntos y el campo sus anillos de computador, los dos con DPR hasta 1,65 y sin tope de cuadros. En las demás ventanas, celulares girados y laptops bajas incluidos, la nube usa 11 000 puntos y el campo los anillos de celular, con DPR hasta 1,35 y 30 cuadros por segundo.

Los puntos de la nube se fijan al arrancar, y el campo rehace sus anillos si la ventana cruza el corte.

## Presupuesto

| Medida | Límite | Medido en v1.2.0-rc.1 |
|---|---|---|
| JS de la nube, gzip | 12 KB | 8274 B: runtime con `historia.js`, Worker, entradas y `pausa.js` |
| JS del campo, gzip | 5 KB | 3800 B, 4156 B con `pausa.js` |
| Lighthouse móvil | 85 en rendimiento, 95 en accesibilidad | Se mide en la portada de mcco.cl |
| LCP | El H1 | |
| CLS | Menos de 0,1 | |
| Imágenes | Menos de 400 KB (R12). Activos de la nube, de 100 a 200 KB | |
| Videos | 8 MB, H.264 con `faststart`, poster WebP, `muted`, `playsinline`, `preload="none"`, en R2 | |

El JS se midió con zlib nivel 9 sobre el build de la demo de `mcco-web-template`. Si la nube necesita el respaldo del hilo principal, que se descarga solo en navegadores sin OffscreenCanvas, sube a 9752 B. Contando `lib/visual/comun.js`, que comparte todo el sistema visual, la nube llega a 10 157 B y el campo a 4561 B.

## Regla de imágenes y rótulos de origen

1. Primero material real: fotos y video de faena propios.
2. Después render propio: nube de puntos, modelo, mapa de desviaciones.
3. Las fotos y los videos hechos con IA muestran la atmósfera o cómo se trabaja, y van siempre con el rótulo «Ilustración». Llevan un prompt detallado y revisado, con la geometría real del activo y referencias, sin textos ni marcas inventadas, y se revisan imagen por imagen.
4. La IA no inventa resultados: ninguna ilustración lleva escalas, cifras ni textos.
5. Una simulación que se presenta como trabajo de MCCO es una captura real y lleva el rótulo «Captura de simulación». Va sin escala, valores, nombres de archivo ni logos de software que identifiquen al cliente, y sin nada que nombre al cliente, la faena, la planta o el folio. Antes de publicarla se revisa contra el `forbidden` del sitio y la lista negra del kit.
6. Una captura chica va en formato chico o en el mosaico de `Galeria`, nunca estirada.
7. Los datos salen del escáner, no de una imagen.

| `origen` | Rótulo |
|---|---|
| `real` | Foto de faena (en un video, Video de faena) |
| `render` | Render 3D |
| `ilustracion` | Ilustración |
| `esquema` | Esquema |
| `captura` | Captura de simulación |

Los textos salen de `lib/estandar/rotulos.mjs`. `Producto` y `Galeria` piden `origen` y lo escriben en el chip de cada imagen. `mcco-check` revisa con R11 que toda imagen con `data-origen="ilustracion"` o bajo `/media/ilustracion/` tenga su rótulo a la vista.

## Webs sin Astro: mcco-estandar-copiar

```bash
# En el deploy, con el kit instalado desde la tag que fija el sitio
node node_modules/@mcco/web-kit/scripts/estandar-copiar.mjs public/estandar
```

El script copia `styles/estandar.css`, `styles/fuentes/*` (con la licencia OFL), `lib/estandar/*.js` y `lib/visual/comun.js` al destino, con las mismas rutas relativas, y así siguen resolviendo los `import`, el Worker de la nube y los `url()` de las fuentes. No copia `lib/estandar/rotulos.mjs`, que solo usan los componentes de Astro al construir. Corre en el deploy desde la tag del kit, nunca a mano, y sin destino sale con código 1.

```html
<link rel="preload" href="/estandar/styles/fuentes/inter-latin-wght-normal.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="/estandar/styles/estandar.css">
<link rel="stylesheet" href="/css/theme.css"><!-- el :root del sitio, con --accion y las demás -->
<body class="std">
  <!-- el mismo marcado que generan los componentes -->
  <script type="module" src="/estandar/lib/estandar/menu.js"></script>
  <script type="module" src="/estandar/lib/estandar/subnav.js"></script>
  <script type="module" src="/estandar/lib/estandar/nube.js"></script>
  <script type="module" src="/estandar/lib/estandar/campo.js"></script>
</body>
```

La copia no trae el marcado ni los estilos de cada componente, que viven en su archivo `.astro` con estilos que Astro aísla por componente. Una web sin Astro escribe el mismo HTML, con las clases `std-*` y los atributos `data-std-*`, y esos estilos. La referencia es `/demo-estandar` de la plantilla. Tampoco trae `lib/visual/video.js`, que reproduce los videos de `Galeria`.

El Worker de la nube se carga desde el mismo origen, así que la CSP del sitio tiene que permitir `'self'` en `worker-src`, o en `script-src` si no declara `worker-src`.

## Decisiones fuera del DESIGN.md de Apple

- El anillo de foco no lleva el radio de 4 px de Apple: es una línea de 2 px a 3 px del borde, con esquinas rectas.
- Las imágenes llevan `height: auto` en la base de la hoja.
- El rótulo de origen va en 11 px, aunque la escala termina en 12.
- `--std-tinta-80` es `#333336`, el de la prueba aprobada. El «Ink Muted 80» de Apple es `#333333`.
- La tarjeta de marca va en `#1d1d1f` sobre negro, fuera de las seis superficies, como en la prueba aprobada.
- La barra global marca la página actual solo con `aria-current`, sin una marca a la vista.
- Los botones de pausa cambian su texto («Pausar movimiento», «Reanudar movimiento») y no llevan `aria-pressed`, como pide el patrón de botón de WAI-ARIA para un botón cuyo texto cambia.
- Un solo corte, `(min-width: 901px) and (min-height: 700px)`, decide si la historia queda fija y si la nube y el campo usan el presupuesto de computador.
- `Cifras` agrupa los números como en Chile y los redondea a dos decimales, así que un año o un código va como texto (`'2011'`).
