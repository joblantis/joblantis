import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireEmployerCompany } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { loadApplicants } from "@/lib/employer/applicants";
import { PageHeader } from "@/components/ui/PageHeader";
import { ApplicantSwipe } from "./ApplicantSwipe";

export const metadata: Metadata = { title: "Jelöltek" };

export default async function ApplicantsPage(props: PageProps<"/munkaltato/allasok/[id]/jeloltek">) {
  const { id } = await props.params;
  const { company } = await requireEmployerCompany(`/munkaltato/allasok/${id}/jeloltek`);
  const supabase = await createClient();
  const { data: job } = await supabase.from("jobs").select("id, title").eq("id", id).eq("company_id", company.id).maybeSingle();
  if (!job) notFound();
  const cards = await loadApplicants(supabase, job.id, ["new"]);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Új jelöltek"
        subtitle={job.title}
        back={`/munkaltato/allasok/${job.id}`}
        action={
          <Link href={`/munkaltato/allasok/${job.id}/pipeline`} className="rounded-full px-3 py-2 text-sm font-semibold text-brand hover:bg-soft">
            Pipeline
          </Link>
        }
      />
      <ApplicantSwipe jobId={job.id} cards={cards} />
    </div>
  );
}
