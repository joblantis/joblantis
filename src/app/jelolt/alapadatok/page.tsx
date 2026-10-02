import type { Metadata } from "next";
import { BasicsWizard } from "./BasicsWizard";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Alapadatok" };

export default async function BasicsPage() {
  const user = await requireRole(["candidate"], "/jelolt/alapadatok");
  const supabase = await createClient();
  const [{ data: profile }, { data: langs }] = await Promise.all([
    supabase.from("candidate_profiles").select("*, settlements(id, postal_code, name, county)").eq("user_id", user.id).single(),
    supabase
      .from("candidate_skills")
      .select("competency_id, language_level, competencies!inner(name, has_language_level)")
      .eq("candidate_id", user.id)
      .eq("competencies.has_language_level", true),
  ]);
  return (
    <BasicsWizard
      languages={(langs ?? []).map((l) => ({ competency_id: l.competency_id, name: l.competencies.name, language_level: l.language_level }))}
      values={{
        availability: profile?.availability ?? [],
        settlement: profile?.settlements ?? null,
        travel_km: profile?.travel_km ?? 20,
        wage_expectation: profile?.wage_expectation ?? null,
        wage_period: profile?.wage_period ?? "monthly",
        start_date: profile?.start_date ?? "",
        headline: profile?.headline ?? "",
        bio: profile?.bio ?? "",
      }}
    />
  );
}
