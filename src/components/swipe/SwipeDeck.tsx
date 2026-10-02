"use client";

import { animate, motion, useMotionValue, useReducedMotion, useTransform } from "framer-motion";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { SwipeButtons } from "./SwipeButtons";

export type SwipeDirection = "left" | "right" | "up";

const THRESHOLD = 110;
const VELOCITY = 600;

type Props<T> = {
  cards: T[];
  getKey: (card: T) => string | number;
  renderCard: (card: T) => ReactNode;
  onSwipe: (card: T, dir: SwipeDirection) => void;
  labels: Record<SwipeDirection, string>;
  empty?: ReactNode;
  /** A pakli magassága (Tailwind osztály); fotós kártyákhoz magasabb. */
  heightClass?: string;
  /** Koppintás a felső kártyára (húzás nélkül), pl. részletek megnyitása. */
  onTap?: (card: T) => void;
};

/**
 * Húzogatós kártyapakli: jobbra / balra / felfelé húzás rugós animációval.
 * Minden mozdulatnak van gombos (X, csillag, pipa) és billentyűzetes (←, ↑, →) megfelelője.
 */
export function SwipeDeck<T>({ cards, getKey, renderCard, onSwipe, labels, empty, heightClass = "h-[min(52svh,460px)] min-h-72", onTap }: Props<T>) {
  const [index, setIndex] = useState(0);
  const [forced, setForced] = useState<SwipeDirection | null>(null);
  const busy = useRef(false);
  const current = cards[index];
  const next = cards[index + 1];

  const finish = useCallback(
    (dir: SwipeDirection) => {
      if (!current) return;
      onSwipe(current, dir);
      setForced(null);
      setIndex((i) => i + 1);
      busy.current = false;
    },
    [current, onSwipe],
  );

  const lock = useCallback(() => {
    busy.current = true;
  }, []);

  const trigger = useCallback((dir: SwipeDirection) => {
    if (busy.current) return;
    busy.current = true;
    setForced(dir);
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!current) return;
      const target = e.target as HTMLElement | null;
      if (target && ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) return;
      const map: Record<string, SwipeDirection> = { ArrowLeft: "left", ArrowRight: "right", ArrowUp: "up" };
      if (map[e.key]) {
        e.preventDefault();
        trigger(map[e.key]);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [current, trigger]);

  if (!current) return <>{empty}</>;

  return (
    <div className="flex flex-col gap-4">
      <div className={`relative mx-auto w-full max-w-sm select-none ${heightClass}`}>
        {next && (
          <div className="absolute inset-0 scale-[0.95] rounded-[2rem] border border-line bg-white opacity-70 shadow-sm" aria-hidden>
            {renderCard(next)}
          </div>
        )}
        <TopCard key={getKey(current)} forced={forced} onDone={finish} onDragDecided={finish} onLock={lock} labels={labels} onTap={onTap ? () => onTap(current) : undefined}>
          {renderCard(current)}
        </TopCard>
      </div>
      <SwipeButtons onAction={trigger} labels={labels} disabled={!!forced} />
      <p className="text-center text-sm text-muted" aria-live="polite">
        {index + 1} / {cards.length}
      </p>
    </div>
  );
}

function TopCard({
  children,
  forced,
  onDone,
  onDragDecided,
  onLock,
  labels,
  onTap,
}: {
  children: ReactNode;
  onTap?: () => void;
  forced: SwipeDirection | null;
  onDone: (dir: SwipeDirection) => void;
  onDragDecided: (dir: SwipeDirection) => void;
  onLock: () => void;
  labels: Record<SwipeDirection, string>;
}) {
  const reduce = useReducedMotion();
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotate = useTransform(x, [-240, 240], [-14, 14]);
  const yesOpacity = useTransform(x, [20, THRESHOLD], [0, 1]);
  const noOpacity = useTransform(x, [-THRESHOLD, -20], [1, 0]);
  const upOpacity = useTransform(y, [-THRESHOLD, -20], [1, 0]);

  const flyOut = useCallback(
    async (dir: SwipeDirection) => {
      const w = typeof window !== "undefined" ? window.innerWidth : 400;
      const target = dir === "left" ? { x: -w * 1.2, y: 40 } : dir === "right" ? { x: w * 1.2, y: 40 } : { x: 0, y: -900 };
      const opts = { duration: reduce ? 0.01 : 0.28, ease: "easeOut" as const };
      await Promise.all([animate(x, target.x, opts), animate(y, target.y, opts)]);
    },
    [reduce, x, y],
  );

  useEffect(() => {
    if (!forced) return;
    let cancelled = false;
    flyOut(forced).then(() => !cancelled && onDone(forced));
    return () => {
      cancelled = true;
    };
  }, [forced, flyOut, onDone]);

  return (
    <motion.div
      className="absolute inset-0 cursor-grab touch-none rounded-[2rem] border border-line bg-white shadow-xl active:cursor-grabbing"
      style={{ x, y, rotate }}
      drag={!forced}
      onTap={onTap}
      dragElastic={0.9}
      dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
      dragSnapToOrigin={false}
      onDragEnd={async (_, info) => {
        const { offset, velocity } = info;
        let dir: SwipeDirection | null = null;
        if (offset.y < -THRESHOLD && Math.abs(offset.y) > Math.abs(offset.x)) dir = "up";
        else if (offset.x > THRESHOLD || velocity.x > VELOCITY) dir = "right";
        else if (offset.x < -THRESHOLD || velocity.x < -VELOCITY) dir = "left";
        else if (velocity.y < -VELOCITY) dir = "up";
        if (dir) {
          onLock();
          await flyOut(dir);
          onDragDecided(dir);
        } else {
          animate(x, 0, { type: "spring", stiffness: 500, damping: 30 });
          animate(y, 0, { type: "spring", stiffness: 500, damping: 30 });
        }
      }}
    >
      {children}
      <motion.span style={{ opacity: yesOpacity }} className="pointer-events-none absolute left-5 top-14 -rotate-12 rounded-xl border-4 border-success px-3 py-1 text-xl font-extrabold uppercase text-success">
        {labels.right}
      </motion.span>
      <motion.span style={{ opacity: noOpacity }} className="pointer-events-none absolute right-5 top-14 rotate-12 rounded-xl border-4 border-danger px-3 py-1 text-xl font-extrabold uppercase text-danger">
        {labels.left}
      </motion.span>
      <motion.span style={{ opacity: upOpacity }} className="pointer-events-none absolute inset-x-0 bottom-8 mx-auto w-max rounded-xl border-4 border-amber-400 px-3 py-1 text-xl font-extrabold uppercase text-amber-500">
        {labels.up}
      </motion.span>
    </motion.div>
  );
}
