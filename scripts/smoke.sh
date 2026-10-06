#!/usr/bin/env bash
# Smoke del deploy (site-deploy.yml): portada, sitemap, robots y llms = 200 en <proyecto>.pages.dev; canonical de la
# portada = dominio de site.yaml; y lo mismo en el dominio si ya está conectado al proyecto en Cloudflare Pages.
# Variables: PROYECTO y DOMINIO; CLOUDFLARE_API_TOKEN y CLOUDFLARE_ACCOUNT_ID opcionales (sin ellas no se prueba el
# dominio); SMOKE_ESPERA = segundos entre reintentos (10 por defecto).
set -uo pipefail
: "${PROYECTO:?falta PROYECTO}" "${DOMINIO:?falta DOMINIO}"
BASE="https://${PROYECTO}.pages.dev"
HOST="${DOMINIO#https://}"

probar() {
  local base="$1" p code i
  for p in / /sitemap.xml /robots.txt /llms.txt; do
    code=000
    for i in 1 2 3 4 5 6; do
      code=$(curl -s -o /dev/null -w '%{http_code}' -L "$base$p")
      [ "$code" = "200" ] && break
      sleep "${SMOKE_ESPERA:-10}"
    done
    echo "$base$p -> $code"
    [ "$code" = "200" ] || return 1
  done
}

probar "$BASE" || exit 1
grep -q "rel=\"canonical\" href=\"$DOMINIO/\"" <<< "$(curl -s -L "$BASE/")" || { echo "la canonical de la portada no apunta a $DOMINIO/"; exit 1; }

ESTADO_DOMINIO="no conectado al proyecto"
if [ -n "${CLOUDFLARE_API_TOKEN:-}" ] && [ -n "${CLOUDFLARE_ACCOUNT_ID:-}" ]; then
  DOMINIOS=$(curl -s -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
    "https://api.cloudflare.com/client/v4/accounts/$CLOUDFLARE_ACCOUNT_ID/pages/projects/$PROYECTO" \
    | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{console.log((JSON.parse(s).result.domains||[]).join(" "))}catch{console.log("")}})')
  if [[ " $DOMINIOS " == *" $HOST "* ]]; then
    probar "$DOMINIO" || exit 1
    ESTADO_DOMINIO="probado"
  fi
fi

{
  echo "## Deploy producción · $PROYECTO"
  echo "- pages.dev: $BASE"
  echo "- Dominio $DOMINIO: $ESTADO_DOMINIO"
  echo "- Smoke: portada, sitemap, robots y llms = 200; canonical OK"
} >> "${GITHUB_STEP_SUMMARY:-/dev/null}"
echo "smoke OK ($ESTADO_DOMINIO)"
