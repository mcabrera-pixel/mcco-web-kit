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
      code=$(curl -s --max-time 20 -o /dev/null -w '%{http_code}' -L "$base$p")
      [ "$code" = "200" ] && break
      sleep "${SMOKE_ESPERA:-10}"
    done
    echo "$base$p -> $code"
    [ "$code" = "200" ] || return 1
  done
}

probar "$BASE" || exit 1
grep -q "rel=\"canonical\" href=\"$DOMINIO/\"" <<< "$(curl -s --max-time 20 -L "$BASE/")" || { echo "la canonical de la portada no apunta a $DOMINIO/"; exit 1; }

ESTADO_DOMINIO="no conectado al proyecto"
if [ -n "${CLOUDFLARE_API_TOKEN:-}" ] && [ -n "${CLOUDFLARE_ACCOUNT_ID:-}" ]; then
  RESPUESTA=$(curl -s --max-time 20 -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
    "https://api.cloudflare.com/client/v4/accounts/$CLOUDFLARE_ACCOUNT_ID/pages/projects/$PROYECTO")
  # Sin success: true (401, 429, 5xx, cuerpo vacío, HTML o corte) no se sabe si el dominio está conectado: queda
  # «sin verificar» con un aviso y el deploy sigue. El motivo que da la API sale por stderr al log del paso.
  if DOMINIOS=$(node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{let j=null;try{j=JSON.parse(s)}catch{}
    if(j?.success!==true){console.error("API de Cloudflare: "+(j?.errors?.[0]?.message??"respuesta vacía o no JSON"));process.exitCode=1;return}
    console.log((j.result?.domains??[]).join(" "))})' <<< "$RESPUESTA"); then
    if [[ " $DOMINIOS " == *" $HOST "* ]]; then
      probar "$DOMINIO" || exit 1
      ESTADO_DOMINIO="probado"
    fi
  else
    echo "::warning::smoke: la API de Cloudflare no respondió success: true para $PROYECTO; el dominio $DOMINIO queda sin verificar."
    ESTADO_DOMINIO="sin verificar (API Cloudflare)"
  fi
fi

{
  echo "## Deploy producción · $PROYECTO"
  echo "- pages.dev: $BASE"
  echo "- Dominio $DOMINIO: $ESTADO_DOMINIO"
  echo "- Smoke: portada, sitemap, robots y llms = 200; canonical OK"
} >> "${GITHUB_STEP_SUMMARY:-/dev/null}"
echo "smoke OK ($ESTADO_DOMINIO)"
