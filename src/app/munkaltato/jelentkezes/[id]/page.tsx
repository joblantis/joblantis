import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { loadCandidateProfile } from "@/lib/candidate/profile";
import { parseMatch } from "@/lib/match";
import { APPLICATION_STATUS_LABELS, CHAT_OPEN, STATUS_TONE } from "@/lib/applications";
import { formatDate } from "@/lib/format";
import { PageHeader } from "@/components/ui/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { ProfileView } from "@/components/candidate/ProfileView";
import { MatchExplain } from "@/components/match/MatchExplain";
import { StatusActions } from "./StatusActions";
import { TrialPanel } from "@/components/trials/TrialPanel";
import { loadTrials } from "@/lib/trials";

export const metadata: Metadata = { title: "Jelölt profilja" };

export default async function ApplicationPage(props: PageProps<"/munkaltato/jelentkezes/[id]">) {
  const { id } = await props.params;
  const { ertekelve } = await props.searchParams;
  await requireRole(["employer", "admin"], `/munkaltato/jelentkezes/${id}`);
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const supabase = await createClient();

  // RLS: csak a cég tagjai látják a saját állásaikra érkezett jelentkezést
  const { data: app } = await supabase
    .from("applications")
    .select("id, status, candidate_id, job_id, created_at, response_due_at, jobs(title)")
    .eq("id", id)
    .maybeSingle();
  if (!app) notFound();

  const [data, { data: match }, { data: refs }, trials] = await Promise.all([
    loadCandidateProfile(supabase, app.candidate_id),
    supabase.rpc("match_details", { p_candidate: app.candidate_id, p_job: app.job_id }),
    supabase.rpc("candidate_reference_counts", { p_candidate_ids: [app.candidate_id] }),
    loadTrials(supabase, app.id),
  ]);
  if (!data) notFound();
  const details = parseMatch(match);
  const referenceCount = refs?.[0]?.reference_count ?? 0;
  const overdue = app.status === "new" && new Date(app.response_due_at) < new Date();

  return (
    <div className="space-y-6">
      <PageHeader
        title={data.fullName || "Jelölt"}
        subtitle={app.jobs?.title}
        back={`/munkaltato/allasok/${app.job_id}/pipeline`}
        action={<Badge tone={STATUS_TONE[app.status]}>{APPLICATION_STATUS_LABELS[app.status]}</Badge>}
      />

      <div className="rounded-2xl bg-soft px-4 py-3 text-sm">
        Jelentkezett: {formatDate(app.created_at)}
        {app.status === "new" && (
          <span className={overdue ? "font-semibold text-danger" : "text-muted"}> · válaszhatáridő: {formatDate(app.response_due_at)}</span>
        )}
      </div>

      {ertekelve && (
        <p role="status" className="rounded-2xl bg-success/10 px-4 py-3 text-sm font-medium text-success">
          Értékelés elmentve. A legalább 4-es pontot kapott kompetenciák „igazolt (próbanap)” státuszt kaptak.
        </p>
      )}

      <StatusActions applicationId={app.id} status={app.status} />
      {CHAT_OPEN.includes(app.status) && (
        <Link href={`/uzenetek/${app.id}`} className="block rounded-2xl bg-brand px-4 py-3 text-center font-semibold text-white">
          Chat megnyitása
        </Link>
      )}

      {app.status !== "new" && (
        <TrialPanel applicationId={app.id} trials={trials} role="employer" canPropose={["viewed", "trial", "offer"].includes(app.status)} />
      )}

      {details && (
        <section className="rounded-3xl border border-brand/20 p-4">
          <MatchExplain match={details} perspective="employer" />
        </section>
      )}

      <p className="text-sm text-muted">
        {referenceCount ? `${referenceCount} igazolt ajánlás` : "Még nincs igazolt ajánlás"}
      </p>

      <ProfileView data={data} />
    </div>
  );
}
