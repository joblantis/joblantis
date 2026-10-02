"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addVenuePhoto, deleteVenuePhoto } from "./actions";
import { createClient } from "@/lib/supabase/client";
import { compressImage } from "@/lib/image";
import { LazyImage } from "@/components/ui/LazyImage";
import { IconPlus } from "@/components/ui/Icons";

type Photo = { id: string; url: string | null };

export function VenuePhotos({ companyId, venueId, photos }: { companyId: string; venueId: string; photos: Photo[] }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const router = useRouter();

  async function upload(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true);
    setError(null);
    const supabase = createClient();
    try {
      for (const file of Array.from(files).slice(0, 8 - photos.length)) {
        if (!file.type.startsWith("image/")) throw new Error("Csak képfájl tölthető fel.");
        const blob = await compressImage(file, 2000);
        const path = `${companyId}/${venueId}/${crypto.randomUUID()}.webp`;
        const { error: upErr } = await supabase.storage.from("venue-photos").upload(path, blob, { contentType: "image/webp" });
        if (upErr) throw new Error("A feltöltés nem sikerült.");
        const res = await addVenuePhoto(venueId, path);
        if (res.error) throw new Error(res.error);
      }
      startTransition(() => router.refresh());
    } catch (e) {
      setError(e instanceof Error ? e.message : "A feltöltés nem sikerült.");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
        {photos.map((p) => (
          <div key={p.id} className="group relative aspect-square overflow-hidden rounded-2xl bg-soft">
            {p.url && <LazyImage src={p.url} alt="Helyszínfotó" className="size-full object-cover" />}
            <button
              type="button"
              aria-label="Fotó törlése"
              onClick={async () => {
                if (!confirm("Törlöd ezt a fotót?")) return;
                await deleteVenuePhoto(p.id);
                startTransition(() => router.refresh());
              }}
              className="absolute right-1.5 top-1.5 grid size-9 place-items-center rounded-full bg-black/60 text-lg text-white"
            >
              ×
            </button>
          </div>
        ))}
        {photos.length < 8 && (
          <button
            type="button"
            disabled={busy}
            onClick={() => inputRef.current?.click()}
            className="grid aspect-square place-items-center rounded-2xl border-2 border-dashed border-line text-muted hover:border-brand hover:text-brand disabled:opacity-50"
          >
            <span className="flex flex-col items-center gap-1 text-sm font-semibold">
              <IconPlus className="size-6" />
              {busy ? "Feltöltés…" : "Fotó"}
            </span>
          </button>
        )}
      </div>
      <input ref={inputRef} type="file" accept="image/*" multiple hidden onChange={(e) => upload(e.target.files)} />
      {error && <p className="text-sm text-danger">{error}</p>}
      <p className="text-sm text-muted">Legfeljebb 8 fotó. Feltöltés előtt 2000 px-re tömörítjük.</p>
    </div>
  );
}
