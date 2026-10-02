import "server-only";
import { publicEnv } from "@/lib/env";
import { renderEmail, sendEmail } from "@/lib/email";
import { createAdminClient } from "@/lib/supabase/admin";
import { newToken } from "@/lib/tokens";

/**
 * Felvétel után 30, 90 és 180 nappal egykattintásos kérdés a munkáltatónak (napi cron).
 * A válasz a followups táblába kerül, külön – később az illesztés tanítására. Service role kell hozzá.
 */
export async function sendDueFollowups(limit = 50) {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.RESEND_API_KEY || !process.env.EMAIL_FROM) return { sent: 0, skipped: true };
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("claim_due_followups", { p_limit: limit });
  if (error) {
    console.error("[utókövetés] lefoglalás sikertelen", error.message);
    return { sent: 0, skipped: false };
  }
  let sent = 0;
  for (const f of data ?? []) {
    if (!f.followup_id) continue;
    const { token, hash } = newToken();
    await admin.from("followups").update({ token_hash: hash }).eq("id", f.followup_id);
    const base = new URL(`/utokovetes/${token}`, publicEnv.siteUrl);
    const { html, text } = renderEmail({
      greeting: "Szia!",
      title: `${f.candidate_name} még nálatok dolgozik?`,
      body:
        `${f.day_offset} napja vettétek fel a(z) „${f.job_title}” munkakörbe (${f.company_name}): ${f.candidate_name}.\n\n` +
        "Egy kattintás az egész: jelöld, hogy még nálatok dolgozik-e, és ha van egy perced, értékeld 1–5-ig, mennyire megbízható, önálló és termelékeny. " +
        "A válaszod segít, hogy a JOBLANTIS a jövőben még pontosabban illessze a jelölteket.",
      url: `${base}?valasz=igen`,
      cta: "Igen, még nálunk dolgozik",
      secondary: { url: `${base}?valasz=nem`, cta: "Már nem" },
    });
    let ok = false;
    for (const to of f.recipient_emails ?? []) {
      const res = await sendEmail({ to, subject: `${f.day_offset} napos utókövetés: ${f.candidate_name}`, html, text });
      if (res.ok) ok = true;
      else console.error("[utókövetés] email hiba", res.error);
    }
    if (ok) sent++;
    // ha senkinek nem ment ki, a következő futás újrapróbálja
    else await admin.from("followups").update({ sent_at: null, token_hash: null }).eq("id", f.followup_id);
  }
  return { sent, skipped: false };
}
