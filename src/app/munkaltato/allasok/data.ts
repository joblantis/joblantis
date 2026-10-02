import "server-only";
import { createClient } from "@/lib/supabase/server";

export async function loadJobFormData(companyId: string, templateId: number) {
  const supabase = await createClient();
  const [template, venues, competencies, templateComps] = await Promise.all([
    supabase.from("job_role_templates").select("id, name, slug").eq("id", templateId).maybeSingle(),
    supabase.from("venues").select("id, name").eq("company_id", companyId).order("name"),
    supabase.from("competencies").select("id, name, category").order("category").order("name"),
    supabase.from("template_competencies").select("competency_id, default_requirement").eq("template_id", templateId).order("sort_order"),
  ]);
  return {
    template: template.data,
    venues: venues.data ?? [],
    competencies: competencies.data ?? [],
    templateRequirements: (templateComps.data ?? []).map((t) => ({ competency_id: t.competency_id, kind: t.default_requirement })),
  };
}
