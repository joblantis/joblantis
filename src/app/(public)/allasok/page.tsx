import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import { coverUrls, fetchPublicJobsByIds } from "@/lib/jobs";
import { JobCard } from "@/components/jobs/JobCard";
import { JobFilters } from "@/components/jobs/JobFilters";
import { PageHeader } from "@/components/ui/PageHeader";

export const metadata: Metadata = {
  title: "Vendéglátós és szállodai állások",
  description: "Szakács, pincér, pultos, barista, recepciós és további vendéglátós állások – szűrhetően, távolság szerint.",
  alternates: { canonical: "/allasok" },
};

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function JobsPage(props: PageProps<"/allasok">) {
  const sp = await props.searchParams;
  if (!isSupabaseConfigured) {
    return <p className="rounded-3xl bg-soft p-6 text-muted">Az adatbázis-kapcsolat még nincs beállítva.</p>;
  }
  const supabase = await createClient();

  const munkakor = one(sp.munkakor);
  const helyId = Number(one(sp.hely_id)) || null;
  const tav = Number(one(sp.tav)) || null;
  const ber = Number(one(sp.ber)) || null;
  const berTipus = one(sp.ber_tipus) === "hourly" ? "hourly" : "monthly";
  const szezonalis = one(sp.szezonalis);
  const page = Math.max(1, Number(one(sp.oldal)) || 1);
  const PAGE_SIZE = 20;

  const [{ data: templates }, { data: hely }] = await Promise.all([
    supabase.from("job_role_templates").select("id, slug, name").eq("is_active", true).order("sort_order"),
    helyId
      ? supabase.from("settlements").select("id, postal_code, name, county, lat, lng").eq("id", helyId).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);
  const template = templates?.find((t) => t.slug === munkakor);

  const { data: hits } = await supabase.rpc("search_public_jobs", {
    p_template_id: template?.id,
    p_lat: hely?.lat,
    p_lng: hely?.lng,
    p_max_km: tav ?? undefined,
    p_wage_period: ber ? berTipus : undefined,
    p_wage_min: ber ?? undefined,
    p_seasonal: szezonalis === "igen" ? true : szezonalis === "nem" ? false : undefined,
    p_limit: PAGE_SIZE + 1,
    p_offset: (page - 1) * PAGE_SIZE,
  });
  const rows = (hits ?? []).filter((h): h is { job_id: string; distance_km: number | null } => !!h.job_id);
  const hasMore = rows.length > PAGE_SIZE;
  const visible = rows.slice(0, PAGE_SIZE);
  const distances = new Map(visible.map((h) => [h.job_id, h.distance_km]));
  const jobs = await fetchPublicJobsByIds(supabase, visible.map((h) => h.job_id));
  const covers = await coverUrls(jobs);

  const activeCount = [template, hely, tav, ber, szezonalis].filter(Boolean).length;
  const nextParams = new URLSearchParams(Object.entries(sp).flatMap(([k, v]) => (typeof v === "string" ? [[k, v]] : [])));
  nextParams.set("oldal", String(page + 1));

  return (
    <div className="space-y-4">
      <PageHeader title={template ? `${template.name} állások` : "Állások"} subtitle="Vendéglátás és szálloda – regisztráció nélkül böngészhető." />
      <JobFilters
        templates={templates ?? []}
        activeCount={activeCount}
        values={{
          munkakor: template?.slug,
          hely: hely ? { id: hely.id, postal_code: hely.postal_code, name: hely.name, county: hely.county } : null,
          tav: tav ? String(tav) : undefined,
          ber: ber ? String(ber) : undefined,
          ber_tipus: berTipus,
          szezonalis,
        }}
      />
      {jobs.length === 0 ? (
        <p className="rounded-3xl bg-soft p-6 text-center text-muted">Nincs a szűrésnek megfelelő állás. Próbálj tágabb szűrést!</p>
      ) : (
        <ul className="space-y-4">
          {jobs.map((job) => {
            const cover = job.venues?.venue_photos?.slice().sort((a, b) => a.sort_order - b.sort_order)[0];
            return (
              <li key={job.id}>
                <JobCard job={job} coverUrl={cover ? covers.get(cover.path) : undefined} distanceKm={distances.get(job.id)} />
              </li>
            );
          })}
        </ul>
      )}
      {hasMore && (
        <a href={`/allasok?${nextParams.toString()}`} className="block rounded-2xl border border-line py-3 text-center font-semibold text-brand">
          További állások
        </a>
      )}
    </div>
  );
}
