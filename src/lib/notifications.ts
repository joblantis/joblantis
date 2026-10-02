import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { isEmailConfigured, renderEmail, sendEmail } from "@/lib/email";
import { publicEnv } from "@/lib/env";

/**
 * A még ki nem küldött értesítések kézbesítése emailben. Az értesítéseket adatbázis-triggerek hozzák létre
 * (új jelentkező, státuszváltás, elutasítás, új chat üzenet); ez csak a kimenő sort üríti.
 * Server Actionből `after()`-rel, illetve a cron végpontból hívjuk. Service role kell hozzá.
 */
export async function deliverPendingNotifications(limit = 50) {
  if (!isEmailConfigured()) return { sent: 0, failed: 0, skipped: true };
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("claim_notification_emails", { p_limit: limit });
  if (error) {
    console.error("[értesítés] lefoglalás sikertelen", error.message);
    return { sent: 0, failed: 0, skipped: false };
  }
  let sent = 0;
  let failed = 0;
  for (const n of data ?? []) {
    if (!n.id || !n.email) continue;
    const url = new URL(n.link || "/", publicEnv.siteUrl).toString();
    const { html, text } = renderEmail({
      greeting: n.full_name ? `Szia ${n.full_name}!` : "Szia!",
      title: n.title ?? "Értesítés",
      body: n.body ?? "",
      url,
      cta: "Megnyitás a JOBLANTIS-ban",
    });
    const res = await sendEmail({ to: n.email, subject: n.title ?? "JOBLANTIS értesítés", html, text });
    if (res.ok) {
      sent++;
    } else {
      failed++;
      console.error("[értesítés] email hiba", res.error);
      // újrapróbálható marad (legfeljebb 3 kísérlet)
      await admin.from("notifications").update({ emailed_at: null }).eq("id", n.id);
    }
  }
  return { sent, failed, skipped: false };
}
