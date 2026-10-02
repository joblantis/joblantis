"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { APPLICATION_STATUS_LABELS, EMPLOYER_SETTABLE } from "@/lib/applications";
import type { Enums } from "@/types/database";
import { setApplicationStatus } from "../actions";

/** Státusz gombok: érdekel (chat), próbanap, ajánlat, felvéve, elutasítás. */
export function StatusActions({ applicationId, status }: { applicationId: string; status: Enums<"application_status"> }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  if (status === "auto_closed") return <p className="text-sm text-muted">A jelentkezés 5 nap válasz nélkül automatikusan lezárult.</p>;

  const set = (next: Enums<"application_status">) =>
    start(async () => {
      if (next === "rejected" && !confirm("Biztosan elutasítod? A jelölt udvarias értesítést kap.")) return;
      const r = await setApplicationStatus(applicationId, next);
      if (!r.ok) setError(r.error);
      else router.refresh();
    });

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-3 gap-2">
        {EMPLOYER_SETTABLE.map((s) => (
          <button
            key={s}
            type="button"
            disabled={pending || s === status}
            onClick={() => set(s)}
            className={`min-h-12 rounded-2xl border px-2 text-sm font-semibold transition disabled:opacity-60 ${
              s === status
                ? "border-brand bg-brand text-white"
                : s === "rejected"
                  ? "border-danger/30 text-danger hover:bg-danger/5"
                  : "border-line hover:border-brand"
            }`}
          >
            {s === "viewed" ? "Érdekel" : APPLICATION_STATUS_LABELS[s]}
          </button>
        ))}
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}
    </div>
  );
}
