import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Enums } from "@/types/database";
import { signedUrls } from "@/lib/storage";
import { parseMatch, type MatchDetails } from "@/lib/match";

type Client = SupabaseClient<Database>;

export type ApplicantCard = {
  applicationId: string;
  candidateId: string;
  status: Enums<"application_status">;
  createdAt: string;
  responseDueAt: string;
  name: string;
  headline: string | null;
  place: string | null;
  introVideo: { url: string; poster: string | null } | null;
  skills: { name: string; level: number; verified: boolean; verificationType: Enums<"verification_type"> | null }[];
  referenceCount: number;
  galleryPreview: { url: string; video: boolean }[];
  galleryCount: number;
  match: MatchDetails | null;
};

/**
 * Egy állás jelentkezői a jelöltkártyákhoz, élő illeszkedési pontszám szerint (hiányzó kötelező kompetencia a végén).
 * Mindent a munkáltató jogaival kérünk le: az RLS csak a hozzá jelentkezett jelöltek adatait engedi.
 */
export async function loadApplicants(supabase: Client, jobId: string, statuses?: Enums<"application_status">[]): Promise<ApplicantCard[]> {
  const { data: rows } = await supabase.rpc("job_applicants", { p_job_id: jobId });
  const list = (rows ?? []).filter((r) => r.application_id && r.candidate_id && (!statuses || (r.status && statuses.includes(r.status))));
  if (!list.length) return [];
  const ids = [...new Set(list.map((r) => r.candidate_id!))];

  const [{ data: people }, { data: profiles }, { data: skills }, { data: refs }, { data: media }] = await Promise.all([
    supabase.from("profiles").select("id, full_name").in("id", ids),
    supabase
      .from("candidate_profiles")
      .select("user_id, headline, intro_video_path, intro_video_poster_path, settlements(name)")
      .in("user_id", ids),
    supabase.from("candidate_skills").select("candidate_id, level, status, verification_type, competencies(name)").in("candidate_id", ids),
    supabase.rpc("candidate_reference_counts", { p_candidate_ids: ids }),
    supabase
      .from("media_items")
      .select("candidate_id, kind, thumb_path, file_path, sort_order, created_at")
      .in("candidate_id", ids)
      .order("created_at", { ascending: false }),
  ]);

  const mediaBy = new Map<string, NonNullable<typeof media>>();
  for (const m of media ?? []) mediaBy.set(m.candidate_id, [...(mediaBy.get(m.candidate_id) ?? []), m]);

  const introPaths = (profiles ?? []).flatMap((p) => [p.intro_video_path ?? "", p.intro_video_poster_path ?? ""]);
  const thumbPaths = [...mediaBy.values()].flatMap((items) => items.slice(0, 3).map((m) => m.thumb_path ?? (m.kind === "image" ? m.file_path : "")));
  const [introUrls, thumbUrls] = await Promise.all([
    signedUrls("intro-videos", introPaths, { client: supabase }),
    signedUrls("candidate-media", thumbPaths, { client: supabase }),
  ]);

  const nameBy = new Map((people ?? []).map((p) => [p.id, p.full_name]));
  const profileBy = new Map((profiles ?? []).map((p) => [p.user_id, p]));
  const refBy = new Map((refs ?? []).map((r) => [r.candidate_id, r.reference_count ?? 0]));

  return list.map((r) => {
    const p = profileBy.get(r.candidate_id!);
    const items = mediaBy.get(r.candidate_id!) ?? [];
    const videoUrl = p?.intro_video_path ? introUrls.get(p.intro_video_path) : undefined;
    return {
      applicationId: r.application_id!,
      candidateId: r.candidate_id!,
      status: r.status!,
      createdAt: r.created_at!,
      responseDueAt: r.response_due_at!,
      name: nameBy.get(r.candidate_id!) || "Jelölt",
      headline: p?.headline ?? null,
      place: p?.settlements?.name ?? null,
      introVideo: videoUrl ? { url: videoUrl, poster: (p?.intro_video_poster_path && introUrls.get(p.intro_video_poster_path)) || null } : null,
      skills: (skills ?? [])
        .filter((s) => s.candidate_id === r.candidate_id)
        .map((s) => ({ name: s.competencies?.name ?? "", level: s.level, verified: s.status === "verified", verificationType: s.verification_type }))
        .sort((a, b) => Number(b.verified) - Number(a.verified) || b.level - a.level),
      referenceCount: refBy.get(r.candidate_id!) ?? 0,
      galleryPreview: items
        .slice(0, 3)
        .map((m) => ({ url: thumbUrls.get(m.thumb_path ?? (m.kind === "image" ? m.file_path : "")) ?? "", video: m.kind === "video" }))
        .filter((m) => m.url),
      galleryCount: items.length,
      match: parseMatch(r.details),
    };
  });
}
