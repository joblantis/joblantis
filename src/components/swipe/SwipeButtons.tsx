"use client";

import type { SwipeDirection } from "./SwipeDeck";

const BTN = "grid place-items-center rounded-full border bg-white shadow-md transition active:scale-95 disabled:opacity-40";

export function SwipeButtons({
  onAction,
  disabled,
  labels,
}: {
  onAction: (dir: SwipeDirection) => void;
  disabled?: boolean;
  labels: Record<SwipeDirection, string>;
}) {
  return (
    <div className="flex items-center justify-center gap-5">
      <button type="button" aria-label={labels.left} title={labels.left} disabled={disabled} onClick={() => onAction("left")} className={`${BTN} size-16 border-danger/30 text-danger`}>
        <svg viewBox="0 0 24 24" className="size-8" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
          <path d="M6 6l12 12M18 6 6 18" />
        </svg>
      </button>
      <button type="button" aria-label={labels.up} title={labels.up} disabled={disabled} onClick={() => onAction("up")} className={`${BTN} size-14 border-amber-300 text-amber-500`}>
        <svg viewBox="0 0 24 24" className="size-7" fill="currentColor">
          <path d="m12 2.5 2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4l-5.9 3.1 1.2-6.5-4.8-4.6 6.6-.9z" />
        </svg>
      </button>
      <button type="button" aria-label={labels.right} title={labels.right} disabled={disabled} onClick={() => onAction("right")} className={`${BTN} size-16 border-success/30 text-success`}>
        <svg viewBox="0 0 24 24" className="size-8" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
          <path d="m5 12 5 5L20 7" />
        </svg>
      </button>
    </div>
  );
}
