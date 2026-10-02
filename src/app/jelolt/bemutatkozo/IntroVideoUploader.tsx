"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setIntroVideo } from "../galeria/actions";
import { createClient } from "@/lib/supabase/client";
import { MAX_VIDEO_BYTES, inspectVideo, videoExtension } from "@/lib/image";
import { Button } from "@/components/ui/Button";

export function IntroVideoUploader({ userId, current }: { userId: string; current: { url: string; poster: string | null } | null }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const router = useRouter();

  async function handle(file: File | undefined) {
    if (!file) return;
    setError(null);
    try {
      if (!file.type.startsWith("video/")) throw new Error("Videófájlt válassz.");
      if (file.size > MAX_VIDEO_BYTES) throw new Error("A videó legfeljebb 100 MB lehet.");
      setStatus("Videó ellenőrzése…");
      const { duration, poster } = await inspectVideo(file);
      if (duration > 45.5) throw new Error("A bemutatkozó videó legfeljebb 45 másodperces lehet.");
      setStatus("Feltöltés…");
      const bucket = createClient().storage.from("intro-videos");
      const id = crypto.randomUUID();
      const videoPath = `${userId}/intro-${id}.${videoExtension(file)}`;
      const posterPath = `${userId}/intro-${id}_poster.webp`;
      const up1 = await bucket.upload(videoPath, file, { contentType: file.type || "video/mp4" });
      const up2 = up1.error ? up1 : await bucket.upload(posterPath, poster, { contentType: "image/webp" });
      if (up1.error || up2.error) {
        await bucket.remove([videoPath, posterPath]);
        throw new Error("A feltöltés nem sikerült. Nagy fájlnál ellenőrizd a Supabase feltöltési méretkorlátját.");
      }
      const res = await setIntroVideo({ video_path: videoPath, poster_path: posterPath, duration_s: duration, size_bytes: file.size });
      if (res.error) throw new Error(res.error);
      startTransition(() => router.refresh());
    } catch (e) {
      setError(e instanceof Error ? e.message : "A feltöltés nem sikerült.");
    } finally {
      setStatus(null);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="space-y-4">
      {current ? (
        <video src={current.url} poster={current.poster ?? undefined} controls playsInline preload="metadata" className="aspect-[9/16] max-h-[60vh] w-full rounded-3xl bg-black object-contain" />
      ) : (
        <div className="grid aspect-[9/16] max-h-[50vh] w-full place-items-center rounded-3xl bg-soft p-6 text-center text-muted">
          Még nincs bemutatkozó videód. 30–45 másodperc bőven elég: ki vagy, mit szeretsz a szakmában, mire vagy büszke.
        </div>
      )}
      <Button type="button" className="w-full" disabled={!!status} onClick={() => inputRef.current?.click()}>
        {status ?? (current ? "Videó cseréje" : "Videó feltöltése / felvétele")}
      </Button>
      {current && !status && (
        <Button
          type="button"
          variant="danger"
          className="w-full"
          onClick={async () => {
            if (!confirm("Törlöd a bemutatkozó videót?")) return;
            const res = await setIntroVideo(null);
            if (res.error) setError(res.error);
            startTransition(() => router.refresh());
          }}
        >
          Videó törlése
        </Button>
      )}
      <input ref={inputRef} type="file" accept="video/mp4,video/webm,video/quicktime" hidden onChange={(e) => handle(e.target.files?.[0])} />
      <p className="text-xs text-muted">Legfeljebb 45 másodperc és 100 MB.</p>
      {error && <p className="text-sm text-danger">{error}</p>}
    </div>
  );
}
