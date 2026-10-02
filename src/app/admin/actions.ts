"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Enums } from "@/types/database";

// Minden admin művelet a bejelentkezett admin jogaival fut: a katalógus-táblák és a moderálás RLS-e is_admin()-t vár.

const str = (f: FormData, k: string) => {
  const v = f.get(k);
  return typeof v === "string" ? v.trim() : "";
};
const int = (f: FormData, k: string) => {
  const n = Number(str(f, k));
  return Number.isInteger(n) ? n : NaN;
};

function back(path: string, result: { error?: string | null; ok?: string }): never {
  revalidatePath(path);
  const q = result.error ? `?hiba=${encodeURIComponent(result.error)}` : result.ok ? `?ok=${encodeURIComponent(result.ok)}` : "";
  redirect(`${path}${q}`);
}

function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// ───────────── munkakör-sablonok ─────────────

export async function saveTemplate(formData: FormData) {
  await requireRole(["admin"]);
  const id = int(formData, "id");
  const name = str(formData, "name");
  const path = `/admin/sablonok/${id}`;
  if (!name || name.length > 80) back(path, { error: "Adj meg nevet (max. 80 karakter)." });
  const supabase = await createClient();
  const { error } = await supabase
    .from("job_role_templates")
    .update({ name, description: str(formData, "description") || null, is_active: formData.get("is_active") === "on", sort_order: int(formData, "sort_order") || 0 })
    .eq("id", id);
  back(path, error ? { error: "A mentés nem sikerült." } : { ok: "Elmentve." });
}

export async function createTemplate(formData: FormData) {
  await requireRole(["admin"]);
  const name = str(formData, "name");
  if (name.length < 2 || name.length > 80) back("/admin/sablonok", { error: "Adj meg nevet (2–80 karakter)." });
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("job_role_templates")
    .insert({ name, slug: slugify(name), sort_order: 100 })
    .select("id")
    .single();
  if (error || !data) back("/admin/sablonok", { error: error?.code === "23505" ? "Ilyen nevű sablon már van." : "Nem sikerült." });
  else redirect(`/admin/sablonok/${data.id}`);
}

export async function setTemplateCompetency(formData: FormData) {
  await requireRole(["admin"]);
  const templateId = int(formData, "template_id");
  const competencyId = int(formData, "competency_id");
  const kind = str(formData, "kind");
  const path = `/admin/sablonok/${templateId}`;
  const supabase = await createClient();
  if (kind === "remove") {
    const { error } = await supabase.from("template_competencies").delete().eq("template_id", templateId).eq("competency_id", competencyId);
    back(path, error ? { error: "Nem sikerült." } : { ok: "Eltávolítva." });
  }
  if (kind !== "required" && kind !== "preferred") back(path, { error: "Érvénytelen típus." });
  const { error } = await supabase.from("template_competencies").upsert(
    { template_id: templateId, competency_id: competencyId, default_requirement: kind as Enums<"requirement_kind">, sort_order: int(formData, "sort_order") || 100 },
    { onConflict: "template_id,competency_id" },
  );
  back(path, error ? { error: "Nem sikerült." } : { ok: "Elmentve." });
}

export async function saveWorkStyleTargets(formData: FormData) {
  await requireRole(["admin"]);
  const templateId = int(formData, "template_id");
  const rows: { template_id: number; dimension_id: number; target: number }[] = [];
  for (const [key, value] of formData.entries()) {
    const m = key.match(/^target_(\d+)$/);
    const n = Number(value);
    if (m && Number.isInteger(n) && n >= 0 && n <= 100) rows.push({ template_id: templateId, dimension_id: Number(m[1]), target: n });
  }
  const supabase = await createClient();
  const { error } = await supabase.from("template_work_styles").upsert(rows, { onConflict: "template_id,dimension_id" });
  back(`/admin/sablonok/${templateId}`, error ? { error: "Nem sikerült." } : { ok: "Munkastílus-célprofil elmentve." });
}

// ───────────── kompetenciák ─────────────

export async function saveCompetency(formData: FormData) {
  await requireRole(["admin"]);
  const id = int(formData, "id");
  const name = str(formData, "name");
  const category = str(formData, "category") || "szakmai";
  if (name.length < 2 || name.length > 120) back("/admin/kompetenciak", { error: "Adj meg nevet (2–120 karakter)." });
  const values = {
    name,
    category,
    description: str(formData, "description") || null,
    has_language_level: formData.get("has_language_level") === "on",
  };
  const supabase = await createClient();
  const { error } = Number.isNaN(id)
    ? await supabase.from("competencies").insert({ ...values, slug: slugify(name) })
    : await supabase.from("competencies").update(values).eq("id", id);
  back("/admin/kompetenciak", error ? { error: error.code === "23505" ? "Ilyen kompetencia már van." : "Nem sikerült." } : { ok: "Elmentve." });
}

// ───────────── swipe kártyák ─────────────

export async function saveSwipeCard(formData: FormData) {
  await requireRole(["admin"]);
  const id = int(formData, "id");
  const returnTo = str(formData, "return_to").startsWith("/admin/kartyak") ? str(formData, "return_to") : "/admin/kartyak";
  const statement = str(formData, "statement");
  if (statement.length < 5 || statement.length > 200) back(returnTo, { error: "Az állítás 5–200 karakter legyen." });
  const kind: Enums<"card_kind"> = str(formData, "kind") === "work_style" ? "work_style" : "competency";
  const values =
    kind === "competency"
      ? { kind, statement, template_id: int(formData, "template_id"), competency_id: int(formData, "competency_id"), dimension_id: null, polarity: 1 }
      : { kind, statement, template_id: null, competency_id: null, dimension_id: int(formData, "dimension_id"), polarity: str(formData, "polarity") === "-1" ? -1 : 1 };
  if (kind === "competency" && (Number.isNaN(values.template_id) || Number.isNaN(values.competency_id))) back(returnTo, { error: "Válassz munkakört és kompetenciát." });
  if (kind === "work_style" && Number.isNaN(values.dimension_id)) back(returnTo, { error: "Válassz dimenziót." });
  const extra = { is_active: formData.get("is_active") === "on", sort_order: int(formData, "sort_order") || 0 };
  const supabase = await createClient();
  const { error } = Number.isNaN(id)
    ? await supabase.from("swipe_cards").insert({ ...values, ...extra, is_active: true })
    : await supabase.from("swipe_cards").update({ ...values, ...extra }).eq("id", id);
  // path without query: a back() a saját query-jét fűzi hozzá
  const [path, query] = returnTo.split("?");
  revalidatePath(path);
  const params = new URLSearchParams(query ?? "");
  params.delete("hiba");
  params.delete("ok");
  params.set(error ? "hiba" : "ok", error ? (error.code === "23505" ? "Ez az állítás már szerepel." : "Nem sikerült.") : "Elmentve.");
  redirect(`${path}?${params}`);
}

// ───────────── moderálás ─────────────

export async function setJobStatus(formData: FormData) {
  await requireRole(["admin"]);
  const status = str(formData, "status");
  if (status !== "closed" && status !== "active") back("/admin/moderalas", { error: "Érvénytelen státusz." });
  const supabase = await createClient();
  const { data: job } = await supabase.from("jobs").select("expires_at").eq("id", str(formData, "id")).maybeSingle();
  if (status === "active" && (!job?.expires_at || new Date(job.expires_at) <= new Date())) back("/admin/moderalas", { error: "Lejárt állás nem aktiválható újra." });
  const { error } = await supabase.from("jobs").update({ status: status as Enums<"job_status"> }).eq("id", str(formData, "id"));
  back("/admin/moderalas", error ? { error: "Nem sikerült." } : { ok: status === "closed" ? "Az állás lezárva." : "Az állás újra aktív." });
}

export async function deleteMediaItem(formData: FormData) {
  await requireRole(["admin"]);
  const supabase = await createClient();
  const { data: item } = await supabase.from("media_items").select("id, file_path, thumb_path").eq("id", str(formData, "id")).maybeSingle();
  if (!item) back("/admin/moderalas", { error: "Nem található." });
  else {
    await supabase.storage.from("candidate-media").remove([item.file_path, item.thumb_path].filter((p): p is string => !!p));
    const { error } = await supabase.from("media_items").delete().eq("id", item.id);
    back("/admin/moderalas", error ? { error: "Nem sikerült." } : { ok: "A média törölve." });
  }
}

export async function setUserRole(formData: FormData) {
  await requireRole(["admin"]);
  const role = str(formData, "role");
  if (!["candidate", "employer", "admin"].includes(role)) back("/admin/moderalas", { error: "Érvénytelen szerepkör." });
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_set_role", { p_user: str(formData, "id"), p_role: role as Enums<"user_role"> });
  back("/admin/moderalas", error ? { error: error.message } : { ok: "Szerepkör módosítva." });
}
