"use client";

import { useActionState } from "react";
import { requestReference } from "./actions";
import { Field, Input } from "@/components/ui/Field";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { FormMessage } from "@/components/ui/FormMessage";
import { initialFormState } from "@/lib/forms";

export function ReferenceRequestForm() {
  const [state, action] = useActionState(requestReference, initialFormState);
  return (
    <form action={action} className="space-y-4" key={state.ok ? state.message : "form"}>
      <Field label="Korábbi munkahely" htmlFor="company_name">
        <Input id="company_name" name="company_name" required maxLength={120} placeholder="Pl. Duna Bisztró" />
      </Field>
      <Field label="Munkáltató vagy közvetlen vezető neve" htmlFor="referee_name">
        <Input id="referee_name" name="referee_name" required maxLength={120} autoComplete="off" />
      </Field>
      <Field label="Email címe" htmlFor="referee_email" hint="Ide küldjük a kitöltő linket. Más nem látja.">
        <Input id="referee_email" name="referee_email" type="email" required maxLength={200} autoComplete="off" />
      </Field>
      <Field label="Pozíciód" htmlFor="position">
        <Input id="position" name="position" required maxLength={120} placeholder="Pl. pincér" />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Kezdés" htmlFor="period_from">
          <Input id="period_from" name="period_from" type="month" required />
        </Field>
        <Field label="Vége" htmlFor="period_to" hint="Üresen: jelenleg is">
          <Input id="period_to" name="period_to" type="month" />
        </Field>
      </div>
      <FormMessage state={state} />
      <SubmitButton className="w-full" pendingText="Küldés…">
        Ajánlás kérése
      </SubmitButton>
    </form>
  );
}
