"use client";

import { useActionState } from "react";
import { saveVenue } from "./actions";
import { Field, Input, Textarea } from "@/components/ui/Field";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { FormMessage } from "@/components/ui/FormMessage";
import { SettlementPicker, type SettlementOption } from "@/components/forms/SettlementPicker";
import { initialFormState } from "@/lib/forms";

type Venue = { id: string; name: string; address: string | null; description: string | null; settlement: SettlementOption | null };

export function VenueForm({ venue }: { venue?: Venue }) {
  const [state, action] = useActionState(saveVenue.bind(null, venue?.id ?? null), initialFormState);
  return (
    <form action={action} className="space-y-4">
      <Field label="Helyszín neve" htmlFor="name" hint="Pl. „Bisztró Belváros” vagy „Hotel Duna – étterem”.">
        <Input id="name" name="name" defaultValue={venue?.name ?? ""} required maxLength={120} />
      </Field>
      <Field label="Irányítószám / település" htmlFor="place">
        <SettlementPicker id="place" name="place" defaultValue={venue?.settlement} required />
      </Field>
      <Field label="Utca, házszám" htmlFor="address" hint="Nem kötelező; a távolságot az irányítószámból számoljuk.">
        <Input id="address" name="address" defaultValue={venue?.address ?? ""} autoComplete="street-address" maxLength={200} />
      </Field>
      <Field label="Leírás" htmlFor="description">
        <Textarea id="description" name="description" defaultValue={venue?.description ?? ""} maxLength={2000} placeholder="Konyha jellege, kapacitás, hangulat…" />
      </Field>
      <FormMessage state={state} />
      <SubmitButton className="w-full">{venue ? "Mentés" : "Helyszín létrehozása"}</SubmitButton>
    </form>
  );
}
