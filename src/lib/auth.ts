import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import type { Tables } from "@/types/database";

export type SessionUser = { id: string; email: string; profile: Tables<"profiles"> };

/** Bejelentkezett felhasználó és profil (kérésenként egyszer lekérve). */
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  if (!isSupabaseConfigured) return null;
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return null;
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", data.user.id).single();
  if (!profile) return null;
  return { id: data.user.id, email: data.user.email ?? "", profile };
});

export async function requireRole(roles: Array<Tables<"profiles">["role"]>, next?: string) {
  const user = await getSessionUser();
  if (!user) redirect(`/belepes${next ? `?next=${encodeURIComponent(next)}` : ""}`);
  if (!roles.includes(user.profile.role)) redirect("/");
  return user;
}

/** A munkáltató első (aktív) cége. Egy felhasználó több céghez is tartozhat; az 1. fázisban az elsőt kezeljük. */
export const getEmployerCompany = cache(async (userId: string) => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("company_members")
    .select("member_role, companies(*)")
    .eq("user_id", userId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  return data?.companies ? { ...data.companies, member_role: data.member_role } : null;
});

export async function requireEmployerCompany(next?: string) {
  const user = await requireRole(["employer", "admin"], next);
  const company = await getEmployerCompany(user.id);
  if (!company) redirect("/munkaltato/ceg");
  return { user, company };
}
