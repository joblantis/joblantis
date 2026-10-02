"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { signUp } from "../actions";
import { Field, Input } from "@/components/ui/Field";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { FormMessage } from "@/components/ui/FormMessage";
import { initialFormState } from "@/lib/forms";

const ROLES = [
  { value: "candidate", title: "Állást keresek", text: "Vendéglátós vagy szállodai munkát keresek." },
  { value: "employer", title: "Munkaerőt keresek", text: "Éttermet, kávézót, szállodát képviselek." },
] as const;

export function SignUpForm({ defaultRole }: { defaultRole?: "candidate" | "employer" }) {
  const [state, action] = useActionState(signUp, initialFormState);
  const [role, setRole] = useState<string>(defaultRole ?? "");

  if (state.ok) {
    return <FormMessage state={state} />;
  }

  return (
    <form action={action} className="space-y-4">
      <fieldset className="space-y-2">
        <legend className="mb-2 text-sm font-semibold">Mit szeretnél?</legend>
        <div className="grid grid-cols-2 gap-3">
          {ROLES.map((r) => (
            <label
              key={r.value}
              className={`flex cursor-pointer flex-col rounded-3xl border p-4 transition ${role === r.value ? "border-brand bg-brand/5" : "border-line"}`}
            >
              <input type="radio" name="role" value={r.value} checked={role === r.value} onChange={() => setRole(r.value)} className="sr-only" />
              <span className="font-semibold">{r.title}</span>
              <span className="mt-1 text-sm text-muted">{r.text}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <Field label={role === "employer" ? "Kapcsolattartó neve" : "Teljes név"} htmlFor="full_name">
        <Input id="full_name" name="full_name" autoComplete="name" required />
      </Field>
      <Field label="Email cím" htmlFor="email">
        <Input id="email" name="email" type="email" autoComplete="email" inputMode="email" required />
      </Field>
      <Field label="Jelszó" htmlFor="password" hint="Legalább 8 karakter.">
        <Input id="password" name="password" type="password" autoComplete="new-password" minLength={8} required />
      </Field>
      <label className="flex items-start gap-3 text-sm text-muted">
        <input type="checkbox" name="terms" className="mt-0.5 size-5 accent-[#001AA6]" required />
        <span>Elfogadom az adatkezelési tájékoztatót és a felhasználási feltételeket.</span>
      </label>
      <FormMessage state={state} />
      <SubmitButton className="w-full" pendingText="Regisztráció…">
        Fiók létrehozása
      </SubmitButton>
      <p className="text-center text-sm text-muted">
        Van már fiókod?{" "}
        <Link href="/belepes" className="font-semibold text-brand">
          Lépj be
        </Link>
      </p>
    </form>
  );
}
