import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/PageHeader";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/Field";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { AdminNotice, AdminTabs } from "@/components/admin/AdminNotice";
import { saveTemplate, saveWorkStyleTargets, setTemplateCompetency } from "../../actions";

export const metadata: Metadata = { title: "Admin – sablon" };

export default async function TemplateAdmin(props: PageProps<"/admin/sablonok/[id]">) {
  const { id } = await props.params;
  await requireRole(["admin"], `/admin/sablonok/${id}`);
  const sp = await props.searchParams;
  const supabase = await createClient();
  const [{ data: t }, { data: comps }, { data: tc }, { data: dims }, { data: targets }, { count: cardCount }] = await Promise.all([
    supabase.from("job_role_templates").select("*").eq("id", Number(id)).maybeSingle(),
    supabase.from("competencies").select("id, name, category").order("category").order("name"),
    supabase.from("template_competencies").select("competency_id, default_requirement, sort_order").eq("template_id", Number(id)).order("sort_order"),
    supabase.from("work_style_dimensions").select("id, name, low_label, high_label").order("sort_order"),
    supabase.from("template_work_styles").select("dimension_id, target").eq("template_id", Number(id)),
    supabase.from("swipe_cards").select("id", { count: "exact", head: true }).eq("template_id", Number(id)),
  ]);
  if (!t) notFound();
  const compName = new Map((comps ?? []).map((c) => [c.id, c.name]));
  const inTemplate = new Set((tc ?? []).map((r) => r.competency_id));
  const target = new Map((targets ?? []).map((r) => [r.dimension_id, r.target]));

  return (
    <div className="space-y-6">
      <PageHeader title={t.name} back="/admin/sablonok" />
      <AdminTabs active="/admin/sablonok" />
      <AdminNotice ok={sp.ok} error={sp.hiba} />

      <form action={saveTemplate} className="space-y-3 rounded-3xl border border-line p-4">
        <input type="hidden" name="id" value={t.id} />
        <Field label="Név" htmlFor="name">
          <Input id="name" name="name" defaultValue={t.name} required maxLength={80} />
        </Field>
        <Field label="Leírás" htmlFor="description">
          <Textarea id="description" name="description" defaultValue={t.description ?? ""} maxLength={500} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Sorrend" htmlFor="sort_order">
            <Input id="sort_order" name="sort_order" type="number" defaultValue={t.sort_order} />
          </Field>
          <div className="pt-7">
            <Checkbox name="is_active" defaultChecked={t.is_active} label="Aktív" />
          </div>
        </div>
        <SubmitButton className="w-full">Mentés</SubmitButton>
      </form>

      <section className="space-y-3">
        <div className="flex items-baseline justify-between">
          <h2 className="text-lg font-bold">Kompetenciák</h2>
          <Link href={`/admin/kartyak?sablon=${t.slug}`} className="text-sm font-semibold text-brand">
            {cardCount ?? 0} swipe kártya →
          </Link>
        </div>
        <p className="text-sm text-muted">Állásfeladáskor ezek kerülnek előre kitöltve kötelezőként vagy előnyként. Ajánlott: 6–10 db.</p>
        <ul className="divide-y divide-line rounded-3xl border border-line">
          {tc?.map((r) => (
            <li key={r.competency_id} className="flex items-center gap-2 px-4 py-2">
              <span className="min-w-0 flex-1 truncate text-sm font-medium">{compName.get(r.competency_id)}</span>
              <form action={setTemplateCompetency} className="flex items-center gap-1">
                <input type="hidden" name="template_id" value={t.id} />
                <input type="hidden" name="competency_id" value={r.competency_id} />
                <input type="hidden" name="sort_order" value={r.sort_order} />
                <select name="kind" defaultValue={r.default_requirement} className="min-h-10 rounded-xl border border-line px-2 text-sm" aria-label="Típus">
                  <option value="required">kötelező</option>
                  <option value="preferred">előny</option>
                  <option value="remove">✕ eltávolítás</option>
                </select>
                <button type="submit" className="min-h-10 rounded-xl bg-soft px-3 text-sm font-semibold">
                  OK
                </button>
              </form>
            </li>
          ))}
        </ul>
        <form action={setTemplateCompetency} className="flex gap-2">
          <input type="hidden" name="template_id" value={t.id} />
          <div className="min-w-0 flex-1">
            <Select name="competency_id" required aria-label="Kompetencia">
              {comps
                ?.filter((c) => !inTemplate.has(c.id))
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.category})
                  </option>
                ))}
            </Select>
          </div>
          <div className="w-32 shrink-0">
            <Select name="kind" defaultValue="preferred" aria-label="Típus">
              <option value="required">kötelező</option>
              <option value="preferred">előny</option>
            </Select>
          </div>
          <SubmitButton className="shrink-0">+</SubmitButton>
        </form>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-bold">Munkastílus-célprofil</h2>
        <p className="text-sm text-muted">0–100 dimenziónként. Ehhez mérjük a jelölt munkastílusát (legfeljebb 15 pont a rangsorban).</p>
        <form action={saveWorkStyleTargets} className="space-y-4 rounded-3xl border border-line p-4">
          <input type="hidden" name="template_id" value={t.id} />
          {dims?.map((d) => (
            <div key={d.id} className="space-y-1">
              <label htmlFor={`target_${d.id}`} className="block text-sm font-semibold">
                {d.name}
              </label>
              <div className="flex items-center gap-3">
                <span className="w-24 shrink-0 text-xs text-muted">{d.low_label}</span>
                <input id={`target_${d.id}`} name={`target_${d.id}`} type="number" min={0} max={100} defaultValue={target.get(d.id) ?? 50} className="min-h-10 w-20 rounded-xl border border-line px-2 text-center" />
                <span className="text-xs text-muted">{d.high_label}</span>
              </div>
            </div>
          ))}
          <SubmitButton className="w-full">Célprofil mentése</SubmitButton>
        </form>
      </section>
    </div>
  );
}
