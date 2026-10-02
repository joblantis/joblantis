import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/PageHeader";

export const metadata: Metadata = { title: "Üzenetek" };

const when = new Intl.DateTimeFormat("hu-HU", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Budapest" });

export default async function MessagesPage() {
  const user = await getSessionUser();
  if (!user) redirect("/belepes?next=/uzenetek");
  const supabase = await createClient();
  const { data } = await supabase.rpc("my_conversations");
  const list = (data ?? []).filter((c) => c.application_id);

  return (
    <div>
      <PageHeader title="Üzenetek" />
      {!list.length ? (
        <p className="rounded-3xl bg-soft p-6 text-center text-muted">
          {user.profile.role === "candidate"
            ? "Még nincs beszélgetésed. A chat akkor nyílik meg, amikor egy munkáltató érdeklődik a jelentkezésed iránt."
            : "Még nincs beszélgetés. A jelöltkártyákon jobbra húzva nyílik meg a chat."}
        </p>
      ) : (
        <ul className="divide-y divide-line rounded-3xl border border-line">
          {list.map((c) => {
            const mine = c.candidate_id === user.id;
            const title = mine ? c.company_name : c.candidate_name || "Jelölt";
            const unread = c.unread ?? 0;
            return (
              <li key={c.application_id}>
                <Link href={`/uzenetek/${c.application_id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-soft">
                  <span className="grid size-11 shrink-0 place-items-center rounded-full bg-brand/10 font-bold text-brand">
                    {(title ?? "?").slice(0, 1).toUpperCase()}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline justify-between gap-2">
                      <span className={`truncate ${unread ? "font-bold" : "font-semibold"}`}>{title}</span>
                      {c.last_at && <span className="shrink-0 text-xs text-muted">{when.format(new Date(c.last_at))}</span>}
                    </span>
                    <span className="block truncate text-xs text-muted">{c.job_title}</span>
                    <span className={`block truncate text-sm ${unread ? "text-ink" : "text-muted"}`}>
                      {c.last_body ? `${c.last_sender === user.id ? "Te: " : ""}${c.last_body}` : "Még nincs üzenet – írj elsőként!"}
                    </span>
                  </span>
                  {unread > 0 && <span className="rounded-full bg-brand px-2 py-0.5 text-xs font-bold text-white">{unread}</span>}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
