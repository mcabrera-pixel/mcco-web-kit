// Pages Function estándar de contacto (Estándar Web MCCO v2 §10). Generalizada desde as-built.cl (en producción desde 2026-08).
// POST /api/contact → honeypot → Turnstile (si hay secret) → Web3Forms → acuse Resend opcional → 302 /gracias.
// Uso en el sitio: functions/api/contact.js →  export { onRequestPost } from '@mcco/web-kit/functions/contact.js';
// Variables (Cloudflare Pages → Settings → Environment variables; NUNCA en el repo):
//   WEB3FORMS_KEY (opcional si el form trae access_key) · TURNSTILE_SECRET (opcional) · RESEND_API_KEY + ACUSE_FROM (opcional)
//   SITE_NAME (opcional, para el acuse) · WHATSAPP (opcional, dígitos) · WEB (opcional, origen canónico)

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
        subject: "Recibimos tu solicitud — te respondemos dentro de 24 horas hábiles",
        text:
          `Hola${nombre ? " " + String(nombre).slice(0, 80) : ""}:\n\n` +
          `Tu solicitud llegó al equipo de ${siteName} (MCCO Group). Un ingeniero la está revisando y te responderá dentro de 24 horas hábiles.\n\n` +
          (env.WHATSAPP ? `Si tu proyecto es urgente, escríbenos directo por WhatsApp: https://wa.me/${String(env.WHATSAPP).replace(/\D/g, "")}\n\n` : "") +
          `${siteName} · MCCO Group SpA\nSuecia 283, of. 402, Providencia, Santiago · ${origin}`,
      }),
      signal: ctrl.signal,
    });
    clearTimeout(timer);
    if (!r.ok) console.warn("[contact] acuse rechazado:", r.status);
  } catch (e) {
    console.warn("[contact] acuse no enviado:", e.message);
  }
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

    // Reenvío a Web3Forms (la key puede venir en el form como access_key o desde env).
    const web3Data = new FormData();
    for (const [key, value] of formData.entries()) {
      if (key !== "cf-turnstile-response" && key !== "website_url") web3Data.append(key, value);
    }
    if (!web3Data.get("access_key") && env.WEB3FORMS_KEY) web3Data.append("access_key", env.WEB3FORMS_KEY);
    if (!web3Data.get("access_key")) {
      console.error("[contact] sin access_key de Web3Forms (form ni env)");
      return Response.redirect(`${errorBase}?reason=config`, 302);
    }

    const web3Res = await fetch("https://api.web3forms.com/submit", { method: "POST", body: web3Data });
    if (web3Res.ok) {
      context.waitUntil(enviarAcuse(env, origin, formData.get("email"), formData.get("nombre") || formData.get("name")));
      return Response.redirect(`${origin}/gracias`, 302);
    }
    console.error("[contact] Web3Forms falló:", web3Res.status, (await web3Res.text()).slice(0, 300));
    return Response.redirect(`${errorBase}?reason=web3forms`, 302);
  } catch (e) {
    console.error("[contact] excepción:", e.message);
    return Response.redirect(`${errorBase}?reason=exception`, 302);
  }
}
