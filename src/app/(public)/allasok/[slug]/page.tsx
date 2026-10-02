import { cache } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/auth";
import { PUBLIC_JOB_SELECT, coverUrls, sortedPhotos, type PublicJob } from "@/lib/jobs";
import { formatDate, formatShifts, formatWage, WAGE_PERIOD_LABELS } from "@/lib/format";
import { publicEnv } from "@/lib/env";
import { PageHeader } from "@/components/ui/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { LazyImage } from "@/components/ui/LazyImage";
import { IconCheck, IconClock, IconPin, IconSun, IconWallet } from "@/components/ui/Icons";

const getJob = cache(async (slug: string) => {
  const supabase = await createClient();
  const { data } = await supabase.from("jobs").select(PUBLIC_JOB_SELECT).eq("slug", slug).maybeSingle();
  return data as PublicJob | null;
});

function isPublic(job: PublicJob) {
  return job.status === "active" && !!job.expires_at && new Date(job.expires_at) > new Date();
}

export async function generateMetadata(props: PageProps<"/allasok/[slug]">): Promise<Metadata> {
  const { slug } = await props.params;
  const job = await getJob(slug);
  if (!job) return { title: "Az állás nem található" };
  const place = job.venues?.settlements?.name ?? "";
  const title = `${job.title} – ${job.companies?.name ?? ""}, ${place}`;
  const description = `${job.job_role_templates?.name} állás: ${formatWage(job.wage_min, job.wage_max, job.wage_period)}, ${formatShifts(job.shifts)}. ${place}.`;
  return {
    title,
    description,
    alternates: { canonical: `/allasok/${job.slug}` },
    robots: isPublic(job) ? undefined : { index: false },
    openGraph: { title, description, type: "website", url: `/allasok/${job.slug}` },
  };
}

function jobPostingJsonLd(job: PublicJob) {
  const salary =
    job.wage_min != null || job.wage_max != null
      ? {
          "@type": "MonetaryAmount",
          currency: "HUF",
          value: {
            "@type": "QuantitativeValue",
            ...(job.wage_min != null ? { minValue: job.wage_min } : {}),
            ...(job.wage_max != null ? { maxValue: job.wage_max } : {}),
            unitText: job.wage_period === "hourly" ? "HOUR" : "MONTH",
          },
        }
      : undefined;
  return {
    "@context": "https://schema.org",
    "@type": "JobPosting",
    title: job.title,
    description: job.description || `${job.job_role_templates?.name} állás – ${job.companies?.name}`,
    datePosted: job.published_at,
    validThrough: job.expires_at,
    employmentType: job.is_seasonal ? "TEMPORARY" : "FULL_TIME",
    hiringOrganization: { "@type": "Organization", name: job.companies?.name, ...(job.companies?.website ? { sameAs: job.companies.website } : {}) },
    jobLocation: {
      "@type": "Place",
      address: {
        "@type": "PostalAddress",
        ...(job.venues?.address ? { streetAddress: job.venues.address } : {}),
        postalCode: job.venues?.postal_code,
        addressLocality: job.venues?.settlements?.name,
        addressRegion: job.venues?.settlements?.county ?? undefined,
        addressCountry: "HU",
      },
    },
    ...(salary ? { baseSalary: salary } : {}),
    skills: job.job_requirements.map((r) => r.competencies?.name).filter(Boolean).join(", "),
    url: `${publicEnv.siteUrl}/allasok/${job.slug}`,
  };
}

export default async function JobPage(props: PageProps<"/allasok/[slug]">) {
  const { slug } = await props.params;
  const job = await getJob(slug);
  if (!job) notFound();
  const user = await getSessionUser();
  const live = isPublic(job);
  const photos = sortedPhotos(job);
  const urls = live ? await coverUrls([job], true) : new Map<string, string>();
  const required = job.job_requirements.filter((r) => r.kind === "required");
  const preferred = job.job_requirements.filter((r) => r.kind === "preferred");

  return (
    <article className="space-y-6">
      {live && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jobPostingJsonLd(job)).replace(/</g, "\\u003c") }}
        />
      )}
      <PageHeader title={job.title} subtitle={`${job.companies?.name} · ${job.venues?.name}`} back="/allasok" />
      {!live && <p className="rounded-2xl bg-amber-100 px-4 py-3 text-sm font-medium text-amber-800">Ez a hirdetés jelenleg nem aktív (csak te látod).</p>}

      {photos.length > 0 && (
        <div className="-mx-4 flex snap-x snap-mandatory gap-2 overflow-x-auto px-4">
          {photos.map((p, i) =>
            urls.get(p.path) ? (
              <LazyImage
                key={p.path}
                src={urls.get(p.path)!}
                alt={`${job.venues?.name} – fotó ${i + 1}`}
                className="aspect-[4/3] w-[85%] shrink-0 snap-center rounded-3xl object-cover"
                loading={i === 0 ? "eager" : "lazy"}
              />
            ) : null,
          )}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <Badge tone="brand">{job.job_role_templates?.name}</Badge>
        {job.is_seasonal && <Badge tone="warning">Szezonális</Badge>}
      </div>

      <ul className="grid gap-3 rounded-3xl bg-soft p-4 text-sm">
        <li className="flex gap-3">
          <IconWallet className="size-5 shrink-0 text-brand" />
          <span>
            <span className="font-semibold">{formatWage(job.wage_min, job.wage_max, job.wage_period)}</span>
            <span className="block text-muted">{WAGE_PERIOD_LABELS[job.wage_period]}</span>
          </span>
        </li>
        <li className="flex gap-3">
          <IconClock className="size-5 shrink-0 text-brand" />
          <span>
            <span className="font-semibold">{formatShifts(job.shifts)}</span>
            {job.schedule_note && <span className="block text-muted">{job.schedule_note}</span>}
          </span>
        </li>
        <li className="flex gap-3">
          <IconPin className="size-5 shrink-0 text-brand" />
          <span>
            <span className="font-semibold">
              {job.venues?.postal_code} {job.venues?.settlements?.name}
            </span>
            {job.venues?.address && <span className="block text-muted">{job.venues.address}</span>}
          </span>
        </li>
        {job.start_date && (
          <li className="flex gap-3">
            <IconSun className="size-5 shrink-0 text-brand" />
            <span className="font-semibold">Kezdés: {formatDate(job.start_date)}</span>
          </li>
        )}
      </ul>

      <section className="space-y-3">
        <h2 className="text-lg font-bold">Kötelező kompetenciák</h2>
        <ul className="space-y-2">
          {required.map((r) => (
            <li key={r.competencies?.id} className="flex items-center gap-3 rounded-2xl border border-line px-4 py-3">
              <IconCheck className="size-5 text-brand" /> {r.competencies?.name}
            </li>
          ))}
        </ul>
        {preferred.length > 0 && (
          <>
            <h2 className="pt-2 text-lg font-bold">Előnyt jelent</h2>
            <div className="flex flex-wrap gap-2">
              {preferred.map((r) => (
                <span key={r.competencies?.id} className="rounded-full bg-soft px-3 py-2 text-sm">
                  {r.competencies?.name}
                </span>
              ))}
            </div>
          </>
        )}
      </section>

      {job.description && (
        <section className="space-y-2">
          <h2 className="text-lg font-bold">A munkáról</h2>
          <p className="whitespace-pre-line text-ink/90">{job.description}</p>
        </section>
      )}

      {(job.companies?.description || job.venues?.description) && (
        <section className="space-y-2">
          <h2 className="text-lg font-bold">{job.companies?.name}</h2>
          {job.companies?.description && <p className="whitespace-pre-line text-ink/90">{job.companies.description}</p>}
          {job.venues?.description && <p className="whitespace-pre-line text-muted">{job.venues.description}</p>}
        </section>
      )}

      {job.expires_at && <p className="text-sm text-muted">A hirdetés lejár: {formatDate(job.expires_at)}</p>}

      {live && (
        <div className="sticky bottom-20 z-10 -mx-4 bg-white/95 px-4 py-3 backdrop-blur">
          {!user ? (
            <ButtonLink href={`/belepes?next=${encodeURIComponent(`/allasok/${job.slug}`)}`} className="w-full">
              Jelentkezés – belépés szükséges
            </ButtonLink>
          ) : user.profile.role === "candidate" ? (
            <ButtonLink href="/jelolt" className="w-full">
              Jelentkezéshez építsd fel a profilod
            </ButtonLink>
          ) : null}
        </div>
      )}
    </article>
  );
}
