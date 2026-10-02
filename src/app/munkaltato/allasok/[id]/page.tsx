import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireEmployerCompany } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { JobForm } from "../JobForm";
import { JobStatusActions } from "../JobStatusActions";
import { loadJobFormData } from "../data";
import { JOB_STATUS_LABELS, budapestDatePlus } from "@/lib/format";

export const metadata: Metadata = { title: "Állás szerkesztése" };

export default async function EditJobPage(props: PageProps<"/munkaltato/allasok/[id]">) {
  const { id } = await props.params;
  const { mentve } = await props.searchParams;
  const { company } = await requireEmployerCompany(`/munkaltato/allasok/${id}`);
  const supabase = await createClient();
  const { data: job } = await supabase
    .from("jobs")
    .select("*, job_requirements(competency_id, kind)")
    .eq("id", id)
    .eq("company_id", company.id)
    .maybeSingle();
  if (!job) notFound();

  const [data, { data: apps }] = await Promise.all([
    loadJobFormData(company.id, job.template_id),
    supabase.from("applications").select("status").eq("job_id", job.id),
  ]);
  const newCount = (apps ?? []).filter((a) => a.status === "new").length;
  if (!data.template) notFound();
  const expired = !!job.expires_at && new Date(job.expires_at) <= new Date();
  const shownStatus = job.status === "active" && expired ? "expired" : job.status;

  // a sablon kompetenciái + a hirdetésben szereplő továbbiak
  const reqMap = new Map(job.job_requirements.map((r) => [r.competency_id, r.kind]));
  const ordered = [
    ...data.templateRequirements.map((t) => ({ competency_id: t.competency_id, kind: reqMap.get(t.competency_id) ?? ("none" as const) })),
    ...job.job_requirements.filter((r) => !data.templateRequirements.some((t) => t.competency_id === r.competency_id)),
  ];
  const expiresOn = job.expires_at && !expired
    ? new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Budapest" }).format(new Date(job.expires_at))
    : budapestDatePlus(30);

  return (
    <div className="space-y-6">
      <PageHeader title={job.title} back="/munkaltato/allasok" action={<Badge tone={shownStatus === "active" ? "success" : "neutral"}>{JOB_STATUS_LABELS[shownStatus]}</Badge>} />
      {mentve && (
        <p role="status" className="rounded-2xl bg-success/10 px-4 py-3 text-sm font-medium text-success">
          {mentve === "publish" ? "Elmentve és közzétéve." : "Vázlatként elmentve."}
        </p>
      )}
      {shownStatus === "active" && (
        <Link href={`/allasok/${job.slug}`} className="block rounded-2xl bg-soft px-4 py-3 text-sm font-semibold text-brand">
          Nyilvános oldal megnyitása →
        </Link>
      )}
      <div className="grid grid-cols-2 gap-3">
        <Link href={`/munkaltato/allasok/${job.id}/jeloltek`} className="rounded-3xl bg-brand p-4 text-white">
          <p className="text-2xl font-bold">{newCount}</p>
          <p className="text-sm text-white/80">új jelölt – kártyák</p>
        </Link>
        <Link href={`/munkaltato/allasok/${job.id}/pipeline`} className="rounded-3xl bg-soft p-4">
          <p className="text-2xl font-bold text-brand">{apps?.length ?? 0}</p>
          <p className="text-sm text-muted">jelentkező – pipeline</p>
        </Link>
      </div>
      <JobStatusActions jobId={job.id} status={job.status} expired={expired} />
      <JobForm
        template={{ id: data.template.id, name: data.template.name }}
        venues={data.venues}
        competencies={data.competencies}
        initialRequirements={ordered}
        values={{
          id: job.id,
          title: job.title,
          venue_id: job.venue_id,
          description: job.description ?? "",
          wage_min: job.wage_min,
          wage_max: job.wage_max,
          wage_period: job.wage_period,
          shifts: job.shifts,
          schedule_note: job.schedule_note ?? "",
          start_date: job.start_date ?? "",
          is_seasonal: job.is_seasonal,
          expires_on: expiresOn,
          status: shownStatus,
        }}
      />
    </div>
  );
}
