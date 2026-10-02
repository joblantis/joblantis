"use client";

import { useActionState } from "react";
import { saveCompany } from "./actions";
import { Field, Input, Textarea } from "@/components/ui/Field";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { FormMessage } from "@/components/ui/FormMessage";
import { initialFormState } from "@/lib/forms";

type Company = { name: string; description: string | null; website: string | null } | null;

export function CompanyForm({ company }: { company: Company }) {
  const [state, action] = useActionState(saveCompany, initialFormState);
  return (
    <form action={action} className="space-y-4">
      <Field label="Cégnév" htmlFor="name" hint="Ez jelenik meg az álláshirdetéseiden.">
        <Input id="name" name="name" defaultValue={company?.name ?? ""} required maxLength={120} />
      </Field>
      <Field label="Rövid bemutatkozás" htmlFor="description">
        <Textarea id="description" name="description" defaultValue={company?.description ?? ""} maxLength={2000} placeholder="Milyen hely vagytok, milyen a csapat?" />
      </Field>
      <Field label="Weboldal" htmlFor="website">
        <Input id="website" name="website" defaultValue={company?.website ?? ""} inputMode="url" placeholder="pelda.hu" />
      </Field>
      <FormMessage state={state} />
      <SubmitButton className="w-full">{company ? "Mentés" : "Cég létrehozása"}</SubmitButton>
    </form>
  );
}
