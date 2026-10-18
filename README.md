# @mcco/web-kit

Kit compartido de las webs de MCCO Group. Implementa en código el **Estándar Web MCCO v2**: lo que el estándar exige, el kit lo genera o lo verifica. Un sitio nuevo nace desde [`mcco-web-template`](https://github.com/mcabrera-pixel/mcco-web-template); un sitio existente lo adopta siguiendo el playbook de migración del estándar.

## Qué contiene

| Ruta | Para qué |
|---|---|
| `config/astro.mjs` | `mccoConfig()`: configuración Astro estándar (dominio desde `site.yaml`, `build.format: preserve`, kit como `noExternal`). |
| `lib/site.mjs` | `loadSite()` lee y valida `site.yaml`; `loadEntity()`, `loadSites()`, `loadBots()`, `loadBlacklist()` leen los datos del grupo. |
| `lib/routes.mjs` | Regla de URL canónica (la que sirve Cloudflare Pages: sin `.html`, carpetas con `/`). |
| `layouts/Base.astro` | `<head>` estándar + analítica declarada + bloque Grupo MCCO. |
| `layouts/Post.astro` | Artículo: cápsula GEO, FAQ, fuentes, relacionados, CTA, JSON-LD BlogPosting + Breadcrumb + FAQPage. |
| `layouts/Estandar.astro` | Layout del estándar visual: `Base` con `<body class="std">`, barra global, sub-navegación y slots `head` y `pie`. |
| `components/*` | `Head`, `SchemaOrg`, `Analytics`, `FooterGrupo`, `AiCapsule`, `Faq`, `Cta`, `PostCard`. |
| `components/estandar/*` | Estándar visual Apple + antigravity: `NavGlobal`, `SubNav`, `Bloque`, `HeroEstandar`, `Acciones`, `NubeAncla`, `CampoAntigravity`, `HistoriaNube`, `GrillaProductos`, `Producto`, `Galeria`, `Cifras`, `TarjetasMarca` (JS en `lib/estandar/`). |
| `styles/estandar.css` | Hoja del estándar: tokens `--std-*`, color de acción por sitio, tipografía, píldoras y rótulo de origen. Inter autoalojada en `styles/fuentes/`, con su licencia OFL. |
| `components/visual/*` | Sistema visual v1.1: `HeroParticulas`, `VideoBanda`, `ProcesoScroll`, `Figura`, `Revelar`, `FranjaClientes`, `PrecioDesde` (JS en `lib/visual/`). |
| `pages/NotFound.astro` | 404 estándar (obligatoria: sin ella Cloudflare sirve la home con 200). |
| `endpoints/*` | `sitemap.xml`, `robots.txt`, `llms.txt`, `llms-full.txt` generados desde `site.yaml` + colecciones. |
| `content/schemas.ts` | Esquemas Zod de `blog`, `casos`, `guias`: el build falla si falta cápsula, FAQ o enlaces. |
| `data/*.json` | `entity` (RUT, dirección, fundación), `sites` (la red), `ai-bots` (crawlers permitidos), `blacklist` (NDA). |
| `scripts/check.mjs` | **`mcco-check`**: verificador R1-R13 sobre `dist/` (R11-R13 del sistema visual, como aviso). Sale 1 si hay errores. Es el gate de CI. |
| `scripts/parity.mjs` | **`mcco-parity`**: gate de migración (producción vs build, ruta por ruta). |
| `scripts/headers.mjs` | **`mcco-headers`**: genera `public/_headers` (CSP) y `public/_redirects` desde `site.yaml`. |
| `scripts/sitio-ci.mjs` | **`mcco-sitio`**: proyecto Cloudflare y dominio desde `site.yaml` para los workflows. |
| `scripts/estandar-copiar.mjs` | **`mcco-estandar-copiar`**: copia la hoja, las fuentes y el JS del estándar a otra carpeta, para las webs sin Astro. |
| `scripts/smoke.sh` | Smoke del deploy sobre `<proyecto>.pages.dev` y, si está conectado, el dominio. |
| `.github/workflows/site-ci.yml` | Reutilizable: PR → build + check + preview. |
| `.github/workflows/site-deploy.yml` | Reutilizable: main → build + check + deploy + smoke. |

## Uso mínimo en un sitio

```bash
npm i github:mcabrera-pixel/mcco-web-kit#v1.0.0
```

```js
// astro.config.mjs
import { defineConfig } from 'astro/config';
import { mccoConfig } from '@mcco/web-kit/config';
export default defineConfig(mccoConfig());
```

```json
// package.json
"scripts": { "prebuild": "mcco-headers", "build": "astro build", "check": "mcco-check --dist dist", "dev": "astro dev" }
```

Los archivos `src/pages/{sitemap.xml,robots.txt,llms.txt,llms-full.txt}.ts`, `src/pages/404.astro` y `src/content.config.ts` se copian de la plantilla (una línea cada uno).

## Estándar visual (v1.2)

El lenguaje de apple.com, según el `DESIGN.md` de Apple del repositorio awesome-design-md, más antigravity: una nube de puntos que arma los activos del sitio y acompaña el scroll, y un campo de guiones detrás del texto del hero. El kit fija la hoja, los componentes y el JS, y cada sitio pone su color de acción, sus activos y su contenido. Sin dependencias en tiempo de ejecución.

```astro
import Estandar from '@mcco/web-kit/layouts/Estandar.astro';
import HeroEstandar from '@mcco/web-kit/components/estandar/HeroEstandar.astro';
```

Uso de cada componente, variables por sitio, presupuesto, regla de imágenes y salida sin Astro: [`docs/ESTANDAR.md`](docs/ESTANDAR.md). Demo: `/demo-estandar` en la plantilla.

## Sistema visual (v1.1)

Componentes para llevar a todas las webs el lenguaje del rediseño de as-built.cl: hero de partículas WebGL2 propio, bandas de video real, procesos que se dibujan al bajar, imágenes rotuladas por origen, revelado al hacer scroll y precio «desde UF». Sin dependencias en tiempo de ejecución y con el color de los tokens de cada sitio. Sigue funcionando en las webs que todavía no migran al estándar.

```astro
import HeroParticulas from '@mcco/web-kit/components/visual/HeroParticulas.astro';
import Figura from '@mcco/web-kit/components/visual/Figura.astro';
```

Uso de cada componente, presupuesto de rendimiento, regla de imágenes del grupo y cómo pasar R11-R13 a error: [`docs/SISTEMA-VISUAL.md`](docs/SISTEMA-VISUAL.md). Demo: `/demo-visual` y `/demo-visual-oscura` en la plantilla.

## Versionado

Tags `vMAJOR.MINOR.PATCH`. Los sitios fijan el tag en `package.json`. Cambios que rompen (renombrar props, cambiar reglas de `mcco-check` de aviso a error) suben MAJOR y se anuncian en `CHANGELOG.md`.

La ref de los workflows reutilizables (`@vX.Y.Z`) y la versión del paquete en `package.json` van juntas: los workflows corren los scripts del kit desde `node_modules`, sin `npx`. La tag `v1` no se mueve.

Historial en `CHANGELOG.md`. Los lockfiles de los sitios se generan en Linux: `docs/LOCKFILE.md`.

## Qué NO es el kit

No trae el color, los activos ni el contenido de ninguna web. El kit fija el estándar visual del grupo, Apple + antigravity (`styles/estandar.css` y `components/estandar/`), y cada sitio pone su color de acción en `src/styles/theme.css`, sus activos en `public/` y su contenido en sus páginas. Los tokens `--mcco-*` de `styles/tokens.css` siguen para los layouts, los componentes generales (`FooterGrupo`, `Faq`, `Cta`, la 404) y el sistema visual v1.1.
