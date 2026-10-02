import type { ReactNode } from "react";
import { Badge } from "@/components/ui/Badge";

export type ReferenceView = {
  reference_id: string;
  referee_name: string;
  company_name: string;
  job_position: string;
  period_from: string;
  period_to: string | null;
  employment_confirmed: boolean;
  recommendation: string | null;
  would_rehire: boolean | null;
  approved_at: string | null;
  hidden: boolean;
  competencies: string[];
};

const month = new Intl.DateTimeFormat("hu-HU", { year: "numeric", month: "short" });

export function formatPeriod(from: string, to: string | null) {
  return `${month.format(new Date(from))} – ${to ? month.format(new Date(to)) : "jelenleg"}`;
}

/** Ajánlás a referens nevével, a cég nevével, az időszakkal és „igazolt ajánlás” jelvénnyel. */
export function ReferenceCard({ r, children }: { r: ReferenceView; children?: ReactNode }) {
  return (
    <article className="space-y-3 rounded-3xl border border-line p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-semibold">{r.referee_name}</p>
          <p className="text-sm text-muted">
            {r.company_name} · {r.job_position}
          </p>
          <p className="text-xs text-muted">{formatPeriod(r.period_from, r.period_to)}</p>
        </div>
        {r.employment_confirmed ? <Badge tone="success">✓ igazolt ajánlás</Badge> : <Badge tone="danger">munkaviszony nem igazolt</Badge>}
      </div>
      {r.recommendation && <p className="whitespace-pre-line text-[15px] leading-relaxed">„{r.recommendation}”</p>}
      {r.competencies.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {r.competencies.map((c) => (
            <Badge key={c} tone="brand">
              {c}
            </Badge>
          ))}
        </div>
      )}
      {r.would_rehire != null && (
        <p className="text-sm">
          Újra felvenné: <b className={r.would_rehire ? "text-success" : "text-danger"}>{r.would_rehire ? "igen" : "nem"}</b>
        </p>
      )}
      {children}
    </article>
  );
}
