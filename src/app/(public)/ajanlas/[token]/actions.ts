"use server";

import { after } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { hashToken } from "@/lib/tokens";
import { deliverPendingNotifications } from "@/lib/notifications";
import type { FormState } from "@/lib/forms";

/** A referens űrlapja – bejelentkezés nélkül, a token hash-ével azonosítva (az adatbázis-függvény ellenőriz mindent). */
export async function submitReferenceForm(token: string, _: FormState, formData: FormData): Promise<FormState> {
  if (!/^[A-Za-z0-9_-]{30,64}$/.test(token)) return { error: "Érvénytelen link." };
  const confirmed = formData.get("employment_confirmed");
  if (confirmed !== "igen" && confirmed !== "nem") return { error: "Jelöld, hogy a munkaviszony fennállt-e." };
  const text = String(formData.get("recommendation") ?? "").trim();
  if (text.length > 600) return { error: "Az ajánlás legfeljebb 600 karakter lehet." };
  const rehire = formData.get("would_rehire");
  const competencyIds = formData
    .getAll("competency")
    .map((v) => Number(v))
    .filter((n) => Number.isInteger(n) && n > 0)
    .slice(0, 50);

  const supabase = await createClient();
  const { error } = await supabase.rpc("submit_reference", {
    p_token_hash: hashToken(token),
    p_employment_confirmed: confirmed === "igen",
    p_competency_ids: competencyIds,
    p_recommendation: text,
    // opcionális kérdés: válasz nélkül null (a generált típus nem jelöli nullázhatónak)
    p_would_rehire: rehire === "igen" ? true : rehire === "nem" ? false : (null as unknown as boolean),
  });
  if (error) return { error: error.message || "A beküldés nem sikerült." };
  after(() => deliverPendingNotifications(10));
  return { ok: true, message: "Köszönjük! Az ajánlást elküldtük. A jelölt jóváhagyása után jelenik meg a profilján." };
}
