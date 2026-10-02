import type { Metadata } from "next";
import { RolePicker } from "./RolePicker";
import { PageHeader } from "@/components/ui/PageHeader";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Munkakörök" };

export default async function RolesPage() {
  const user = await requireRole(["candidate"], "/jelolt/munkakorok");
  const supabase = await createClient();
  const [{ data: templates }, { data: mine }] = await Promise.all([
    supabase.from("job_role_templates").select("id, name, description").eq("is_active", true).order("sort_order"),
    supabase.from("candidate_target_roles").select("template_id").eq("candidate_id", user.id),
  ]);
  return (
    <div>
      <PageHeader title="Milyen munkát keresel?" subtitle="Válassz egy vagy több munkakört. Ezekhez kapsz szakmai kártyákat." back="/jelolt" />
      <RolePicker templates={templates ?? []} selected={(mine ?? []).map((m) => m.template_id)} />
    </div>
  );
}
