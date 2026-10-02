import Link from "next/link";
import type { Metadata } from "next";
import { requireEmployerCompany } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/PageHeader";
import { ButtonLink } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { IconPlus } from "@/components/ui/Icons";
import { JOB_STATUS_LABELS, formatDate, formatWage, isPast } from "@/lib/format";
import type { Enums } from "@/types/database";

export const metadata: Metadata = { title: "Állásaim" };

const TONE: Record<Enums<"job_status">, "success" | "neutral" | "warning" | "danger"> = {
  active: "success",
  draft: "neutral",
  expired: "warning",
  closed: "danger",
};

export default async function EmployerJobsPage() {
  const { company } = await requireEmployerCompany("/munkaltato/allasok");
  const supabase = await createClient();
  const { data: jobs } = await supabase
    .from("jobs")
    .select("id, title, status, expires_at, wage_min, wage_max, wage_period, venues(name), job_role_templates(name), applications(status)")
    .eq("company_id", company.id)
    .order("created_at", { ascending: false });

  return (
    <div>
      <PageHeader
        title="Állásaim"
        subtitle={company.name}
        action={
          <ButtonLink href="/munkaltato/allasok/uj" className="!min-h-11 !px-4">
            <IconPlus className="size-5" /> Új
          </ButtonLink>
        }
      />
      {!jobs?.length ? (
        <p className="rounded-3xl bg-soft p-6 text-center text-muted">Még nem adtál fel állást.</p>
      ) : (
        <ul className="space-y-3">
          {jobs.map((j) => {
            // a lejárt, de még aktív státuszú hirdetést lejártként mutatjuk (a cron később átállítja)
            const status: Enums<"job_status"> = j.status === "active" && isPast(j.expires_at) ? "expired" : j.status;
            return (
              <li key={j.id}>
                <Link href={`/munkaltato/allasok/${j.id}`} className="block rounded-3xl border border-line p-4 hover:border-brand">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{j.title}</p>
                      <p className="truncate text-sm text-muted">
                        {j.job_role_templates?.name} · {j.venues?.name}
                      </p>
                    </div>
                    <Badge tone={TONE[status]}>{JOB_STATUS_LABELS[status]}</Badge>
                  </div>
                  <p className="mt-2 text-sm">{formatWage(j.wage_min, j.wage_max, j.wage_period)}</p>
                  <div className="flex items-center justify-between gap-2">
                    {j.expires_at && <p className="text-xs text-muted">Lejár: {formatDate(j.expires_at)}</p>}
                    {j.applications.length > 0 && (
                      <p className="text-xs font-semibold text-brand">
                        {j.applications.length} jelentkező
                        {j.applications.some((a) => a.status === "new") && ` · ${j.applications.filter((a) => a.status === "new").length} új`}
                      </p>
                    )}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
