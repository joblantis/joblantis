import Link from "next/link";
import type { Metadata } from "next";
import { NewAlbumForm } from "./NewAlbumForm";
import { PageHeader } from "@/components/ui/PageHeader";
import { LazyImage } from "@/components/ui/LazyImage";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { loadGallery } from "@/lib/candidate/gallery";

export const metadata: Metadata = { title: "Galéria" };

export default async function GalleryPage() {
  const user = await requireRole(["candidate"], "/jelolt/galeria");
  const supabase = await createClient();
  const albums = await loadGallery(supabase, user.id);

  return (
    <div className="space-y-5">
      <PageHeader title="Galéria" subtitle="Mutasd meg a munkáidat: tányérok, koktélok, terítések, rendezvények." back="/jelolt" />
      <NewAlbumForm />
      {albums.length === 0 ? (
        <p className="rounded-3xl bg-soft p-6 text-center text-muted">Hozd létre az első albumodat, pl. „Tányérjaim” vagy „Koktélok”.</p>
      ) : (
        <ul className="grid grid-cols-2 gap-3">
          {albums.map((a) => {
            const cover = a.items.find((i) => i.thumbUrl);
            return (
              <li key={a.id}>
                <Link href={`/jelolt/galeria/${a.id}`} className="block overflow-hidden rounded-3xl border border-line">
                  <div className="aspect-square bg-soft">{cover?.thumbUrl && <LazyImage src={cover.thumbUrl} alt="" className="size-full object-cover" />}</div>
                  <div className="p-3">
                    <p className="truncate font-semibold">{a.title}</p>
                    <p className="text-xs text-muted">{a.items.length} elem</p>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
