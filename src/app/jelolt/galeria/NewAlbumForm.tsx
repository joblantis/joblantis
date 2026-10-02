"use client";

import { useActionState } from "react";
import { createAlbum } from "./actions";
import { Input } from "@/components/ui/Field";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { FormMessage } from "@/components/ui/FormMessage";
import { initialFormState } from "@/lib/forms";

export function NewAlbumForm() {
  const [state, action] = useActionState(createAlbum, initialFormState);
  return (
    <form action={action} className="space-y-2">
      <div className="flex gap-2">
        <Input name="title" placeholder="pl. Esküvői bankett 2025" maxLength={80} required aria-label="Új album neve" />
        <SubmitButton pendingText="…">Létrehozás</SubmitButton>
      </div>
      <FormMessage state={state} />
    </form>
  );
}
