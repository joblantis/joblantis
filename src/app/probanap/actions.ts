"use server";

import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getSessionUser, requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { deliverPendingNotifications } from "@/lib/notifications";
import { budapestLocalToDate, formatDateTime, formatDuration } from "@/lib/format";
import type { FormState } from "@/lib/forms";

const proposeSchema = z.object({
  starts: z.string(),
  duration: z.coerce.number().int().min(60).max(720),
  note: z.string().trim().max(500, "A megjegyzés legfeljebb 500 karakter").nullable(),
});

function refresh(applicationId: string) {
  revalidatePath(`/munkaltato/jelentkezes/${applicationId}`);
  revalidatePath(`/uzenetek/${applicationId}`);
  revalidatePath("/jelolt/jelentkezesek");
  after(() => deliverPendingNotifications(20));
}

/** Próbanap ajánlása (a chatből vagy a pipeline-ból / profilból). A jelentkezés "próbanap" státuszba kerül, és a chatbe is bekerül. */
export async function proposeTrial(applicationId: string, _: FormState, formData: FormData): Promise<FormState> {
  const user = await requireRole(["employer", "admin"]);
  const parsed = proposeSchema.safeParse({
    starts: formData.get("starts"),
    duration: formData.get("duration"),
    note: (String(formData.get("note") ?? "").trim() || null),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const starts = budapestLocalToDate(parsed.data.starts);
  if (!starts) return { error: "Adj meg időpontot." };
  if (starts.getTime() < Date.now() + 60 * 60 * 1000) return { error: "Az időpont legalább egy órával később legyen." };
  if (starts.getTime() > Date.now() + 90 * 86400_000) return { error: "Legfeljebb 90 napra előre ajánlhatsz időpontot." };
  const paid = formData.get("is_paid") === "on";

  const supabase = await createClient();
  const { data: app } = await supabase.from("applications").select("id, status").eq("id", applicationId).maybeSingle();
  if (!app) return { error: "A jelentkezés nem található." };
  if (!["viewed", "trial", "offer"].includes(app.status)) return { error: "Próbanapot az érdeklődés után, elutasítás vagy felvétel előtt lehet ajánlani." };

  const { error } = await supabase.from("trial_shifts").insert({
    application_id: app.id,
    starts_at: starts.toISOString(),
    duration_minutes: parsed.data.duration,
    is_paid: paid,
    note: parsed.data.note,
    proposed_by: user.id,
  });
  if (error) return { error: "Az ajánlat mentése nem sikerült." };
  if (app.status === "viewed") await supabase.from("applications").update({ status: "trial" }).eq("id", app.id);
  await supabase.from("messages").insert({
    application_id: app.id,
    sender_id: user.id,
    body:
      `📅 Próbanapot ajánlottam: ${formatDateTime(starts.toISOString())}, ${formatDuration(parsed.data.duration)}, ` +
      `${paid ? "díjazott" : "díjazás nélkül"}.${parsed.data.note ? `\n${parsed.data.note}` : ""}\nFogadd el a chat tetején, vagy írj, ha más időpont kell.`,
  });
  refresh(app.id);
  return { ok: true, message: "Elküldtük a próbanap-ajánlatot." };
}

export async function cancelTrial(trialId: string, applicationId: string) {
  await requireRole(["employer", "admin"]);
  const supabase = await createClient();
  await supabase.from("trial_shifts").update({ status: "cancelled" }).eq("id", trialId).in("status", ["proposed", "accepted"]);
  refresh(applicationId);
}

/** A jelölt válasza: elfogadás vagy elutasítás (az adatbázis ellenőrzi, hogy az övé és még időben van). */
export async function respondTrial(trialId: string, applicationId: string, accept: boolean) {
  const user = await getSessionUser();
  if (!user) return { ok: false as const, error: "Jelentkezz be újra." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("respond_trial_shift", { p_trial_id: trialId, p_accept: accept });
  if (error) return { ok: false as const, error: error.message };
  await supabase.from("messages").insert({
    application_id: applicationId,
    sender_id: user.id,
    body: accept ? "✓ Elfogadtam a próbanapot, ott leszek!" : "✗ Ez az időpont sajnos nem jó nekem. Tudnánk másikat egyeztetni?",
  });
  refresh(applicationId);
  return { ok: true as const };
}

/** Próbanap értékelése: kompetenciánként 1–5; a legalább 4-es pontot kapott készségek "igazolt (próbanap)" státuszt kapnak. */
export async function submitEvaluation(trialId: string, applicationId: string, _: FormState, formData: FormData): Promise<FormState> {
  await requireRole(["employer", "admin"]);
  const scores: Record<string, number> = {};
  for (const [key, value] of formData.entries()) {
    const m = key.match(/^score_(\d+)$/);
    if (m && typeof value === "string" && /^[1-5]$/.test(value)) scores[m[1]] = Number(value);
  }
  const comment = String(formData.get("comment") ?? "").trim();
  if (comment.length > 1000) return { error: "A megjegyzés legfeljebb 1000 karakter lehet." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("submit_trial_evaluation", { p_trial_id: trialId, p_scores: scores, p_comment: comment });
  if (error) return { error: error.message || "A mentés nem sikerült." };
  refresh(applicationId);
  redirect(`/munkaltato/jelentkezes/${applicationId}?ertekelve=1`);
}
