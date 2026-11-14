# CHANGELOG · @mcco/web-kit

Cada versión se fija por tag (`github:mcabrera-pixel/mcco-web-kit#vX.Y.Z`). Los sitios la adoptan con
`node bin/webs.mjs subir-kit vX.Y.Z` desde `Paginas WEB MCCO`.

## v1.4.2 · 2026-11-14
- El campo del hero despeja todo el texto visible del hero, no solo el H1, la bajada y las acciones: cuentan las líneas de cada nodo de texto (también antetítulos, filas de cifras y notas que ponga el sitio), las píldoras de `.std-acciones` y los campos `input`, `select` y `textarea` con su caja. Quedan fuera la capa del campo, el botón de pausa, la figura de la nube con sus rótulos `[data-rotulo]` y el texto dentro de elementos de menos de 2 × 2 px (`.std-oculto`, `.sr-only`). Sin marcado nuevo. La rampa de 8 a 56 px y el recálculo por tamaño, fuente y alto se conservan, y el observador de tamaño sigue a todo el hero. Los límites de la regla están en `docs/ESTANDAR.md`.
- `Estandar` y `Post` emiten como primer hijo del `<body>` el enlace «Saltar al contenido» («Skip to content» si la página no está en español), visible solo con foco: `a.std-saltar` a `main#std-contenido` y `a.mcco-saltar` a `main#mcco-contenido`. `Base` no lo emite porque no tiene `<main>`. La regla `.std-saltar` va en `styles/estandar.css` y en `dist/estandar`; el contrato HTML la recomienda sin exigirla.
- Para subir, ninguna web cambia su código. cuplai y monitorai, que ponen su propio enlace de salto dentro de `Estandar`, quedan con dos paradas seguidas al tabular: conviene quitar el suyo con su CSS. as-built, que arma su propio HTML, fija la tag y el SHA de v1.4.2 en `config/estandar.json` y en sus workflows, acepta el manifiesto `1.4.2` en `build-estandar`, `check-estandar` y sus pruebas, y vuelve a copiar `dist/estandar` con `estandar-copiar --completo`. Entre v1.4.1 y v1.4.2 la distribución mantiene archivos, entradas y formato del manifiesto; cambian `campo.js` y `estandar.css`. Su antetítulo y su fila de cifras quedan despejados sin tocar el HTML, y su enlace `a.skip` sigue sirviendo; si quiere la regla del kit, usa `class="std-saltar"`.
- La comparación literal con v1.3.1 (`test/metadatos-html.test.mjs`) excluye en `Estandar` y `Post` solo el enlace de salto, el id del `<main>` y el hash del nombre de la hoja propia del layout, y exige que cada pieza aparezca una vez. `Base` y el resto del HTML se comparan como antes.
- Pruebas de Chrome del campo con antetítulo, fila de cifras, notas en línea y campos de formulario en 1366 y 390 px, y del enlace de salto con y sin foco; render del enlace en `es`, `es-CL` y `en`. Campo 4989/5000 B gzip en la distribución (4918 B en el build de Astro) sin subir el límite: el GLSL se compactó con nombres cortos, explicados en una leyenda del comentario. Nube 9022/12 000 B. Distribución regenerada en `dist/estandar`. Siguen pendientes los textos fijos del kit en páginas en otro idioma (pausa, rótulos, video, `HistoriaNube`, `Cta` y `Post`), para v1.4.3, y el respaldo del hero que puede quedar como LCP.

## v1.4.1 · 2026-11-14
- El campo del hero no dibuja guiones sobre el texto: en la caja que ocupan las líneas del H1 y de la bajada y las píldoras de las acciones no hay ninguno, y se desvanece de 8 a 56 px de su borde. La caja se mide sin marcado nuevo y sigue al tamaño, la fuente y el alto del contenido. Fuera de ella, o sin ese texto, el campo queda igual. El build compacta el GLSL sin cambiar sus tokens.
- `NavGlobal`, `SubNav` y `FooterGrupo` siguen el idioma de la página (WCAG 3.1.2) con la prop opcional `lang`, que `Estandar` y `Base` les pasan; el `lang` de `nav` o `subnav` manda. Fuera del español sus `aria-label` salen en inglés, también en idiomas como `pt-BR`, y el texto del bloque Grupo queda sin traducir bajo `lang="es"`. Las páginas en español y las piezas sueltas sin la prop conservan el HTML de v1.4.0. La pausa, los rótulos de origen, el video, `HistoriaNube`, `Cta` y `Post` siguen en español.
- Pruebas de Chrome del campo despejado, de render del idioma de las partes y del GLSL compacto. Campo 4988/5000 B y nube 9022/12 000 B gzip. Distribución regenerada en `dist/estandar`.

## v1.4.0 · 2026-10-29
- `Base`, `Estandar` y `Post` aceptan `lang` por página: llega al documento y a `og:locale`; `Post` también lo usa en BlogPosting. Sin la prop conservan `site.lang`.
- `Head` y los layouts aceptan `ogTitle`, `ogDescription` y `ogUrl` independientes del SEO, y `robots` como texto o `false` para omitirla. Sin estas props conservan los valores anteriores y la regla de `noindex`, sin metas duplicadas.
- Contacto espera al Worker hasta 25 segundos. `TimeoutError` redirige con `reason=demora`, también al leer el JSON; rechazo, JSON inválido y red conservan `reason=correo`. Las páginas de error propias deben agregar el nuevo caso con el correo del sitio, sin prometer plazos.
- Pruebas de render de los tres layouts, comparación literal con v1.3.1, detección de metas duplicadas y vencimiento con fetch y reloj simulados. Distribución regenerada en `dist/estandar`.

## v1.3.1 · 2026-10-29
- `NubeAncla` y `HistoriaNube` aceptan `origen`, validado con `rotuloDe`; cada activo de la historia puede sobrescribirlo. Por defecto conservan el HTML de ilustración. `HeroEstandar` propaga el origen de su nube.
- Contacto limita el cuerpo a 32 KiB antes del parser, admite hasta 40 entradas y recorta cada valor a 5000 caracteres, también al juntar campos repetidos. El exceso redirige con `reason=tamano` sin llamadas externas.
- Turnstile tiene un plazo de 10 segundos y su vencimiento rechaza el token. Se documentan las cuatro combinaciones de clave pública y secreto sin cambiar la configuración de v1.2.0.
- `--accion-texto` permite texto negro sobre un botón amarillo; su valor por defecto `#fff` conserva la apariencia anterior. El sitio debe medir al menos 4,5:1 sobre `--accion-boton`.
- Pruebas de render, límites de contacto y vencimiento con fetch simulado, y contraste y compatibilidad CSS en Chrome. Distribución completa regenerada en `dist/estandar`.

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
