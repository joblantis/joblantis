"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getEmployerCompany, requireRole } from "@/lib/auth";
import type { FormState } from "@/lib/forms";

const schema = z.object({
  name: z.string().trim().min(2, "Add meg a cég nevét").max(120),
  description: z.string().trim().max(2000).optional().transform((v) => v || null),
  website: z
    .string()
    .trim()
    .max(200)
    .optional()
    .transform((v) => (v ? (/^https?:\/\//.test(v) ? v : `https://${v}`) : null))
    .refine((v) => v === null || /^https?:\/\/[^\s.]+\.[^\s]+$/.test(v), "Érvénytelen weboldal cím"),
});

export async function saveCompany(_: FormState, formData: FormData): Promise<FormState> {
  const user = await requireRole(["employer", "admin"]);
  const parsed = schema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") ?? undefined,
    website: formData.get("website") ?? undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const existing = await getEmployerCompany(user.id);
  if (!existing) {
    const { error } = await supabase.rpc("create_company", {
      p_name: parsed.data.name,
      p_description: parsed.data.description ?? undefined,
      p_website: parsed.data.website ?? undefined,
    });
    if (error) return { error: "A cég létrehozása nem sikerült." };
    revalidatePath("/munkaltato", "layout");
    redirect("/munkaltato/helyszinek/uj?elso=1");
  }

  const { error } = await supabase.from("companies").update(parsed.data).eq("id", existing.id);
  if (error) return { error: "A mentés nem sikerült." };
  revalidatePath("/munkaltato", "layout");
  return { ok: true, message: "Elmentve." };
}
