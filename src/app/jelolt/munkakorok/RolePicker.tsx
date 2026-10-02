"use client";

import { useState, useTransition } from "react";
import { saveTargetRoles } from "../actions";
import { Button } from "@/components/ui/Button";
import { IconCheck } from "@/components/ui/Icons";

export function RolePicker({ templates, selected }: { templates: { id: number; name: string; description: string | null }[]; selected: number[] }) {
  const [chosen, setChosen] = useState<number[]>(selected);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const toggle = (id: number) => setChosen((c) => (c.includes(id) ? c.filter((x) => x !== id) : [...c, id]));

  return (
    <div className="space-y-5">
      <ul className="grid grid-cols-2 gap-3">
        {templates.map((t) => {
          const on = chosen.includes(t.id);
          return (
            <li key={t.id}>
              <button
                type="button"
                aria-pressed={on}
                onClick={() => toggle(t.id)}
                className={`relative flex h-full min-h-24 w-full flex-col rounded-3xl border p-4 text-left transition ${on ? "border-brand bg-brand/5" : "border-line"}`}
              >
                <span className="pr-7 font-semibold">{t.name}</span>
                <span className="mt-1 line-clamp-2 text-xs text-muted">{t.description}</span>
                {on && (
                  <span className="absolute right-3 top-3 grid size-6 place-items-center rounded-full bg-brand text-white">
                    <IconCheck className="size-4" />
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>
      {error && <p className="text-sm text-danger">{error}</p>}
      <div className="sticky bottom-20 -mx-4 bg-white/95 px-4 py-3 backdrop-blur">
        <Button
          className="w-full"
          disabled={!chosen.length || pending}
          onClick={() =>
            start(async () => {
              const res = await saveTargetRoles(chosen);
              if (res?.error) setError(res.error);
            })
          }
        >
          {pending ? "Mentés…" : `Tovább a kártyákhoz${chosen.length ? ` (${chosen.length} munkakör)` : ""}`}
        </Button>
      </div>
    </div>
  );
}
