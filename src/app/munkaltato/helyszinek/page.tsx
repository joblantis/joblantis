import Link from "next/link";
import type { Metadata } from "next";
import { requireEmployerCompany } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/PageHeader";
import { ButtonLink } from "@/components/ui/Button";
import { IconPin, IconPlus } from "@/components/ui/Icons";

export const metadata: Metadata = { title: "Helyszínek" };

export default async function VenuesPage() {
  const { company } = await requireEmployerCompany("/munkaltato/helyszinek");
  const supabase = await createClient();
  const { data: venues } = await supabase
    .from("venues")
    .select("id, name, address, postal_code, settlements(name), venue_photos(count), jobs(count)")
    .eq("company_id", company.id)
    .order("created_at");

  return (
    <div>
      <PageHeader
        title="Helyszínek"
        subtitle={company.name}
        action={
          <ButtonLink href="/munkaltato/helyszinek/uj" className="!min-h-11 !px-4" aria-label="Új helyszín">
            <IconPlus className="size-5" /> Új
          </ButtonLink>
        }
      />
      {!venues?.length ? (
        <p className="rounded-3xl bg-soft p-6 text-center text-muted">Még nincs helyszíned. Adj hozzá egyet!</p>
      ) : (
        <ul className="space-y-3">
          {venues.map((v) => (
            <li key={v.id}>
              <Link href={`/munkaltato/helyszinek/${v.id}`} className="flex items-center gap-4 rounded-3xl border border-line p-4 hover:border-brand">
                <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-brand/10 text-brand">
                  <IconPin className="size-6" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{v.name}</span>
                  <span className="block truncate text-sm text-muted">
                    {v.postal_code} {v.settlements?.name}
                    {v.address ? `, ${v.address}` : ""}
                  </span>
                  <span className="block text-xs text-muted">
                    {v.venue_photos[0]?.count ?? 0} fotó · {v.jobs[0]?.count ?? 0} állás
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
