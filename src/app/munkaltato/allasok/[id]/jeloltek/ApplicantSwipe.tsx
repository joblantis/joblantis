"use client";

/* eslint-disable @next/next/no-img-element -- aláírt, lejáró URL */
import Link from "next/link";
import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { SwipeDeck, type SwipeDirection } from "@/components/swipe/SwipeDeck";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { formatDistance } from "@/lib/format";
import { explainMatch, scoreTone } from "@/lib/match";
import type { ApplicantCard } from "@/lib/employer/applicants";
import { setApplicationStatus } from "@/app/munkaltato/jelentkezes/actions";

const LABELS = { left: "Elutasítom", right: "Érdekel", up: "Később" };
const TONE_BG = { success: "bg-success", brand: "bg-brand", warning: "bg-amber-500" } as const;

type Feedback = { kind: "chat"; card: ApplicantCard } | { kind: "info" | "error"; text: string };

export function ApplicantSwipe({ jobId, cards: initial }: { jobId: string; cards: ApplicantCard[] }) {
  // a "Később" kártyák a pakli végére kerülnek
  const [cards, setCards] = useState(initial);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const router = useRouter();

  const onSwipe = useCallback((card: ApplicantCard, dir: SwipeDirection) => {
    if (dir === "up") {
      setCards((list) => [...list, { ...card, applicationId: card.applicationId }]);
      setFeedback({ kind: "info", text: `${card.name} a pakli végére került.` });
      return;
    }
    const status = dir === "right" ? "viewed" : "rejected";
    if (dir === "right") setFeedback({ kind: "chat", card });
    else setFeedback({ kind: "info", text: `${card.name} udvarias értesítést kap az elutasításról.` });
    setApplicationStatus(card.applicationId, status).then((r) => {
      if (!r.ok) setFeedback({ kind: "error", text: r.error });
    });
  }, []);

  return (
    <div className="space-y-4">
      <p className="text-center text-sm text-muted">
        <b className="text-success">Jobbra</b>: érdekel, megnyílik a chat · <b className="text-danger">balra</b>: elutasítás · <b className="text-amber-500">fel</b>: később
      </p>
      <SwipeDeck
        cards={cards}
        getKey={(c) => `${c.applicationId}-${cards.indexOf(c)}`}
        renderCard={(c) => <ApplicantFace card={c} />}
        onSwipe={onSwipe}
        labels={LABELS}
        onTap={(c) => router.push(`/munkaltato/jelentkezes/${c.applicationId}`)}
        heightClass="h-[min(66svh,600px)] min-h-[26rem]"
        empty={
          <div className="space-y-3 rounded-3xl bg-soft p-6 text-center">
            <p className="text-lg font-bold">{initial.length ? "Minden új jelöltet átnéztél" : "Még nincs új jelentkező"}</p>
            <p className="text-sm text-muted">A továbbjutottakat a pipeline-ban kezelheted. Minden jelentkezésre 5 napon belül kell válaszolni.</p>
            <ButtonLink href={`/munkaltato/allasok/${jobId}/pipeline`} className="w-full">
              Pipeline megnyitása
            </ButtonLink>
          </div>
        }
      />
      {feedback?.kind === "chat" && (
        <div role="status" className="space-y-2 rounded-2xl bg-success/10 px-4 py-3 text-sm">
          <p className="font-semibold text-success">{feedback.card.name} átkerült a „megnézve” oszlopba – megnyílt a chat.</p>
          <div className="flex gap-2">
            <Link href={`/uzenetek/${feedback.card.applicationId}`} className="flex-1 rounded-xl bg-brand py-2.5 text-center font-semibold text-white">
              Üzenet írása
            </Link>
            <button type="button" onClick={() => setFeedback(null)} className="flex-1 rounded-xl border border-line bg-white py-2.5 font-semibold">
              Következő jelölt
            </button>
          </div>
        </div>
      )}
      {feedback && feedback.kind !== "chat" && (
        <p role="status" className={`rounded-2xl px-4 py-3 text-center text-sm ${feedback.kind === "error" ? "bg-danger/10 text-danger" : "bg-soft text-muted"}`}>
          {feedback.text}
        </p>
      )}
    </div>
  );
}

function ApplicantFace({ card }: { card: ApplicantCard }) {
  const m = card.match;
  const tone = m ? scoreTone(m) : "brand";
  const reasons = m ? explainMatch(m, "employer").filter((r) => r.tone !== "info").slice(0, 3) : [];
  const [playing, setPlaying] = useState(false);
  const stop = (e: React.PointerEvent) => e.stopPropagation();

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-[2rem]">
      <div className="relative h-[38%] shrink-0 bg-ink">
        {card.introVideo ? (
          playing ? (
            <video src={card.introVideo.url} autoPlay controls playsInline className="size-full object-contain" onPointerDownCapture={stop} />
          ) : (
            <button type="button" onClick={() => setPlaying(true)} onPointerDownCapture={stop} className="relative block size-full" aria-label="Bemutatkozó videó lejátszása">
              {card.introVideo.poster && <img src={card.introVideo.poster} alt="" draggable={false} className="size-full object-cover" />}
              <span className="absolute inset-0 grid place-items-center">
                <span className="grid size-14 place-items-center rounded-full bg-white/90 text-xl text-brand shadow">▶</span>
              </span>
            </button>
          )
        ) : (
          <div className="grid size-full place-items-center bg-brand/90 text-5xl font-extrabold text-white">{card.name.slice(0, 1).toUpperCase()}</div>
        )}
        {m && (
          <span className={`absolute bottom-3 right-3 rounded-2xl px-3 py-1.5 text-lg font-extrabold text-white shadow ${TONE_BG[tone]}`}>{Math.round(m.score)}%</span>
        )}
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden p-4">
        <div>
          <h2 className="text-xl font-bold leading-tight">{card.name}</h2>
          <p className="truncate text-sm text-muted">
            {[card.headline, card.place, formatDistance(m?.distance_km)].filter(Boolean).join(" · ")}
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {card.skills.slice(0, 6).map((s) => (
            <Badge key={s.name} tone={s.verified ? "success" : "neutral"}>
              {s.verified ? "✓ " : ""}
              {s.name}
            </Badge>
          ))}
          {card.skills.length > 6 && <Badge>+{card.skills.length - 6}</Badge>}
        </div>
        <ul className="space-y-0.5 text-xs">
          {reasons.map((r) => (
            <li key={r.text} className={r.tone === "missing" ? "text-danger" : r.tone === "verified" ? "text-brand" : "text-success"}>
              {r.text}
            </li>
          ))}
        </ul>
        <div className="mt-auto flex items-center gap-2">
          <div className="flex gap-1">
            {card.galleryPreview.map((g, i) => (
              <span key={i} className="relative size-10 overflow-hidden rounded-lg bg-soft">
                <img src={g.url} alt="" draggable={false} loading="lazy" className="pointer-events-none size-full object-cover" />
                {g.video && <span className="absolute inset-0 grid place-items-center text-xs text-white">▶</span>}
              </span>
            ))}
          </div>
          <span className="text-xs text-muted">
            {card.galleryCount ? `${card.galleryCount} fotó/videó` : "Nincs galéria"} · {card.referenceCount} ajánlás
          </span>
          <Link
            href={`/munkaltato/jelentkezes/${card.applicationId}`}
            onPointerDownCapture={stop}
            className="ml-auto shrink-0 rounded-full bg-soft px-3 py-1.5 text-sm font-semibold text-brand"
          >
            Profil →
          </Link>
        </div>
      </div>
    </div>
  );
}
