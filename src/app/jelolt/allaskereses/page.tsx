import Link from "next/link";
import type { Metadata } from "next";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { coverUrls, fetchPublicJobsByIds, sortedPhotos } from "@/lib/jobs";
import { parseMatch } from "@/lib/match";
import { PageHeader } from "@/components/ui/PageHeader";
import { ButtonLink } from "@/components/ui/Button";
import { Select } from "@/components/ui/Field";
import { JobSwipe, type JobSwipeCard } from "./JobSwipe";

export const metadata: Metadata = { title: "Álláskeresés" };

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function JobSearchPage(props: PageProps<"/jelolt/allaskereses">) {
  const user = await requireRole(["candidate"], "/jelolt/allaskereses");
  const sp = await props.searchParams;
  const supabase = await createClient();

  const [{ data: profile }, { data: templates }] = await Promise.all([
    supabase.from("candidate_profiles").select("onboarding_step, travel_km, settlement_id").eq("user_id", user.id).single(),
    supabase.from("job_role_templates").select("id, slug, name").eq("is_active", true).order("sort_order"),
  ]);

  if (profile?.onboarding_step !== "done") {
    return (
      <div className="space-y-4">
        <PageHeader title="Álláskeresés" />
        <div className="space-y-3 rounded-3xl bg-soft p-6 text-center">
          <p className="font-semibold">Előbb építsd fel a profilod</p>
          <p className="text-sm text-muted">A kártyákból tudjuk, mi megy neked – ebből rangsoroljuk az állásokat.</p>
          <ButtonLink href="/jelolt" className="w-full">
            Profil folytatása
          </ButtonLink>
        </div>
      </div>
    );
  }

  const template = templates?.find((t) => t.slug === one(sp.munkakor));
  const km = Number(one(sp.tav)) || null;
  const { data: feed, error } = await supabase.rpc("candidate_job_feed", {
    p_template_id: template?.id,
    p_max_km: km ?? undefined,
    p_limit: 40,
  });
  const rows = (feed ?? []).filter((r) => r.job_id);
  const jobs = await fetchPublicJobsByIds(supabase, rows.map((r) => r.job_id!));
  const covers = await coverUrls(jobs);
  const byId = new Map(rows.map((r) => [r.job_id!, r]));

  const cards: JobSwipeCard[] = jobs.flatMap((job) => {
    const match = parseMatch(byId.get(job.id)?.details);
    if (!match) return [];
    const cover = sortedPhotos(job)[0];
    return [
      {
        id: job.id,
        slug: job.slug,
        title: job.title,
        company: job.companies?.name ?? "",
        venue: job.venues?.name ?? "",
        place: job.venues?.settlements?.name ?? "",
        role: job.job_role_templates?.name ?? "",
        seasonal: job.is_seasonal,
        wageMin: job.wage_min,
        wageMax: job.wage_max,
        wagePeriod: job.wage_period,
        shifts: job.shifts,
        coverUrl: cover ? (covers.get(cover.path) ?? null) : null,
        match,
      },
    ];
  });

  const defaultKm = Math.max(profile.travel_km ?? 20, 5) * 2;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Álláskeresés"
        subtitle="Illeszkedés szerint rangsorolva"
        action={
          <Link href="/allasok" className="rounded-full px-3 py-2 text-sm font-semibold text-brand hover:bg-soft">
            Lista
          </Link>
        }
      />
      <form method="get" className="flex gap-2">
        <div className="min-w-0 flex-1">
        <Select name="munkakor" defaultValue={template?.slug ?? ""} aria-label="Munkakör">
          <option value="">Keresett munkaköreim</option>
          {templates?.map((t) => (
            <option key={t.slug} value={t.slug}>
              {t.name}
            </option>
          ))}
        </Select>
        </div>
        <div className="w-28 shrink-0">
        <Select name="tav" defaultValue={km ? String(km) : ""} aria-label="Távolság">
          <option value="">{defaultKm} km</option>
          {[10, 20, 50, 100, 300].map((n) => (
            <option key={n} value={n}>
              {n} km
            </option>
          ))}
        </Select>
        </div>
        <button type="submit" className="rounded-2xl bg-brand px-4 font-semibold text-white">
          OK
        </button>
      </form>
      {!profile.settlement_id && (
        <p className="rounded-2xl bg-amber-100 px-4 py-3 text-sm text-amber-800">
          Add meg a lakhelyed az <Link href="/jelolt/alapadatok" className="font-semibold underline">alapadatoknál</Link>, hogy távolság szerint is rangsoroljunk.
        </p>
      )}
      {error && <p className="text-sm text-danger">Az állások betöltése nem sikerült.</p>}
      <JobSwipe cards={cards} />
    </div>
  );
}
