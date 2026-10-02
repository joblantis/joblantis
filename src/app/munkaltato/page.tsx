import Link from "next/link";
import type { Metadata } from "next";
import { requireEmployerCompany } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/Card";
import { ButtonLink } from "@/components/ui/Button";
import { IconBriefcase, IconPin, IconPlus } from "@/components/ui/Icons";
import { NotificationList } from "@/components/notifications/NotificationList";

export const metadata: Metadata = { title: "Munkáltatói áttekintés" };

export default async function EmployerHome() {
  const { user, company } = await requireEmployerCompany("/munkaltato");
  const supabase = await createClient();
  const [venues, active, drafts, { data: pending }, { data: notifications }] = await Promise.all([
    supabase.from("venues").select("id", { count: "exact", head: true }).eq("company_id", company.id),
    supabase.from("jobs").select("id", { count: "exact", head: true }).eq("company_id", company.id).eq("status", "active"),
    supabase.from("jobs").select("id", { count: "exact", head: true }).eq("company_id", company.id).eq("status", "draft"),
    supabase
      .from("applications")
      .select("id, response_due_at, jobs!inner(id, title, company_id)")
      .eq("status", "new")
      .eq("jobs.company_id", company.id)
      .order("response_due_at"),
    supabase.from("notifications").select("id, title, body, link, created_at, read_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(8),
  ]);
  // állásonként a válaszra váró jelentkezések (nincs ghosting: 5 napon belül válasz)
  const waiting = new Map<string, { title: string; count: number; due: string }>();
  for (const a of pending ?? []) {
    const w = waiting.get(a.jobs.id);
    waiting.set(a.jobs.id, { title: a.jobs.title, count: (w?.count ?? 0) + 1, due: w?.due ?? a.response_due_at });
  }
  const venueCount = venues.count ?? 0;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold text-muted">Munkáltatói felület</p>
        <h1 className="text-2xl font-bold">{company.name}</h1>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          ["Aktív állás", active.count ?? 0, "/munkaltato/allasok"],
          ["Vázlat", drafts.count ?? 0, "/munkaltato/allasok"],
          ["Helyszín", venueCount, "/munkaltato/helyszinek"],
        ].map(([label, value, href]) => (
          <Link key={label as string} href={href as string} className="rounded-3xl bg-soft p-4">
            <p className="text-2xl font-bold text-brand">{value}</p>
            <p className="text-sm text-muted">{label}</p>
          </Link>
        ))}
      </div>

      {venueCount === 0 ? (
        <Card className="space-y-3">
          <div className="flex items-center gap-3">
            <IconPin className="size-6 text-brand" />
            <p className="font-semibold">Első lépés: add meg a helyszínt</p>
          </div>
          <p className="text-sm text-muted">Az álláshoz tartozik egy helyszín (irányítószámmal), ebből számoljuk a jelöltek távolságát.</p>
          <ButtonLink href="/munkaltato/helyszinek/uj" className="w-full">
            <IconPlus className="size-5" /> Helyszín hozzáadása
          </ButtonLink>
        </Card>
      ) : (
        <Card className="space-y-3">
          <div className="flex items-center gap-3">
            <IconBriefcase className="size-6 text-brand" />
            <p className="font-semibold">Új állás sablonból</p>
          </div>
          <p className="text-sm text-muted">Válassz munkakört, és előre kitöltjük a szükséges kompetenciákat.</p>
          <ButtonLink href="/munkaltato/allasok/uj" className="w-full">
            <IconPlus className="size-5" /> Állás feladása
          </ButtonLink>
        </Card>
      )}

      {waiting.size > 0 && (
        <section className="space-y-2">
          <h2 className="text-lg font-bold">Válaszra váró jelöltek</h2>
          <ul className="space-y-2">
            {[...waiting].map(([jobId, w]) => (
              <li key={jobId}>
                <Link href={`/munkaltato/allasok/${jobId}/jeloltek`} className="flex items-center justify-between gap-3 rounded-2xl border border-line px-4 py-3 hover:border-brand">
                  <span className="min-w-0">
                    <span className="block truncate font-semibold">{w.title}</span>
                    <span className="text-xs text-muted">Legkésőbb válaszolj: {new Intl.DateTimeFormat("hu-HU", { month: "long", day: "numeric" }).format(new Date(w.due))}</span>
                  </span>
                  <span className="rounded-full bg-brand px-3 py-1 text-sm font-bold text-white">{w.count}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <NotificationList items={notifications ?? []} />
    </div>
  );
}
