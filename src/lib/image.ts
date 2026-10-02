"use client";

/** Kliensoldali képtömörítés: a hosszabbik oldal legfeljebb `maxSize` px, WebP kimenet. */
export async function compressImage(file: File, maxSize = 2000, quality = 0.82): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("A kép feldolgozása nem támogatott ebben a böngészőben.");
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", quality));
  if (!blob) throw new Error("A kép tömörítése nem sikerült.");
  return blob;
}

export const MAX_VIDEO_BYTES = 100 * 1024 * 1024;

/** Videó hossza és előnézeti képkocka (WebP) a böngészőben. */
export async function inspectVideo(file: File, posterMaxSize = 720): Promise<{ duration: number; poster: Blob }> {
  const url = URL.createObjectURL(file);
  try {
    const video = document.createElement("video");
    video.preload = "metadata";
    video.muted = true;
    video.playsInline = true;
    video.src = url;
    await new Promise<void>((resolve, reject) => {
      video.onloadedmetadata = () => resolve();
      video.onerror = () => reject(new Error("A videó nem olvasható. Próbáld MP4 formátumban."));
    });
    const duration = video.duration;
    video.currentTime = Math.min(1, duration / 2);
    await new Promise<void>((resolve, reject) => {
      video.onseeked = () => resolve();
      video.onerror = () => reject(new Error("Az előnézeti kép nem készíthető el."));
    });
    const scale = Math.min(1, posterMaxSize / Math.max(video.videoWidth, video.videoHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(video.videoWidth * scale);
    canvas.height = Math.round(video.videoHeight * scale);
    canvas.getContext("2d")?.drawImage(video, 0, 0, canvas.width, canvas.height);
    const poster = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", 0.8));
    if (!poster) throw new Error("Az előnézeti kép nem készíthető el.");
    return { duration, poster };
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function videoExtension(file: File) {
  if (file.type === "video/webm") return "webm";
  if (file.type === "video/quicktime") return "mov";
  return "mp4";
}
