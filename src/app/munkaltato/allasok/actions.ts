"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireEmployerCompany } from "@/lib/auth";
import { optionalInt, type FormState } from "@/lib/forms";
import { SHIFTS, endOfDayBudapest } from "@/lib/format";
import { randomSuffix, slugify } from "@/lib/slug";
import type { Enums } from "@/types/database";

const MAX_DAYS = 90;

const schema = z
  .object({
    template_id: z.coerce.number({ message: "Válassz munkakört" }).int().positive("Válassz munkakört"),
    venue_id: z.string().uuid("Válassz helyszínt"),
    title: z.string().trim().min(3, "Adj meg egy címet (legalább 3 karakter)").max(120),
    description: z.string().trim().max(5000).nullable(),
    wage_min: z.number().int().min(0, "Érvénytelen bérösszeg").nullable(),
    wage_max: z.number().int().min(0, "Érvénytelen bérösszeg").nullable(),
    wage_period: z.enum(["hourly", "monthly"], { message: "Válaszd ki a bér típusát" }),
    shifts: z.array(z.enum(SHIFTS as [Enums<"shift_type">, ...Enums<"shift_type">[]])),
    schedule_note: z.string().trim().max(300).nullable(),
    start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Érvénytelen kezdési dátum").nullable(),
    is_seasonal: z.boolean(),
    expires_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Adj meg lejárati dátumot"),
    intent: z.enum(["draft", "publish"]),
  })
  .refine((d) => d.wage_min == null || d.wage_max == null || d.wage_min <= d.wage_max, {
    message: "A bérsáv alsó értéke nem lehet nagyobb a felsőnél",
  });

function parseForm(formData: FormData) {
  const num = (k: string) => {
    const v = optionalInt(formData.get(k));
    return Number.isNaN(v) ? -1 : v;
  };
  const str = (k: string) => {
    const v = formData.get(k);
    return typeof v === "string" && v.trim() ? v.trim() : null;
  };
  return schema.safeParse({
    template_id: formData.get("template_id"),
    venue_id: formData.get("venue_id"),
    title: formData.get("title"),
    description: str("description"),
    wage_min: num("wage_min"),
    wage_max: num("wage_max"),
    wage_period: formData.get("wage_period"),
    shifts: formData.getAll("shifts"),
    schedule_note: str("schedule_note"),
    start_date: str("start_date"),
    is_seasonal: formData.get("is_seasonal") === "on",
    expires_on: formData.get("expires_on"),
    intent: formData.get("intent"),
  });
}

function parseRequirements(formData: FormData) {
  const reqs: { competency_id: number; kind: Enums<"requirement_kind"> }[] = [];
  for (const [key, value] of formData.entries()) {
    const m = key.match(/^req_(\d+)$/);
    if (m && (value === "required" || value === "preferred")) reqs.push({ competency_id: Number(m[1]), kind: value });
  }
  return reqs;
}

export async function saveJob(jobId: string | null, _: FormState, formData: FormData): Promise<FormState> {
  const { user, company } = await requireEmployerCompany();
  const parsed = parseForm(formData);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const d = parsed.data;
  const requirements = parseRequirements(formData);
  if (!requirements.some((r) => r.kind === "required")) return { error: "Jelölj ki legalább egy kötelező kompetenciát." };

  const expiresAt = endOfDayBudapest(d.expires_on);
  const now = new Date();
  if (d.intent === "publish") {
    if (expiresAt <= now) return { error: "A lejárati dátum nem lehet a múltban." };
    if (expiresAt.getTime() - now.getTime() > MAX_DAYS * 86400_000) return { error: `Egy állás legfeljebb ${MAX_DAYS} napig lehet aktív.` };
  }

  const supabase = await createClient();
  const { data: venue } = await supabase.from("venues").select("id").eq("id", d.venue_id).eq("company_id", company.id).maybeSingle();
  if (!venue) return { error: "Válassz helyszínt" };

  const row = {
    company_id: company.id,
    venue_id: d.venue_id,
    template_id: d.template_id,
    title: d.title,
    description: d.description,
    wage_min: d.wage_min,
    wage_max: d.wage_max,
    wage_period: d.wage_period,
    shifts: d.shifts,
    schedule_note: d.schedule_note,
    start_date: d.start_date,
    is_seasonal: d.is_seasonal,
    expires_at: expiresAt.toISOString(),
  };

  let id = jobId;
  if (id) {
    const { data: current } = await supabase.from("jobs").select("status, published_at").eq("id", id).eq("company_id", company.id).single();
    if (!current) return { error: "Az állás nem található." };
    const publish = d.intent === "publish";
    const { error } = await supabase
      .from("jobs")
      .update({
        ...row,
        ...(publish ? { status: "active" as const, published_at: current.published_at ?? now.toISOString() } : {}),
      })
      .eq("id", id);
    if (error) return { error: "A mentés nem sikerült." };
  } else {
    const slug = `${slugify(d.title)}-${randomSuffix()}`;
    const { data, error } = await supabase
      .from("jobs")
      .insert({
        ...row,
        slug,
        created_by: user.id,
        status: d.intent === "publish" ? "active" : "draft",
        published_at: d.intent === "publish" ? now.toISOString() : null,
      })
      .select("id")
      .single();
    if (error || !data) return { error: "Az állás létrehozása nem sikerült." };
    id = data.id;
  }

  // követelmények cseréje
  const { error: delErr } = await supabase.from("job_requirements").delete().eq("job_id", id);
  if (delErr) return { error: "A kompetenciák mentése nem sikerült." };
  const { error: reqErr } = await supabase.from("job_requirements").insert(requirements.map((r) => ({ ...r, job_id: id! })));
  if (reqErr) return { error: "A kompetenciák mentése nem sikerült." };

  revalidatePath("/munkaltato", "layout");
  revalidatePath("/allasok", "layout");
  redirect(`/munkaltato/allasok/${id}?mentve=${d.intent}`);
}

export async function setJobStatus(jobId: string, status: "active" | "closed" | "draft") {
  const { company } = await requireEmployerCompany();
  const supabase = await createClient();
  const { data: job } = await supabase.from("jobs").select("expires_at, published_at").eq("id", jobId).eq("company_id", company.id).single();
  if (!job) return { error: "Az állás nem található." };
  if (status === "active" && (!job.expires_at || new Date(job.expires_at) <= new Date())) {
    return { error: "A közzétételhez állíts be jövőbeli lejárati dátumot." };
  }
  const { error } = await supabase
    .from("jobs")
    .update({ status, ...(status === "active" && !job.published_at ? { published_at: new Date().toISOString() } : {}) })
    .eq("id", jobId);
  if (error) return { error: "A státusz módosítása nem sikerült." };
  revalidatePath("/munkaltato", "layout");
  revalidatePath("/allasok", "layout");
  return { ok: true };
}
