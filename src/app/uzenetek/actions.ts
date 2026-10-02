"use server";

import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { deliverPendingNotifications } from "@/lib/notifications";

const sendSchema = z.object({ applicationId: z.guid(), body: z.string().trim().min(1, "Üres üzenet").max(2000, "Legfeljebb 2000 karakter") });

export type SentMessage = { id: string; application_id: string; sender_id: string; body: string; created_at: string; read_at: string | null };

/** Üzenet küldése: az RLS ellenőrzi, hogy résztvevő vagy-e és nyitva van-e a chat; az értesítést trigger hozza létre. */
export async function sendMessage(applicationId: string, body: string): Promise<{ ok: true; message: SentMessage } | { ok: false; error: string }> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: "Jelentkezz be újra." };
  const parsed = sendSchema.safeParse({ applicationId, body });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("messages")
    .insert({ application_id: parsed.data.applicationId, sender_id: user.id, body: parsed.data.body })
    .select("id, application_id, sender_id, body, created_at, read_at")
    .single();
  if (error || !data) return { ok: false, error: "Az üzenet nem ment el. Lehet, hogy a chat lezárult." };
  after(() => deliverPendingNotifications(20));
  return { ok: true, message: data };
}

/** A beszélgetés megnyitásakor: a másik fél üzenetei és a kapcsolódó értesítések olvasottak. */
export async function markThreadRead(applicationId: string) {
  const user = await getSessionUser();
  if (!user || !z.guid().safeParse(applicationId).success) return;
  const supabase = await createClient();
  const now = new Date().toISOString();
  await Promise.all([
    supabase.from("messages").update({ read_at: now }).eq("application_id", applicationId).neq("sender_id", user.id).is("read_at", null),
    supabase.from("notifications").update({ read_at: now }).eq("user_id", user.id).eq("application_id", applicationId).eq("kind", "message").is("read_at", null),
  ]);
}

export async function markNotificationsRead(): Promise<void> {
  const user = await getSessionUser();
  if (!user) return;
  const supabase = await createClient();
  await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("user_id", user.id).is("read_at", null);
  revalidatePath("/", "layout");
}
