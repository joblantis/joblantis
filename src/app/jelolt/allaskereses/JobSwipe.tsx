"use client";

/* eslint-disable @next/next/no-img-element -- aláírt, lejáró URL */
import Link from "next/link";
import { useCallback, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { SwipeDeck, type SwipeDirection } from "@/components/swipe/SwipeDeck";
import { Badge } from "@/components/ui/Badge";
import { Button, ButtonLink } from "@/components/ui/Button";
import { IconClock, IconPin, IconWallet } from "@/components/ui/Icons";
import { formatDistance, formatShifts, formatWage } from "@/lib/format";
import { scoreTone, type MatchDetails } from "@/lib/match";
import type { Enums } from "@/types/database";
import { resetSkippedJobs, swipeJob } from "../jelentkezesek/actions";

export type JobSwipeCard = {
  id: string;
  slug: string;
  title: string;
  company: string;
  venue: string;
  place: string;
  role: string;
  seasonal: boolean;
  wageMin: number | null;
  wageMax: number | null;
  wagePeriod: Enums<"wage_period">;
  shifts: Enums<"shift_type">[];
  coverUrl: string | null;
  match: MatchDetails;
};

const LABELS = { left: "Kihagy", right: "Jelentkezem", up: "Mentés" };
const TONE_BG = { success: "bg-success", brand: "bg-brand", warning: "bg-amber-500" } as const;

type Toast = { tone: "ok" | "error"; text: string; href?: string };

export function JobSwipe({ cards }: { cards: JobSwipeCard[] }) {
  const [toast, setToast] = useState<Toast | null>(null);
  const [resetting, startReset] = useTransition();
  const router = useRouter();

  const onSwipe = useCallback((card: JobSwipeCard, dir: SwipeDirection) => {
    swipeJob(card.id, dir).then((r) => {
      if (!r.ok) setToast({ tone: "error", text: r.error });
      else if (dir === "right") setToast({ tone: "ok", text: `Jelentkeztél: ${card.title} – ${card.company}`, href: "/jelolt/jelentkezesek" });
      else if (dir === "up") setToast({ tone: "ok", text: `Elmentve: ${card.title}`, href: "/jelolt/mentett" });
      else setToast(null);
    });
  }, []);

  return (
    <div className="space-y-4">
      <p className="text-center text-sm text-muted">
        <b className="text-success">Jobbra</b>: jelentkezem · <b className="text-danger">balra</b>: kihagyom · <b className="text-amber-500">felfelé</b>: mentés
      </p>
      <SwipeDeck
        cards={cards}
        getKey={(c) => c.id}
        renderCard={(c) => <JobSwipeFace card={c} />}
        onSwipe={onSwipe}
        labels={LABELS}
        onTap={(c) => router.push(`/allasok/${c.slug}`)}
        heightClass="h-[min(62svh,560px)] min-h-96"
        empty={
          <div className="space-y-3 rounded-3xl bg-soft p-6 text-center">
            <p className="text-lg font-bold">{cards.length ? "Végigértél a listán!" : "Most nincs új állás a környékeden"}</p>
            <p className="text-sm text-muted">Bővítsd a távolságot vagy a munkaköröket, nézd meg a listát, vagy hozd vissza a kihagyottakat.</p>
            <ButtonLink href="/jelolt/allaskereses?tav=300" variant="secondary" className="w-full">
              Keresés 300 km-ig
            </ButtonLink>
            <ButtonLink href="/jelolt/mentett" variant="secondary" className="w-full">
              Mentett állások
            </ButtonLink>
            <Button
              variant="ghost"
              className="w-full"
              disabled={resetting}
              onClick={() =>
                startReset(async () => {
                  await resetSkippedJobs();
                  window.location.reload();
                })
              }
            >
              Kihagyott állások visszahozása
            </Button>
          </div>
        }
      />
      {toast && (
        <p
          role="status"
          className={`rounded-2xl px-4 py-3 text-center text-sm font-medium ${toast.tone === "ok" ? "bg-success/10 text-success" : "bg-danger/10 text-danger"}`}
        >
          {toast.text}
          {toast.href && (
            <Link href={toast.href} className="ml-2 font-semibold underline">
              Megnézem
            </Link>
          )}
        </p>
      )}
    </div>
  );
}

function JobSwipeFace({ card }: { card: JobSwipeCard }) {
  const m = card.match;
  const tone = scoreTone(m);
  const distance = formatDistance(m.distance_km);
  return (
    <div className="flex h-full flex-col overflow-hidden rounded-[2rem]">
      <div className="relative h-[42%] shrink-0 bg-soft">
        {card.coverUrl ? (
          <img src={card.coverUrl} alt="" draggable={false} className="pointer-events-none size-full object-cover" />
        ) : (
          <div className="grid size-full place-items-center text-3xl font-extrabold tracking-[0.12em] text-brand/15">JOBLANTIS</div>
        )}
        <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
          <Badge tone="brand">{card.role}</Badge>
          {card.seasonal && <Badge tone="warning">Szezonális</Badge>}
        </div>
        <span className={`absolute bottom-3 right-3 rounded-2xl px-3 py-1.5 text-lg font-extrabold text-white shadow ${TONE_BG[tone]}`}>
          {Math.round(m.score)}%
        </span>
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-2 p-5">
        <div>
          <h2 className="text-xl font-bold leading-tight">{card.title}</h2>
          <p className="truncate text-sm text-muted">
            {card.company} · {card.venue}
          </p>
        </div>
        <ul className="space-y-1 text-sm">
          <li className="flex items-center gap-2">
            <IconWallet className="size-4 shrink-0 text-brand" /> {formatWage(card.wageMin, card.wageMax, card.wagePeriod)}
          </li>
          <li className="flex items-center gap-2">
            <IconClock className="size-4 shrink-0 text-brand" /> {formatShifts(card.shifts)}
          </li>
          <li className="flex items-center gap-2">
            <IconPin className="size-4 shrink-0 text-brand" /> {card.place}
            {distance && <span className="text-muted">· {distance}</span>}
          </li>
        </ul>
        <p className={`rounded-xl px-3 py-2 text-sm font-semibold ${m.missing_required ? "bg-amber-100 text-amber-800" : "bg-success/10 text-success"}`}>
          Kötelező kompetenciák: {m.required_met}/{m.required_total} teljesül nálad
          {m.required_verified > 0 && <span className="font-normal"> · {m.required_verified} igazolt</span>}
        </p>
        <Link
          href={`/allasok/${card.slug}`}
          className="mt-auto self-center rounded-full px-4 py-1.5 text-sm font-semibold text-brand hover:bg-soft"
          onPointerDownCapture={(e) => e.stopPropagation()}
        >
          Részletek és indoklás →
        </Link>
      </div>
    </div>
  );
}
