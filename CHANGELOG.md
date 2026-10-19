# CHANGELOG · @mcco/web-kit

Cada versión se fija por tag (`github:mcabrera-pixel/mcco-web-kit#vX.Y.Z`). Los sitios la adoptan con
`node bin/webs.mjs subir-kit vX.Y.Z` desde `Paginas WEB MCCO`.

## Sin publicar
- Parámetros opcionales del campo antigravity, aditivos: `parametrosCampo(movil, ajuste)` acepta un ajuste parcial y lanza `Error('parametrosCampo: clave desconocida <clave>')` ante una clave que el campo no tiene. `CampoAntigravity` recibe `parametros` (`{ computador?, celular? }`), que viaja en `data-std-campo-parametros`, y `HeroEstandar` acepta `campo` como `boolean` o `{ parametros }`. Sin parámetros el campo queda igual que en rc.1.
- Parámetro nuevo `atenuacionNube` (por defecto 0,32): la opacidad que conservan los guiones sobre la nube, que antes estaba fija en el shader. Tipos en `lib/estandar/campo-anillos.d.ts`.

## v1.2.0-rc.1 · 2026-10-18
- Estándar visual Apple + antigravity, aditivo: hoja `styles/estandar.css` (tokens `--std-*`, color de acción por sitio en `--accion*` e Inter autoalojada con su licencia OFL), `layouts/Estandar.astro`, componentes en `components/estandar/` y JS en `lib/estandar/` (nube con historia, campo, pausa común, sub-navegación y menú). La guía está en `docs/ESTANDAR.md`.
- `mcco-estandar-copiar <destino>` entrega una capa base para webs sin Astro: la hoja, las fuentes y los runtimes como fuentes sin minificar. La copia sola no monta el estándar en un sitio sin framework ni cumple el presupuesto de JS, que en rc.1 corresponde al build de Astro. Los estilos de los 13 componentes, `lib/visual/video.js` y el build minificado que cumpla ese presupuesto se definirán en el plan de adopción de as-built, después del VB de mcco.cl (spec §6).
- El cierre del Worker cancela todos los pedidos pendientes sin repetir el muestreo en el hilo principal. La píldora chica cubre las cuatro esquinas de su área táctil de 44 × 44 px, también en la receta de `HistoriaNube`.
- Rótulo de origen «Captura de simulación» (`origen: 'captura'`) para las capturas reales de simulación.
- Los botones de video de `VideoBanda` y de pausa de `HeroParticulas` cambian su texto y ya no llevan `aria-pressed`. El de video lleva `data-accion` (`pausar` o `reproducir`), así que un sitio que estilice ese botón por `aria-pressed` pasa a `data-accion`. Los botones de escena del hero conservan `aria-pressed`.
- El README y el encabezado de `styles/tokens.css` dicen ahora que el kit fija el estándar visual del grupo y que cada sitio pone su color de acción, sus activos y su contenido. Los tokens `--mcco-*` siguen para los layouts y el sistema visual v1.1.

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
