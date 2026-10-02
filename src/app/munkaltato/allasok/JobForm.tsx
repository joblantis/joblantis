"use client";

import { useActionState, useMemo, useState } from "react";
import { saveJob } from "./actions";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/Field";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { FormMessage } from "@/components/ui/FormMessage";
import { initialFormState } from "@/lib/forms";
import { SHIFTS, SHIFT_LABELS } from "@/lib/format";
import type { Enums } from "@/types/database";

type Competency = { id: number; name: string; category: string };
type ReqKind = Enums<"requirement_kind"> | "none";

export type JobFormValues = {
  id?: string;
  title: string;
  venue_id: string;
  description: string;
  wage_min: number | null;
  wage_max: number | null;
  wage_period: Enums<"wage_period">;
  shifts: Enums<"shift_type">[];
  schedule_note: string;
  start_date: string;
  is_seasonal: boolean;
  expires_on: string;
  status: Enums<"job_status">;
};

const KIND_LABELS: Record<ReqKind, string> = { required: "Kötelező", preferred: "Előny", none: "Nem kell" };

export function JobForm({
  template,
  venues,
  competencies,
  initialRequirements,
  values,
}: {
  template: { id: number; name: string };
  venues: { id: string; name: string }[];
  competencies: Competency[];
  initialRequirements: { competency_id: number; kind: ReqKind }[];
  values: JobFormValues;
}) {
  const [state, action] = useActionState(saveJob.bind(null, values.id ?? null), initialFormState);
  const [reqs, setReqs] = useState(initialRequirements);
  const byId = useMemo(() => new Map(competencies.map((c) => [c.id, c])), [competencies]);
  const available = competencies.filter((c) => !reqs.some((r) => r.competency_id === c.id));
  const isActive = values.status === "active";

  function setKind(id: number, kind: ReqKind) {
    setReqs((rs) => rs.map((r) => (r.competency_id === id ? { ...r, kind } : r)));
  }

  return (
    <form action={action} className="space-y-6">
      <input type="hidden" name="template_id" value={template.id} />

      <section className="space-y-4">
        <Field label="Munkakör">
          <p className="flex min-h-12 items-center rounded-2xl bg-soft px-4 font-semibold">{template.name}</p>
        </Field>
        <Field label="Álláshirdetés címe" htmlFor="title">
          <Input id="title" name="title" defaultValue={values.title} required maxLength={120} />
        </Field>
        <Field label="Helyszín" htmlFor="venue_id">
          <Select id="venue_id" name="venue_id" defaultValue={values.venue_id} required>
            <option value="" disabled>
              Válassz…
            </option>
            {venues.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
              </option>
            ))}
          </Select>
        </Field>
      </section>

      <section className="space-y-3">
        <div>
          <h2 className="text-lg font-bold">Kompetenciák</h2>
          <p className="text-sm text-muted">
            A rangsort ezek döntik el. Ha egy jelöltnél hiányzik egy kötelező kompetencia, a lista aljára kerül, de nem tűnik el.
          </p>
        </div>
        <ul className="space-y-2">
          {reqs.map((r) => (
            <li key={r.competency_id} className="rounded-2xl border border-line p-3">
              <p className="mb-2 font-medium">{byId.get(r.competency_id)?.name}</p>
              <input type="hidden" name={`req_${r.competency_id}`} value={r.kind} />
              <div role="radiogroup" aria-label={byId.get(r.competency_id)?.name} className="grid grid-cols-3 gap-1 rounded-xl bg-soft p-1">
                {(["required", "preferred", "none"] as const).map((k) => (
                  <button
                    key={k}
                    type="button"
                    role="radio"
                    aria-checked={r.kind === k}
                    onClick={() => setKind(r.competency_id, k)}
                    className={`min-h-10 rounded-lg text-sm font-semibold transition ${
                      r.kind === k ? (k === "required" ? "bg-brand text-white" : "bg-white text-ink shadow-sm") : "text-muted"
                    }`}
                  >
                    {KIND_LABELS[k]}
                  </button>
                ))}
              </div>
            </li>
          ))}
        </ul>
        {available.length > 0 && (
          <Select
            aria-label="Kompetencia hozzáadása"
            value=""
            onChange={(e) => {
              const id = Number(e.target.value);
              if (id) setReqs((rs) => [...rs, { competency_id: id, kind: "preferred" }]);
            }}
          >
            <option value="">+ További kompetencia hozzáadása…</option>
            {available.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.category})
              </option>
            ))}
          </Select>
        )}
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-bold">Bér és beosztás</h2>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Bér (tól)" htmlFor="wage_min">
            <Input id="wage_min" name="wage_min" inputMode="numeric" defaultValue={values.wage_min ?? ""} placeholder="pl. 450000" />
          </Field>
          <Field label="Bér (ig)" htmlFor="wage_max">
            <Input id="wage_max" name="wage_max" inputMode="numeric" defaultValue={values.wage_max ?? ""} placeholder="pl. 550000" />
          </Field>
        </div>
        <Field label="Bér típusa" htmlFor="wage_period">
          <Select id="wage_period" name="wage_period" defaultValue={values.wage_period}>
            <option value="monthly">Havi bruttó</option>
            <option value="hourly">Órabér (bruttó)</option>
          </Select>
        </Field>
        <fieldset className="space-y-2">
          <legend className="mb-1.5 text-sm font-semibold">Műszakrend</legend>
          <div className="grid grid-cols-2 gap-2">
            {SHIFTS.map((s) => (
              <Checkbox key={s} name="shifts" value={s} defaultChecked={values.shifts.includes(s)} label={SHIFT_LABELS[s]} />
            ))}
          </div>
        </fieldset>
        <Field label="Beosztás megjegyzés" htmlFor="schedule_note">
          <Input id="schedule_note" name="schedule_note" defaultValue={values.schedule_note} maxLength={300} placeholder="pl. 2 nap munka, 2 nap pihenő" />
        </Field>
        <Field label="Kezdés" htmlFor="start_date">
          <Input id="start_date" name="start_date" type="date" defaultValue={values.start_date} />
        </Field>
        <Checkbox name="is_seasonal" defaultChecked={values.is_seasonal} label="Szezonális munka" />
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-bold">Leírás és lejárat</h2>
        <Field label="Leírás" htmlFor="description">
          <Textarea id="description" name="description" defaultValue={values.description} maxLength={5000} rows={6} placeholder="Feladatok, csapat, juttatások…" />
        </Field>
        <Field label="Hirdetés lejárata" htmlFor="expires_on" hint="Legfeljebb 90 nap. Lejárat után a hirdetés automatikusan eltűnik a listából.">
          <Input id="expires_on" name="expires_on" type="date" defaultValue={values.expires_on} required />
        </Field>
      </section>

      <FormMessage state={state} />
      <div className="sticky bottom-20 z-10 -mx-4 space-y-2 bg-white/95 px-4 py-3 backdrop-blur">
        <SubmitButton name="intent" value="publish" className="w-full" pendingText="Mentés…">
          {isActive ? "Mentés (aktív marad)" : "Közzététel"}
        </SubmitButton>
        {!isActive && (
          <SubmitButton name="intent" value="draft" variant="secondary" className="w-full" pendingText="Mentés…">
            Mentés vázlatként
          </SubmitButton>
        )}
      </div>
    </form>
  );
}
