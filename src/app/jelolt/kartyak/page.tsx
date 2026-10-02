import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CardDeck, type DeckCard } from "./CardDeck";
import { PageHeader } from "@/components/ui/PageHeader";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Kártyák" };

export default async function CardsPage(props: PageProps<"/jelolt/kartyak">) {
  const user = await requireRole(["candidate"], "/jelolt/kartyak");
  const { ujra } = await props.searchParams;
  const supabase = await createClient();

  const { data: roles } = await supabase
    .from("candidate_target_roles")
    .select("template_id, job_role_templates(name, sort_order)")
    .eq("candidate_id", user.id);
  if (!roles?.length) redirect("/jelolt/munkakorok");
  const templateIds = roles.map((r) => r.template_id);

  const [{ data: cards }, { data: answers }] = await Promise.all([
    supabase
      .from("swipe_cards")
      .select("id, template_id, kind, statement, competency_id, sort_order, job_role_templates(name, sort_order)")
      .eq("is_active", true)
      .or(`template_id.in.(${templateIds.join(",")}),kind.eq.work_style`)
      .order("sort_order"),
    supabase.from("candidate_swipe_answers").select("card_id").eq("candidate_id", user.id),
  ]);
  const answered = new Set((answers ?? []).map((a) => a.card_id));

  // azonos állítás több munkakörben: egy kártyaként jelenik meg
  const skill = new Map<string, DeckCard & { order: number }>();
  const style: DeckCard[] = [];
  for (const c of cards ?? []) {
    if (c.kind === "work_style") {
      if (ujra || !answered.has(c.id)) style.push({ key: `w${c.id}`, ids: [c.id], statement: c.statement, label: "Munkastílus" });
      continue;
    }
    const key = `${c.competency_id}|${c.statement}`;
    const existing = skill.get(key);
    if (existing) {
      existing.ids.push(c.id);
      continue;
    }
    skill.set(key, {
      key,
      ids: [c.id],
      statement: c.statement,
      label: c.job_role_templates?.name ?? "",
      order: (c.job_role_templates?.sort_order ?? 0) * 1000 + c.sort_order,
    });
  }
  const skillCards = [...skill.values()]
    .filter((c) => ujra || c.ids.some((id) => !answered.has(id)))
    .sort((a, b) => a.order - b.order)
    .map((c) => ({ key: c.key, ids: c.ids, statement: c.statement, label: c.label }));

  return (
    <div>
      <PageHeader title="Mi megy neked?" subtitle={`${skillCards.length} szakmai és ${style.length} munkastílus-kártya`} back="/jelolt" />
      <CardDeck skillCards={skillCards} styleCards={style} />
    </div>
  );
}
