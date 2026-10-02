import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { hashToken } from "@/lib/tokens";
import { isSupabaseConfigured } from "@/lib/env";
import { FollowupForm } from "./FollowupForm";

export const metadata: Metadata = { title: "Utókövetés", robots: { index: false, follow: false } };

export default async function FollowupPage(props: PageProps<"/utokovetes/[token]">) {
  const { token } = await props.params;
  const { valasz } = await props.searchParams;
  if (!isSupabaseConfigured || !/^[A-Za-z0-9_-]{30,64}$/.test(token)) return <Message title="Érvénytelen link" />;
  const supabase = await createClient();
  const { data } = await supabase.rpc("followup_by_token", { p_token_hash: hashToken(token) });
  const f = data?.[0];
  if (!f) return <Message title="Érvénytelen link" text="Ellenőrizd, hogy a teljes linket nyitottad-e meg az emailből." />;
  if (f.status === "answered") return <Message title="Erre a kérdésre már válaszoltatok" text="Köszönjük!" />;
  if (f.status === "expired") return <Message title="Ez a link lejárt" />;

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <p className="text-sm font-semibold text-muted">{f.day_offset} napos utókövetés · {f.company_name}</p>
        <h1 className="text-2xl font-bold">{f.candidate_name} még nálatok dolgozik?</h1>
        <p className="text-muted">{f.job_title}</p>
      </div>
      <FollowupForm token={token} initial={valasz === "igen" ? "igen" : valasz === "nem" ? "nem" : null} />
      <p className="text-xs text-muted">A válaszokat bizalmasan kezeljük, a jelölt nem látja őket; az illesztés fejlesztésére használjuk.</p>
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
