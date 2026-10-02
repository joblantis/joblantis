import { NextResponse, type NextRequest } from "next/server";
import { deliverPendingNotifications } from "@/lib/notifications";
import { sendReferenceReminders } from "@/lib/references";

/**
 * Napi feladatok (Vercel Cron): kimaradt értesítő emailek (az azonnali kézbesítés a Server Actionökből megy),
 * 7 napos emlékeztető a referenseknek, 30 napos ajánláskérések lezárása.
 * Védelem: Vercel a CRON_SECRET-et Bearer tokenként küldi.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const references = await sendReferenceReminders(100);
  const notifications = await deliverPendingNotifications(200);
  return NextResponse.json({ notifications, references });
}
