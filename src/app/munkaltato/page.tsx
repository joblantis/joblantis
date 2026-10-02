import Link from "next/link";
import type { Metadata } from "next";
import { requireEmployerCompany } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/Card";
import { ButtonLink } from "@/components/ui/Button";
import { IconBriefcase, IconPin, IconPlus } from "@/components/ui/Icons";

export const metadata: Metadata = { title: "Munkáltatói áttekintés" };

export default async function EmployerHome() {
  const { company } = await requireEmployerCompany("/munkaltato");
  const supabase = await createClient();
  const [venues, active, drafts] = await Promise.all([
    supabase.from("venues").select("id", { count: "exact", head: true }).eq("company_id", company.id),
    supabase.from("jobs").select("id", { count: "exact", head: true }).eq("company_id", company.id).eq("status", "active"),
    supabase.from("jobs").select("id", { count: "exact", head: true }).eq("company_id", company.id).eq("status", "draft"),
  ]);
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

      <Card className="bg-soft">
        <p className="font-semibold">Hamarosan</p>
        <p className="mt-1 text-sm text-muted">
          Jelöltkártyák illeszkedési pontszámmal és indoklással, kanban pipeline, chat és próbanap – a következő fázisokban érkeznek.
        </p>
      </Card>
    </div>
  );
}
