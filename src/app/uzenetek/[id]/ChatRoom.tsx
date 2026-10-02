"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { sendMessage, type SentMessage } from "../actions";

const time = new Intl.DateTimeFormat("hu-HU", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Budapest" });
const day = new Intl.DateTimeFormat("hu-HU", { month: "long", day: "numeric", weekday: "short", timeZone: "Europe/Budapest" });

/** Egyszerű szöveges chat Supabase Realtime-mal: új üzenetek élőben, olvasottsági jelzés (✓ elküldve, ✓✓ olvasva). */
export function ChatRoom({
  applicationId,
  meId,
  counterpart,
  initial,
  open,
  closedText,
}: {
  applicationId: string;
  meId: string;
  counterpart: string;
  initial: SentMessage[];
  open: boolean;
  closedText: string;
}) {
  const [messages, setMessages] = useState<SentMessage[]>(initial);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [live, setLive] = useState(false);
  const [pending, start] = useTransition();
  const bottom = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottom.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    const upsert = (m: SentMessage) =>
      setMessages((list) => {
        const i = list.findIndex((x) => x.id === m.id);
        if (i === -1) return [...list, m].sort((a, b) => a.created_at.localeCompare(b.created_at));
        const copy = list.slice();
        copy[i] = { ...copy[i], ...m };
        return copy;
      });

    const markRead = (id: string) =>
      supabase.from("messages").update({ read_at: new Date().toISOString() }).eq("id", id).is("read_at", null).then(() => undefined);

    (async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) await supabase.realtime.setAuth(data.session.access_token);
      if (cancelled) return;
      channel = supabase
        .channel(`chat:${applicationId}`)
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `application_id=eq.${applicationId}` }, (payload) => {
          const m = payload.new as SentMessage;
          upsert(m);
          if (m.sender_id !== meId && document.visibilityState === "visible") markRead(m.id);
        })
        .on("postgres_changes", { event: "UPDATE", schema: "public", table: "messages", filter: `application_id=eq.${applicationId}` }, (payload) => {
          upsert(payload.new as SentMessage);
        })
        .subscribe((status) => setLive(status === "SUBSCRIBED"));
    })();

    // visszatéréskor a háttérben érkezett üzenetek olvasottak
    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      setMessages((list) => {
        list.filter((m) => m.sender_id !== meId && !m.read_at).forEach((m) => markRead(m.id));
        return list;
      });
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisible);
      if (channel) supabase.removeChannel(channel);
    };
  }, [applicationId, meId]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const body = draft.trim();
    if (!body) return;
    setError(null);
    start(async () => {
      const r = await sendMessage(applicationId, body);
      if (!r.ok) {
        setError(r.error);
        return;
      }
      setDraft("");
      setMessages((list) => (list.some((m) => m.id === r.message.id) ? list : [...list, r.message]));
    });
  }

  const days = messages.map((m) => day.format(new Date(m.created_at)));
  const lastMine = [...messages].reverse().find((m) => m.sender_id === meId);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 space-y-1.5 overflow-y-auto rounded-3xl bg-soft p-3" aria-live="polite">
        {messages.length === 0 && (
          <p className="py-8 text-center text-sm text-muted">{open ? `Írj elsőként ${counterpart} részére!` : closedText}</p>
        )}
        {messages.map((m, i) => {
          const mine = m.sender_id === meId;
          const d = days[i];
          const showDay = i === 0 || d !== days[i - 1];
          return (
            <div key={m.id}>
              {showDay && <p className="py-2 text-center text-xs font-semibold text-muted">{d}</p>}
              <div className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[80%] rounded-2xl px-3.5 py-2 ${mine ? "rounded-br-md bg-brand text-white" : "rounded-bl-md bg-white text-ink"}`}>
                  <p className="whitespace-pre-wrap break-words text-[15px]">{m.body}</p>
                  <p className={`mt-0.5 text-right text-[11px] ${mine ? "text-white/70" : "text-muted"}`}>
                    {time.format(new Date(m.created_at))}
                    {mine && <span aria-label={m.read_at ? "Olvasva" : "Elküldve"}> {m.read_at ? "✓✓" : "✓"}</span>}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
        {lastMine?.read_at && <p className="pr-1 text-right text-[11px] text-muted">Olvasva</p>}
        <div ref={bottom} />
      </div>

      {open ? (
        <form onSubmit={submit} className="mt-3 flex items-end gap-2">
          <label htmlFor="chat-input" className="sr-only">
            Üzenet
          </label>
          <textarea
            id="chat-input"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                e.currentTarget.form?.requestSubmit();
              }
            }}
            rows={1}
            maxLength={2000}
            placeholder="Üzenet…"
            className="max-h-32 min-h-12 flex-1 resize-none rounded-2xl border border-line bg-white px-4 py-3 text-base outline-none focus:border-brand"
          />
          <button type="submit" disabled={pending || !draft.trim()} className="min-h-12 rounded-2xl bg-brand px-5 font-semibold text-white disabled:opacity-50">
            Küldés
          </button>
        </form>
      ) : (
        <p className="mt-3 rounded-2xl bg-soft px-4 py-3 text-center text-sm text-muted">{closedText}</p>
      )}
      <div className="mt-1 flex justify-between text-xs text-muted">
        <span>{error && <span className="text-danger">{error}</span>}</span>
        <span>{live ? "● élő" : "kapcsolódás…"}</span>
      </div>
    </div>
  );
}
