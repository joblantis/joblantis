import Link from "next/link";
import { LazyImage } from "@/components/ui/LazyImage";
import { Badge } from "@/components/ui/Badge";
import { IconClock, IconPin, IconWallet } from "@/components/ui/Icons";
import { formatDistance, formatShifts, formatWage } from "@/lib/format";
import type { PublicJob } from "@/lib/jobs";

export function JobCard({ job, coverUrl, distanceKm }: { job: PublicJob; coverUrl?: string; distanceKm?: number | null }) {
  const required = job.job_requirements.filter((r) => r.kind === "required").length;
  const distance = formatDistance(distanceKm);
  return (
    <Link href={`/allasok/${job.slug}`} className="block overflow-hidden rounded-3xl border border-line bg-white transition hover:border-brand">
      <div className="relative aspect-[16/9] bg-soft">
        {coverUrl ? (
          <LazyImage src={coverUrl} alt={job.venues?.name ?? job.title} className="size-full object-cover" />
        ) : (
          <div className="grid size-full place-items-center text-4xl font-extrabold tracking-[0.12em] text-brand/15">JOBLANTIS</div>
        )}
        <div className="absolute left-3 top-3 flex gap-2">
          <Badge tone="brand">{job.job_role_templates?.name}</Badge>
          {job.is_seasonal && <Badge tone="warning">Szezonális</Badge>}
        </div>
      </div>
      <div className="space-y-2 p-4">
        <div>
          <h3 className="text-lg font-bold leading-snug">{job.title}</h3>
          <p className="text-sm text-muted">
            {job.companies?.name} · {job.venues?.name}
          </p>
        </div>
        <ul className="space-y-1 text-sm">
          <li className="flex items-center gap-2">
            <IconWallet className="size-4 text-brand" /> {formatWage(job.wage_min, job.wage_max, job.wage_period)}
          </li>
          <li className="flex items-center gap-2">
            <IconClock className="size-4 text-brand" /> {formatShifts(job.shifts)}
          </li>
          <li className="flex items-center gap-2">
            <IconPin className="size-4 text-brand" /> {job.venues?.settlements?.name}
            {distance && <span className="text-muted">· {distance}</span>}
          </li>
        </ul>
        <p className="text-xs font-semibold text-muted">{required} kötelező kompetencia</p>
      </div>
    </Link>
  );
}
