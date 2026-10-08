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
| `components/*` | `Head`, `SchemaOrg`, `Analytics`, `FooterGrupo`, `AiCapsule`, `Faq`, `Cta`, `PostCard`. |
| `components/visual/*` | Sistema visual v1.1: `HeroParticulas`, `VideoBanda`, `ProcesoScroll`, `Figura`, `Revelar`, `FranjaClientes`, `PrecioDesde` (JS en `lib/visual/`). |
| `pages/NotFound.astro` | 404 estándar (obligatoria: sin ella Cloudflare sirve la home con 200). |
| `endpoints/*` | `sitemap.xml`, `robots.txt`, `llms.txt`, `llms-full.txt` generados desde `site.yaml` + colecciones. |
| `content/schemas.ts` | Esquemas Zod de `blog`, `casos`, `guias`: el build falla si falta cápsula, FAQ o enlaces. |
| `data/*.json` | `entity` (RUT, dirección, fundación), `sites` (la red), `ai-bots` (crawlers permitidos), `blacklist` (NDA). |
| `scripts/check.mjs` | **`mcco-check`**: verificador R1-R13 sobre `dist/` (R11-R13 del sistema visual, como aviso). Sale 1 si hay errores. Es el gate de CI. |
| `scripts/parity.mjs` | **`mcco-parity`**: gate de migración (producción vs build, ruta por ruta). |
| `scripts/headers.mjs` | **`mcco-headers`**: genera `public/_headers` (CSP) y `public/_redirects` desde `site.yaml`. |
| `scripts/sitio-ci.mjs` | **`mcco-sitio`**: proyecto Cloudflare y dominio desde `site.yaml` para los workflows. |
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

## Sistema visual (v1.1)

Componentes para llevar a todas las webs el lenguaje del rediseño de as-built.cl: hero de partículas WebGL2 propio, bandas de video real, procesos que se dibujan al bajar, imágenes rotuladas por origen, revelado al hacer scroll y precio «desde UF». Sin dependencias en tiempo de ejecución y con el color de los tokens de cada sitio.

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

No impone identidad visual: cada división conserva la suya en `DESIGN.md` y `src/styles/theme.css`. El kit solo fija **nombres** de tokens con fallbacks neutros; los componentes del sistema visual son piezas que toman esos tokens, no una estética.
