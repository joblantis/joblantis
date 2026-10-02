"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import type { FormState } from "@/lib/forms";

const titleSchema = z.string().trim().min(1, "Adj nevet az albumnak").max(80, "Legfeljebb 80 karakter");

export async function createAlbum(_: FormState, formData: FormData): Promise<FormState> {
  const user = await requireRole(["candidate"]);
  const parsed = titleSchema.safeParse(formData.get("title"));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const supabase = await createClient();
  const { count } = await supabase.from("albums").select("id", { count: "exact", head: true }).eq("candidate_id", user.id);
  if ((count ?? 0) >= 30) return { error: "Legfeljebb 30 album hozható létre." };
  const { data, error } = await supabase.from("albums").insert({ candidate_id: user.id, title: parsed.data, sort_order: count ?? 0 }).select("id").single();
  if (error || !data) return { error: "Az album létrehozása nem sikerült." };
  revalidatePath("/jelolt", "layout");
  redirect(`/jelolt/galeria/${data.id}`);
}

export async function renameAlbum(albumId: string, title: string) {
  const user = await requireRole(["candidate"]);
  const parsed = titleSchema.safeParse(title);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const supabase = await createClient();
  const { error } = await supabase.from("albums").update({ title: parsed.data }).eq("id", albumId).eq("candidate_id", user.id);
  if (error) return { error: "A mentés nem sikerült." };
  revalidatePath("/jelolt", "layout");
  return { ok: true };
}

export async function deleteAlbum(albumId: string) {
  const user = await requireRole(["candidate"]);
  const supabase = await createClient();
  const { data: items } = await supabase.from("media_items").select("file_path, thumb_path").eq("album_id", albumId).eq("candidate_id", user.id);
  const paths = (items ?? []).flatMap((i) => [i.file_path, i.thumb_path].filter((p): p is string => !!p));
  if (paths.length) await supabase.storage.from("candidate-media").remove(paths);
  await supabase.from("albums").delete().eq("id", albumId).eq("candidate_id", user.id);
  revalidatePath("/jelolt", "layout");
  redirect("/jelolt/galeria");
}

const itemSchema = z.object({
  kind: z.enum(["image", "video"]),
  file_path: z.string().min(1),
  thumb_path: z.string().min(1),
  duration_s: z.number().min(0).max(60.5, "A videó legfeljebb 60 másodperces lehet").nullable(),
  size_bytes: z.number().int().min(1).max(100 * 1024 * 1024, "A videó legfeljebb 100 MB lehet"),
});

/** A kliens már feltöltötte a fájlt (és az előnézetet) a saját mappájába; itt rögzítjük. */
export async function addMediaItem(albumId: string, input: z.input<typeof itemSchema>) {
  const user = await requireRole(["candidate"]);
  const parsed = itemSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const prefix = `${user.id}/${albumId}/`;
  const { file_path, thumb_path } = parsed.data;
  if (![file_path, thumb_path].every((p) => p.startsWith(prefix) && !p.includes(".."))) return { error: "Érvénytelen fájlútvonal." };

  const supabase = await createClient();
  const { data: album } = await supabase.from("albums").select("id").eq("id", albumId).eq("candidate_id", user.id).maybeSingle();
  if (!album) return { error: "Az album nem található." };
  const { count } = await supabase.from("media_items").select("id", { count: "exact", head: true }).eq("album_id", albumId);
  if ((count ?? 0) >= 50) {
    await supabase.storage.from("candidate-media").remove([file_path, thumb_path]);
    return { error: "Egy albumban legfeljebb 50 elem lehet." };
  }
  const { error } = await supabase.from("media_items").insert({
    ...parsed.data,
    album_id: albumId,
    candidate_id: user.id,
    sort_order: count ?? 0,
  });
  if (error) {
    await supabase.storage.from("candidate-media").remove([file_path, thumb_path]);
    return { error: "A mentés nem sikerült." };
  }
  revalidatePath(`/jelolt/galeria/${albumId}`);
  return { ok: true };
}

export async function updateMediaItem(itemId: string, description: string, competencyIds: number[]) {
  const user = await requireRole(["candidate"]);
  const desc = description.trim().slice(0, 300) || null;
  const supabase = await createClient();
  const { data: item, error } = await supabase
    .from("media_items")
    .update({ description: desc })
    .eq("id", itemId)
    .eq("candidate_id", user.id)
    .select("album_id")
    .single();
  if (error || !item) return { error: "A mentés nem sikerült." };
  await supabase.from("media_item_competencies").delete().eq("media_item_id", itemId);
  const ids = [...new Set(competencyIds)].slice(0, 10);
  if (ids.length) {
    const { error: e2 } = await supabase.from("media_item_competencies").insert(ids.map((competency_id) => ({ media_item_id: itemId, competency_id })));
    if (e2) return { error: "A kompetenciák mentése nem sikerült." };
  }
  revalidatePath(`/jelolt/galeria/${item.album_id}`);
  return { ok: true };
}

export async function deleteMediaItem(itemId: string) {
  const user = await requireRole(["candidate"]);
  const supabase = await createClient();
  const { data } = await supabase.from("media_items").delete().eq("id", itemId).eq("candidate_id", user.id).select("album_id, file_path, thumb_path").single();
  if (!data) return { error: "A törlés nem sikerült." };
  await supabase.storage.from("candidate-media").remove([data.file_path, data.thumb_path].filter((p): p is string => !!p));
  revalidatePath(`/jelolt/galeria/${data.album_id}`);
  return { ok: true };
}

/** Elem mozgatása az albumon belül (fel / le). */
export async function moveMediaItem(itemId: string, delta: -1 | 1) {
  const user = await requireRole(["candidate"]);
  const supabase = await createClient();
  const { data: item } = await supabase.from("media_items").select("album_id").eq("id", itemId).eq("candidate_id", user.id).single();
  if (!item) return { error: "Nem található." };
  const { data: items } = await supabase.from("media_items").select("id").eq("album_id", item.album_id).order("sort_order").order("created_at");
  const list = (items ?? []).map((i) => i.id);
  const from = list.indexOf(itemId);
  const to = from + delta;
  if (from < 0 || to < 0 || to >= list.length) return { ok: true };
  [list[from], list[to]] = [list[to], list[from]];
  await Promise.all(list.map((id, idx) => supabase.from("media_items").update({ sort_order: idx }).eq("id", id)));
  revalidatePath(`/jelolt/galeria/${item.album_id}`);
  return { ok: true };
}

/** Bemutatkozó videó rögzítése (max. 45 mp); a régi fájlok törlődnek. */
export async function setIntroVideo(input: { video_path: string; poster_path: string; duration_s: number; size_bytes: number } | null) {
  const user = await requireRole(["candidate"]);
  const supabase = await createClient();
  const { data: profile } = await supabase.from("candidate_profiles").select("intro_video_path, intro_video_poster_path").eq("user_id", user.id).single();

  if (input) {
    const prefix = `${user.id}/`;
    if (![input.video_path, input.poster_path].every((p) => p.startsWith(prefix) && !p.includes(".."))) return { error: "Érvénytelen fájlútvonal." };
    if (input.duration_s > 45.5) return { error: "A bemutatkozó videó legfeljebb 45 másodperces lehet." };
    if (input.size_bytes > 100 * 1024 * 1024) return { error: "A videó legfeljebb 100 MB lehet." };
  }
  const { error } = await supabase
    .from("candidate_profiles")
    .update({ intro_video_path: input?.video_path ?? null, intro_video_poster_path: input?.poster_path ?? null })
    .eq("user_id", user.id);
  if (error) return { error: "A mentés nem sikerült." };
  const old = [profile?.intro_video_path, profile?.intro_video_poster_path].filter((p): p is string => !!p && p !== input?.video_path && p !== input?.poster_path);
  if (old.length) await supabase.storage.from("intro-videos").remove(old);
  revalidatePath("/jelolt", "layout");
  return { ok: true };
}
