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
