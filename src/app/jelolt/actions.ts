"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import { skillLevel, workStyleScore } from "@/lib/candidate/scoring";
import { SHIFTS } from "@/lib/format";
import { optionalInt, type FormState } from "@/lib/forms";
import type { Enums } from "@/types/database";

const ORDER = ["roles", "cards", "basics", "done"] as const;
type Step = (typeof ORDER)[number];

async function advanceStep(userId: string, to: Step) {
  const supabase = await createClient();
  const { data } = await supabase.from("candidate_profiles").select("onboarding_step").eq("user_id", userId).single();
  const current = (data?.onboarding_step ?? "roles") as Step;
  if (ORDER.indexOf(to) > ORDER.indexOf(current)) {
    await supabase.from("candidate_profiles").update({ onboarding_step: to }).eq("user_id", userId);
  }
}

export async function saveTargetRoles(templateIds: number[]) {
  const user = await requireRole(["candidate"]);
  const ids = [...new Set(templateIds.filter((n) => Number.isInteger(n) && n > 0))];
  if (!ids.length) return { error: "Válassz legalább egy munkakört." };
  const supabase = await createClient();
  const { error: delErr } = await supabase.from("candidate_target_roles").delete().eq("candidate_id", user.id);
  if (delErr) return { error: "A mentés nem sikerült." };
  const { error } = await supabase.from("candidate_target_roles").insert(ids.map((template_id) => ({ candidate_id: user.id, template_id })));
  if (error) return { error: "A mentés nem sikerült." };
  await advanceStep(user.id, "cards");
  revalidatePath("/jelolt", "layout");
  redirect("/jelolt/kartyak");
}

/** Egy kártyára adott válasz. Azonos állítás több munkakörnél is szerepelhet, ezért több kártya-id jöhet. */
export async function saveSwipeAnswer(cardIds: number[], direction: Enums<"swipe_dir">) {
  const user = await requireRole(["candidate"]);
  if (!["left", "right", "up"].includes(direction) || !cardIds.length || cardIds.length > 20) return { error: "Érvénytelen válasz." };
  const supabase = await createClient();
  const { error } = await supabase.from("candidate_swipe_answers").upsert(
    cardIds.map((card_id) => ({ candidate_id: user.id, card_id, direction, answered_at: new Date().toISOString() })),
    { onConflict: "candidate_id,card_id" },
  );
  return error ? { error: "A válasz mentése nem sikerült." } : { ok: true };
}

/** A kártyaválaszokból újraszámolja a bemondott készségszinteket és a munkastílus-profilt. */
export async function finalizeCards() {
  const user = await requireRole(["candidate"]);
  const supabase = await createClient();

  const [{ data: roles }, { data: answers }, { data: skills }] = await Promise.all([
    supabase.from("candidate_target_roles").select("template_id").eq("candidate_id", user.id),
    supabase
      .from("candidate_swipe_answers")
      .select("direction, swipe_cards(kind, template_id, competency_id, dimension_id, polarity, is_active)")
      .eq("candidate_id", user.id),
    supabase.from("candidate_skills").select("competency_id, status").eq("candidate_id", user.id),
  ]);
  const roleIds = new Set((roles ?? []).map((r) => r.template_id));

  const byCompetency = new Map<number, Enums<"swipe_dir">[]>();
  const byDimension = new Map<number, { direction: Enums<"swipe_dir">; polarity: number }[]>();
  for (const a of answers ?? []) {
    const c = a.swipe_cards;
    if (!c || !c.is_active) continue;
    if (c.kind === "competency" && c.competency_id && c.template_id && roleIds.has(c.template_id)) {
      byCompetency.set(c.competency_id, [...(byCompetency.get(c.competency_id) ?? []), a.direction]);
    } else if (c.kind === "work_style" && c.dimension_id) {
      byDimension.set(c.dimension_id, [...(byDimension.get(c.dimension_id) ?? []), { direction: a.direction, polarity: c.polarity }]);
    }
  }

  // igazolt készséghez nem nyúlunk; a bemondottakat a válaszok alapján frissítjük
  const verified = new Set((skills ?? []).filter((s) => s.status === "verified").map((s) => s.competency_id));
  const upserts: { candidate_id: string; competency_id: number; level: number }[] = [];
  const removals: number[] = [];
  for (const [competencyId, dirs] of byCompetency) {
    if (verified.has(competencyId)) continue;
    const level = skillLevel(dirs);
    if (level == null) removals.push(competencyId);
    else upserts.push({ candidate_id: user.id, competency_id: competencyId, level });
  }
  // ha egy munkakört levett, az ahhoz tartozó bemondott készségek kikerülnek
  for (const s of skills ?? []) {
    if (s.status === "claimed" && !byCompetency.has(s.competency_id)) removals.push(s.competency_id);
  }

  if (upserts.length) {
    const { error } = await supabase.from("candidate_skills").upsert(upserts, { onConflict: "candidate_id,competency_id" });
    if (error) return { error: "A készségek mentése nem sikerült." };
  }
  if (removals.length) {
    await supabase.from("candidate_skills").delete().eq("candidate_id", user.id).eq("status", "claimed").in("competency_id", removals);
  }

  const styles = [...byDimension].flatMap(([dimension_id, list]) => {
    const score = workStyleScore(list);
    return score == null ? [] : [{ candidate_id: user.id, dimension_id, score, updated_at: new Date().toISOString() }];
  });
  if (styles.length) {
    const { error } = await supabase.from("work_style_profiles").upsert(styles, { onConflict: "candidate_id,dimension_id" });
    if (error) return { error: "A munkastílus mentése nem sikerült." };
  }

  await advanceStep(user.id, "basics");
  revalidatePath("/jelolt", "layout");
  return { ok: true };
}

const basicsSchema = z.object({
  availability: z.array(z.enum(SHIFTS as [Enums<"shift_type">, ...Enums<"shift_type">[]])).min(1, "Jelölj meg legalább egy műszakot"),
  settlement_id: z.coerce.number({ message: "Válassz települést a listából" }).int().positive("Válassz települést a listából"),
  postal_code: z.string().regex(/^\d{4}$/, "Válassz települést a listából"),
  travel_km: z.number().int().min(0).max(300),
  wage_expectation: z.number().int().min(0, "Érvénytelen bérigény").max(100_000_000).nullable(),
  wage_period: z.enum(["hourly", "monthly"]),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  headline: z.string().trim().max(120).nullable(),
  bio: z.string().trim().max(1000).nullable(),
});

const LANG_LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;

export async function saveBasics(_: FormState, formData: FormData): Promise<FormState> {
  const user = await requireRole(["candidate"]);
  const str = (k: string) => {
    const v = formData.get(k);
    return typeof v === "string" && v.trim() ? v.trim() : null;
  };
  const wage = optionalInt(formData.get("wage_expectation"));
  const parsed = basicsSchema.safeParse({
    availability: formData.getAll("availability"),
    settlement_id: formData.get("place_id") || undefined,
    postal_code: formData.get("place_postal"),
    travel_km: Number(formData.get("travel_km") ?? 0),
    wage_expectation: Number.isNaN(wage) ? -1 : wage,
    wage_period: formData.get("wage_period"),
    start_date: str("start_date"),
    headline: str("headline"),
    bio: str("bio"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const { data: s } = await supabase.from("settlements").select("postal_code").eq("id", parsed.data.settlement_id).single();
  if (!s || s.postal_code !== parsed.data.postal_code) return { error: "Válassz települést a listából" };

  const { error } = await supabase.from("candidate_profiles").update(parsed.data).eq("user_id", user.id);
  if (error) return { error: "A mentés nem sikerült." };

  // nyelvtudás szintje a bemondott nyelvi készségekhez
  for (const [key, value] of formData.entries()) {
    const m = key.match(/^lang_(\d+)$/);
    if (!m || typeof value !== "string" || !(LANG_LEVELS as readonly string[]).includes(value)) continue;
    await supabase
      .from("candidate_skills")
      .update({ language_level: value })
      .eq("candidate_id", user.id)
      .eq("competency_id", Number(m[1]))
      .eq("status", "claimed");
  }

  await advanceStep(user.id, "done");
  revalidatePath("/jelolt", "layout");
  redirect("/jelolt?kesz=1");
}
