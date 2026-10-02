"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { finalizeCards, saveSwipeAnswer } from "../actions";
import { SwipeDeck, type SwipeDirection } from "@/components/swipe/SwipeDeck";
import { Button } from "@/components/ui/Button";

export type DeckCard = { key: string; ids: number[]; statement: string; label: string };

const SKILL_LABELS = { left: "Nem", right: "Megy", up: "Erős vagyok" };
const STYLE_LABELS = { left: "Nem igaz", right: "Igaz", up: "Nagyon igaz" };

export function CardDeck({ skillCards, styleCards }: { skillCards: DeckCard[]; styleCards: DeckCard[] }) {
  const [phase, setPhase] = useState<"skills" | "styles" | "saving" | "nothing">(
    skillCards.length ? "skills" : styleCards.length ? "styles" : "nothing",
  );
  const [error, setError] = useState<string | null>(null);
  const pending = useRef<Promise<unknown>[]>([]);
  const router = useRouter();

  const record = useCallback((card: DeckCard, dir: SwipeDirection) => {
    pending.current.push(
      saveSwipeAnswer(card.ids, dir).then((r) => {
        if (r.error) setError(r.error);
      }),
    );
  }, []);

  const finish = useCallback(async () => {
    setPhase("saving");
    await Promise.all(pending.current);
    const res = await finalizeCards();
    if (res?.error) {
      setError(res.error);
      return;
    }
    router.push("/jelolt/alapadatok");
  }, [router]);

  const render = (card: DeckCard) => (
    <div className="flex h-full flex-col p-7">
      <span className="text-xs font-bold uppercase tracking-wider text-brand">{card.label}</span>
      <p className="my-auto text-center text-2xl font-bold leading-snug">{card.statement}</p>
      <p className="text-center text-xs text-muted">Húzd jobbra, balra vagy felfelé</p>
    </div>
  );

  if (phase === "nothing") {
    return (
      <div className="space-y-3 rounded-3xl bg-soft p-6 text-center">
        <p className="font-semibold">Minden kártyára válaszoltál.</p>
        <Button className="w-full" onClick={finish}>
          Profil frissítése és tovább
        </Button>
        <a href="/jelolt/kartyak?ujra=1" className="block py-2 text-sm font-semibold text-brand">
          Kártyák újrakezdése
        </a>
      </div>
    );
  }

  if (phase === "saving") {
    return (
      <div className="space-y-4 rounded-3xl bg-soft p-6 text-center">
        <p className="font-semibold">{error ? "Hiba történt" : "Profil összeállítása…"}</p>
        {error && (
          <>
            <p className="text-sm text-danger">{error}</p>
            <Button onClick={finish}>Újrapróbálom</Button>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {phase === "skills" ? (
        <>
          <p className="text-center text-sm text-muted">
            <b className="text-success">Jobbra</b>: ez megy · <b className="text-danger">balra</b>: nem · <b className="text-amber-500">felfelé</b>: ebben erős vagyok
          </p>
          <SwipeDeck
            key="skills"
            cards={skillCards}
            getKey={(c) => c.key}
            renderCard={render}
            onSwipe={record}
            labels={SKILL_LABELS}
            empty={
              <div className="space-y-4 rounded-3xl bg-soft p-6 text-center">
                <p className="text-lg font-bold">Szakmai kártyák kész!</p>
                <p className="text-sm text-muted">Most jön {styleCards.length} rövid kérdés a munkastílusodról. Ez legfeljebb 20%-ban számít.</p>
                <Button className="w-full" onClick={() => (styleCards.length ? setPhase("styles") : finish())}>
                  Tovább
                </Button>
              </div>
            }
          />
        </>
      ) : (
        <SwipeDeck
          key="styles"
          cards={styleCards}
          getKey={(c) => c.key}
          renderCard={render}
          onSwipe={record}
          labels={STYLE_LABELS}
          empty={
            <div className="space-y-4 rounded-3xl bg-soft p-6 text-center">
              <p className="text-lg font-bold">Megvan minden válasz!</p>
              <Button className="w-full" onClick={finish}>
                Profil összeállítása
              </Button>
            </div>
          }
        />
      )}
      {error && <p className="text-center text-sm text-danger">{error}</p>}
    </div>
  );
}
