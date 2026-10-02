import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { APPLICATION_STATUS_LABELS, CANDIDATE_STATUS_LABELS, CHAT_OPEN, STATUS_TONE } from "@/lib/applications";
import { ChatRoom } from "./ChatRoom";
import { markThreadRead } from "../actions";
import { TrialPanel } from "@/components/trials/TrialPanel";
import { loadTrials } from "@/lib/trials";

export const metadata: Metadata = { title: "Chat" };

export default async function ChatPage(props: PageProps<"/uzenetek/[id]">) {
  const { id } = await props.params;
  const user = await getSessionUser();
  if (!user) redirect(`/belepes?next=${encodeURIComponent(`/uzenetek/${id}`)}`);
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const supabase = await createClient();

  // RLS: csak a jelölt és a cég tagjai látják
  const { data: app } = await supabase
    .from("applications")
    .select("id, status, candidate_id, jobs(title, companies(name))")
    .eq("id", id)
    .maybeSingle();
  if (!app) notFound();

  const isCandidate = app.candidate_id === user.id;
  await markThreadRead(app.id);
  const [{ data: messages }, { data: person }, trials] = await Promise.all([
    supabase.from("messages").select("id, application_id, sender_id, body, created_at, read_at").eq("application_id", app.id).order("created_at").limit(500),
    isCandidate ? Promise.resolve({ data: null }) : supabase.from("profiles").select("full_name").eq("id", app.candidate_id).maybeSingle(),
    loadTrials(supabase, app.id),
  ]);

  const company = app.jobs?.companies?.name ?? "Munkáltató";
  const counterpart = isCandidate ? company : person?.full_name || "Jelölt";
  const open = CHAT_OPEN.includes(app.status);

  return (
    <div className="flex h-[calc(100svh-12rem)] min-h-96 flex-col">
      <PageHeader
        title={counterpart}
        subtitle={app.jobs?.title}
        back={isCandidate ? "/uzenetek" : `/munkaltato/jelentkezes/${app.id}`}
        action={
          <Badge tone={STATUS_TONE[app.status]}>
            {isCandidate ? CANDIDATE_STATUS_LABELS[app.status] : APPLICATION_STATUS_LABELS[app.status]}
          </Badge>
        }
      />
      <TrialPanel
        applicationId={app.id}
        trials={trials}
        role={isCandidate ? "candidate" : "employer"}
        canPropose={!isCandidate && ["viewed", "trial", "offer"].includes(app.status)}
        compact
      />
      <ChatRoom
        applicationId={app.id}
        meId={user.id}
        counterpart={counterpart}
        initial={messages ?? []}
        open={open}
        closedText={
          app.status === "new"
            ? "A chat akkor nyílik meg, amikor a munkáltató érdeklődik a jelentkezés iránt."
            : "Ez a beszélgetés lezárult, új üzenet nem küldhető."
        }
      />
    </div>
  );
}
