import Link from "next/link";
import type { Metadata } from "next";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { NotificationList } from "@/components/notifications/NotificationList";
import { CANDIDATE_STATUS_LABELS, CHAT_OPEN, STATUS_TONE } from "@/lib/applications";
import { formatDate } from "@/lib/format";

export const metadata: Metadata = { title: "Jelentkezéseim" };

export default async function MyApplicationsPage() {
  const user = await requireRole(["candidate"], "/jelolt/jelentkezesek");
  const supabase = await createClient();
  const [{ data: apps }, { data: notifications }, { data: conversations }] = await Promise.all([
    supabase
      .from("applications")
      .select("id, status, created_at, match_score, jobs(slug, title, companies(name), venues(name, settlements(name)))")
      .eq("candidate_id", user.id)
      .order("created_at", { ascending: false }),
    supabase.from("notifications").select("id, title, body, link, created_at, read_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(10),
    supabase.rpc("my_conversations"),
  ]);
  const unread = new Map((conversations ?? []).map((c) => [c.application_id, c.unread ?? 0]));

  return (
    <div className="space-y-6">
      <PageHeader title="Jelentkezéseim" subtitle="Minden jelentkezésre 5 napon belül választ kapsz." />
      <NotificationList items={notifications ?? []} />
      <section className="space-y-3">
        {!apps?.length ? (
          <div className="space-y-3 rounded-3xl bg-soft p-6 text-center">
            <p className="text-muted">Még nem jelentkeztél állásra.</p>
            <ButtonLink href="/jelolt/allaskereses" className="w-full">
              Álláskeresés
            </ButtonLink>
          </div>
        ) : (
          <ul className="space-y-3">
            {apps.map((a) => {
              const chat = CHAT_OPEN.includes(a.status);
              const n = unread.get(a.id) ?? 0;
              return (
                <li key={a.id} className="rounded-3xl border border-line p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Link href={a.jobs ? `/allasok/${a.jobs.slug}` : "#"} className="font-semibold hover:text-brand">
                        {a.jobs?.title ?? "Állás"}
                      </Link>
                      <p className="truncate text-sm text-muted">
                        {a.jobs?.companies?.name} · {a.jobs?.venues?.settlements?.name}
                      </p>
                    </div>
                    <Badge tone={STATUS_TONE[a.status]}>{CANDIDATE_STATUS_LABELS[a.status]}</Badge>
                  </div>
                  <div className="mt-3 flex items-center justify-between text-sm">
                    <span className="text-muted">
                      {formatDate(a.created_at)}
                      {a.match_score != null && ` · ${Math.round(a.match_score)}% illeszkedés`}
                    </span>
                    {chat && (
                      <Link href={`/uzenetek/${a.id}`} className="rounded-full bg-brand px-4 py-2 font-semibold text-white">
                        Chat{n > 0 ? ` (${n})` : ""}
                      </Link>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
