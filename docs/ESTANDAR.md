# Estándar visual MCCO: Apple + antigravity (kit v1.4)

Las webs del grupo usan el lenguaje de apple.com, tal como lo describe `design-md/apple/DESIGN.md` del repositorio VoltAgent/awesome-design-md (licencia MIT), y le suman antigravity: una nube de puntos que arma un activo y acompaña el scroll, y un campo de guiones que se mueve en el hero, alrededor de su texto. El kit fija el estándar. Cada sitio pone su color de acción, sus activos y su contenido. mcco.cl es el piloto y después vienen as-built.cl, condron.cl y 3d-ultra.cl.

- Hoja: `styles/estandar.css`, con Inter autoalojada en `styles/fuentes/` y su licencia en `OFL-Inter.txt`.
- Componentes Astro: `layouts/Estandar.astro` y `components/estandar/*.astro`. El JS va en `lib/estandar/`.
- Sin Three.js, GSAP ni CDN. La nube y el campo corren sobre WebGL2 propio, con IntersectionObserver y CSS.
- Con `prefers-reduced-motion` todo queda completo y quieto, y sin WebGL2 se ven imágenes fijas.
- Demo: `src/pages/demo-estandar.astro` en `mcco-web-template`.
- El sistema visual v1.1 ([`SISTEMA-VISUAL.md`](SISTEMA-VISUAL.md)) sigue funcionando en las webs que todavía no migran.

## Lo que pone cada sitio

El color de acción va en el `:root` de `src/styles/theme.css`, en cuatro variantes y el texto sobre el botón, y el sitio puede fijar además los dos tonos del campo. La hoja declara sus valores por defecto con `:where(:root)`, que no pesa, así que el `:root` del sitio gana sin importar el orden de las hojas. Si el sitio no los fija, queda el azul de Apple.

| Variable | Para qué | Por defecto |
|---|---|---|
| `--accion` | Texto y enlaces sobre blanco | `#0066cc` |
| `--accion-boton` | Relleno de la píldora | `#0071e3` |
| `--accion-texto` | Texto sobre el relleno de acción | `#fff` |
| `--accion-foco` | Anillo de foco | `#0071e3` |
| `--accion-oscuro` | Texto, enlaces y anillo de foco dentro de un bloque negro | `#2997ff` |
| `--campo-claro` | Un tono del campo antigravity | `var(--accion-oscuro)` |
| `--campo-oscuro` | El otro tono del campo | `var(--accion)` |

Si el sitio cambia `--accion-texto`, debe medir el contraste de ese texto sobre `--accion-boton`: **≥ 4,5:1**. Por ejemplo, puede combinar amarillo vivo con texto negro. El valor por defecto conserva el texto blanco de v1.3.0; las píldoras fantasma mantienen su color de enlace.

Cada variante que fija el sitio tiene que pasar AA en su uso: 4,5:1 para el texto y el botón y 3:1 para el anillo de foco. El azul de condron.cl (`#5B85AA`), por ejemplo, da 3,9:1 sobre blanco, así que para texto y botones necesita una variante más oscura. La nube toma `--accion-boton` para sus realces sobre blanco y `--accion-oscuro` sobre negro, y `--accion-foco` para las chispas sobre blanco. El campo mezcla `--accion-boton`, `--campo-claro`, `--campo-oscuro` y un neutro (`#48484a`).

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

El layout del sitio importa `src/styles/theme.css`. Ni `Estandar` ni `Base` cargan esa hoja, por lo que omitir el import deja los colores azules por defecto.

```astro
---
// src/layouts/Sitio.astro
import type { ComponentProps } from 'astro/types';
import Estandar from '@mcco/web-kit/layouts/Estandar.astro';
import '../styles/theme.css';
interface Props extends Omit<ComponentProps<typeof Estandar>, 'nav' | 'subnav'> {}
const props = Astro.props;
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
<Estandar {...props} nav={nav} subnav={subnav}>
  <link slot="head" rel="icon" href="/favicon.svg" type="image/svg+xml" />
  <slot />
  <footer slot="pie">…</footer>
</Estandar>
```

Es el `Base` del kit con `<body class="std">`, la barra global, la sub-navegación, la página dentro de `<main>` y el pie propio del sitio (slot `pie`) antes del bloque Grupo MCCO, que se quita con `footer={false}`. El slot `head` suma a la cabecera lo del sitio, como el favicon o una precarga. El layout precarga Inter latina para que el H1, que es el LCP, no cambie de letra cuando llega la fuente.

### Enlace «Saltar al contenido» (v1.4.2)

`Estandar` y `Post` emiten como primer hijo del `<body>`, y por lo tanto como primer elemento enfocable, un enlace
al `<main>` del layout, que lleva el id que el enlace apunta. El texto sigue el idioma de la página con la misma regla
de las demás piezas (`esEspanol` de `lib/idioma.mjs`): «Saltar al contenido» si el subtag primario es `es` o no hay
`lang`, «Skip to content» con cualquier otro.

| Layout | Marcado | Estilo |
|---|---|---|
| `Estandar` | `<a class="std-saltar" href="#std-contenido">` antes de `NavGlobal`; `<main id="std-contenido">` | `.std-saltar` en `styles/estandar.css` (entra en `dist/estandar`) |
| `Post` | `<a class="mcco-saltar" href="#mcco-contenido">` antes del slot `nav`; `<main id="mcco-contenido" class="mcco-post">` | `<style>` del layout: `Post` no carga la hoja del estándar |
| `Base` | No emite enlace: no tiene `<main>` y el enlace quedaría roto | El sitio que usa `Base` directo pone el suyo |

Los id llevan prefijo del kit porque hay sitios con su propio `id="contenido"` dentro de la página (la portada de
cuplai): un id repetido rompería su HTML. `Post` usa el prefijo `mcco-` de su plantilla (`mcco-post`) para no
depender de clases del estándar.

Sin foco, el enlace queda fuera de la vista (`position: fixed` y `transform` hacia arriba, sin `display: none`, así
sigue en el orden de tabulación y en el árbol de accesibilidad). Con foco aparece arriba a la izquierda (8 px), sobre
la barra global (`z-index` 12) y la sub-navegación (11) con `z-index` 13, como píldora de 44 px de alto con tinta
sobre blanco (16:1, AA con cualquier color de acción) y el anillo de foco del estándar. `.mcco-saltar` tiene el mismo
comportamiento con colores fijos (`#1d1d1f` sobre `#fff`) y `z-index` 1000, porque la barra del slot `nav` es del
sitio. Al activarlo, el navegador lleva la lectura y el siguiente Tab al `<main>`.

Es aditivo: ninguna web tiene que cambiar su código para subir a v1.4.2. Una web que ya pone su propio enlace de salto
dentro de `Estandar` (en el slot por defecto, que queda dentro del `<main>` después de las dos barras) pasa a tener dos
paradas seguidas al tabular, primero la del kit. No rompe nada: su enlace sigue funcionando y el del kit apunta a
`#std-contenido`, así que tampoco hay id repetido. Aun así conviene quitar el propio, con su CSS, al subir. Casos
conocidos a noviembre de 2026 (revisados en los worktrees de las webs; las que usan `Post` no ponen nada en su slot
`nav` y las que usan solo `Base` no reciben enlace del kit):

- **as-built** arma su propio HTML con la distribución, sin el layout, así que no recibe el enlace del kit y no cambia
  nada. Ya cumple: su `<a class="skip" href="#contenido">Ir al contenido</a>` es el primer hijo del body y apunta a su
  `<main id="contenido">`. Si quiere usar la regla del kit, cambia `class="skip"` por `class="std-saltar"` (el `href`
  y su id pueden quedar como están), usa también el texto del kit, «Saltar al contenido», y quita su regla local
  `.std .skip` y `.std .skip:focus` de `public/css/sitio-estandar.css`. No es obligatorio.
- **cuplai** (`Estandar`) pone `<a class="skip-link" href="#contenido">Saltar al contenido</a>` en el slot por defecto
  de `src/layouts/Sitio.astro`, con la regla `.skip-link` en `src/styles/theme.css`: conviene quitar los dos. Su
  `<div id="contenido">` de la portada puede quedar.
- **monitorai** (`Estandar`) pone `<a class="skip" href="#contenido">Saltar al contenido</a>` en el slot por defecto
  de `src/components/Layout.astro`, con las reglas `.skip` y `.skip:focus` en `src/styles/theme.css`: conviene quitar
  el enlace y las dos reglas. Su `<div id="contenido">` alrededor del slot puede quedar.

### Idioma y metadatos por página (v1.4.0)

`Base`, `Estandar` y `Post` aceptan estas props opcionales; el layout propio del sitio debe
propagarlas, como hace `Sitio` en el ejemplo anterior. Sin ellas se conserva el HTML de v1.3.1.

| Prop | Resultado | Si se omite |
|---|---|---|
| `lang` | `<html lang>` y `og:locale` (guion convertido a `_`, como antes) | `site.lang` |
| `ogTitle` | `og:title`, independiente de `<title>` y Twitter | Título SEO |
| `ogDescription` | `og:description`, independiente de description y Twitter | Descripción SEO |
| `ogUrl` | `og:url` literal, sin limpiar `.html` ni cambiar canonical | Canonical |
| `robots` | Texto propio, o `false` para omitir la meta | Regla de `noindex`: `noindex, nofollow` o `index, follow, max-image-preview:large, max-snippet:-1` |

`robots` explícito tiene prioridad sobre `noindex`. `Post` conserva sus títulos y descripción derivados
de `post.data` y usa `lang` también en el `inLanguage` de BlogPosting. `Head` acepta las mismas props
para quien compone su propia cabecera; en ese caso el sitio debe fijar también el idioma de `<html>`.

```astro
<Sitio title="FAQ técnica" description="Descripción SEO existente" lang="en"
  ogTitle="Technical FAQ" ogDescription="Existing English Open Graph description"
  ogUrl="https://3d-ultra.cl/en/faq.html" robots={false}>
  <h1>Technical FAQ</h1>
</Sitio>
```

No agregues estas metas ni el canonical mediante el slot `head`: las props sustituyen sus valores
sin duplicarlas. El slot sigue disponible para etiquetas adicionales, por ejemplo favicon o alternates.

Desde v1.4.1 el mismo `lang` llega también a las piezas del kit (WCAG 3.1.2, idioma de las partes): `Base` se lo
pasa a `FooterGrupo` y `Estandar` a `NavGlobal` y `SubNav`. Si la web ya pone `lang` en `nav` o en `subnav`, ese
manda. Una página es española si el subtag primario de su idioma es `es` (`es`, `es-CL`, `ES-cl`, `es-419`), y
entonces el HTML de las tres piezas es el de v1.4.0. Con cualquier otro idioma, los nombres accesibles del kit salen
en inglés:

| Pieza | En español | En otro idioma |
|---|---|---|
| `NavGlobal`, el `nav` | `Principal` | `Main` |
| `NavGlobal`, el enlace del logo | `<logo.alt>, inicio` | `<logo.alt>, home` |
| `NavGlobal`, el botón de menú | `Menú` | `Menu` |
| `SubNav`, el `nav` | `Secciones` | `Sections` |
| `FooterGrupo`, la `section` | `Grupo MCCO` | `MCCO Group` |

El kit solo trae estas etiquetas en español y en inglés. Con un idioma que no es ni `es` ni `en` (por ejemplo `pt-BR`)
salen en inglés, sin un `lang` propio, así que quedan marcadas con el idioma de la página: eso solo es correcto en
inglés. Hoy ninguna web MCCO tiene páginas en otro idioma; agregar uno requiere sus propias etiquetas en el kit.

El texto visible de `FooterGrupo` (la pertenencia al grupo, razón social, RUT, dirección y las bajadas de las marcas)
son datos del grupo en español y no se traducen: en otro idioma quedan bajo `<div class="mcco-grupo__inner"
lang="es">`, para que el lector de pantalla los lea con voz española. Los textos visibles de la barra y la
sub-navegación son props de la web, que los escribe en el idioma de la página. La web no cambia su código: basta el
`lang` que su layout ya le pasa a `Estandar`, como `Sitio` en el ejemplo. Las tres piezas aceptan además `lang`
como prop opcional para quien las use sueltas; sin ella siguen en español.

En el contrato HTML sin Astro ([ESTANDAR-HTML.md](ESTANDAR-HTML.md)) el marcado de referencia está en español y no
cambia. Una página en inglés pone `lang="en"` en `<html>` y escribe ella misma esos cuatro `aria-label` en inglés
(`Main`, `<nombre del sitio>, home`, `Menu` y `Sections`), junto con sus enlaces. Si copia el bloque Grupo, usa
`aria-label="MCCO Group"` y `lang="es"` en el contenedor del texto en español. `menu.js` y `subnav.js` no escriben
textos, así que no hay nada más que ajustar.

Quedan fuera de v1.4.1 y de v1.4.2 (pendientes para v1.4.3) otros textos fijos del kit que siguen en español también
en una página en otro idioma, sin `lang="es"`, así que se leen con el idioma de la página. Una página en inglés que
use estas piezas los tiene así:

- El botón de pausa del movimiento, «Pausar movimiento» y «Reanudar movimiento»: lo escribe `lib/estandar/pausa.js`
  y lo traen `HeroEstandar` y `HistoriaNube` (en el sistema v1.1, `HeroParticulas` y `lib/visual/hero.js`).
- El `aria-label` de la nube de `HistoriaNube`, «Ilustración animada en nube de puntos: …» (o con el rótulo de su
  origen).
- Los rótulos de origen de `lib/estandar/rotulos.mjs` («Ilustración», «Render 3D», «Captura de simulación»…), que
  escriben `HistoriaNube`, `Producto` y `Galeria`, y los `rotulo` por defecto de `HeroEstandar` y `HistoriaNube`
  («Ilustración en nube de puntos.», «Ilustraciones en nube de puntos.»). Esos dos aceptan un `rotulo` propio.
- El botón de video, «Pausar video» y «Reproducir video», de `Galeria` y `VideoBanda` (`lib/visual/video.js`).
- `Cta` («Escríbenos») y los textos de la plantilla de `Post` (la ruta «Inicio», «Por», «min de lectura», «Fuentes» y
  «Servicios relacionados», entre otros).

No entraron en v1.4.2 porque cada camino toca algo que esta versión no cambia:

- Los componentes que la página pone en el slot (`HeroEstandar`, `HistoriaNube`, `Producto`, `Galeria`,
  `VideoBanda`, `ProcesoScroll`, `Cta`) no reciben el idioma. Una prop `lang` en cada uno obliga a la web a pasarla en
  cada uso, y un idioma compartido en el render (`Astro.locals` fijado por `Base`) es un contrato interno nuevo que
  depende del orden en que Astro evalúa el layout y el slot, y hay que probarlo con un render real.
- `pausa.js` y `video.js` reescriben el texto del botón en el cliente: aunque el HTML saliera en inglés, el primer
  clic lo devolvería al español. `pausa.js` cuenta en el presupuesto del campo, que quedó con 11 B de margen (6 B en v1.4.3).
- `mcco-check` (R11) acepta un `figcaption` sin `data-rotulo` solo si dice «ilustraci»: traducir los rótulos obliga
  a cambiar esa regla del grupo.
- `Post` y `Cta` mezclan textos del kit con datos de `site.yaml` (autor, SLA, «Inicio» del BreadcrumbList).

La propuesta para v1.4.3 parte por lo que no cambia textos: marcar con `lang="es"` lo que el kit deja en español en una
página que no está en español, como el bloque Grupo. Después, probar el idioma en el render (con una prop `lang`
opcional como respaldo), que `pausa.js` y `video.js` elijan su texto según el `lang` más cercano (midiendo los bytes
del campo), que R11 acepte el rótulo en inglés, y una prop `textos` opcional en `Post` y `Cta`. En español el HTML
no cambia.

Dentro de `.std`, los tokens de v1.1 que consumen `FooterGrupo` y las piezas de `Revelar` toman los valores del estándar. Se redefinen también sus alias `--mcco-*` en ese ámbito, porque un alias heredado de `:root` ya tiene resuelto su valor. Las páginas fuera de `.std` conservan sus tokens.

| Token de v1.1 | Valor dentro de `.std` |
|---|---|
| `--color-accent` | `var(--accion)` |
| `--color-bg`, `--color-on-accent` | `var(--std-blanco)` |
| `--color-bg-alt` | `var(--std-parchment)` |
| `--color-text` | `var(--std-tinta)` |
| `--color-muted` | `var(--std-gris)` |
| `--color-border` | `var(--std-linea)` |
| `--font-body`, `--font-display` | `var(--std-fuente)`, `var(--std-fuente-display)` |
| `--space`, `--maxw` | `22px`, `1024px`, para el margen interior y el ancho máximo del pie de grupo |

`NavGlobal` es la barra negra de 44 px con el logo en claro y enlaces de 12 px. Bajo los 834 px, el menú colapsa cuando `menu.js` termina de instalar sus manejadores y marca el nav con `data-std-menu-listo`. El botón abre los mismos enlaces como bandeja, que se cierra con Escape, con un clic afuera, cuando el foco sale o al cruzar los 833 px.

Sin JS o si el módulo no carga, los enlaces siguen visibles y el botón queda oculto. El enlace a la página actual lleva `aria-current="page"`.

`SubNav` es la barra esmerilada de 52 px (48 en ≤ 640 px) que queda fija arriba al bajar, con el título del sitio, enlaces de 12 px y la acción principal siempre a la vista. En ≤ 833 px quedan el título y la acción, y en ≤ 640 px la acción usa su `textoCorto`. Pasa a su versión oscura cuando tiene debajo un bloque negro a todo el ancho. El fondo y el texto cambian juntos, sin transición del fondo, para conservar el contraste AA durante el cruce.

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
| `campo` | `false` | El campo antigravity alrededor del texto |

El respaldo de la nube se ve sin WebGL2, con movimiento reducido y sin JS. Con `nube` o `campo` el hero lleva su propio botón «Pausar movimiento» (WCAG 2.2.2), arriba a la derecha y antes del H1 en el orden del foco. Se ve mientras algo se mueve en el hero.

### NubeAncla

`origen?: string` vale `'ilustracion'` por defecto y se valida con `rotuloDe` (un origen desconocido falla al construir). Se aplica al respaldo y a su copia de `<noscript>`. Para un render propio usa `<NubeAncla origen="render" respaldo={...} />` y el rótulo visible «Render 3D». `HeroEstandar` también lo propaga mediante `nube={{ respaldo, origen: 'render' }}`; en ese caso pasa `rotulo="Render 3D"` al hero.

Para usar el ancla directamente, pasa `respaldo` y escribe el rótulo de origen junto a ella. Este ejemplo pone también el botón de pausa en un contenedor `.std-hero`, que el runtime marca mientras la nube se mueve. Usa una sola ancla de hero por página.

```astro
---
import NubeAncla from '@mcco/web-kit/components/estandar/NubeAncla.astro';
---
<figure class="std-hero nube-directa">
  <button type="button" class="std-pildora std-pildora--chica" data-std-pausa>Pausar movimiento</button>
  <NubeAncla respaldo={{
    src: '/media/ilustracion/hero-chancado-960.webp', width: 960, height: 540,
    alt: 'Edificio de chancado con su correa, en nube de puntos',
  }} />
  <figcaption class="std-fina" data-rotulo>Ilustración en nube de puntos.</figcaption>
</figure>
<style>
  .nube-directa { margin: 0; text-align: center; }
  .nube-directa [data-std-pausa] { display: none; }
  .nube-directa[data-std-movimiento] [data-std-pausa] { display: inline-flex; }
</style>
```

### Acciones

```astro
<Acciones acciones={[
  { href: '#negro', texto: 'Píldora llena' },
  { href: '#parchment', texto: 'Píldora fantasma', variante: 'fantasma' },
  { href: '/demo-visual', texto: 'Enlace de texto', variante: 'mas' },
]} tamano="chica" />
```

`variante` es `llena` (por defecto), `fantasma` o `mas`, el enlace con «›». Con `tamano="chica"` las píldoras se ven de 12 px y conservan su área táctil de 44 × 44 px. Las píldoras se achican a `scale(.95)` al presionarlas.

Cada acción acepta `oculto?: string`, que se agrega dentro del enlace con `.std-oculto`, disponible para lectores de pantalla y buscadores, pero recortado visualmente. Incluye el espacio inicial si corresponde: `{ href: '/estructuras', texto: 'Más información', oculto: ' sobre Estructuras mineras' }`. Sin `oculto`, el HTML del enlace no cambia. También se puede pasar en las acciones de `HeroEstandar` y `Producto`.

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

`origen?: string` define el origen general de la nube (por defecto `'ilustracion'`). Cada activo acepta `{ src, etiqueta, alt, origen? }`: si omite `origen`, hereda el general. Ambos niveles se validan con `rotuloDe`; cada imagen fija lleva su `data-origen` y su chip correspondiente («Render 3D» para `'render'`). Con `origen="render"`, el pie por defecto dice «Render 3D»; se puede personalizar con `rotulo`, especialmente si se mezclan orígenes. Sin las props nuevas se conserva el HTML de v1.3.0.

Una sección negra con título, bajada, la nube, un paso por activo y el botón de pausa. Lleva de uno a cuatro activos, que son ilustraciones en nube de puntos sobre negro de 960 × 540, y el primero debería ser el respaldo del hero, porque es lo que la nube arma arriba. Por defecto, `rotulo` dice `'Ilustraciones en nube de puntos.'` e `id` vale `'historia'`.

Cuando la nube tiene todas sus formas, y nadie está mirando la parte que cambia, la sección pasa a la nube. La nube llega bajando desde el hero y, mientras se recorre la sección, pasa por los activos y enciende el paso de cada uno.

Con 901 px de ancho y 700 de alto o más, puede quedar fija si caben el título, la bajada, los pasos, los controles y el área mínima de la nube, junto con los márgenes y la sub-navegación. Si no caben, la historia sigue en flujo y la nube cambia mientras cruza la pantalla.

El runtime mide ese espacio al cambiar el tamaño de la ventana, al cargar fuentes y cuando `ResizeObserver` detecta cambios en los bloques de texto. El atributo `data-std-fija` activa el CSS fijo y el cálculo de progreso correspondiente. Sin ese atributo, la historia fluye.

El contenedor visual conserva al menos el mínimo del ancla: 200 px dentro del corte de escritorio y 300 px fuera de él. Dentro de la historia, el dibujo se limita al área visual para que los puntos no cubran textos ni controles al dispersarse o cambiar de forma.

Sin JS, sin WebGL2, con movimiento reducido o si un activo no carga, se ven las ilustraciones fijas con su rótulo y todos los pasos encendidos. El respaldo distribuye uno, dos o tres activos en una fila y cuatro en dos filas de dos; en celular usa una sola columna.

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

```astro
---
import CampoAntigravity from '@mcco/web-kit/components/estandar/CampoAntigravity.astro';
---
<section class="campo-propio" aria-labelledby="campo-titulo">
  <CampoAntigravity />
  <div class="campo-propio__contenido">
    <h2 class="std-h2" id="campo-titulo">Campo antigravity.</h2>
    <button type="button" class="std-pildora" data-std-pausa>Pausar movimiento</button>
  </div>
</section>
<style>
  .campo-propio { position: relative; overflow: hidden; padding: 80px 22px; text-align: center; }
  .campo-propio__contenido { position: relative; z-index: 1; }
  .campo-propio [data-std-pausa] { display: none; }
  .campo-propio[data-std-movimiento] [data-std-pausa] { display: inline-flex; }
</style>
```

El runtime crea un solo campo por página. Usa este ejemplo en una página que no active `campo` en `HeroEstandar`.

## Nube, campo y pausa

La nube usa un solo lienzo fijo. Después del primer pintado, los puntos suben desde abajo y en unos 2,6 s arman el primer activo bajo el título. Al bajar, la nube acompaña el scroll a media opacidad hasta la historia. El cursor dispersa los puntos y un barrido de luz los recorre.

La nube arranca después de la carga, en tiempo ocioso y con un ancla cerca de la vista, y se detiene con la pestaña oculta o fuera de pantalla. Las formas se muestrean en un Worker con OffscreenCanvas. Si falta esa API o falla el Worker, el hilo principal procesa una forma por vez, con lotes de hasta 256 elementos y un presupuesto de 8 ms entre pausas. La ordenación estable conserva el resultado de rc.1 para cada semilla. El cierre cancela los pedidos pendientes y el respaldo activo entre lotes; el Worker se cierra cuando llega la última forma. `window.__mccoNube.state` deja ver el estado para verificar.

Desde v1.4.3 el campo y la nube crean su contexto WebGL2 en una tarea aparte. El callback de su `IntersectionObserver` no lo crea: lo agenda con `setTimeout(alArrancar, 400, arrancar)`, con 400 ms de espera y después tiempo ocioso. El primer `getContext('webgl2')` de la página bloquea el hilo principal mientras el proceso de GPU termina de iniciar. Creado en el callback, que corre en el primer cuadro después de la carga, era una tarea larga: de 65 a 177 ms en la portada de condron.cl, con TBT de 194 y 677 ms en Lighthouse móvil. Con la espera de 300 ms o más el mismo `getContext` tarda 4 ms. Mientras tanto se ve la imagen fija de la nube y el hero sin campo, como antes del arranque. `test/estandar-arranque.test.mjs` lo comprueba con dobles.

El campo va en una capa bajo el contenido de su contenedor, sin recuadros blancos, también cuando falla la primera forma y se muestra el respaldo de la nube. El texto queda despejado: en la caja que ocupa todo el texto visible del hero no se dibuja ningún guion, y el campo se desvanece de forma suave hacia afuera, de 8 a 56 px del borde de esa caja. Fuera de ella el campo sigue igual, también sobre la nube. Sin texto en el contenedor, el campo lo ocupa todo. Usa los valores de la prueba aprobada: en computador, anillos cada 28 px y un guion cada 30, del radio 46 al 1180 (5184 guiones). En celular son 24 y 26 px, hasta el radio 760 (2841 guiones).

Desde v1.4.2 la caja cubre todo el texto del hero, no solo el H1, la bajada y las acciones (lo que medía v1.4.1). `campo.js` la deduce del DOM, sin marcado ni clases nuevas, como la unión de:

- las líneas de cada nodo de texto con contenido: el H1, la bajada y lo que el sitio agregue, como un antetítulo, una fila de cifras o una nota. Cuentan las líneas y no el bloque que las contiene, así un `<p>` o un `<dl>` de ancho completo no borra el campo de lado a lado;
- la caja completa de cada píldora de `.std-acciones` y de los campos `input`, `select` y `textarea`, cuyo texto no es un nodo.

Si el texto está en dos zonas, la caja es una sola y las contiene a las dos. No cuentan la capa del campo, el botón de pausa (`[data-std-pausa]`), la figura que contiene la nube (o el ancla, si no hay `figure`) y los rótulos `[data-rotulo]`, sobre los que el campo sigue pasando; tampoco el texto dentro de un elemento cuya caja mide menos de 2 × 2 px, que es el recorte de 1 px de `.std-oculto` y `.sr-only`, ni lo que no se pinta (`display: none`, `<noscript>` con JS). La caja se rehace cuando cambia de tamaño cualquier elemento del hero (un `ResizeObserver` los sigue a todos), al cargar una fuente y al cambiar la ventana o el DPR.

Límites de la regla:

- El texto con `visibility: hidden` u `opacity: 0` cuenta, porque tiene caja, y también el texto llevado fuera de la vista (`left: -9999px`), que estira la caja. Un `.sr-only` que oculta solo con `clip-path`, sin medir 1 px, también cuenta. Para ocultar texto en el hero, usar el recorte de 1 px o `display: none`.
- Un elemento que el sitio agregue al hero después del arranque no queda observado: la caja lo incluye recién con el siguiente cambio de tamaño de la ventana o de un elemento observado, de fuente o de alto del hero.
- Un cambio de texto que no altera el tamaño de ningún elemento, o que mueve el texto con `transform`, no rehace la caja.
- `img` y `svg` sin texto no cuentan, por ejemplo un logo dentro del H1.
- Como el observador sigue todo el hero, una animación de tamaño dentro de él hace recalcular la caja en cada cuadro. Nada del kit lo hace; si el sitio anima algo en el hero, conviene que use `transform`.

El centro del campo persigue al mouse con unos 1,4 s de retraso, sin cursor pasea despacio, los anillos giran a 0,012 rad/s y el scroll no los mueve. Sobre la nube los guiones bajan a un tercio. Con movimiento reducido no se crea, y sin WebGL2 no queda nada porque es decorativo. `window.__mccoCampo.state` deja ver su estado.

La pausa es una sola para todo el documento (`lib/estandar/pausa.js`). Los botones `[data-std-pausa]` del hero y de la historia dicen siempre lo mismo y cualquiera pausa o reanuda todo. Cada cambio avisa con el evento `std-pausa` en `window`, con `detail.pausa`.

Con 901 × 700 px o más, la nube usa 26 000 puntos y el campo sus anillos de computador, los dos con DPR hasta 1,65 y sin tope de cuadros. En las demás ventanas, celulares girados y laptops bajas incluidos, la nube usa 11 000 puntos y el campo los anillos de celular, con DPR hasta 1,35 y 30 cuadros por segundo.

Los puntos de la nube se fijan al arrancar, y el campo rehace sus anillos si la ventana cruza el corte. Ambos lienzos siguen los cambios de DPR mediante una consulta de resolución, incluso sin un evento resize y en pausa. Al apagarse definitivamente, el campo desconecta observadores, quita oyentes y libera sus recursos WebGL; una pérdida de contexto queda en respaldo y no intenta restaurarse.

## Presupuesto

Los límites y las mediciones de JS de esta tabla corresponden al build optimizado de Astro. La copia de fuentes sin minificar de rc.1 no cumple estos presupuestos por sí sola.

| Medida | Límite | Medido en v1.2.0-rc.2 |
|---|---|---|
| JS de la nube, gzip | 12 KB | 11 658 B, incluidos Worker, respaldo del hilo principal, entradas, `pausa.js` y utilidades compartidas |
| JS del campo, gzip | 5 KB | 4960 B, incluidas `pausa.js` y utilidades compartidas |
| Lighthouse móvil | 85 en rendimiento, 95 en accesibilidad | Se mide en la portada de mcco.cl |
| LCP | El H1 | Con la nube funcionando, hoy el respaldo del hero se pinta antes de que la nube arranque y puede quedar como LCP; en celular la bajada puede tener más área que el H1. Pendiente: no entró en v1.4.2 |
| CLS | Menos de 0,1 | |
| Imágenes | Menos de 400 KB (R12). Activos de la nube, de 100 a 200 KB; el que sirve de respaldo del hero no pasa de 150 KB, el tope de héroes del contrato de cada sitio | |
| Videos | 8 MB, H.264 con `faststart`, poster WebP, `muted`, `playsinline`, `preload="none"`, en R2 | |

El JS se midió con zlib nivel 9 sobre el build de Astro 7.3.8 de la demo de `mcco-web-template`, sumando cada archivo comprimido por separado. Se cuentan las dos entradas de la nube y todos sus módulos alcanzables, incluido el respaldo dinámico aunque funcione el Worker. `node test/estandar-presupuesto.mjs <dist>` reproduce la medición y comprueba límites conservadores de 12 000 y 5000 bytes. En v1.4.2 el campo, con la caja de todo el texto del hero, mide 4918 B en el build de Astro del contrato (`test/fixtures/estandar-astro`) y la nube 11 676 B. El límite del campo sigue en 5000 B: para que la regla nueva cupiera se compactó el GLSL, con nombres cortos de uniformes y variables que explica una leyenda en el comentario de `campo.js`. Cualquier cambio en el campo o en las utilidades compartidas requiere volver a medir ambos presupuestos.

## Regla de imágenes y rótulos de origen

1. Primero material real: fotos y video de faena propios.
2. Después render propio: nube de puntos, modelo, mapa de desviaciones.
3. Cuándo se usa IA lo fija la regla de imágenes del contrato de cada sitio (`AGENTS.md`). Las fotos y los videos hechos con IA van siempre con el rótulo «Ilustración». Llevan un prompt detallado y revisado, con la geometría real del activo y referencias, sin textos ni marcas inventadas, y se revisan imagen por imagen.
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

## Capa base para webs sin Astro: mcco-estandar-copiar

En v1.2.0-rc.2 la salida sin Astro se limita a la hoja, las fuentes y los runtimes como código fuente sin minificar. La copia sola no monta el estándar en un sitio sin framework ni cumple el presupuesto de JS del build de Astro.

```bash
# En el deploy, con el kit instalado desde la tag que fija el sitio
node node_modules/@mcco/web-kit/scripts/estandar-copiar.mjs public/estandar
```

El script copia `styles/estandar.css`, `styles/fuentes/*` (con la licencia OFL), `lib/estandar/*.js` y `lib/visual/comun.js` al destino, con las mismas rutas relativas, y así siguen resolviendo los `import`, el Worker de la nube y los `url()` de las fuentes. No copia `lib/estandar/rotulos.mjs`, que solo usan los componentes de Astro al construir. Corre en el deploy desde la tag del kit, nunca a mano, y sin destino sale con código 1.

El modo base conserva exactamente sus archivos v1.2: no incluye la hoja de componentes ni video. Los componentes Astro importan ahora `styles/estandar-componentes.css`, que es también la fuente de estilos de la distribución completa.

Desde v1.3.0, `--completo` copia `dist/estandar/`: CSS base y de componentes, fuentes/licencia, menú, subnav,
nube e historia, campo/anillos, pausa pública, video, Worker y muestreo de respaldo. El destino de `--completo`
es una carpeta propia del estándar: si ya existe y tiene archivos, deben ser una distribución administrada por
este comando. El comando verifica primero versión, archivos obligatorios, SHA-256, tamaños y grafos; no instala
ni importa herramientas de build.

```sh
node node_modules/@mcco/web-kit/scripts/estandar-copiar.mjs public/estandar --completo
```

Contrato HTML, marcado completo de cada pieza y variantes independientes: [ESTANDAR-HTML.md](ESTANDAR-HTML.md).
El modo completo cumple los límites conservadores (medición de v1.4.3): nube **9028 B gzip / 12 000 B**, campo
**4994 B / 5000 B** (6 B de margen, sin subir el límite), con pausa pública y comunes en cada presupuesto aislado.
Total JS de página **14 052 B**, contando cada recurso una vez. `npm run check:estandar` reconstruye el grafo (también imports dinámicos y URL del Worker), comprime cada
respuesta con `gzipSync` nivel 9 y falla si hay corrupción o se excede un límite. Menú **457 B**, subnav **341 B**,
video **1351 B** con su común. La medición vigente completa está en `dist/estandar/manifest.json` y en la salida
del verificador; estos valores no reemplazan la medición de la página del sitio con sus adaptadores.

Para subir de versión, una web sin Astro fija la tag y el SHA nuevos del kit, acepta la versión nueva del manifiesto
si su build la comprueba (as-built lo hace en `build-estandar` y `check-estandar`) y vuelve a copiar con
`--completo`. De v1.4.1 a v1.4.2 se mantienen archivos, entradas y formato del manifiesto; cambian `campo.js` (el
texto despejado) y `estandar.css` (la regla `.std-saltar`), y el HTML del sitio no cambia. De v1.4.2 a v1.4.3 tampoco
cambian archivos, entradas ni formato; cambian `campo.js` y `nube.js` (el contexto WebGL en una tarea diferida).

El empaquetado usa esbuild **0.28.2**, división de módulos comunes y entradas estables. Compacta el GLSL (sin
comentarios ni espacios que no separen dos palabras o dos operadores) sin cambiar sus tokens. `pausa.js` reexporta
el único estado de pausa compartido por nube y campo; ambos usan una sola instancia de `comun.js`. El mismo `nube-worker.js` es Worker ESM y respaldo importado dinámicamente.
La distribución no incluye fechas ni rutas absolutas y dos builds limpios deben producir los mismos bytes.

Astro sigue usando los runtimes fuente y recibe las mismas hojas a través de cada componente o del layout.
El respaldo del hero permanece visible hasta que el runtime confirma la nube: un módulo bloqueado no lo oculta.
No se modifican los componentes ni los runtimes visuales v1.1.

El Worker de la nube se carga desde el mismo origen, así que la CSP del sitio tiene que permitir `'self'` en `worker-src`, o en `script-src` si no declara `worker-src`.

## Contacto: límites, demora del Worker y Turnstile

`functions/contact.js` recibe el formulario en `/api/contact` y lo envía al Worker `formularios-mcco`.
El plazo del Worker es de **25 segundos**, incluida la lectura de su JSON. Si vence (`TimeoutError`),
redirige a `/contacto-error?reason=demora`: el Worker puede seguir procesando y el mensaje puede haber
llegado. Un rechazo HTTP, `{ ok: false }`, JSON inválido o un error de red siguen usando `reason=correo`.
Ninguno de esos fallos programa el acuse; este requiere confirmación de éxito del Worker.

El kit no incluye una página de error ni traduce `reason` en `components/`, `pages/` o `lib/`.
**Cada web con página de error propia debe agregar el caso `demora`**, con este texto seguido del
correo del sitio (`site.contact.email`, enlazado con `mailto:`):

> Es posible que tu mensaje haya llegado igual. Si no te contactamos, escríbenos a

No se promete un plazo de respuesta ni se afirma que el envío haya fallado.

Antes de parsearlo admite hasta **32 KiB (32 × 1024 bytes)**: comprueba `content-length` y cuenta también
los bytes leídos, cancelando la lectura al excederlos. Admite hasta **40 entradas** (incluye repetidas,
campos excluidos y archivos). Un exceso redirige a `/contacto-error?reason=tamano`, sin llamar a
Turnstile ni al Worker y sin programar el acuse. Cada valor enviado se recorta a **5000 caracteres**;
el mismo límite se aplica al juntar entradas repetidas con `, `.

Se conserva la lista de campos que no viajan: `access_key`, `cf-turnstile-response`, `website_url` y
`botcheck`; tampoco se envían archivos. El Worker recorta los valores y escapa el contenido al formar
el correo. Ese escape sigue siendo responsabilidad del Worker: la función envía texto en JSON y no
lo convierte a HTML. No se agrega una lista permitida opcional en v1.3.1; los demás nombres de campos
siguen viajando como antes. Un sitio que necesite restringirlos debe hacerlo en su adaptador antes
de delegar al kit, además de conservar los controles del Worker.

La clave pública (`contact.turnstile_sitekey`, usada por el formulario del sitio) y el secreto
(`TURNSTILE_SECRET`, variable del servidor) siguen desacoplados, como en v1.2.0. El servidor no deduce
su configuración a partir del widget:

| Clave pública | Secreto | Resultado |
|---|---|---|
| No | No | Sin widget ni verificación; el formulario puede llegar al Worker. |
| Sí | No | Se muestra el widget, pero el servidor no exige ni verifica el token; se puede enviar sin él. |
| No | Sí | El formulario normal no genera token y se rechaza con `reason=turnstile`. |
| Sí | Sí | Se exige token y `success: true` en Siteverify antes del Worker y del acuse. |

Estos resultados suponen que pasan los límites, el honeypot y la configuración obligatoria del Worker.
Con secreto, el token ausente, vacío, rechazado o cuya verificación vence a los **10 segundos** termina
en `reason=turnstile`. Errores de red y JSON inválido conservan `reason=exception`; nunca envían el lead.
Sin secreto no se consulta Siteverify, haya o no token. El sitio debe configurar ambas claves de forma
coherente; v1.3.1 documenta las combinaciones sin activar ni desactivar Turnstile automáticamente.

## Decisiones fuera del DESIGN.md de Apple

- El anillo de foco no lleva el radio de 4 px de Apple: es una línea de 2 px a 3 px del borde, con esquinas rectas.
- Las imágenes llevan `height: auto` en la base de la hoja.
- El rótulo de origen va en 11 px, aunque la escala termina en 12.
- `--std-tinta-80` es `#333336`, el de la prueba aprobada. El «Ink Muted 80» de Apple es `#333333`.
- La tarjeta de marca va en `#1d1d1f` sobre negro, fuera de las seis superficies, como en la prueba aprobada.
- La barra global marca la página actual solo con `aria-current`, sin una marca a la vista.
- Los botones de pausa cambian su texto («Pausar movimiento», «Reanudar movimiento») y no llevan `aria-pressed`, como pide el patrón de botón de WAI-ARIA para un botón cuyo texto cambia.
- Un solo corte, `(min-width: 901px) and (min-height: 700px)`, habilita la historia fija y el presupuesto de computador de nube y campo. La historia además debe caber completa; si no cabe, pasa a flujo sin cambiar ese presupuesto.
- `Cifras` agrupa los números como en Chile y los redondea a dos decimales, así que un año o un código va como texto (`'2011'`).
