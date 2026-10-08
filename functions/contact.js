// Pages Function estándar de contacto (Estándar Web MCCO v2 §10). Generalizada desde as-built.cl (en producción desde 2026-08).
// POST /api/contact → honeypot → Turnstile (si hay secret) → Worker formularios-mcco → acuse Resend opcional → 302 /gracias.
// Errores → 302 /contacto-error?reason= spam (honeypot) · config (faltan variables) · correo (falló el Worker) · exception.
// Uso en el sitio: functions/api/contact.js →  export { onRequestPost } from '@mcco/web-kit/functions/contact.js';
// Variables (Cloudflare Pages → Settings → Environment variables; NUNCA en el repo):
//   FORMULARIOS_URL (URL del Worker formularios-mcco) · FORMULARIOS_CLAVE (clave compartida con el Worker, como secreto)
//   MARCA (marca del sitio en el Worker: mcco, 3d-ultra…) · las tres son obligatorias
//   TURNSTILE_SECRET (opcional) · RESEND_API_KEY + ACUSE_FROM (opcional)
//   SITE_NAME (opcional, para el acuse) · WHATSAPP (opcional, dígitos) · WEB (opcional, origen canónico)

// Campos que no viajan al Worker: clave de Web3Forms de formularios antiguos, token de Turnstile y trampas para bots.
const NO_VIAJAN = new Set(["access_key", "cf-turnstile-response", "website_url", "botcheck"]);

async function enviarAcuse(env, origin, email, nombre) {
  if (!env.RESEND_API_KEY || !email) return;
  const siteName = env.SITE_NAME || new URL(origin).host;
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 30000);
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${env.RESEND_API_KEY}` },
      body: JSON.stringify({
        from: env.ACUSE_FROM || `${siteName} <no-reply@${new URL(origin).host}>`,
        to: [String(email).slice(0, 254)],
        subject: "Recibimos tu solicitud: te respondemos dentro de 24 horas hábiles",
        text:
          `Hola${nombre ? " " + String(nombre).slice(0, 80) : ""}:\n\n` +
          `Tu solicitud llegó al equipo de ${siteName} (MCCO Group). Un ingeniero la está revisando y te responderá dentro de 24 horas hábiles.\n\n` +
          (env.WHATSAPP ? `Si tu proyecto es urgente, escríbenos directo por WhatsApp: https://wa.me/${String(env.WHATSAPP).replace(/\D/g, "")}\n\n` : "") +
          `${siteName} · MCCO Group\nSuecia 283, of. 402, Providencia, Santiago · ${origin}`,
      }),
      signal: ctrl.signal,
    });
    clearTimeout(timer);
    if (!r.ok) console.warn("[contact] acuse rechazado:", r.status);
  } catch (e) {
    console.warn("[contact] acuse no enviado:", e.message);
  }
}

// Envía el lead al Worker formularios-mcco. true solo si responde 2xx con { ok: true }. Los fallos (rechazo, JSON
// inválido, timeout o red) quedan en el log sin datos personales.
async function enviarAlWorker(env, lead) {
  try {
    const r = await fetch(env.FORMULARIOS_URL, {
      method: "POST",
      headers: { "content-type": "application/json", "x-formularios-clave": env.FORMULARIOS_CLAVE },
      body: JSON.stringify(lead),
      signal: AbortSignal.timeout(15000),
    });
    const data = await r.json().catch(() => null);
    if (r.ok && data?.ok === true) return true;
    console.error("[contact] el Worker formularios-mcco no aceptó el lead:", r.status);
  } catch (e) {
    console.error("[contact] el Worker formularios-mcco no respondió:", e.name);
  }
  return false;
}

export async function onRequestPost(context) {
  const { request, env } = context;
  const origin = env.WEB || new URL(request.url).origin;
  const errorBase = `${origin}/contacto-error`;

  try {
    const formData = await request.formData();

    // Honeypot: campo oculto que solo llenan los bots.
    const honeypot = formData.get("website_url");
    if (honeypot && String(honeypot).trim().length > 0) {
      console.warn("[contact] honeypot activado");
      return Response.redirect(`${errorBase}?reason=spam`, 302);
    }

    // Sin la configuración del Worker no hay a dónde mandar el lead: se corta antes de cualquier llamada externa.
    const faltan = ["FORMULARIOS_URL", "FORMULARIOS_CLAVE", "MARCA"].filter((v) => !env[v]);
    if (faltan.length > 0) {
      console.error("[contact] faltan variables del sitio:", faltan.join(", "));
      return Response.redirect(`${errorBase}?reason=config`, 302);
    }

    // Turnstile: si hay token y secret, se valida. Sin token se sigue con honeypot (el widget puede fallar con TrustedTypes).
    const token = formData.get("cf-turnstile-response");
    if (token && env.TURNSTILE_SECRET) {
      const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secret: env.TURNSTILE_SECRET, response: token, remoteip: request.headers.get("CF-Connecting-IP") }),
      });
      const data = await res.json();
      if (!data.success) console.warn("[contact] Turnstile inválido; se continúa solo con honeypot");
    }

    // Lead al Worker: los campos de texto del formulario salvo NO_VIAJAN. Un campo repetido (casillas con el mismo
    // nombre) junta sus valores en vez de perderlos.
    const campos = new Map();
    for (const [clave, valor] of formData.entries()) {
      if (typeof valor !== "string" || NO_VIAJAN.has(clave)) continue;
      campos.set(clave, campos.has(clave) ? `${campos.get(clave)}, ${valor}` : valor);
    }
    const origen = request.headers.get("Referer") || "/contacto/";
    if (await enviarAlWorker(env, { marca: env.MARCA, origen, campos: Object.fromEntries(campos) })) {
      context.waitUntil(enviarAcuse(env, origin, formData.get("email"), formData.get("nombre") || formData.get("name")));
      return Response.redirect(`${origin}/gracias`, 302);
    }
    return Response.redirect(`${errorBase}?reason=correo`, 302);
  } catch (e) {
    console.error("[contact] excepción:", e.message);
    return Response.redirect(`${errorBase}?reason=exception`, 302);
  }
}
