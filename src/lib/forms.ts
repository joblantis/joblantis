export type FormState = { error?: string; fieldErrors?: Record<string, string>; ok?: boolean; message?: string };

export const initialFormState: FormState = {};

export function optionalInt(value: FormDataEntryValue | null) {
  if (value == null || value === "") return null;
  const n = Number(String(value).replace(/\s/g, ""));
  return Number.isFinite(n) ? Math.round(n) : NaN;
}

export function optionalString(value: FormDataEntryValue | null) {
  const s = value == null ? "" : String(value).trim();
  return s === "" ? null : s;
}
