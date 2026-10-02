"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signIn } from "../actions";
import { Field, Input } from "@/components/ui/Field";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { FormMessage } from "@/components/ui/FormMessage";
import { initialFormState } from "@/lib/forms";

export function LoginForm({ next }: { next?: string }) {
  const [state, action] = useActionState(signIn, initialFormState);
  return (
    <form action={action} className="space-y-4">
      {next && <input type="hidden" name="next" value={next} />}
      <Field label="Email cím" htmlFor="email">
        <Input id="email" name="email" type="email" autoComplete="email" inputMode="email" required />
      </Field>
      <Field label="Jelszó" htmlFor="password">
        <Input id="password" name="password" type="password" autoComplete="current-password" required />
      </Field>
      <FormMessage state={state} />
      <SubmitButton className="w-full" pendingText="Belépés…">
        Belépés
      </SubmitButton>
      <p className="text-center text-sm text-muted">
        Még nincs fiókod?{" "}
        <Link href="/regisztracio" className="font-semibold text-brand">
          Regisztrálj
        </Link>
      </p>
    </form>
  );
}
