import type { Enums } from "@/types/database";

const huf = new Intl.NumberFormat("hu-HU", { maximumFractionDigits: 0 });
const date = new Intl.DateTimeFormat("hu-HU", { year: "numeric", month: "long", day: "numeric" });

export const SHIFT_LABELS: Record<Enums<"shift_type">, string> = {
  reggel: "Reggel",
  delutan: "Délután",
  este: "Este",
  ejszaka: "Éjszaka",
  hetvege: "Hétvége",
};
export const SHIFTS = Object.keys(SHIFT_LABELS) as Enums<"shift_type">[];

export const WAGE_PERIOD_LABELS: Record<Enums<"wage_period">, string> = {
  hourly: "Ft/óra",
  monthly: "Ft/hó (bruttó)",
};

export const JOB_STATUS_LABELS: Record<Enums<"job_status">, string> = {
  draft: "Vázlat",
  active: "Aktív",
  expired: "Lejárt",
  closed: "Lezárva",
};

export function formatWage(min: number | null, max: number | null, period: Enums<"wage_period">) {
  const unit = period === "hourly" ? "Ft/óra" : "Ft/hó";
  if (min != null && max != null) return min === max ? `${huf.format(min)} ${unit}` : `${huf.format(min)}–${huf.format(max)} ${unit}`;
  if (min != null) return `${huf.format(min)} ${unit}-tól`;
  if (max != null) return `max. ${huf.format(max)} ${unit}`;
  return "Megegyezés szerint";
}

export function formatDate(value: string | null | undefined) {
  if (!value) return "";
  return date.format(new Date(value));
}

export function formatDistance(km: number | null | undefined) {
  if (km == null) return null;
  if (km < 1) return "1 km-en belül";
  return `${Math.round(km)} km`;
}

export function formatShifts(shifts: Enums<"shift_type">[]) {
  return shifts.length ? shifts.map((s) => SHIFT_LABELS[s]).join(", ") : "Egyeztetés szerint";
}

/** Egy adott (YYYY-MM-DD) nap vége budapesti idő szerint, ISO formátumban. */
export function endOfDayBudapest(day: string) {
  const part = new Intl.DateTimeFormat("en-US", { timeZone: "Europe/Budapest", timeZoneName: "longOffset" })
    .formatToParts(new Date(`${day}T12:00:00Z`))
    .find((p) => p.type === "timeZoneName")?.value;
  const offset = part?.replace("GMT", "") || "+01:00";
  return new Date(`${day}T23:59:59${offset}`);
}

/** Mai nap + n nap, YYYY-MM-DD (budapesti idő). */
export function budapestDatePlus(days: number) {
  const d = new Date(Date.now() + days * 86400_000);
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Budapest" }).format(d);
}

export function isPast(iso: string | null | undefined) {
  return !!iso && new Date(iso).getTime() <= Date.now();
}

const dateTime = new Intl.DateTimeFormat("hu-HU", {
  year: "numeric", month: "long", day: "numeric", weekday: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Budapest",
});

export function formatDateTime(value: string | null | undefined) {
  return value ? dateTime.format(new Date(value)) : "";
}

/** <input type="datetime-local"> értéke (budapesti helyi idő) → Date. */
export function budapestLocalToDate(local: string) {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(local)) return null;
  const part = new Intl.DateTimeFormat("en-US", { timeZone: "Europe/Budapest", timeZoneName: "longOffset" })
    .formatToParts(new Date(`${local}:00Z`))
    .find((p) => p.type === "timeZoneName")?.value;
  const offset = part?.replace("GMT", "") || "+01:00";
  const d = new Date(`${local}:00${offset}`);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Időtartam percben → "4 óra" / "4,5 óra". */
export function formatDuration(minutes: number) {
  const h = minutes / 60;
  return `${new Intl.NumberFormat("hu-HU", { maximumFractionDigits: 1 }).format(h)} óra`;
}
