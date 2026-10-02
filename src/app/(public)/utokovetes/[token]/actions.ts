"use server";

import { createClient } from "@/lib/supabase/server";
import { hashToken } from "@/lib/tokens";
import type { FormState } from "@/lib/forms";

const score = (v: FormDataEntryValue | null) => (typeof v === "string" && /^[1-5]$/.test(v) ? Number(v) : null);

/** Utókövetési válasz bejelentkezés nélkül (emailben kapott token alapján). */
export async function submitFollowupForm(token: string, _: FormState, formData: FormData): Promise<FormState> {
  if (!/^[A-Za-z0-9_-]{30,64}$/.test(token)) return { error: "Érvénytelen link." };
  const still = formData.get("still_employed");
  if (still !== "igen" && still !== "nem") return { error: "Jelöld, hogy még nálatok dolgozik-e." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("submit_followup", {
    p_token_hash: hashToken(token),
    p_still_employed: still === "igen",
    // a pontszámok nem kötelezők: válasz nélkül null (a generált típus nem jelöli nullázhatónak)
    p_reliable: score(formData.get("reliable")) as number,
    p_independent: score(formData.get("independent")) as number,
    p_productive: score(formData.get("productive")) as number,
  });
  if (error) return { error: error.message || "A mentés nem sikerült." };
  return { ok: true, message: "Köszönjük a választ! Ezzel segítesz, hogy a jövőben még jobb jelölteket ajánljunk." };
}
