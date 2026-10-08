# CHANGELOG · @mcco/web-kit

Cada versión se fija por tag (`github:mcabrera-pixel/mcco-web-kit#vX.Y.Z`). Los sitios la adoptan con
`node bin/webs.mjs subir-kit vX.Y.Z` desde `Paginas WEB MCCO`.

## v1.1.3 · 2026-10-06
- Workflows `site-ci` y `site-deploy` en `ubuntu-24.04` con Node 24.21.0 (npm 11.19.0). `ubuntu-latest` migra a Ubuntu 26 desde el 19-oct-2026.
- El proyecto Cloudflare sale de `site.yaml` con el bin nuevo `mcco-sitio`; si el workflow del sitio pasa otro proyecto, la CI falla con el motivo.
- Smoke del deploy en `scripts/smoke.sh`: prueba `<proyecto>.pages.dev` y el dominio solo si ya está conectado al proyecto. Las webs sin dominio propio pueden desplegar.
- `docs/LOCKFILE.md`: el lockfile se genera en Linux con el npm de la CI.
- Los sitios llaman a los workflows con la misma tag del paquete (`@v1.1.3`) en vez de `@v1`.
- Los workflows corren `mcco-sitio` y `mcco-check` con `node node_modules/@mcco/web-kit/scripts/…`, sin `npx`. La ref del workflow (`@vX.Y.Z`) y la versión del paquete van juntas, y la tag `v1` no se mueve.
- Formulario de contacto (`functions/contact.js`): los leads van al Worker `formularios-mcco`, porque Web3Forms rechaza con 403 los envíos desde servidor. Variables nuevas `FORMULARIOS_URL`, `FORMULARIOS_CLAVE` y `MARCA`; `WEB3FORMS_KEY` deja de usarse. Si el Worker falla, el error es `reason=correo` (antes `reason=web3forms`).

## v1.1.2 · 2026-10-05
- MCCO Group pasa a «Ingeniería para minería: estructuras, infraestructura crítica y activos», con 5 productos en `sites.json`.

## v1.1.1 · 2026-10-05
- Pie de grupo correcto en la casa matriz y encabezados sin raya.

## v1.1.0 · 2026-10-05
- Sistema visual: `HeroParticulas`, `VideoBanda`, `ProcesoScroll`, `Figura`, `Revelar`, `FranjaClientes`, `PrecioDesde` y `docs/SISTEMA-VISUAL.md`.
- `mcco-check` R11-R13 (ilustración rotulada, peso de medios, movimiento reducido) como aviso; `check: { visual: error }` las sube a error.

## v1.0.4 · 2026-10-05
- Razón social Inversiones MCCO SpA, marca MCCO Group y registro de las 8 marcas en `sites.json` (`estado` y `loadActiveSites()`).

## v1.0.3 · 2026-09-23
- R8 verifica que los iframes externos estén permitidos por `frame-src`.

## v1.0.2 · 2026-09-23
- R6 ignora el atributo `placeholder=` de los inputs.

## v1.0.1 · 2026-09-23
- Workflows sin `deployments: write` (el token del repo llamador no lo otorga).

## v1.0.0 · 2026-09-23
- Primera versión: Estándar Web MCCO v2 en código (layouts, entidad, endpoints SEO/GEO, `mcco-check` R1-R10, `mcco-parity`, `mcco-headers` y workflows reutilizables).
