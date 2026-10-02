"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { publicEnv } from "@/lib/env";
import type { FormState } from "@/lib/forms";

function safeNext(value: FormDataEntryValue | null) {
  const s = typeof value === "string" ? value : "";
  return s.startsWith("/") && !s.startsWith("//") ? s : null;
}

const loginSchema = z.object({
  email: z.string().trim().email("Érvénytelen email cím"),
  password: z.string().min(1, "Add meg a jelszavad"),
});

export async function signIn(_: FormState, formData: FormData): Promise<FormState> {
  const parsed = loginSchema.safeParse({ email: formData.get("email"), password: formData.get("password") });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error || !data.user) {
    return { error: error?.message === "Email not confirmed" ? "Előbb erősítsd meg az email címed a kiküldött linkkel." : "Hibás email cím vagy jelszó." };
  }
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", data.user.id).single();
  const fallback = profile?.role === "employer" ? "/munkaltato" : profile?.role === "admin" ? "/admin" : "/jelolt";
  redirect(safeNext(formData.get("next")) ?? fallback);
}

const signUpSchema = z.object({
  full_name: z.string().trim().min(2, "Add meg a neved").max(100),
  email: z.string().trim().email("Érvénytelen email cím"),
  password: z.string().min(8, "A jelszó legalább 8 karakter legyen"),
  role: z.enum(["candidate", "employer"], { message: "Válaszd ki, hogy állást keresel vagy munkaerőt" }),
  terms: z.literal("on", { message: "Az adatkezelési tájékoztató elfogadása kötelező" }),
});

export async function signUp(_: FormState, formData: FormData): Promise<FormState> {
  const parsed = signUpSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { full_name, email, password, role } = parsed.data;

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    // a szerepkört a handle_new_user trigger olvassa ki; admin szerepkör így nem kérhető
    options: { data: { full_name, role }, emailRedirectTo: `${publicEnv.siteUrl}/auth/callback` },
  });
  if (error) {
    return { error: error.message.includes("already registered") ? "Ezzel az email címmel már van fiók." : "A regisztráció nem sikerült. Próbáld újra." };
  }
  if (!data.session) {
    return { ok: true, message: "Elküldtük a megerősítő emailt. Kattints a benne lévő linkre, és már be is léphetsz." };
  }
  redirect(role === "employer" ? "/munkaltato/ceg" : "/jelolt");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
