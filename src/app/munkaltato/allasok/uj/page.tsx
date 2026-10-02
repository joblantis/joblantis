import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireEmployerCompany } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/PageHeader";
import { JobForm } from "../JobForm";
import { loadJobFormData } from "../data";
import { budapestDatePlus } from "@/lib/format";

export const metadata: Metadata = { title: "Új állás" };

export default async function NewJobPage(props: PageProps<"/munkaltato/allasok/uj">) {
  const { company } = await requireEmployerCompany("/munkaltato/allasok/uj");
  const { sablon } = await props.searchParams;
  const supabase = await createClient();

  const { count: venueCount } = await supabase.from("venues").select("id", { count: "exact", head: true }).eq("company_id", company.id);
  if (!venueCount) redirect("/munkaltato/helyszinek/uj");

  const { data: templates } = await supabase
    .from("job_role_templates")
    .select("id, slug, name, description, template_competencies(count)")
    .eq("is_active", true)
    .order("sort_order");
  const template = templates?.find((t) => t.slug === sablon);

  if (!template) {
    return (
      <div>
        <PageHeader title="Új állás" subtitle="Válassz munkakört – a kompetenciákat előre kitöltjük." back="/munkaltato/allasok" />
        <ul className="grid grid-cols-2 gap-3">
          {templates?.map((t) => (
            <li key={t.id}>
              <Link href={`/munkaltato/allasok/uj?sablon=${t.slug}`} className="flex h-full flex-col rounded-3xl border border-line p-4 hover:border-brand">
                <span className="font-semibold">{t.name}</span>
                <span className="mt-1 line-clamp-2 text-sm text-muted">{t.description}</span>
                <span className="mt-auto pt-2 text-xs font-semibold text-brand">{t.template_competencies[0]?.count ?? 0} kompetencia</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  const data = await loadJobFormData(company.id, template.id);
  return (
    <div>
      <PageHeader title={`Új állás: ${template.name}`} back="/munkaltato/allasok/uj" />
      <JobForm
        template={{ id: template.id, name: template.name }}
        venues={data.venues}
        competencies={data.competencies}
        initialRequirements={data.templateRequirements}
        values={{
          title: template.name,
          venue_id: data.venues.length === 1 ? data.venues[0].id : "",
          description: "",
          wage_min: null,
          wage_max: null,
          wage_period: "monthly",
          shifts: [],
          schedule_note: "",
          start_date: "",
          is_seasonal: false,
          expires_on: budapestDatePlus(30),
          status: "draft",
        }}
      />
    </div>
  );
}
