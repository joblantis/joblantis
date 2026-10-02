"use client";

import { useActionState } from "react";
import { submitEvaluation } from "@/app/probanap/actions";
import { Field, Textarea } from "@/components/ui/Field";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { FormMessage } from "@/components/ui/FormMessage";
import { initialFormState } from "@/lib/forms";

const HINT = ["", "gyenge", "fejlesztendő", "megfelelő", "jó", "kiváló"];

export function EvaluationForm({
  trialId,
  applicationId,
  competencies,
}: {
  trialId: string;
  applicationId: string;
  competencies: { id: number; name: string; required: boolean }[];
}) {
  const [state, action] = useActionState(submitEvaluation.bind(null, trialId, applicationId), initialFormState);
  return (
    <form action={action} className="space-y-4">
      {competencies.map((c) => (
        <fieldset key={c.id} className="space-y-2 rounded-2xl border border-line p-3">
          <legend className="px-1 font-semibold">
            {c.name} {c.required && <span className="text-xs font-normal text-muted">· kötelező</span>}
          </legend>
          <div className="grid grid-cols-5 gap-1.5">
            {[1, 2, 3, 4, 5].map((n) => (
              <label
                key={n}
                className="flex min-h-12 cursor-pointer flex-col items-center justify-center rounded-xl border border-line text-sm has-[:checked]:border-brand has-[:checked]:bg-brand has-[:checked]:text-white"
                title={HINT[n]}
              >
                <input type="radio" name={`score_${c.id}`} value={n} required className="sr-only" />
                <span className="text-lg font-bold leading-none">{n}</span>
                <span className="text-[10px] opacity-80">{HINT[n]}</span>
              </label>
            ))}
          </div>
        </fieldset>
      ))}
      <Field label="Megjegyzés (nem kötelező)" htmlFor="comment">
        <Textarea id="comment" name="comment" maxLength={1000} placeholder="Mi ment jól, min kell még dolgozni?" />
      </Field>
      <FormMessage state={state} />
      <SubmitButton className="w-full" pendingText="Mentés…">
        Értékelés mentése
      </SubmitButton>
    </form>
  );
}
