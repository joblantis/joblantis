import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireEmployerCompany } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { parseMatch } from "@/lib/match";
import { PageHeader } from "@/components/ui/PageHeader";
import { PipelineBoard, type PipelineItem } from "./PipelineBoard";

export const metadata: Metadata = { title: "Pipeline" };

export default async function PipelinePage(props: PageProps<"/munkaltato/allasok/[id]/pipeline">) {
  const { id } = await props.params;
  const { company } = await requireEmployerCompany(`/munkaltato/allasok/${id}/pipeline`);
  const supabase = await createClient();
  const { data: job } = await supabase.from("jobs").select("id, title").eq("id", id).eq("company_id", company.id).maybeSingle();
  if (!job) notFound();

  const { data: rows } = await supabase.rpc("job_applicants", { p_job_id: job.id });
  const ids = [...new Set((rows ?? []).map((r) => r.candidate_id).filter((x): x is string => !!x))];
  const [{ data: people }, { data: chats }] = await Promise.all([
    ids.length ? supabase.from("profiles").select("id, full_name").in("id", ids) : Promise.resolve({ data: [] as { id: string; full_name: string }[] }),
    supabase.rpc("my_conversations"),
  ]);
  const names = new Map((people ?? []).map((p) => [p.id, p.full_name]));
  const unread = new Map((chats ?? []).map((c) => [c.application_id, c.unread ?? 0]));

  const items: PipelineItem[] = (rows ?? []).flatMap((r) => {
    if (!r.application_id || !r.candidate_id || !r.status) return [];
    const m = parseMatch(r.details);
    return [
      {
        applicationId: r.application_id,
        name: names.get(r.candidate_id) || "Jelölt",
        status: r.status,
        score: m?.score ?? r.score ?? null,
        missingRequired: m?.missing_required ?? r.missing_required ?? 0,
        verified: m?.required_verified ?? 0,
        distanceKm: m?.distance_km ?? null,
        createdAt: r.created_at!,
        responseDueAt: r.response_due_at!,
        unread: unread.get(r.application_id) ?? 0,
      },
    ];
  });
  const newCount = items.filter((i) => i.status === "new").length;

  return (
    <div className="space-y-4">
      <PageHeader title="Pipeline" subtitle={job.title} back={`/munkaltato/allasok/${job.id}`} />
      {newCount > 0 && (
        <Link href={`/munkaltato/allasok/${job.id}/jeloltek`} className="block rounded-2xl bg-brand px-4 py-3 text-center font-semibold text-white">
          {newCount} új jelölt átnézése kártyákon
        </Link>
      )}
      <PipelineBoard items={items} />
    </div>
  );
}
