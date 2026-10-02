"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addMediaItem } from "./actions";
import { createClient } from "@/lib/supabase/client";
import { MAX_VIDEO_BYTES, compressImage, inspectVideo, videoExtension } from "@/lib/image";
import { Button } from "@/components/ui/Button";
import { IconPlus } from "@/components/ui/Icons";

export function MediaUploader({ userId, albumId }: { userId: string; albumId: string }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const router = useRouter();

  async function uploadOne(file: File) {
    const supabase = createClient();
    const bucket = supabase.storage.from("candidate-media");
    const id = crypto.randomUUID();
    const base = `${userId}/${albumId}/${id}`;

    if (file.type.startsWith("image/")) {
      const [full, thumb] = await Promise.all([compressImage(file, 2000), compressImage(file, 480, 0.75)]);
      const filePath = `${base}.webp`;
      const thumbPath = `${base}_thumb.webp`;
      const up1 = await bucket.upload(filePath, full, { contentType: "image/webp" });
      const up2 = up1.error ? up1 : await bucket.upload(thumbPath, thumb, { contentType: "image/webp" });
      if (up1.error || up2.error) {
        await bucket.remove([filePath, thumbPath]);
        throw new Error("A feltöltés nem sikerült.");
      }
      const res = await addMediaItem(albumId, { kind: "image", file_path: filePath, thumb_path: thumbPath, duration_s: null, size_bytes: full.size });
      if (res.error) throw new Error(res.error);
      return;
    }

    if (file.type.startsWith("video/")) {
      if (file.size > MAX_VIDEO_BYTES) throw new Error(`„${file.name}” túl nagy: legfeljebb 100 MB lehet.`);
      const { duration, poster } = await inspectVideo(file);
      if (duration > 60.5) throw new Error(`„${file.name}” túl hosszú: legfeljebb 60 másodperc lehet.`);
      const filePath = `${base}.${videoExtension(file)}`;
      const thumbPath = `${base}_poster.webp`;
      const up1 = await bucket.upload(filePath, file, { contentType: file.type || "video/mp4" });
      const up2 = up1.error ? up1 : await bucket.upload(thumbPath, poster, { contentType: "image/webp" });
      if (up1.error || up2.error) {
        await bucket.remove([filePath, thumbPath]);
        throw new Error("A videó feltöltése nem sikerült. Nagy fájlnál ellenőrizd a Supabase feltöltési méretkorlátját.");
      }
      const res = await addMediaItem(albumId, {
        kind: "video",
        file_path: filePath,
        thumb_path: thumbPath,
        duration_s: Math.round(duration * 10) / 10,
        size_bytes: file.size,
      });
      if (res.error) throw new Error(res.error);
      return;
    }
    throw new Error(`„${file.name}”: csak kép vagy videó tölthető fel.`);
  }

  async function handle(files: FileList | null) {
    if (!files?.length) return;
    setError(null);
    const list = Array.from(files);
    try {
      for (const [i, file] of list.entries()) {
        setStatus(`Feltöltés ${i + 1}/${list.length}…`);
        await uploadOne(file);
      }
      startTransition(() => router.refresh());
    } catch (e) {
      setError(e instanceof Error ? e.message : "A feltöltés nem sikerült.");
      startTransition(() => router.refresh());
    } finally {
      setStatus(null);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="space-y-2">
      <Button type="button" variant="secondary" className="w-full" disabled={!!status} onClick={() => inputRef.current?.click()}>
        <IconPlus className="size-5" />
        {status ?? "Fotó vagy videó hozzáadása"}
      </Button>
      <input ref={inputRef} type="file" accept="image/*,video/mp4,video/webm,video/quicktime" multiple hidden onChange={(e) => handle(e.target.files)} />
      <p className="text-xs text-muted">Képek: 2000 px-re tömörítve. Videó: legfeljebb 60 mp és 100 MB.</p>
      {error && <p className="text-sm text-danger">{error}</p>}
    </div>
  );
}
