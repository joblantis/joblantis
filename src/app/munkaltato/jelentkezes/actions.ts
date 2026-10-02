"use server";

import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { deliverPendingNotifications } from "@/lib/notifications";
import { EMPLOYER_SETTABLE } from "@/lib/applications";
import type { Enums } from "@/types/database";

const schema = z.object({
  applicationId: z.guid(),
  status: z.enum(EMPLOYER_SETTABLE as [Enums<"application_status">, ...Enums<"application_status">[]]),
});

/**
 * Jelentkezés státuszváltása (kártya húzás vagy pipeline). Az RLS csak a cég tagjainak engedi;
 * a jelölt értesítését (udvarias elutasítás, chat megnyílása) adatbázis-trigger hozza létre.
 */
export async function setApplicationStatus(applicationId: string, status: Enums<"application_status">) {
  await requireRole(["employer", "admin"]);
  const parsed = schema.safeParse({ applicationId, status });
  if (!parsed.success) return { ok: false as const, error: "Érvénytelen művelet." };
  const supabase = await createClient();

  const { data: current } = await supabase.from("applications").select("status, decided_at, job_id").eq("id", applicationId).maybeSingle();
  if (!current) return { ok: false as const, error: "A jelentkezés nem található." };
  if (current.status === status) return { ok: true as const };
  if (current.status === "auto_closed") return { ok: false as const, error: "Ez a jelentkezés automatikusan lezárult." };

  const { data, error } = await supabase
    .from("applications")
    .update({ status, decided_at: current.decided_at ?? new Date().toISOString(), ...(status === "rejected" ? { closed_reason: "employer_rejected" } : {}) })
    .eq("id", applicationId)
    .select("id")
    .maybeSingle();
  if (error || !data) return { ok: false as const, error: "A mentés nem sikerült." };

  after(() => deliverPendingNotifications(20));
  revalidatePath(`/munkaltato/allasok/${current.job_id}`, "layout");
  revalidatePath(`/munkaltato/jelentkezes/${applicationId}`);
  return { ok: true as const };
}
