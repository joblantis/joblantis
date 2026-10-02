import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { signedUrls } from "@/lib/storage";

export const PUBLIC_JOB_SELECT = `
  id, slug, title, description, wage_min, wage_max, wage_period, shifts, schedule_note, start_date,
  is_seasonal, status, published_at, expires_at,
  companies(name, slug, description, website),
  venues(id, name, address, postal_code, description, settlements(name, county, lat, lng), venue_photos(path, sort_order)),
  job_role_templates(slug, name),
  job_requirements(kind, min_level, competencies(id, name, category))
` as const;

type Client = SupabaseClient<Database>;

export async function fetchPublicJobsByIds(supabase: Client, ids: string[]) {
  if (!ids.length) return [];
  const { data } = await supabase.from("jobs").select(PUBLIC_JOB_SELECT).in("id", ids);
  const byId = new Map((data ?? []).map((j) => [j.id, j]));
  return ids.map((id) => byId.get(id)).filter((j): j is NonNullable<typeof j> => !!j);
}

export type PublicJob = Awaited<ReturnType<typeof fetchPublicJobsByIds>>[number];

export function sortedPhotos(job: PublicJob) {
  return [...(job.venues?.venue_photos ?? [])].sort((a, b) => a.sort_order - b.sort_order);
}

/** Helyszínfotók aláírt URL-jei nyilvános, RLS-sel már szűrt állásokhoz. */
export async function coverUrls(jobs: PublicJob[], all = false) {
  const paths = jobs.flatMap((j) => (all ? sortedPhotos(j) : sortedPhotos(j).slice(0, 1)).map((p) => p.path));
  return signedUrls("venue-photos", paths);
}
