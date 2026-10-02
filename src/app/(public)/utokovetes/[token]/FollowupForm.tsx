"use client";

import { useActionState } from "react";
import { submitFollowupForm } from "./actions";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { FormMessage } from "@/components/ui/FormMessage";
import { initialFormState } from "@/lib/forms";

const RATINGS = [
  ["reliable", "Megbízható"],
  ["independent", "Önálló"],
  ["productive", "Termelékeny"],
] as const;

export function FollowupForm({ token, initial }: { token: string; initial: "igen" | "nem" | null }) {
  const [state, action] = useActionState(submitFollowupForm.bind(null, token), initialFormState);
  if (state.ok) return <FormMessage state={state} />;
  return (
    <form action={action} className="space-y-5">
      <fieldset className="flex gap-3">
        <legend className="sr-only">Még nálatok dolgozik?</legend>
        {(["igen", "nem"] as const).map((v) => (
          <label
            key={v}
            className="flex min-h-14 flex-1 cursor-pointer items-center justify-center rounded-2xl border border-line text-lg font-semibold has-[:checked]:border-brand has-[:checked]:bg-brand has-[:checked]:text-white"
          >
            <input type="radio" name="still_employed" value={v} defaultChecked={initial === v} required className="sr-only" />
            {v === "igen" ? "Igen" : "Már nem"}
          </label>
        ))}
      </fieldset>
      <div className="space-y-3">
        <p className="text-sm text-muted">Ha van egy perced: értékeld 1–5-ig (nem kötelező).</p>
        {RATINGS.map(([name, label]) => (
          <fieldset key={name} className="space-y-1.5">
            <legend className="font-semibold">{label}</legend>
            <div className="grid grid-cols-5 gap-1.5">
              {[1, 2, 3, 4, 5].map((n) => (
                <label key={n} className="flex min-h-12 cursor-pointer items-center justify-center rounded-xl border border-line font-bold has-[:checked]:border-brand has-[:checked]:bg-brand has-[:checked]:text-white">
                  <input type="radio" name={name} value={n} className="sr-only" />
                  {n}
                </label>
              ))}
            </div>
          </fieldset>
        ))}
      </div>
      <FormMessage state={state} />
      <SubmitButton className="w-full" pendingText="Küldés…">
        Válasz elküldése
      </SubmitButton>
    </form>
  );
}
