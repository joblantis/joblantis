import { Badge } from "@/components/ui/Badge";
import { COMPONENT_LABELS, explainMatch, scoreTone, type MatchComponent, type MatchDetails } from "@/lib/match";

const DOT = { ok: "bg-success", missing: "bg-danger", verified: "bg-brand", info: "bg-muted" } as const;

export function ScoreBadge({ match }: { match: Pick<MatchDetails, "score" | "missing_required"> }) {
  return (
    <Badge tone={scoreTone(match)}>
      {Math.round(match.score)}% illeszkedés{match.missing_required > 0 ? ` · ${match.missing_required} kötelező hiányzik` : ""}
    </Badge>
  );
}

/** Pontszám és indoklás: mi teljesül, mi hiányzik, mi igazolt – és összetevőnként a részpontszám. */
export function MatchExplain({ match, perspective, compact = false }: { match: MatchDetails; perspective: "candidate" | "employer"; compact?: boolean }) {
  const reasons = explainMatch(match, perspective);
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-brand text-xl font-extrabold text-white">{Math.round(match.score)}</span>
        <div className="min-w-0">
          <p className="font-semibold">Illeszkedési pontszám</p>
          {match.missing_required > 0 ? (
            <p className="text-sm text-danger">Hiányzó kötelező kompetencia – a lista végére sorolva</p>
          ) : (
            <p className="text-sm text-muted">
              {match.required_met}/{match.required_total} kötelező, ebből {match.required_verified} igazolt (1,5× súly)
            </p>
          )}
        </div>
      </div>
      <ul className="space-y-1.5 text-sm">
        {(compact ? reasons.slice(0, 4) : reasons).map((r) => (
          <li key={r.text} className="flex gap-2">
            <span className={`mt-1.5 size-2 shrink-0 rounded-full ${DOT[r.tone]}`} aria-hidden />
            <span>{r.text}</span>
          </li>
        ))}
      </ul>
      {!compact && (
        <dl className="space-y-1.5 rounded-2xl bg-soft p-3 text-xs">
          {(Object.keys(COMPONENT_LABELS) as MatchComponent[]).map((k) => (
            <div key={k} className="flex items-center gap-2">
              <dt className="w-40 shrink-0 text-muted">{COMPONENT_LABELS[k]}</dt>
              <dd className="flex flex-1 items-center gap-2">
                <span className="h-1.5 flex-1 rounded-full bg-line">
                  <span className="block h-full rounded-full bg-brand" style={{ width: `${Math.round((match.components[k] ?? 0) * 100)}%` }} />
                </span>
                <span className="w-14 text-right font-semibold tabular-nums">
                  {Math.round((match.components[k] ?? 0) * match.weights[k])}/{match.weights[k]}
                </span>
              </dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}
