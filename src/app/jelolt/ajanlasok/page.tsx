import type { Metadata } from "next";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { ReferenceCard, formatPeriod, type ReferenceView } from "@/components/references/ReferenceCard";
import { formatDate } from "@/lib/format";
import { ReferenceRequestForm } from "./ReferenceRequestForm";
import { CancelRequestButton, ReferenceActions } from "./ReferenceActions";

export const metadata: Metadata = { title: "Ajánlások" };

const REQUEST_STATUS = { pending: "Elküldve", reminded: "Emlékeztetve", completed: "Kitöltve", expired: "Lejárt" } as const;

export default async function ReferencesPage() {
  const user = await requireRole(["candidate"], "/jelolt/ajanlasok");
  const supabase = await createClient();
  const [{ data: requests }, { data: refs }] = await Promise.all([
    supabase
      .from("reference_requests")
      .select("id, company_name, referee_name, position, period_from, period_to, status, sent_at, reminded_at")
      .eq("candidate_id", user.id)
      .neq("status", "completed")
      .order("created_at", { ascending: false }),
    supabase.rpc("candidate_references", { p_candidate: user.id }),
  ]);
  const received = (refs ?? []) as ReferenceView[];
  const waiting = received.filter((r) => !r.approved_at && !r.hidden);
  const rest = received.filter((r) => r.approved_at || r.hidden);

  return (
    <div className="space-y-8">
      <PageHeader title="Ajánlások" subtitle="Korábbi munkáltatóid igazolják a munkaviszonyt és a kompetenciáidat." back="/jelolt" />

      {waiting.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-bold">Jóváhagyásra vár</h2>
          <p className="text-sm text-muted">
            Jóváhagyás után jelenik meg a profilodon, és a referens által igazolt kompetenciák „igazolt (referencia)” státuszt kapnak. Szerkeszteni nem
            lehet, csak elrejteni.
          </p>
          {waiting.map((r) => (
            <ReferenceCard key={r.reference_id} r={r}>
              <ReferenceActions id={r.reference_id} approved={false} hidden={r.hidden} />
            </ReferenceCard>
          ))}
        </section>
      )}

      {rest.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-bold">Ajánlásaim</h2>
          {rest.map((r) => (
            <ReferenceCard key={r.reference_id} r={r}>
              <p className="text-xs text-muted">{r.hidden ? "Rejtett – a munkáltatók nem látják." : "Látható a profilodon."}</p>
              <ReferenceActions id={r.reference_id} approved={!!r.approved_at} hidden={r.hidden} />
            </ReferenceCard>
          ))}
        </section>
      )}

      {!!requests?.length && (
        <section className="space-y-3">
          <h2 className="text-lg font-bold">Elküldött kérések</h2>
          <ul className="divide-y divide-line rounded-3xl border border-line">
            {requests.map((q) => (
              <li key={q.id} className="space-y-1 px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <p className="font-semibold">
                    {q.referee_name} <span className="font-normal text-muted">· {q.company_name}</span>
                  </p>
                  <Badge tone={q.status === "expired" ? "neutral" : "warning"}>{REQUEST_STATUS[q.status]}</Badge>
                </div>
                <p className="text-sm text-muted">
                  {q.position}, {formatPeriod(q.period_from, q.period_to)}
                </p>
                <div className="flex items-center justify-between text-xs text-muted">
                  <span>
                    Elküldve: {formatDate(q.sent_at)}
                    {q.reminded_at && ` · emlékeztető: ${formatDate(q.reminded_at)}`}
                  </span>
                  {(q.status === "pending" || q.status === "reminded") && <CancelRequestButton id={q.id} />}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="space-y-3">
        <h2 className="text-lg font-bold">Új ajánlás kérése</h2>
        <p className="text-sm text-muted">A referens emailben kap egy linket, regisztráció nélkül tölti ki. Ha 7 napon belül nem válaszol, egyszer emlékeztetjük.</p>
        <ReferenceRequestForm />
      </section>
    </div>
  );
}
