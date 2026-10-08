# Lockfiles de las webs MCCO

El `package-lock.json` de cada web se genera en Linux con el mismo npm que usa la CI: hoy Node 24.21.0 y npm 11.19.0
(los fijan `site-ci.yml` y `site-deploy.yml` con `node: 24.21.0`).

## Por qué

El 06-oct-2026 la CI de condron, 3d-ultra y cupla fallaba en `npm ci` con «Missing: @emnapi/runtime@1.11.3 from lock
file». El lockfile se había escrito en Windows con npm 11.6.2 y no traía `@emnapi/core` ni `@emnapi/runtime` en la raíz,
y npm 11.19 en Linux lo rechaza. Regenerado en Linux con npm 11.19.0, `npm ci` pasa en Linux y también en Windows.
Regenerado en Windows no sirve, aunque se use npm 11.19.

## Cómo

Desde la raíz de `Paginas WEB MCCO`, `node bin/webs.mjs subir-kit vX.Y.Z` lo hace solo. A mano, desde la carpeta de
la web:

    ssh mcco-vps 'rm -rf /tmp/lock && mkdir -p /tmp/lock && cat > /tmp/lock/package.json' < package.json
    ssh mcco-vps 'cat > /tmp/lock/package-lock.json' < package-lock.json
    ssh mcco-vps "bash -lc 'cd /tmp/lock && npx -y npm@11.19.0 install --package-lock-only --ignore-scripts'"
    ssh mcco-vps 'cat /tmp/lock/package-lock.json' > package-lock.json

## Al cambiar la versión de Node de la CI

Se cambian juntos, en la misma versión del kit: `node` en los dos workflows, `npm_ci` en `webs.json` de la raíz de
`Paginas WEB MCCO` y esta página.
