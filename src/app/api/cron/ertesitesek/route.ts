import { NextResponse, type NextRequest } from "next/server";
import { deliverPendingNotifications } from "@/lib/notifications";

/**
 * Kimaradt értesítő emailek kiküldése (Vercel Cron). Az azonnali kézbesítés a Server Actionökből történik,
 * ez a biztonsági háló. Védelem: Vercel a CRON_SECRET-et Bearer tokenként küldi.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const result = await deliverPendingNotifications(200);
  return NextResponse.json(result);
}
