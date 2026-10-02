"use client";

import { useState } from "react";
import { LazyImage } from "@/components/ui/LazyImage";
import { MediaViewer, type ViewerItem } from "./MediaViewer";

export type AlbumWithItems = { id: string; title: string; items: ViewerItem[] };

/** Albumok csempés nézetben; koppintásra teljes képernyős lapozós nézegető. */
export function AlbumTiles({ albums }: { albums: AlbumWithItems[] }) {
  const [open, setOpen] = useState<{ album: AlbumWithItems; index: number } | null>(null);
  const visible = albums.filter((a) => a.items.length);
  if (!visible.length) return null;

  return (
    <div className="space-y-5">
      {visible.map((album) => (
        <section key={album.id} className="space-y-2">
          <h3 className="font-semibold">
            {album.title} <span className="text-sm font-normal text-muted">· {album.items.length}</span>
          </h3>
          <ul className="grid grid-cols-3 gap-1.5">
            {album.items.map((item, i) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => setOpen({ album, index: i })}
                  className="relative block aspect-square w-full overflow-hidden rounded-xl bg-soft"
                  aria-label={item.description ?? `${album.title} ${i + 1}. elem`}
                >
                  {item.thumbUrl && <LazyImage src={item.thumbUrl} alt="" className="size-full object-cover" />}
                  {item.kind === "video" && (
                    <span className="absolute inset-0 grid place-items-center">
                      <span className="grid size-9 place-items-center rounded-full bg-black/55 text-white">▶</span>
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}
      {open && <MediaViewer items={open.album.items} startIndex={open.index} title={open.album.title} onClose={() => setOpen(null)} />}
    </div>
  );
}
