import type { MetadataRoute } from "next";
import { isSupabaseConfigured, publicEnv } from "@/lib/env";
import { createPublicClient } from "@/lib/supabase/public";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = publicEnv.siteUrl;
  const entries: MetadataRoute.Sitemap = [
    { url: `${base}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/allasok`, changeFrequency: "hourly", priority: 0.9 },
  ];
  if (!isSupabaseConfigured) return entries;
  const supabase = createPublicClient();
  const [{ data: jobs }, { data: templates }] = await Promise.all([
    supabase.from("jobs").select("slug, updated_at").eq("status", "active").gt("expires_at", new Date().toISOString()).limit(5000),
    supabase.from("job_role_templates").select("slug").eq("is_active", true),
  ]);
  for (const t of templates ?? []) entries.push({ url: `${base}/allasok?munkakor=${t.slug}`, changeFrequency: "daily", priority: 0.7 });
  for (const j of jobs ?? []) entries.push({ url: `${base}/allasok/${j.slug}`, lastModified: j.updated_at, changeFrequency: "daily", priority: 0.8 });
  return entries;
}
