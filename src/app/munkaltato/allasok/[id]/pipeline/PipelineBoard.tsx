"use client";

import Link from "next/link";
import { useOptimistic, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { APPLICATION_STATUS_LABELS, EMPLOYER_SETTABLE, PIPELINE } from "@/lib/applications";
import { formatDate, formatDistance } from "@/lib/format";
import type { Enums } from "@/types/database";
import { setApplicationStatus } from "@/app/munkaltato/jelentkezes/actions";

export type PipelineItem = {
  applicationId: string;
  name: string;
  status: Enums<"application_status">;
  score: number | null;
  missingRequired: number;
  verified: number;
  distanceKm: number | null;
  createdAt: string;
  responseDueAt: string;
  unread: number;
};

const column = (s: Enums<"application_status">) => (s === "auto_closed" ? "rejected" : s);

/** Kanban: új, megnézve, próbanap, ajánlat, felvéve, elutasítva. Telefonon vízszintesen lapozható oszlopok. */
export function PipelineBoard({ items }: { items: PipelineItem[] }) {
  const [optimistic, move] = useOptimistic(items, (list, a: { id: string; status: Enums<"application_status"> }) =>
    list.map((i) => (i.applicationId === a.id ? { ...i, status: a.status } : i)),
  );
  const [, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const change = (id: string, status: Enums<"application_status">) =>
    start(async () => {
      if (status === "rejected" && !confirm("Biztosan elutasítod? A jelölt udvarias értesítést kap.")) return;
      move({ id, status });
      const r = await setApplicationStatus(id, status);
      if (!r.ok) setError(r.error);
      router.refresh();
    });

  return (
    <div className="space-y-2">
      {error && <p className="text-sm text-danger">{error}</p>}
      <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-4">
        {PIPELINE.map((col) => {
          const list = optimistic.filter((i) => column(i.status) === col);
          return (
            <section key={col} className="w-[78%] max-w-72 shrink-0 snap-start rounded-3xl bg-soft p-3" aria-label={APPLICATION_STATUS_LABELS[col]}>
              <h2 className="mb-2 flex items-center justify-between px-1 font-bold">
                {APPLICATION_STATUS_LABELS[col]}
                <span className="rounded-full bg-white px-2 py-0.5 text-xs text-muted">{list.length}</span>
              </h2>
              <ul className="space-y-2">
                {list.length === 0 && <li className="px-1 py-4 text-center text-sm text-muted">Üres</li>}
                {list.map((i) => {
                  const overdue = i.status === "new" && new Date(i.responseDueAt) < new Date();
                  return (
                    <li key={i.applicationId} className="rounded-2xl bg-white p-3 shadow-sm">
                      <Link href={`/munkaltato/jelentkezes/${i.applicationId}`} className="block">
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-semibold leading-tight">{i.name}</p>
                          {i.score != null && (
                            <span className={`rounded-lg px-2 py-0.5 text-sm font-bold text-white ${i.missingRequired ? "bg-amber-500" : "bg-brand"}`}>
                              {Math.round(i.score)}
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-xs text-muted">
                          {[
                            i.missingRequired ? `${i.missingRequired} kötelező hiányzik` : "Kötelezők megvannak",
                            i.verified ? `${i.verified} igazolt` : null,
                            formatDistance(i.distanceKm),
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                        </p>
                        <p className={`mt-1 text-xs ${overdue ? "font-semibold text-danger" : "text-muted"}`}>
                          {i.status === "new" ? `Válasz eddig: ${formatDate(i.responseDueAt)}` : `Jelentkezett: ${formatDate(i.createdAt)}`}
                          {i.status === "auto_closed" && " · automatikusan lezárva"}
                        </p>
                      </Link>
                      <div className="mt-2 flex items-center gap-2">
                        <label className="sr-only" htmlFor={`move-${i.applicationId}`}>
                          Áthelyezés
                        </label>
                        <select
                          id={`move-${i.applicationId}`}
                          value=""
                          disabled={i.status === "auto_closed"}
                          onChange={(e) => e.target.value && change(i.applicationId, e.target.value as Enums<"application_status">)}
                          className="min-h-10 flex-1 rounded-xl border border-line bg-white px-2 text-sm"
                        >
                          <option value="">Áthelyezés…</option>
                          {EMPLOYER_SETTABLE.filter((s) => s !== i.status).map((s) => (
                            <option key={s} value={s}>
                              → {s === "viewed" ? "Megnézve (chat)" : APPLICATION_STATUS_LABELS[s]}
                            </option>
                          ))}
                        </select>
                        {(i.status === "viewed" || i.status === "trial") && (
                          <Link href={`/munkaltato/jelentkezes/${i.applicationId}#probanap`} className="min-h-10 rounded-xl bg-soft px-3 py-2 text-sm font-semibold" aria-label="Próbanap">
                            📅
                          </Link>
                        )}
                        {i.status !== "new" && i.status !== "rejected" && i.status !== "auto_closed" && (
                          <Link href={`/uzenetek/${i.applicationId}`} className="min-h-10 rounded-xl bg-brand/10 px-3 py-2 text-sm font-semibold text-brand">
                            Chat{i.unread ? ` (${i.unread})` : ""}
                          </Link>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}
