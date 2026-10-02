import type { Metadata } from "next";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { coverUrls, fetchPublicJobsByIds, sortedPhotos } from "@/lib/jobs";
import { PageHeader } from "@/components/ui/PageHeader";
import { JobCard } from "@/components/jobs/JobCard";
import { ButtonLink } from "@/components/ui/Button";
import { SavedJobActions } from "./SavedJobActions";

export const metadata: Metadata = { title: "Mentett állások" };

export default async function SavedJobsPage() {
  const user = await requireRole(["candidate"], "/jelolt/mentett");
  const supabase = await createClient();
  const { data: saved } = await supabase
    .from("job_swipes")
    .select("job_id")
    .eq("candidate_id", user.id)
    .eq("direction", "up")
    .order("created_at", { ascending: false });
  // csak a még aktív (RLS szerint nyilvános) állások jelennek meg
  const jobs = await fetchPublicJobsByIds(supabase, (saved ?? []).map((s) => s.job_id));
  const live = jobs.filter((j) => j.status === "active" && j.expires_at && new Date(j.expires_at) > new Date());
  const [covers, { data: matches }] = await Promise.all([
    coverUrls(live),
    live.length ? supabase.rpc("candidate_job_matches", { p_job_ids: live.map((j) => j.id) }) : Promise.resolve({ data: [] }),
  ]);
  const matchById = new Map((matches ?? []).map((m) => [m.job_id, m]));

  return (
    <div className="space-y-4">
      <PageHeader title="Mentett állások" subtitle="Felfelé húzott állások – később dönthetsz." back="/jelolt/allaskereses" />
      {live.length === 0 ? (
        <div className="space-y-3 rounded-3xl bg-soft p-6 text-center">
          <p className="text-muted">Nincs mentett aktív állás.</p>
          <ButtonLink href="/jelolt/allaskereses" className="w-full">
            Álláskeresés
          </ButtonLink>
        </div>
      ) : (
        <ul className="space-y-5">
          {live.map((job) => {
            const cover = sortedPhotos(job)[0];
            const m = matchById.get(job.id);
            return (
              <li key={job.id} className="space-y-2">
                <JobCard
                  job={job}
                  coverUrl={cover ? covers.get(cover.path) : undefined}
                  match={m?.score != null ? { score: m.score, missing_required: m.missing_required ?? 0 } : undefined}
                />
                <SavedJobActions jobId={job.id} />
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
