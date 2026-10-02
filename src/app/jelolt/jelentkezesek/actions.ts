"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Enums } from "@/types/database";

const jobId = z.guid();

export type JobActionResult = { ok: true; applicationId?: string } | { ok: false; error: string };

/**
 * Jelentkezés: az adatbázis apply_to_job() függvénye ellenőrzi a profilt és az állást,
 * kiszámolja az illeszkedési pontszámot és rögzíti a jobbra húzást.
 */
export async function applyToJob(id: string): Promise<JobActionResult> {
  await requireRole(["candidate"]);
  if (!jobId.safeParse(id).success) return { ok: false, error: "Érvénytelen állás." };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("apply_to_job", { p_job_id: id });
  if (error || !data) return { ok: false, error: error?.message || "A jelentkezés nem sikerült." };
  revalidatePath("/jelolt/jelentkezesek");
  revalidatePath("/jelolt/mentett");
  return { ok: true, applicationId: data };
}

/** Állás-kártya húzása: jobbra jelentkezés, balra kihagyás, felfelé mentés későbbre. */
export async function swipeJob(id: string, direction: Enums<"swipe_dir">): Promise<JobActionResult> {
  if (direction === "right") return applyToJob(id);
  const user = await requireRole(["candidate"]);
  if (!jobId.safeParse(id).success || !["left", "up"].includes(direction)) return { ok: false, error: "Érvénytelen művelet." };
  const supabase = await createClient();
  const { error } = await supabase
    .from("job_swipes")
    .upsert({ candidate_id: user.id, job_id: id, direction, created_at: new Date().toISOString() }, { onConflict: "candidate_id,job_id" });
  if (error) return { ok: false, error: "A mentés nem sikerült." };
  if (direction === "up") revalidatePath("/jelolt/mentett");
  return { ok: true };
}

/** Mentett állás eltávolítása (a feedbe nem kerül vissza, kihagyottként jelöljük). */
export async function unsaveJob(id: string): Promise<JobActionResult> {
  return swipeJob(id, "left").finally(() => revalidatePath("/jelolt/mentett"));
}

/** Kihagyott állások visszaállítása a húzogatós listába. */
export async function resetSkippedJobs(): Promise<JobActionResult> {
  const user = await requireRole(["candidate"]);
  const supabase = await createClient();
  const { error } = await supabase.from("job_swipes").delete().eq("candidate_id", user.id).eq("direction", "left");
  if (error) return { ok: false, error: "Nem sikerült." };
  revalidatePath("/jelolt/allaskereses");
  return { ok: true };
}
