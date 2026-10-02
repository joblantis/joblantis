import type { Metadata } from "next";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Field";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { AdminNotice, AdminTabs } from "@/components/admin/AdminNotice";
import { saveSwipeCard } from "../actions";

export const metadata: Metadata = { title: "Admin – swipe kártyák" };

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
const SEL = "min-h-11 w-full rounded-xl border border-line bg-white px-2 text-sm";

export default async function CardsAdmin(props: PageProps<"/admin/kartyak">) {
  await requireRole(["admin"], "/admin/kartyak");
  const sp = await props.searchParams;
  const supabase = await createClient();
  const [{ data: templates }, { data: comps }, { data: dims }] = await Promise.all([
    supabase.from("job_role_templates").select("id, slug, name").order("sort_order"),
    supabase.from("competencies").select("id, name").order("name"),
    supabase.from("work_style_dimensions").select("id, name").order("sort_order"),
  ]);
  const sablon = one(sp.sablon) ?? templates?.[0]?.slug ?? "";
  const style = sablon === "stilus";
  const template = templates?.find((t) => t.slug === sablon);

  let query = supabase.from("swipe_cards").select("id, statement, competency_id, dimension_id, polarity, is_active, sort_order, template_id").order("sort_order").order("id");
  query = style ? query.eq("kind", "work_style") : query.eq("template_id", template?.id ?? -1);
  const { data: cards } = await query;
  const returnTo = `/admin/kartyak?sablon=${sablon}`;
  const active = cards?.filter((c) => c.is_active).length ?? 0;

  return (
    <div className="space-y-4">
      <PageHeader title="Swipe kártyák" subtitle="Munkakörönként kb. 15–20 állítás; mindegyik egy kompetenciához kötött." />
      <AdminTabs active="/admin/kartyak" />
      <AdminNotice ok={sp.ok} error={sp.hiba} />
      <nav className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1" aria-label="Munkakör">
        {[...(templates ?? []).map((t) => [t.slug, t.name]), ["stilus", "Munkastílus"]].map(([slug, name]) => (
          <a key={slug} href={`/admin/kartyak?sablon=${slug}`} className={`shrink-0 rounded-full px-3 py-1.5 text-sm font-semibold ${slug === sablon ? "bg-ink text-white" : "bg-soft"}`}>
            {name}
          </a>
        ))}
      </nav>
      <p className="text-sm text-muted">
        {active} aktív kártya{!style && (active < 15 || active > 20) ? " – ajánlott 15–20" : ""}
      </p>

      <ul className="space-y-2">
        {cards?.map((c) => (
          <li key={c.id}>
            <form action={saveSwipeCard} className={`space-y-2 rounded-2xl border p-3 ${c.is_active ? "border-line" : "border-dashed border-line opacity-70"}`}>
              <input type="hidden" name="id" value={c.id} />
              <input type="hidden" name="return_to" value={returnTo} />
              <input type="hidden" name="kind" value={style ? "work_style" : "competency"} />
              {!style && <input type="hidden" name="template_id" value={c.template_id ?? ""} />}
              <Input name="statement" defaultValue={c.statement} required minLength={5} maxLength={200} aria-label="Állítás" />
              <div className="flex flex-wrap items-center gap-2">
                <div className="min-w-0 flex-1">
                  {style ? (
                    <select name="dimension_id" defaultValue={c.dimension_id ?? ""} className={SEL} aria-label="Dimenzió">
                      {dims?.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <select name="competency_id" defaultValue={c.competency_id ?? ""} className={SEL} aria-label="Kompetencia">
                      {comps?.map((k) => (
                        <option key={k.id} value={k.id}>
                          {k.name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
                {style && (
                  <select name="polarity" defaultValue={String(c.polarity)} className="min-h-11 rounded-xl border border-line px-2 text-sm" aria-label="Irány">
                    <option value="1">egyenes</option>
                    <option value="-1">fordított</option>
                  </select>
                )}
                <input name="sort_order" type="number" defaultValue={c.sort_order} className="min-h-11 w-16 rounded-xl border border-line px-2 text-center text-sm" aria-label="Sorrend" />
                <label className="flex items-center gap-1.5 text-sm">
                  <input type="checkbox" name="is_active" defaultChecked={c.is_active} className="size-5 accent-[#001AA6]" /> aktív
                </label>
                {!c.is_active && <Badge>inaktív</Badge>}
                <SubmitButton className="!min-h-11 !px-4 text-sm">Mentés</SubmitButton>
              </div>
            </form>
          </li>
        ))}
      </ul>

      {(style || template) && (
        <form action={saveSwipeCard} className="space-y-2 rounded-3xl border border-brand/30 p-4">
          <p className="font-semibold text-brand">+ Új kártya {style ? "(munkastílus)" : `(${template?.name})`}</p>
          <input type="hidden" name="return_to" value={returnTo} />
          <input type="hidden" name="kind" value={style ? "work_style" : "competency"} />
          {!style && <input type="hidden" name="template_id" value={template?.id} />}
          <Input name="statement" placeholder={style ? "Pl. Stresszben is nyugodt maradok" : "Pl. Csúcsidőben egyedül vittem 8+ asztalt"} required minLength={5} maxLength={200} aria-label="Állítás" />
          {style ? (
            <div className="flex gap-2">
              <select name="dimension_id" className={SEL} aria-label="Dimenzió">
                {dims?.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
              <select name="polarity" className="min-h-11 rounded-xl border border-line px-2 text-sm" aria-label="Irány">
                <option value="1">egyenes</option>
                <option value="-1">fordított</option>
              </select>
            </div>
          ) : (
            <select name="competency_id" className={SEL} aria-label="Kompetencia">
              {comps?.map((k) => (
                <option key={k.id} value={k.id}>
                  {k.name}
                </option>
              ))}
            </select>
          )}
          <input type="hidden" name="sort_order" value={(cards?.length ?? 0) + 1} />
          <SubmitButton className="w-full">Kártya hozzáadása</SubmitButton>
        </form>
      )}
    </div>
  );
}
