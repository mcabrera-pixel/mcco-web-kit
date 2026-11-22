#!/usr/bin/env bash
# Smoke del deploy (site-deploy.yml): portada, sitemap, robots y llms = 200 en el subdominio pages.dev del proyecto;
# canonical de la portada = dominio de site.yaml; y lo mismo en el dominio si ya está conectado al proyecto en
# Cloudflare Pages. El subdominio se le pregunta a Cloudflare, porque no siempre es <proyecto>.pages.dev: si ese nombre
# ya estaba tomado, Cloudflare le suma un sufijo (monitor-ia publica en monitor-ia-7c6.pages.dev). Sin credenciales o
# sin respuesta de la API se prueba <proyecto>.pages.dev.
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

ESTADO_DOMINIO="no conectado al proyecto"
DOMINIOS=""
if [ -n "${CLOUDFLARE_API_TOKEN:-}" ] && [ -n "${CLOUDFLARE_ACCOUNT_ID:-}" ]; then
  RESPUESTA=$(curl -s --max-time 20 -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
    "https://api.cloudflare.com/client/v4/accounts/$CLOUDFLARE_ACCOUNT_ID/pages/projects/$PROYECTO")
  # Sin success: true (401, 429, 5xx, cuerpo vacío, HTML o corte) no se sabe si el dominio está conectado: queda
  # «sin verificar» con un aviso y el deploy sigue. El motivo que da la API sale por stderr al log del paso.
  # La primera línea es el subdominio pages.dev del proyecto y la segunda sus dominios.
  if PROYECTO_CF=$(node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{let j=null;try{j=JSON.parse(s)}catch{}
    if(j?.success!==true){console.error("API de Cloudflare: "+(j?.errors?.[0]?.message??"respuesta vacía o no JSON"));process.exitCode=1;return}
    console.log(j.result?.subdomain??"");console.log((j.result?.domains??[]).join(" "))})' <<< "$RESPUESTA"); then
    { read -r SUBDOMINIO; read -r DOMINIOS; } <<< "$PROYECTO_CF"
    [ -n "$SUBDOMINIO" ] && BASE="https://$SUBDOMINIO"
  else
    echo "::warning::smoke: la API de Cloudflare no respondió success: true para $PROYECTO; el dominio $DOMINIO queda sin verificar."
    ESTADO_DOMINIO="sin verificar (API Cloudflare)"
  fi
fi

probar "$BASE" || exit 1
grep -q "rel=\"canonical\" href=\"$DOMINIO/\"" <<< "$(curl -s --max-time 20 -L "$BASE/")" || { echo "la canonical de la portada no apunta a $DOMINIO/"; exit 1; }

if [[ " $DOMINIOS " == *" $HOST "* ]]; then
  probar "$DOMINIO" || exit 1
  ESTADO_DOMINIO="probado"
fi

{
  echo "## Deploy producción · $PROYECTO"
  echo "- pages.dev: $BASE"
  echo "- Dominio $DOMINIO: $ESTADO_DOMINIO"
  echo "- Smoke: portada, sitemap, robots y llms = 200; canonical OK"
} >> "${GITHUB_STEP_SUMMARY:-/dev/null}"
echo "smoke OK ($ESTADO_DOMINIO)"
