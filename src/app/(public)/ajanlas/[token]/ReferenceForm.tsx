"use client";

import { useActionState, useState } from "react";
import { submitReferenceForm } from "./actions";
import { Field, Textarea } from "@/components/ui/Field";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { FormMessage } from "@/components/ui/FormMessage";
import { initialFormState } from "@/lib/forms";

function Choice({ name, value, label, onChange }: { name: string; value: string; label: string; onChange?: () => void }) {
  return (
    <label className="flex min-h-12 flex-1 cursor-pointer items-center justify-center rounded-2xl border border-line px-4 font-semibold has-[:checked]:border-brand has-[:checked]:bg-brand has-[:checked]:text-white">
      <input type="radio" name={name} value={value} className="sr-only" onChange={onChange} required={name === "employment_confirmed"} />
      {label}
    </label>
  );
}

export function ReferenceForm({ token, candidateName, competencies }: { token: string; candidateName: string; competencies: { id: number; name: string }[] }) {
  const [state, action] = useActionState(submitReferenceForm.bind(null, token), initialFormState);
  const [confirmed, setConfirmed] = useState<boolean | null>(null);
  const [len, setLen] = useState(0);

  if (state.ok) return <FormMessage state={state} />;

  return (
    <form action={action} className="space-y-6">
      <fieldset className="space-y-2">
        <legend className="mb-2 font-semibold">1. {candidateName} nálatok dolgozott a megadott időszakban?</legend>
        <div className="flex gap-3">
          <Choice name="employment_confirmed" value="igen" label="Igen" onChange={() => setConfirmed(true)} />
          <Choice name="employment_confirmed" value="nem" label="Nem" onChange={() => setConfirmed(false)} />
        </div>
      </fieldset>

      {confirmed && competencies.length > 0 && (
        <fieldset className="space-y-2">
          <legend className="mb-1 font-semibold">2. Mely kompetenciáit tudod igazolni?</legend>
          <p className="text-sm text-muted">Csak azt jelöld, amit saját szemeddel láttál.</p>
          <div className="flex flex-wrap gap-2">
            {competencies.map((c) => (
              <label
                key={c.id}
                className="cursor-pointer rounded-full border border-line px-3 py-2 text-sm has-[:checked]:border-brand has-[:checked]:bg-brand/10 has-[:checked]:font-semibold has-[:checked]:text-brand"
              >
                <input type="checkbox" name="competency" value={c.id} className="sr-only" />
                {c.name}
              </label>
            ))}
          </div>
        </fieldset>
      )}

      {confirmed !== false && (
        <>
          <Field label="3. Rövid ajánlás (nem kötelező)" htmlFor="recommendation" hint={`${len}/600 karakter`}>
            <Textarea id="recommendation" name="recommendation" maxLength={600} onChange={(e) => setLen(e.target.value.length)} placeholder="Milyen munkatárs volt? Miben volt erős?" />
          </Field>
          <fieldset className="space-y-2">
            <legend className="mb-2 font-semibold">4. Újra felvennéd? (nem kötelező)</legend>
            <div className="flex gap-3">
              <Choice name="would_rehire" value="igen" label="Igen" />
              <Choice name="would_rehire" value="nem" label="Nem" />
            </div>
          </fieldset>
        </>
      )}

      <FormMessage state={state} />
      <SubmitButton className="w-full" pendingText="Küldés…">
        Ajánlás elküldése
      </SubmitButton>
    </form>
  );
}
