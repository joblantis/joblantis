import type { Metadata } from "next";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/PageHeader";
import { Input } from "@/components/ui/Field";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { AdminNotice, AdminTabs } from "@/components/admin/AdminNotice";
import { saveCompetency } from "../actions";

export const metadata: Metadata = { title: "Admin – kompetenciák" };

function CompetencyFields({ c }: { c?: { id: number; name: string; category: string; description: string | null; has_language_level: boolean } }) {
  return (
    <>
      {c && <input type="hidden" name="id" value={c.id} />}
      <Input name="name" defaultValue={c?.name} placeholder="Név" required maxLength={120} aria-label="Név" />
      <div className="flex gap-2">
        <Input name="category" defaultValue={c?.category ?? "szakmai"} placeholder="Kategória" aria-label="Kategória" className="flex-1" />
        <label className="flex shrink-0 items-center gap-2 px-2 text-sm">
          <input type="checkbox" name="has_language_level" defaultChecked={c?.has_language_level} className="size-5 accent-[#001AA6]" />
          nyelvi szint
        </label>
      </div>
      <Input name="description" defaultValue={c?.description ?? ""} placeholder="Leírás (nem kötelező)" aria-label="Leírás" />
    </>
  );
}

export default async function CompetenciesAdmin(props: PageProps<"/admin/kompetenciak">) {
  await requireRole(["admin"], "/admin/kompetenciak");
  const sp = await props.searchParams;
  const supabase = await createClient();
  const { data: comps } = await supabase.from("competencies").select("id, name, category, description, has_language_level").order("category").order("name");

  return (
    <div className="space-y-4">
      <PageHeader title="Kompetenciák" subtitle="Konkrét, ellenőrizhető tudás – ezekre épülnek a kártyák, az állások és az igazolások." />
      <AdminTabs active="/admin/kompetenciak" />
      <AdminNotice ok={sp.ok} error={sp.hiba} />
      <details className="rounded-3xl border border-brand/30 p-4">
        <summary className="cursor-pointer font-semibold text-brand">+ Új kompetencia</summary>
        <form action={saveCompetency} className="mt-3 space-y-2">
          <CompetencyFields />
          <SubmitButton className="w-full">Létrehozás</SubmitButton>
        </form>
      </details>
      <ul className="space-y-2">
        {comps?.map((c) => (
          <li key={c.id}>
            <details className="rounded-2xl border border-line px-4 py-3">
              <summary className="cursor-pointer">
                <span className="font-medium">{c.name}</span> <span className="text-xs text-muted">· {c.category}</span>
              </summary>
              <form action={saveCompetency} className="mt-3 space-y-2">
                <CompetencyFields c={c} />
                <SubmitButton className="w-full">Mentés</SubmitButton>
              </form>
            </details>
          </li>
        ))}
      </ul>
    </div>
  );
}
