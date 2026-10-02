import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatDateTime, formatDuration } from "@/lib/format";
import { PageHeader } from "@/components/ui/PageHeader";
import { EvaluationForm } from "./EvaluationForm";

export const metadata: Metadata = { title: "Próbanap értékelése" };

export default async function EvaluatePage(props: PageProps<"/munkaltato/probanap/[id]">) {
  const { id } = await props.params;
  await requireRole(["employer", "admin"], `/munkaltato/probanap/${id}`);
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const supabase = await createClient();
  // RLS: csak a cég tagjai látják
  const { data: trial } = await supabase
    .from("trial_shifts")
    .select("id, status, starts_at, duration_minutes, application_id, applications(candidate_id, job_id, jobs(title))")
    .eq("id", id)
    .maybeSingle();
  if (!trial?.applications) notFound();

  const [{ data: reqs }, { data: person }] = await Promise.all([
    supabase.from("job_requirements").select("kind, competencies(id, name)").eq("job_id", trial.applications.job_id),
    supabase.from("profiles").select("full_name").eq("id", trial.applications.candidate_id).maybeSingle(),
  ]);
  const competencies = (reqs ?? [])
    .filter((r) => r.competencies)
    .sort((a, b) => (a.kind === b.kind ? a.competencies!.name.localeCompare(b.competencies!.name, "hu") : a.kind === "required" ? -1 : 1))
    .map((r) => ({ id: r.competencies!.id, name: r.competencies!.name, required: r.kind === "required" }));

  const ready = trial.status === "accepted" && new Date(trial.starts_at) <= new Date();

  return (
    <div className="space-y-5">
      <PageHeader
        title="Próbanap értékelése"
        subtitle={`${person?.full_name || "Jelölt"} · ${trial.applications.jobs?.title ?? ""}`}
        back={`/munkaltato/jelentkezes/${trial.application_id}`}
      />
      <p className="rounded-2xl bg-soft px-4 py-3 text-sm">
        {formatDateTime(trial.starts_at)} · {formatDuration(trial.duration_minutes)}
      </p>
      {ready ? (
        <>
          <p className="text-sm text-muted">
            Pontozd 1–5-ig ugyanazokat a kompetenciákat, amelyeket az állás megkövetel. A legalább 4-es pontot kapottak automatikusan „igazolt
            (próbanap)” státuszt kapnak a jelölt profilján. Az értékelést csak te látod.
          </p>
          <EvaluationForm trialId={trial.id} applicationId={trial.application_id} competencies={competencies} />
        </>
      ) : (
        <p className="rounded-2xl bg-amber-100 px-4 py-3 text-sm text-amber-800">
          {trial.status === "completed"
            ? "Ezt a próbanapot már értékelted."
            : trial.status === "accepted"
              ? "A próbanap még nem kezdődött el – utána tudod értékelni."
              : "Csak elfogadott próbanap értékelhető."}
        </p>
      )}
    </div>
  );
}
