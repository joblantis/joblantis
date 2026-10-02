"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteAlbum, deleteMediaItem, moveMediaItem, renameAlbum, updateMediaItem } from "./actions";
import { MediaViewer, type ViewerItem } from "@/components/media/MediaViewer";
import { LazyImage } from "@/components/ui/LazyImage";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Field";

type Item = ViewerItem & { competencyIds: number[] };
type Competency = { id: number; name: string };

export function AlbumEditor({ album, items, competencies }: { album: { id: string; title: string }; items: Item[]; competencies: Competency[] }) {
  const [viewer, setViewer] = useState<number | null>(null);
  const [title, setTitle] = useState(album.title);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();

  const run = (fn: () => Promise<{ error?: string } | undefined | void>) =>
    start(async () => {
      const res = await fn();
      if (res && "error" in res && res.error) setMsg(res.error);
      router.refresh();
    });

  return (
    <div className="space-y-5">
      <div className="flex gap-2">
        <Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={80} aria-label="Album neve" />
        {title !== album.title && (
          <Button type="button" disabled={pending} onClick={() => run(() => renameAlbum(album.id, title))}>
            Mentés
          </Button>
        )}
      </div>
      {msg && <p className="text-sm text-danger">{msg}</p>}

      {items.length === 0 ? (
        <p className="rounded-3xl bg-soft p-6 text-center text-muted">Még üres az album.</p>
      ) : (
        <ul className="space-y-3">
          {items.map((item, i) => (
            <MediaRow
              key={item.id}
              item={item}
              competencies={competencies}
              first={i === 0}
              last={i === items.length - 1}
              disabled={pending}
              onOpen={() => setViewer(i)}
              onMove={(d) => run(() => moveMediaItem(item.id, d))}
              onDelete={() => confirm("Törlöd ezt az elemet?") && run(() => deleteMediaItem(item.id))}
              onSave={(desc, ids) => run(() => updateMediaItem(item.id, desc, ids))}
            />
          ))}
        </ul>
      )}

      <Button type="button" variant="danger" className="w-full" disabled={pending} onClick={() => confirm("Törlöd az albumot az összes elemével?") && run(() => deleteAlbum(album.id))}>
        Album törlése
      </Button>

      {viewer != null && <MediaViewer items={items} startIndex={viewer} title={album.title} onClose={() => setViewer(null)} />}
    </div>
  );
}

function MediaRow({
  item,
  competencies,
  first,
  last,
  disabled,
  onOpen,
  onMove,
  onDelete,
  onSave,
}: {
  item: Item;
  competencies: Competency[];
  first: boolean;
  last: boolean;
  disabled: boolean;
  onOpen: () => void;
  onMove: (d: -1 | 1) => void;
  onDelete: () => void;
  onSave: (description: string, ids: number[]) => void;
}) {
  const [desc, setDesc] = useState(item.description ?? "");
  const [ids, setIds] = useState<number[]>(item.competencyIds);
  const dirty = desc !== (item.description ?? "") || ids.join() !== item.competencyIds.join();

  return (
    <li className="space-y-3 rounded-3xl border border-line p-3">
      <div className="flex gap-3">
        <button type="button" onClick={onOpen} className="relative size-24 shrink-0 overflow-hidden rounded-2xl bg-soft" aria-label="Megnyitás teljes képernyőn">
          {item.thumbUrl && <LazyImage src={item.thumbUrl} alt="" className="size-full object-cover" />}
          {item.kind === "video" && <span className="absolute inset-0 grid place-items-center text-xl text-white drop-shadow">▶</span>}
        </button>
        <div className="flex flex-1 flex-col justify-between">
          <Textarea value={desc} onChange={(e) => setDesc(e.target.value)} maxLength={300} placeholder="Rövid leírás…" className="!min-h-20 text-sm" aria-label="Leírás" />
        </div>
        <div className="flex flex-col gap-1">
          <button type="button" disabled={first || disabled} onClick={() => onMove(-1)} aria-label="Feljebb" className="grid size-9 place-items-center rounded-full border border-line disabled:opacity-30">
            ↑
          </button>
          <button type="button" disabled={last || disabled} onClick={() => onMove(1)} aria-label="Lejjebb" className="grid size-9 place-items-center rounded-full border border-line disabled:opacity-30">
            ↓
          </button>
          <button type="button" disabled={disabled} onClick={onDelete} aria-label="Törlés" className="grid size-9 place-items-center rounded-full border border-danger/30 text-danger">
            ×
          </button>
        </div>
      </div>
      {competencies.length > 0 && (
        <div className="flex flex-wrap gap-1.5" aria-label="Kapcsolódó kompetenciák">
          {competencies.map((c) => {
            const on = ids.includes(c.id);
            return (
              <button
                key={c.id}
                type="button"
                aria-pressed={on}
                onClick={() => setIds((x) => (on ? x.filter((y) => y !== c.id) : [...x, c.id]))}
                className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${on ? "border-brand bg-brand text-white" : "border-line text-muted"}`}
              >
                {c.name}
              </button>
            );
          })}
        </div>
      )}
      {dirty && (
        <Button type="button" className="w-full !min-h-10" disabled={disabled} onClick={() => onSave(desc, ids)}>
          Mentés
        </Button>
      )}
    </li>
  );
}
