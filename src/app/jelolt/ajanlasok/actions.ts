"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { newToken } from "@/lib/tokens";
import { sendReferenceRequestEmail } from "@/lib/references";
import type { FormState } from "@/lib/forms";

const schema = z
  .object({
    company_name: z.string().trim().min(2, "Add meg a munkahely nevét").max(120),
    referee_name: z.string().trim().min(2, "Add meg a referens nevét").max(120),
    referee_email: z.email("Érvénytelen email cím").max(200),
    position: z.string().trim().min(2, "Add meg a pozíciót").max(120),
    period_from: z.string().regex(/^\d{4}-\d{2}$/, "Add meg, mikor kezdtél"),
    period_to: z.string().regex(/^\d{4}-\d{2}$/).nullable(),
  })
  .refine((v) => !v.period_to || v.period_to >= v.period_from, { message: "A vége nem lehet a kezdés előtt", path: ["period_to"] });

/** Ajánlás kérése: a token csak az emailben megy ki, az adatbázisba a hash-e kerül. Ha az email nem megy ki, a kérést visszavonjuk. */
export async function requestReference(_: FormState, formData: FormData): Promise<FormState> {
  const user = await requireRole(["candidate"]);
  const str = (k: string) => {
    const v = formData.get(k);
    return typeof v === "string" && v.trim() ? v.trim() : null;
  };
  const parsed = schema.safeParse({
    company_name: str("company_name") ?? "",
    referee_name: str("referee_name") ?? "",
    referee_email: (str("referee_email") ?? "").toLowerCase(),
    position: str("position") ?? "",
    period_from: str("period_from") ?? "",
    period_to: str("period_to"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const d = parsed.data;
  if (d.referee_email === user.email.toLowerCase()) return { error: "Saját magadtól nem kérhetsz ajánlást." };

  const supabase = await createClient();
  const { token, hash } = newToken();
  const { data: id, error } = await supabase.rpc("create_reference_request", {
    p_company_name: d.company_name,
    p_referee_name: d.referee_name,
    p_referee_email: d.referee_email,
    p_position: d.position,
    p_period_from: `${d.period_from}-01`,
    // jelenlegi munkahelynél nincs vége (null; a generált típus nem jelöli nullázhatónak)
    p_period_to: d.period_to ? `${d.period_to}-01` : (null as unknown as string),
    p_token_hash: hash,
  });
  if (error || !id) return { error: error?.message || "A kérés nem sikerült." };

  const sent = await sendReferenceRequestEmail({
    to: d.referee_email,
    refereeName: d.referee_name,
    candidateName: user.profile.full_name || "Egy jelölt",
    companyName: d.company_name,
    token,
  });
  if (!sent.ok) {
    await supabase.from("reference_requests").delete().eq("id", id);
    return { error: sent.skipped ? "Az email küldés még nincs beállítva (RESEND_API_KEY, EMAIL_FROM). Szólj az üzemeltetőnek." : "Az emailt nem sikerült elküldeni. Próbáld újra később." };
  }
  revalidatePath("/jelolt/ajanlasok");
  return { ok: true, message: `Elküldtük a kérést ${d.referee_name} részére. Ha 7 napon belül nem válaszol, egyszer emlékeztetjük.` };
}

export async function cancelReferenceRequest(id: string) {
  const user = await requireRole(["candidate"]);
  const supabase = await createClient();
  await supabase.from("reference_requests").delete().eq("id", id).eq("candidate_id", user.id);
  revalidatePath("/jelolt/ajanlasok");
}

/** Jóváhagyás: ezután jelenik meg a profilon, és a referens által igazolt kompetenciák "igazolt (referencia)" státuszt kapnak. */
export async function approveReference(id: string) {
  await requireRole(["candidate"]);
  const supabase = await createClient();
  await supabase.from("references").update({ approved_at: new Date().toISOString() }).eq("id", id).is("approved_at", null);
  revalidatePath("/jelolt", "layout");
}

/** Elrejtés / visszaállítás. Szerkeszteni nem lehet. */
export async function setReferenceHidden(id: string, hidden: boolean) {
  await requireRole(["candidate"]);
  const supabase = await createClient();
  await supabase.from("references").update({ hidden }).eq("id", id);
  revalidatePath("/jelolt", "layout");
}
