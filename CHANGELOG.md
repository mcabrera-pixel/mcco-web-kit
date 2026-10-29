# CHANGELOG · @mcco/web-kit

Cada versión se fija por tag (`github:mcabrera-pixel/mcco-web-kit#vX.Y.Z`). Los sitios la adoptan con
`node bin/webs.mjs subir-kit vX.Y.Z` desde `Paginas WEB MCCO`.

## v1.3.0 · 2026-10-29
- `--completo` solo reemplaza una copia administrada (con `manifest.json` y nada fuera de él) y deja la versión anterior en un respaldo hasta que la nueva queda instalada; si el cambio falla, la restaura.
- El respaldo de la nube se ve cuando falta WebGL2, falla el muestreo o se pierde el contexto, y sin JS queda una sola imagen. Las pruebas evalúan la cascada real.
- Distribución completa sin Astro en `dist/estandar/`, versionada y empaquetada: CSS compartido, Inter y licencia, módulos ESM minificados, Worker y respaldo dinámico. esbuild 0.28.2 es la única dependencia de desarrollo nueva; Astro pasa a peer opcional para los consumidores HTML.
- `mcco-estandar-copiar <destino> --completo` valida versión, SHA-256, recursos obligatorios y grafos usando Node nativo. El modo base conserva sus archivos y bytes de v1.2.
- `build:estandar`, `check:estandar` y `verificar`, con límites de 12 000/5000 B gzip y comunes contados por presupuesto. Nube: 9140 B; campo: 4935 B; página: 14 105 B.
- Los 13 componentes Astro y el layout importan la única hoja de componentes. El respaldo del hero se ve también si falla la descarga de su módulo.
- Contrato HTML documentado, pruebas de corrupción y reproducibilidad, fixtures HTML/Astro y verificación HTTP por CDP. Workflow de comprobación y evidencia sin publicar ni modificar los jobs de deploy existentes.

## v1.2.0 · 2026-10-28
- SubNav cambia el fondo y el texto juntos, sin transición del fondo, para conservar AA al cruzar bloques negros. La T2 mide el contraste durante la entrada y la salida.
- Acciones acepta `oculto` opcional: texto adicional dentro del enlace con la nueva clase `.std-oculto`. Sin ese campo, conserva el HTML anterior.
- Con `TURNSTILE_SECRET`, contacto exige token y `success: true` antes de enviar al Worker o programar el acuse. La ausencia o el rechazo del token redirige a `contacto-error?reason=turnstile`; sin secreto conserva el comportamiento anterior.
- CI recibe la rama por `env`, la normaliza a `[a-z0-9-]` y usa solo esa salida en el comando de preview. Si queda `main`, usa `rama-main`: la vista previa nunca publica en producción. El deploy de producción conserva `--branch=main`; separar los jobs queda para v1.3.0.
- Faq, Head y SchemaOrg comparten un serializador JSON-LD que escapa `<`, U+2028 y U+2029, sin alterar los datos ni su lectura por mcco-check R5.
- Pruebas de render Astro, contacto y workflows, sin dependencias nuevas ni cambios incompatibles de API.

## v1.2.0-rc.2 · 2026-10-28
- Muestreo de respaldo por lotes de hasta 256 elementos, con un presupuesto de 8 ms entre pausas y ordenación estable. Conserva el resultado de rc.1 para cada semilla, serializa las formas y cancela el trabajo pendiente al cerrar la nube, también si OffscreenCanvas falta solo dentro del Worker.
- El respaldo de la nube deja visible el campo del hero. El campo libera observadores, oyentes y recursos WebGL al apagarse, y ambos lienzos siguen los cambios de DPR sin depender de resize.
- Enlace de shaders compartido con liberación de recursos en éxito, fallo y cancelación. La nube completa ocupa 11 658 B gzip y el campo 4960 B en la demo de Astro, incluidos los módulos compartidos.
- La grilla de respaldo se ajusta a uno, dos, tres o cuatro activos. Galeria comparte la superficie translúcida del rótulo con el control de video; conserva `--w` y `--h` por compatibilidad.
- Pruebas de equivalencia con rc.1, cancelación, limpieza WebGL, DPR, CSS y navegador. Sin cambios de API pública ni dependencias del kit.

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
