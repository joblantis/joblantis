import "server-only";
import { publicEnv } from "@/lib/env";
import { renderEmail, sendEmail } from "@/lib/email";
import { createAdminClient } from "@/lib/supabase/admin";
import { newToken } from "@/lib/tokens";

/** Ajánláskérő email a referensnek (regisztráció nélkül kitölthető űrlap linkjével). */
export async function sendReferenceRequestEmail(opts: {
  to: string;
  refereeName: string;
  candidateName: string;
  companyName: string;
  token: string;
  reminder?: boolean;
}) {
  const url = new URL(`/ajanlas/${opts.token}`, publicEnv.siteUrl).toString();
  const { html, text } = renderEmail({
    greeting: `Kedves ${opts.refereeName}!`,
    title: opts.reminder ? `Emlékeztető: ${opts.candidateName} ajánlást kér` : `${opts.candidateName} ajánlást kér tőled`,
    body:
      `${opts.candidateName} a JOBLANTIS-on, a vendéglátós és szállodai álláskeresőn épít profilt, és megadott téged korábbi munkahelyéről (${opts.companyName}).\n\n` +
      "Kérjük, egy rövid, kb. 2 perces űrlapon erősítsd meg a munkaviszonyt, jelöld be, mely kompetenciáit tudod igazolni, és ha szeretnéd, írj pár mondatos ajánlást. Regisztráció nem kell." +
      (opts.reminder ? "\n\nEz egyetlen emlékeztető – többet nem írunk ezzel kapcsolatban." : ""),
    url,
    cta: "Ajánlás kitöltése",
  });
  return sendEmail({ to: opts.to, subject: opts.reminder ? `Emlékeztető: ajánlás ${opts.candidateName} részére` : `Ajánlás kérése: ${opts.candidateName}`, html, text });
}

/**
 * Egyszeri emlékeztető a 7 napja nem válaszoló referenseknek (napi cron). Az emlékeztető új linket kap
 * (a régi is érvényes marad), mert a nyers tokent nem tároljuk. Service role kell hozzá.
 */
export async function sendReferenceReminders(limit = 50) {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.RESEND_API_KEY || !process.env.EMAIL_FROM) return { reminded: 0, expired: 0, skipped: true };
  const admin = createAdminClient();
  const { data: expired } = await admin.rpc("expire_reference_requests");
  const { data, error } = await admin.rpc("claim_reference_reminders", { p_limit: limit });
  if (error) {
    console.error("[ajánlás] emlékeztető lefoglalása sikertelen", error.message);
    return { reminded: 0, expired: expired ?? 0, skipped: false };
  }
  let reminded = 0;
  for (const r of data ?? []) {
    if (!r.request_id || !r.referee_email) continue;
    const { token, hash } = newToken();
    await admin.from("reference_requests").update({ reminder_token_hash: hash }).eq("id", r.request_id);
    const res = await sendReferenceRequestEmail({
      to: r.referee_email,
      refereeName: r.referee_name ?? "",
      candidateName: r.candidate_name || "Egy jelölt",
      companyName: r.company_name ?? "",
      token,
      reminder: true,
    });
    if (res.ok) reminded++;
    else {
      console.error("[ajánlás] emlékeztető email hiba", res.error);
      // következő futáskor újrapróbálható
      await admin.from("reference_requests").update({ status: "pending", reminded_at: null }).eq("id", r.request_id);
    }
  }
  return { reminded, expired: expired ?? 0, skipped: false };
}
