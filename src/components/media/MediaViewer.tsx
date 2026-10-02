"use client";

/* eslint-disable @next/next/no-img-element -- aláírt, lejáró URL-ek */
import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useState } from "react";

export type ViewerItem = {
  id: string;
  kind: "image" | "video";
  url: string | null;
  thumbUrl: string | null;
  description: string | null;
  competencies: string[];
};

/** Teljes képernyős, lapozós nézegető: húzás balra/jobbra, nyilak, Esc. */
export function MediaViewer({ items, startIndex, onClose, title }: { items: ViewerItem[]; startIndex: number; onClose: () => void; title?: string }) {
  const [[index, dir], setState] = useState<[number, number]>([startIndex, 0]);
  const item = items[index];

  const go = useCallback(
    (delta: number) => setState(([i]) => [Math.min(items.length - 1, Math.max(0, i + delta)), delta]),
    [items.length],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [go, onClose]);

  if (!item) return null;

  return (
    <div role="dialog" aria-modal="true" aria-label={title ?? "Galéria"} className="fixed inset-0 z-50 flex flex-col bg-black text-white">
      <div className="flex items-center justify-between px-4 pt-[max(env(safe-area-inset-top),12px)] pb-2">
        <span className="text-sm text-white/70">
          {title ? `${title} · ` : ""}
          {index + 1} / {items.length}
        </span>
        <button type="button" onClick={onClose} aria-label="Bezárás" className="grid size-11 place-items-center rounded-full bg-white/10 text-2xl">
          ×
        </button>
      </div>
      <div className="relative flex-1 overflow-hidden">
        <AnimatePresence initial={false} custom={dir} mode="popLayout">
          <motion.div
            key={item.id}
            custom={dir}
            initial={{ x: dir >= 0 ? "100%" : "-100%", opacity: 0.4 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: dir >= 0 ? "-100%" : "100%", opacity: 0.4 }}
            transition={{ type: "spring", stiffness: 320, damping: 34 }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.6}
            onDragEnd={(_, info) => {
              if (info.offset.x < -80 || info.velocity.x < -500) go(1);
              else if (info.offset.x > 80 || info.velocity.x > 500) go(-1);
            }}
            className="absolute inset-0 flex touch-pan-y items-center justify-center"
          >
            {item.kind === "image" ? (
              item.url && <img src={item.url} alt={item.description ?? ""} className="max-h-full max-w-full select-none object-contain" draggable={false} />
            ) : (
              item.url && (
                <video src={item.url} poster={item.thumbUrl ?? undefined} controls playsInline preload="metadata" className="max-h-full max-w-full" />
              )
            )}
          </motion.div>
        </AnimatePresence>
        {index > 0 && (
          <button type="button" aria-label="Előző" onClick={() => go(-1)} className="absolute left-2 top-1/2 hidden size-11 -translate-y-1/2 place-items-center rounded-full bg-white/10 sm:grid">
            ‹
          </button>
        )}
        {index < items.length - 1 && (
          <button type="button" aria-label="Következő" onClick={() => go(1)} className="absolute right-2 top-1/2 hidden size-11 -translate-y-1/2 place-items-center rounded-full bg-white/10 sm:grid">
            ›
          </button>
        )}
      </div>
      {(item.description || item.competencies.length > 0) && (
        <div className="space-y-2 px-4 pt-3 pb-[max(env(safe-area-inset-bottom),16px)]">
          {item.description && <p className="text-sm">{item.description}</p>}
          {item.competencies.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {item.competencies.map((c) => (
                <span key={c} className="rounded-full bg-white/15 px-2.5 py-1 text-xs">
                  {c}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
