"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireEmployerCompany } from "@/lib/auth";
import type { FormState } from "@/lib/forms";

const schema = z.object({
  name: z.string().trim().min(2, "Add meg a helyszín nevét").max(120),
  address: z.string().trim().max(200).optional().transform((v) => v || null),
  settlement_id: z.coerce.number({ message: "Válassz települést a listából" }).int().positive("Válassz települést a listából"),
  postal_code: z.string().regex(/^\d{4}$/, "Válassz települést a listából"),
  description: z.string().trim().max(2000).optional().transform((v) => v || null),
});

export async function saveVenue(venueId: string | null, _: FormState, formData: FormData): Promise<FormState> {
  const { company } = await requireEmployerCompany();
  const parsed = schema.safeParse({
    name: formData.get("name"),
    address: formData.get("address") ?? undefined,
    settlement_id: formData.get("place_id") || undefined,
    postal_code: formData.get("place_postal"),
    description: formData.get("description") ?? undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  // az irányítószámnak a kiválasztott településhez kell tartoznia
  const { data: s } = await supabase.from("settlements").select("postal_code").eq("id", parsed.data.settlement_id).single();
  if (!s || s.postal_code !== parsed.data.postal_code) return { error: "Válassz települést a listából" };

  if (venueId) {
    const { error } = await supabase.from("venues").update(parsed.data).eq("id", venueId).eq("company_id", company.id);
    if (error) return { error: "A mentés nem sikerült." };
    revalidatePath("/munkaltato/helyszinek");
    return { ok: true, message: "Elmentve." };
  }

  const { data, error } = await supabase
    .from("venues")
    .insert({ ...parsed.data, company_id: company.id })
    .select("id")
    .single();
  if (error || !data) return { error: "A helyszín létrehozása nem sikerült." };
  revalidatePath("/munkaltato", "layout");
  redirect(`/munkaltato/helyszinek/${data.id}?uj=1`);
}

export async function deleteVenue(venueId: string) {
  const { company } = await requireEmployerCompany();
  const supabase = await createClient();
  const { count } = await supabase.from("jobs").select("id", { count: "exact", head: true }).eq("venue_id", venueId);
  if (count) return { error: "Ehhez a helyszínhez állás tartozik, ezért nem törölhető." };
  const { data: photos } = await supabase.from("venue_photos").select("path").eq("venue_id", venueId);
  if (photos?.length) await supabase.storage.from("venue-photos").remove(photos.map((p) => p.path));
  const { error } = await supabase.from("venues").delete().eq("id", venueId).eq("company_id", company.id);
  if (error) return { error: "A törlés nem sikerült." };
  revalidatePath("/munkaltato", "layout");
  redirect("/munkaltato/helyszinek");
}

/** A kliens már feltöltötte a fájlt a saját cégmappájába; itt rögzítjük a fotót. */
export async function addVenuePhoto(venueId: string, path: string) {
  const { company } = await requireEmployerCompany();
  if (!path.startsWith(`${company.id}/${venueId}/`) || path.includes("..")) return { error: "Érvénytelen fájlútvonal." };
  const supabase = await createClient();
  const { count } = await supabase.from("venue_photos").select("id", { count: "exact", head: true }).eq("venue_id", venueId);
  if ((count ?? 0) >= 8) {
    await supabase.storage.from("venue-photos").remove([path]);
    return { error: "Helyszínenként legfeljebb 8 fotó tölthető fel." };
  }
  const { error } = await supabase.from("venue_photos").insert({ venue_id: venueId, path, sort_order: count ?? 0 });
  if (error) return { error: "A fotó mentése nem sikerült." };
  revalidatePath(`/munkaltato/helyszinek/${venueId}`);
  return { ok: true };
}

export async function deleteVenuePhoto(photoId: string) {
  await requireEmployerCompany();
  const supabase = await createClient();
  const { data } = await supabase.from("venue_photos").delete().eq("id", photoId).select("path, venue_id").single();
  if (!data) return { error: "A törlés nem sikerült." };
  await supabase.storage.from("venue-photos").remove([data.path]);
  revalidatePath(`/munkaltato/helyszinek/${data.venue_id}`);
  return { ok: true };
}
