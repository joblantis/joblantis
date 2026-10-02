import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { hashToken } from "@/lib/tokens";
import { isSupabaseConfigured } from "@/lib/env";
import { formatPeriod } from "@/components/references/ReferenceCard";
import { ReferenceForm } from "./ReferenceForm";

export const metadata: Metadata = { title: "Ajánlás kitöltése", robots: { index: false, follow: false } };

export default async function RefereePage(props: PageProps<"/ajanlas/[token]">) {
  const { token } = await props.params;
  if (!isSupabaseConfigured || !/^[A-Za-z0-9_-]{30,64}$/.test(token)) return <Message title="Érvénytelen link" />;
  const supabase = await createClient();
  const { data } = await supabase.rpc("reference_request_by_token", { p_token_hash: hashToken(token) });
  const req = data?.[0];
  if (!req) return <Message title="Érvénytelen link" text="Ellenőrizd, hogy a teljes linket másoltad-e be az emailből." />;
  if (req.status === "completed") return <Message title="Ezt az ajánlást már kitöltötték" text="Köszönjük a segítséget!" />;
  if (req.status === "expired") return <Message title="Ez a link lejárt" text="A jelölt új kérést küldhet, ha még szüksége van ajánlásra." />;

  const competencies = (req.competencies ?? []) as { id: number; name: string; category: string }[];
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <p className="text-sm font-semibold text-muted">Ajánlás · kb. 2 perc · regisztráció nélkül</p>
        <h1 className="text-2xl font-bold">{req.candidate_name} ajánlást kér tőled</h1>
        <p className="text-muted">
          {req.company_name} · {req.job_position} · {req.period_from && formatPeriod(req.period_from, req.period_to)}
        </p>
      </div>
      <ReferenceForm token={token} candidateName={req.candidate_name ?? "A jelölt"} competencies={competencies} />
      <p className="text-xs text-muted">
        Az ajánlásod a jelölt jóváhagyása után jelenik meg a JOBLANTIS profilján a neveddel, a cég nevével és az időszakkal. Az email címed nem jelenik meg
        senkinek.
      </p>
    </div>
  );
}

function Message({ title, text }: { title: string; text?: string }) {
  return (
    <div className="space-y-2 rounded-3xl bg-soft p-6 text-center">
      <p className="text-lg font-bold">{title}</p>
      {text && <p className="text-muted">{text}</p>}
    </div>
  );
}
