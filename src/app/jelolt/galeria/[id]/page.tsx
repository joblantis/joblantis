import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AlbumEditor } from "../AlbumEditor";
import { MediaUploader } from "../MediaUploader";
import { PageHeader } from "@/components/ui/PageHeader";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { loadGallery } from "@/lib/candidate/gallery";

export const metadata: Metadata = { title: "Album" };

export default async function AlbumPage(props: PageProps<"/jelolt/galeria/[id]">) {
  const { id } = await props.params;
  const user = await requireRole(["candidate"], `/jelolt/galeria/${id}`);
  const supabase = await createClient();
  const [gallery, { data: links }, { data: comps }] = await Promise.all([
    loadGallery(supabase, user.id),
    supabase.from("media_item_competencies").select("media_item_id, competency_id, media_items!inner(album_id)").eq("media_items.album_id", id),
    // választható kompetenciák: a bemondott/igazolt készségek és a keresett munkakörök kompetenciái
    supabase.rpc("candidate_relevant_competencies"),
  ]);
  const album = gallery.find((a) => a.id === id);
  if (!album) notFound();

  const byItem = new Map<string, number[]>();
  for (const l of links ?? []) byItem.set(l.media_item_id, [...(byItem.get(l.media_item_id) ?? []), l.competency_id]);

  return (
    <div className="space-y-5">
      <PageHeader title={album.title} back="/jelolt/galeria" />
      <MediaUploader userId={user.id} albumId={album.id} />
      <AlbumEditor
        album={{ id: album.id, title: album.title }}
        items={album.items.map((it) => ({ ...it, competencyIds: byItem.get(it.id) ?? [] }))}
        competencies={(comps ?? []).flatMap((c) => (c.id != null && c.name ? [{ id: c.id, name: c.name }] : []))}
      />
    </div>
  );
}
