import "server-only";

/**
 * Email küldése a Resend API-n keresztül. Kell hozzá: RESEND_API_KEY és EMAIL_FROM
 * (egy Resendben ellenőrzött domainről, pl. "JOBLANTIS <ertesites@sajatdomain.hu>").
 * Ha valamelyik hiányzik, nem küldünk és ezt jelezzük – kitalált feladót nem használunk.
 */
export async function sendEmail(msg: { to: string; subject: string; html: string; text: string }) {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!key || !from) return { ok: false as const, skipped: true as const, error: "RESEND_API_KEY vagy EMAIL_FROM nincs beállítva" };
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to: [msg.to], subject: msg.subject, html: msg.html, text: msg.text }),
  });
  if (!res.ok) return { ok: false as const, skipped: false as const, error: `Resend ${res.status}: ${await res.text()}` };
  return { ok: true as const };
}

export function isEmailConfigured() {
  return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/** Egyszerű, márkázott email sablon egy gombbal. */
export function renderEmail({
  greeting,
  title,
  body,
  url,
  cta,
  secondary,
}: {
  greeting: string;
  title: string;
  body: string;
  url: string;
  cta: string;
  secondary?: { url: string; cta: string };
}) {
  const second = secondary
    ? ` <a href="${esc(secondary.url)}" style="display:inline-block;margin-left:8px;border:1px solid #e7e7ec;color:#0a0a0a;text-decoration:none;font-weight:600;padding:13px 21px;border-radius:14px">${esc(secondary.cta)}</a>`
    : "";
  const html = `<!doctype html><html lang="hu"><body style="margin:0;background:#f4f5fb;font-family:Inter,Arial,sans-serif;color:#0a0a0a">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="100%" style="max-width:520px;background:#ffffff;border-radius:20px;padding:28px">
<tr><td style="font-weight:800;letter-spacing:.12em;color:#001AA6;font-size:18px">JOBLANTIS</td></tr>
<tr><td style="padding-top:20px;font-size:15px">${esc(greeting)}</td></tr>
<tr><td style="padding-top:8px;font-size:20px;font-weight:700">${esc(title)}</td></tr>
<tr><td style="padding-top:12px;font-size:15px;line-height:1.55;white-space:pre-line">${esc(body)}</td></tr>
<tr><td style="padding-top:24px"><a href="${esc(url)}" style="display:inline-block;background:#001AA6;color:#ffffff;text-decoration:none;font-weight:600;padding:14px 22px;border-radius:14px">${esc(cta)}</a>${second}</td></tr>
<tr><td style="padding-top:28px;font-size:12px;color:#7a7a7a">Ezt az értesítést a JOBLANTIS fiókod miatt kaptad. Raise your future.</td></tr>
</table></td></tr></table></body></html>`;
  const text = `${greeting}\n\n${title}\n\n${body}\n\n${cta}: ${url}${secondary ? `\n${secondary.cta}: ${secondary.url}` : ""}\n\n– JOBLANTIS`;
  return { html, text };
}
