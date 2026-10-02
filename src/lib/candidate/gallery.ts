import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { signedUrls } from "@/lib/storage";
import type { AlbumWithItems } from "@/components/media/AlbumTiles";

/**
 * A jelölt albumai elemekkel és aláírt URL-ekkel. A hívó kliens jogaival fut (RLS + storage policy),
 * így a munkáltató csak akkor kap adatot, ha a jelölt jelentkezett hozzá.
 */
export async function loadGallery(supabase: SupabaseClient<Database>, candidateId: string): Promise<AlbumWithItems[]> {
  const { data: albums } = await supabase
    .from("albums")
    .select("id, title, sort_order, media_items(id, kind, file_path, thumb_path, description, sort_order, created_at, media_item_competencies(competencies(name)))")
    .eq("candidate_id", candidateId)
    .order("sort_order")
    .order("created_at");
  if (!albums?.length) return [];

  const paths = albums.flatMap((a) => a.media_items.flatMap((m) => [m.file_path, m.thumb_path ?? ""]));
  const urls = await signedUrls("candidate-media", paths, { client: supabase });

  return albums.map((a) => ({
    id: a.id,
    title: a.title,
    items: [...a.media_items]
      .sort((x, y) => x.sort_order - y.sort_order || x.created_at.localeCompare(y.created_at))
      .map((m) => ({
        id: m.id,
        kind: m.kind,
        url: urls.get(m.file_path) ?? null,
        thumbUrl: (m.thumb_path && urls.get(m.thumb_path)) || null,
        description: m.description,
        competencies: m.media_item_competencies.map((c) => c.competencies?.name).filter((n): n is string => !!n),
      })),
  }));
}
