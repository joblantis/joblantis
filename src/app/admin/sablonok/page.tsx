import Link from "next/link";
import type { Metadata } from "next";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Field";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { AdminNotice, AdminTabs } from "@/components/admin/AdminNotice";
import { createTemplate } from "../actions";

export const metadata: Metadata = { title: "Admin – sablonok" };

export default async function TemplatesAdmin(props: PageProps<"/admin/sablonok">) {
  await requireRole(["admin"], "/admin/sablonok");
  const sp = await props.searchParams;
  const supabase = await createClient();
  const { data: templates } = await supabase
    .from("job_role_templates")
    .select("id, name, slug, is_active, sort_order, template_competencies(count), swipe_cards(count)")
    .order("sort_order");

  return (
    <div className="space-y-4">
      <PageHeader title="Munkakör-sablonok" />
      <AdminTabs active="/admin/sablonok" />
      <AdminNotice ok={sp.ok} error={sp.hiba} />
      <ul className="divide-y divide-line rounded-3xl border border-line">
        {templates?.map((t) => (
          <li key={t.id}>
            <Link href={`/admin/sablonok/${t.id}`} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-soft">
              <span>
                <span className="font-semibold">{t.name}</span>
                <span className="block text-xs text-muted">
                  {t.template_competencies[0]?.count ?? 0} kompetencia · {t.swipe_cards[0]?.count ?? 0} kártya
                </span>
              </span>
              {!t.is_active && <Badge>inaktív</Badge>}
            </Link>
          </li>
        ))}
      </ul>
      <form action={createTemplate} className="flex gap-2">
        <Input name="name" placeholder="Új munkakör neve" required maxLength={80} />
        <SubmitButton className="shrink-0">Létrehozás</SubmitButton>
      </form>
    </div>
  );
}
