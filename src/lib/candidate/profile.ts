import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { signedUrls } from "@/lib/storage";
import { loadGallery } from "./gallery";
import type { ReferenceView } from "@/components/references/ReferenceCard";

/** A jelölt teljes profilja megjelenítéshez – a hívó jogaival (RLS). */
export async function loadCandidateProfile(supabase: SupabaseClient<Database>, candidateId: string) {
  const [{ data: profile }, { data: person }, { data: skills }, { data: styles }, { data: roles }, gallery, { data: refs }] = await Promise.all([
    supabase.from("candidate_profiles").select("*, settlements(postal_code, name, county)").eq("user_id", candidateId).maybeSingle(),
    supabase.from("profiles").select("full_name").eq("id", candidateId).maybeSingle(),
    supabase
      .from("candidate_skills")
      .select("competency_id, level, status, verification_type, language_level, competencies(name, category)")
      .eq("candidate_id", candidateId),
    supabase.from("work_style_profiles").select("score, work_style_dimensions(name, low_label, high_label, sort_order)").eq("candidate_id", candidateId),
    supabase.from("candidate_target_roles").select("job_role_templates(name, sort_order)").eq("candidate_id", candidateId),
    loadGallery(supabase, candidateId),
    // RLS-biztos függvény: a munkáltató csak a jóváhagyott, nem rejtett ajánlásokat kapja, a referens email címe nélkül
    supabase.rpc("candidate_references", { p_candidate: candidateId }),
  ]);
  if (!profile) return null;

  const urls = await signedUrls("intro-videos", [profile.intro_video_path ?? "", profile.intro_video_poster_path ?? ""], { client: supabase });

  return {
    profile,
    fullName: person?.full_name ?? "",
    introVideo: profile.intro_video_path && urls.get(profile.intro_video_path)
      ? { url: urls.get(profile.intro_video_path)!, poster: (profile.intro_video_poster_path && urls.get(profile.intro_video_poster_path)) || null }
      : null,
    skills: (skills ?? [])
      .map((s) => ({
        competencyId: s.competency_id,
        name: s.competencies?.name ?? "",
        category: s.competencies?.category ?? "",
        level: s.level,
        status: s.status,
        verificationType: s.verification_type,
        languageLevel: s.language_level,
      }))
      .sort((a, b) => Number(b.status === "verified") - Number(a.status === "verified") || b.level - a.level || a.name.localeCompare(b.name, "hu")),
    workStyle: (styles ?? [])
      .filter((s) => s.work_style_dimensions)
      .sort((a, b) => a.work_style_dimensions!.sort_order - b.work_style_dimensions!.sort_order)
      .map((s) => ({ score: s.score, ...s.work_style_dimensions! })),
    roles: (roles ?? [])
      .map((r) => r.job_role_templates)
      .filter((r): r is NonNullable<typeof r> => !!r)
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((r) => r.name),
    gallery,
    references: ((refs ?? []) as ReferenceView[]).filter((r) => r.approved_at && !r.hidden),
  };
}

export type CandidateProfileData = NonNullable<Awaited<ReturnType<typeof loadCandidateProfile>>>;
