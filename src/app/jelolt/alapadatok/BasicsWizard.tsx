"use client";

import { useActionState, useRef, useState } from "react";
import { saveBasics } from "../actions";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { FormMessage } from "@/components/ui/FormMessage";
import { SettlementPicker, type SettlementOption } from "@/components/forms/SettlementPicker";
import { initialFormState } from "@/lib/forms";
import { SHIFTS, SHIFT_LABELS } from "@/lib/format";
import type { Enums } from "@/types/database";

export type BasicsValues = {
  availability: Enums<"shift_type">[];
  settlement: SettlementOption | null;
  travel_km: number;
  wage_expectation: number | null;
  wage_period: Enums<"wage_period">;
  start_date: string;
  headline: string;
  bio: string;
};

type LangSkill = { competency_id: number; name: string; language_level: string | null };

export function BasicsWizard({ values, languages }: { values: BasicsValues; languages: LangSkill[] }) {
  const [state, action] = useActionState(saveBasics, initialFormState);
  const [step, setStep] = useState(0);
  const [km, setKm] = useState(values.travel_km);
  const [stepError, setStepError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const steps = [
    { title: "Mikor tudsz dolgozni?", hint: "Jelöld meg az összes műszakot, ami belefér." },
    { title: "Hol laksz?", hint: "Irányítószám vagy település – ebből számoljuk a távolságot légvonalban." },
    { title: "Mennyit utaznál?", hint: "Legfeljebb ekkora távolságra lévő állásokat mutatunk előre." },
    { title: "Mi a bérigényed?", hint: "Nem kötelező, de segít a jó ajánlatokban." },
    { title: "Mikor tudsz kezdeni?", hint: "Hagyd üresen, ha azonnal." },
    ...(languages.length ? [{ title: "Milyen szinten beszélsz?", hint: "A nyelvtudás szintje a munkáltatóknak fontos." }] : []),
    { title: "Pár szó magadról", hint: "Nem kötelező. Röviden, a lényeg." },
  ];
  const last = step === steps.length - 1;

  function validate(): string | null {
    const form = formRef.current;
    if (!form) return null;
    const fd = new FormData(form);
    if (step === 0 && fd.getAll("availability").length === 0) return "Jelölj meg legalább egy műszakot.";
    if (step === 1 && !fd.get("place_id")) return "Válassz települést a listából.";
    return null;
  }

  const panel = (i: number) => (i === step ? "space-y-3" : "hidden");
  let i = 0;

  return (
    <form ref={formRef} action={action} className="space-y-6">
      <div className="flex gap-1.5" aria-hidden>
        {steps.map((_, n) => (
          <span key={n} className={`h-1.5 flex-1 rounded-full ${n <= step ? "bg-brand" : "bg-line"}`} />
        ))}
      </div>
      <div>
        <p className="text-sm font-semibold text-muted">
          {step + 1}. lépés / {steps.length}
        </p>
        <h1 className="text-2xl font-bold">{steps[step].title}</h1>
        <p className="mt-1 text-muted">{steps[step].hint}</p>
      </div>

      <div className={panel(i++)}>
        <div className="grid grid-cols-2 gap-2">
          {SHIFTS.map((s) => (
            <Checkbox key={s} name="availability" value={s} defaultChecked={values.availability.includes(s)} label={SHIFT_LABELS[s]} />
          ))}
        </div>
      </div>

      <div className={panel(i++)}>
        <SettlementPicker name="place" defaultValue={values.settlement} />
      </div>

      <div className={panel(i++)}>
        <p className="text-center text-4xl font-bold text-brand">{km} km</p>
        <input
          type="range"
          name="travel_km"
          min={0}
          max={100}
          step={5}
          value={km}
          onChange={(e) => setKm(Number(e.target.value))}
          className="h-12 w-full accent-[#001AA6]"
          aria-label="Utazási hajlandóság km-ben"
        />
        <div className="flex justify-between text-sm text-muted">
          <span>0 km</span>
          <span>100 km</span>
        </div>
      </div>

      <div className={panel(i++)}>
        <Field label="Bérigény (bruttó)" htmlFor="wage_expectation">
          <Input id="wage_expectation" name="wage_expectation" inputMode="numeric" defaultValue={values.wage_expectation ?? ""} placeholder="pl. 450000" />
        </Field>
        <Field label="Típus" htmlFor="wage_period">
          <Select id="wage_period" name="wage_period" defaultValue={values.wage_period}>
            <option value="monthly">Havi</option>
            <option value="hourly">Órabér</option>
          </Select>
        </Field>
      </div>

      <div className={panel(i++)}>
        <Input name="start_date" type="date" defaultValue={values.start_date} aria-label="Kezdési dátum" />
      </div>

      {languages.length > 0 && (
        <div className={panel(i++)}>
          {languages.map((l) => (
            <Field key={l.competency_id} label={l.name} htmlFor={`lang_${l.competency_id}`}>
              <Select id={`lang_${l.competency_id}`} name={`lang_${l.competency_id}`} defaultValue={l.language_level ?? "B1"}>
                {[
                  ["A1", "A1 – kezdő"],
                  ["A2", "A2 – alapfok"],
                  ["B1", "B1 – küszöbszint"],
                  ["B2", "B2 – középfok"],
                  ["C1", "C1 – felsőfok"],
                  ["C2", "C2 – anyanyelvi szint"],
                ].map(([v, t]) => (
                  <option key={v} value={v}>
                    {t}
                  </option>
                ))}
              </Select>
            </Field>
          ))}
        </div>
      )}

      <div className={panel(i++)}>
        <Field label="Egy mondatban" htmlFor="headline">
          <Input id="headline" name="headline" defaultValue={values.headline} maxLength={120} placeholder="pl. 5 év à la carte tapasztalat, bort is ajánlok" />
        </Field>
        <Field label="Bemutatkozás" htmlFor="bio">
          <Textarea id="bio" name="bio" defaultValue={values.bio} maxLength={1000} />
        </Field>
      </div>

      {(stepError || state.error) && <FormMessage state={{ error: stepError ?? state.error }} />}

      <div className="sticky bottom-20 -mx-4 flex gap-3 bg-white/95 px-4 py-3 backdrop-blur">
        {step > 0 && (
          <Button type="button" variant="secondary" onClick={() => (setStepError(null), setStep((s) => s - 1))}>
            Vissza
          </Button>
        )}
        {last ? (
          <SubmitButton className="flex-1">Kész</SubmitButton>
        ) : (
          <Button
            type="button"
            className="flex-1"
            onClick={() => {
              const err = validate();
              setStepError(err);
              if (!err) setStep((s) => s + 1);
            }}
          >
            Tovább
          </Button>
        )}
      </div>
    </form>
  );
}
