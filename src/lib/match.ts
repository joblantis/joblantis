import type { Enums, Json } from "@/types/database";
import { SHIFT_LABELS } from "@/lib/format";

/** A public.match_details() SQL függvény kimenete. A pontszámítás egyetlen forrása az adatbázis. */
export type MatchCompetency = {
  id: number;
  name: string;
  kind: Enums<"requirement_kind">;
  min_level: number;
  level: number | null;
  status: Enums<"skill_status"> | null;
  verification_type: Enums<"verification_type"> | null;
};

export type MatchDetails = {
  score: number;
  missing_required: number;
  required_total: number;
  required_met: number;
  required_verified: number;
  components: Record<MatchComponent, number>;
  weights: Record<MatchComponent, number>;
  competencies: MatchCompetency[];
  shifts_job: Enums<"shift_type">[];
  shifts_matched: Enums<"shift_type">[];
  distance_km: number | null;
  travel_km: number | null;
  work_style_known: boolean;
};

export type MatchComponent = "required" | "preferred" | "shifts" | "distance" | "work_style";

export const COMPONENT_LABELS: Record<MatchComponent, string> = {
  required: "Kötelező kompetenciák",
  preferred: "Előnyt jelentő kompetenciák",
  shifts: "Műszak-elérhetőség",
  distance: "Távolság",
  work_style: "Munkastílus (kiegészítő)",
};

export function parseMatch(value: Json | null | undefined): MatchDetails | null {
  if (!value || typeof value !== "object" || Array.isArray(value) || typeof value.score !== "number") return null;
  return value as unknown as MatchDetails;
}

const VERIFIED_LABEL: Record<Enums<"verification_type">, string> = {
  reference: "igazolt (referencia)",
  trial: "igazolt (próbanap)",
  admin: "igazolt",
};

export function verifiedLabel(c: Pick<MatchCompetency, "status" | "verification_type">) {
  return c.status === "verified" ? VERIFIED_LABEL[c.verification_type ?? "admin"] : "bemondott";
}

export type Reason = { tone: "ok" | "missing" | "verified" | "info"; text: string };

/**
 * Szöveges indoklás a pontszám mellé: mi teljesül, mi hiányzik, mi igazolt.
 * `perspective`: a jelöltnek ("Neked megvan") vagy a munkáltatónak ("A jelöltnek megvan") szól.
 */
export function explainMatch(m: MatchDetails, perspective: "candidate" | "employer"): Reason[] {
  const reasons: Reason[] = [];
  const req = m.competencies.filter((c) => c.kind === "required");
  const pref = m.competencies.filter((c) => c.kind === "preferred");
  const verified = m.competencies.filter((c) => c.level != null && c.status === "verified");
  const metReq = req.filter((c) => c.level != null);
  const missingReq = req.filter((c) => c.level == null);
  const belowMin = req.filter((c) => c.level != null && c.level < c.min_level);
  const metPref = pref.filter((c) => c.level != null);

  if (req.length) {
    reasons.push({
      tone: missingReq.length ? "info" : "ok",
      text: `Kötelező kompetenciák: ${metReq.length}/${req.length} teljesül${metReq.length ? ` (${metReq.map((c) => c.name).join(", ")})` : ""}`,
    });
  }
  if (missingReq.length) {
    reasons.push({ tone: "missing", text: `Hiányzik: ${missingReq.map((c) => c.name).join(", ")}` });
  }
  if (belowMin.length) {
    reasons.push({ tone: "missing", text: `Az elvárt szint alatt: ${belowMin.map((c) => c.name).join(", ")}` });
  }
  if (verified.length) {
    reasons.push({ tone: "verified", text: `Igazolt: ${verified.map((c) => `${c.name} – ${verifiedLabel(c)}`).join(", ")}` });
  } else if (metReq.length) {
    reasons.push({ tone: "info", text: "Minden kompetencia bemondott, még nincs igazolás (referencia vagy próbanap)." });
  }
  if (pref.length) {
    reasons.push({
      tone: metPref.length ? "ok" : "info",
      text: `Előnyt jelent: ${metPref.length}/${pref.length}${metPref.length ? ` (${metPref.map((c) => c.name).join(", ")})` : ""}`,
    });
  }

  if (m.shifts_job.length) {
    const missing = m.shifts_job.filter((s) => !m.shifts_matched.includes(s));
    reasons.push({
      tone: missing.length ? (m.shifts_matched.length ? "info" : "missing") : "ok",
      text: missing.length
        ? `Műszak: ${m.shifts_matched.length}/${m.shifts_job.length} egyezik${missing.length ? `, nem elérhető: ${missing.map((s) => SHIFT_LABELS[s]).join(", ")}` : ""}`
        : "Minden kért műszakban elérhető",
    });
  }

  if (m.distance_km == null) {
    reasons.push({ tone: "info", text: "Távolság nem számolható (hiányzó lakhely)" });
  } else {
    const within = m.travel_km == null || m.distance_km <= m.travel_km;
    const who = perspective === "candidate" ? "utazási hajlandóságodon" : "a jelölt utazási hajlandóságán";
    reasons.push({
      tone: within ? "ok" : "missing",
      text: `${Math.round(m.distance_km)} km légvonalban${m.travel_km != null ? (within ? ` – ${who} belül` : ` – ${who} (${m.travel_km} km) kívül`) : ""}`,
    });
  }

  if (m.work_style_known) {
    reasons.push({ tone: "info", text: `Munkastílus-illeszkedés: ${Math.round(m.components.work_style * 100)}% (legfeljebb 15 pont)` });
  }
  return reasons;
}

/** Pontszám színe: hiányzó kötelező kompetenciánál mindig figyelmeztető. */
export function scoreTone(m: Pick<MatchDetails, "score" | "missing_required">) {
  if (m.missing_required > 0) return "warning" as const;
  if (m.score >= 70) return "success" as const;
  return "brand" as const;
}
