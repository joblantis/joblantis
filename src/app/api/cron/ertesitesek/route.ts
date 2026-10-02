import { NextResponse, type NextRequest } from "next/server";
import { deliverPendingNotifications } from "@/lib/notifications";
import { sendReferenceReminders } from "@/lib/references";
import { sendDueFollowups } from "@/lib/followups";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Napi feladatok (Vercel Cron): nincs ghosting (3. napi emlékeztető, 5. napi lezárás) és lejáratok – ezek óránként
 * a Supabase pg_cronból is futnak –, 30/90/180 napos utókövetés, referens-emlékeztető, végül a kimaradt emailek.
 * Védelem: Vercel a CRON_SECRET-et Bearer tokenként küldi.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  let scheduled: unknown = null;
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const { data, error } = await createAdminClient().rpc("run_scheduled_jobs");
    scheduled = error ? { error: error.message } : data;
  }
  const followups = await sendDueFollowups(100);
  const references = await sendReferenceReminders(100);
  const notifications = await deliverPendingNotifications(500);
  return NextResponse.json({ scheduled, followups, references, notifications });
}
