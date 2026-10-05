# Sistema visual MCCO (kit v1.1)

El lenguaje del rediseño de as-built.cl (28-sep-2026), llevado a componentes del kit: partículas que arman el activo, video real de faena, procesos que se dibujan al bajar, imágenes con origen declarado y menos texto. Cada web lo usa con sus tokens y sus archivos; nadie copia código entre repos.

- Componentes: `components/visual/*.astro`. JS: `lib/visual/*.js`.
- Cero dependencias en tiempo de ejecución: WebGL2, IntersectionObserver y CSS. Nada de Three.js, GSAP ni CDN.
- Color: todo sale de los tokens (`--mcco-color-*` de `styles/tokens.css`). La misma pieza funciona en una web clara y en una oscura. Tokens nuevos opcionales: `--color-on-accent` (texto sobre el acento) y `--font-mono` (rótulos).
- Movimiento: todo respeta `prefers-reduced-motion` (queda completo y quieto) y nada mueve el layout.
- Demo: `src/pages/demo-visual.astro` y `demo-visual-oscura.astro` en `mcco-web-template`.

## Regla de imágenes del grupo

1. **Primero material real**: fotos y video de faena propios.
2. **Después render propio**: nube de puntos, modelo, mapa de desviaciones.
3. **Codex solo para atmósfera**, y siempre rotulado «Ilustración».
4. **Nunca** texto, cifras, logos ni escalas generados dentro de una imagen.
5. **Los datos salen del escáner**, no de una imagen.

En el código eso es `origen` en `Figura` y en `HeroParticulas`, y la regla R11 de `mcco-check`. Las ilustraciones se guardan en `public/media/ilustracion/` para que el chequeo las reconozca aunque falte el atributo.

## Componentes

### HeroParticulas

Texto a la izquierda, activo grande a la derecha (en móvil, bajo el texto). La nube se muestrea por brillo desde una imagen (WebP con el activo sobre negro, o SVG de silueta con `invertir`), el cursor la dispersa, un barrido de luz la recorre y cada `intervalo` segundos se rearma en el siguiente activo. El muestreo corre en un Web Worker.

```astro
---
import HeroParticulas from '@mcco/web-kit/components/visual/HeroParticulas.astro';
const activos = [
  { src: '/media/ilustracion/molino-sag-960.webp', etiqueta: 'Molino SAG' },
  { src: '/media/ilustracion/caex-960.webp', etiqueta: 'Camión CAEX' },
];
---
<HeroParticulas activos={activos} antetitulo="Escaneo láser 3D" bajada="Medimos tu instalación y la entregamos como nube, planos o modelo.">
  <Fragment slot="titulo">Capturar lo que existe. <span>Proyectar lo que viene.</span></Fragment>
  <a class="btn" href="/cotizar/">Cotizar</a>
</HeroParticulas>
```

| Prop | Por defecto | Para qué |
|---|---|---|
| `activos` | (obligatorio) | `{ src, etiqueta, alt?, invertir?, width?, height? }[]` |
| `titulo` / slot `titulo` | | H1. Es el LCP: WebGL arranca después de la carga, en tiempo ocioso y con el lienzo a la vista |
| `intervalo` | `8` | segundos por activo |
| `densidad` | `{ escritorio: 90000, movil: 24000 }` | puntos por activo |
| `colores` | `'tema'` | `'tema'` usa `--mcco-color-text` y `--mcco-color-accent`; `'imagen'`, los colores del archivo (fondos oscuros) |
| `origen` / `rotulo` | `'ilustracion'` | rótulo visible sobre el activo |
| `arranque` | `'visible'` | `'interaccion'` espera el primer gesto y mientras muestra la imagen fija |
| `nivel` | `1` | `2` si el hero no es el titular de la página |

Pausa con botón, con `prefers-reduced-motion` (arranca armado y quieto) y con la pestaña oculta o el lienzo fuera de pantalla. Sin WebGL2 o si falla el contexto se muestra la imagen fija del primer activo; sin JS, la misma imagen por `<noscript>`. En móvil: menos puntos, DPR 1 y 30 fps.

### VideoBanda

```astro
<VideoBanda src="/media/video/faena.mp4" poster="/media/video/faena-poster.webp" etiqueta="Escáner FARO en una plataforma de planta">
  <h2>Del trípode al modelo.</h2>
  <p>Estaciones de escaneo, registro y modelado.</p>
</VideoBanda>

<VideoBanda formato="partido" lado="derecha" src="/media/video/dron.mp4" poster="/media/video/dron-poster.webp"
  etiqueta="Vuelo de dron sobre una correa" rotulo="Registro en terreno">
  <h2>Zonas altas, con dron.</h2>
</VideoBanda>
```

`poster` y `etiqueta` son obligatorios. `muted playsinline loop preload="none"`: el video se descarga recién cuando entra en pantalla. Sin autoplay con movimiento reducido ni con `Save-Data`; queda el poster y el botón «Reproducir video». Rótulo visible, «Video de faena» por defecto. Para fuentes WebM + MP4, `fuentes={[{ src, type }]}`.

### ProcesoScroll

```astro
<ProcesoScroll titulo="Del rajo a la fundición." pasos={[
  { titulo: 'Mina', texto: 'Rajo y botaderos.', icono: 'mina' },
  { titulo: 'Chancado', icono: 'chancado' },
  { titulo: 'Concentradora', icono: 'concentradora' },
  { titulo: 'Fundición', icono: 'fundicion' },
]} nota="Esquema simplificado." />
```

Horizontal en escritorio, vertical en móvil. Al bajar, la línea avanza y cada paso aparece cuando la línea lo alcanza (no se desarma al subir). Sin JS o con movimiento reducido se ve completo. Íconos del kit (`lib/visual/iconos.mjs`): `mina`, `chancado`, `concentradora`, `fundicion`, `escaner`, `nube`, `modelo`, `documento`, `reunion`, `terreno`, `entrega`, `camion`; o una ruta `/…` a una imagen propia.

### Figura

```astro
<Figura src="/media/real/faro-plataforma.webp" alt="Escáner FARO sobre trípode en una plataforma" width={1600} height={1200} origen="real" />
<Figura src="/media/ilustracion/rajo.webp" alt="Rajo al amanecer" width={960} height={540} origen="ilustracion" rotuloEn="sup-der" pie="Atmósfera. No muestra un proyecto." />
```

`origen`: `real` («Foto de faena»), `render` («Render 3D»), `ilustracion` («Ilustración»), `esquema` («Esquema»). `src`, `alt`, `width`, `height` y `origen` son obligatorios: si falta uno, el build falla. `loading="lazy"` salvo `prioridad`. `rotuloEn` mueve el rótulo de esquina para no tapar lo importante; `proporcion="4 / 3"` con `ajuste="cubrir" | "contener"` alinea grillas.

### Revelar

```astro
<Revelar />  <!-- una vez por página -->
<h2 data-revelar>Aparece al entrar en pantalla</h2>
<ul data-revelar-grupo><li>…</li><li>…</li></ul>   <!-- cada hijo con 70 ms de desfase -->
<strong>±<span data-contar="2">2</span> mm</strong>  <!-- data-decimales="1" si corresponde -->
```

El HTML trae siempre el estado final; el estado oculto solo existe cuando el script marcó `<html>`. Solo `opacity` y `transform`, y lo que ya está a la vista al cargar no se oculta: CLS 0.

### FranjaClientes y PrecioDesde

```astro
<FranjaClientes frase="Han confiado en nuestro equipo" />
<PrecioDesde uf={45} detalle="control dimensional" contar />
```

`FranjaClientes` lee `clientes_autorizados` de `site.yaml` (también acepta el nombre anterior, `clients_allowed`), en texto y sin logos. `solo={['CODELCO', 'BHP']}` muestra un subconjunto, siempre dentro de los autorizados. `PrecioDesde` es el chip «desde UF X»; la cifra la pone el sitio.

## Presupuesto de rendimiento

| Pieza | JS (gzip) | Notas |
|---|---|---|
| HeroParticulas | 5,8 KB + 1,4 KB del Worker | incluye el muestreo de respaldo para navegadores sin OffscreenCanvas |
| VideoBanda | 0,6 KB | |
| ProcesoScroll | 0,5 KB | un listener de scroll pasivo, se quita al completarse |
| Revelar | 0,9 KB | |
| utilidades comunes | 0,4 KB | compartidas |
| Figura, FranjaClientes, PrecioDesde | 0 | solo HTML y CSS |

Medido en el build de la demo de `mcco-web-template`. Límites para una página:

- El H1 es el LCP. Nada del sistema visual va antes del titular ni lo anima.
- Imágenes WebP ≤ 300 KB (activos del hero de 960 px: 100 a 200 KB). Videos de 6 a 12 s, ≤ 8 MB, H.264 con `faststart`, con poster WebP.
- CLS < 0,1: el hero y las bandas reservan su alto con `aspect-ratio` o alto fijo.
- Lighthouse móvil ≥ 85 en rendimiento y ≥ 95 en accesibilidad. Si el hero de partículas no lo deja en una portada cargada, la palanca es `arranque="interaccion"`.

## Reglas nuevas de mcco-check

| Regla | Qué revisa |
|---|---|
| R11-ilustracion | Toda imagen con `data-origen="ilustracion"` o bajo `/media/ilustracion/` tiene un rótulo visible (`[data-rotulo]` o un `figcaption` que diga «Ilustración») en su contenedor. |
| R12-medios | Imagen > 400 KB o video > 8 MB en `dist/`; `<video>` sin `poster`, `muted` o `playsinline`. |
| R13-movimiento | Una página que usa componentes visuales, o cuyos scripts animan (`requestAnimationFrame`, `.animate(`), debe tener algún script que consulte `prefers-reduced-motion`. Se leen los scripts en línea y locales, siguiendo sus imports. |

Nacen como **aviso** para no romper las webs actuales. Para pasarlas a **error** en un sitio:

```yaml
# site.yaml
check:
  visual: error
```

o, sin tocar el manifiesto, `mcco-check --dist dist --visual-error` en el script `check`. `--strict` también las sube, junto con todos los demás avisos. Cuando todas las webs estén en verde, el kit puede cambiar el valor por defecto (cambio MAJOR, según el versionado del README).

**Chequeo manual que R13 no cubre** (no se puede ver en el HTML estático): animaciones solo CSS (`@keyframes`, `transition` largas) y scripts externos. Para revisarlas: DevTools → Rendering → «Emulate CSS media feature prefers-reduced-motion: reduce», recargar y bajar por la página. Todo debe verse completo y quieto, sin contenido oculto y con las cifras finales.

R11 tampoco ve un rótulo escondido por CSS (`display: none` en una hoja): usa el componente `Figura` o un `[data-rotulo]` sin ocultar.
