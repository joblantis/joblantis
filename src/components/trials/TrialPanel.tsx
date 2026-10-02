"use client";

import Link from "next/link";
import { useActionState, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { cancelTrial, proposeTrial, respondTrial } from "@/app/probanap/actions";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/Field";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { FormMessage } from "@/components/ui/FormMessage";
import { initialFormState } from "@/lib/forms";
import type { Enums } from "@/types/database";
import type { TrialView as TrialItem } from "@/lib/trials";


const STATUS: Record<Enums<"trial_status">, { label: string; tone: "warning" | "success" | "danger" | "neutral" | "brand" }> = {
  proposed: { label: "Válaszra vár", tone: "warning" },
  accepted: { label: "Elfogadva", tone: "success" },
  declined: { label: "Elutasítva", tone: "danger" },
  completed: { label: "Értékelve", tone: "brand" },
  cancelled: { label: "Lemondva", tone: "neutral" },
};

const when = new Intl.DateTimeFormat("hu-HU", { month: "long", day: "numeric", weekday: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Budapest" });
const hours = (m: number) => `${new Intl.NumberFormat("hu-HU", { maximumFractionDigits: 1 }).format(m / 60)} óra`;

/**
 * Próbanap: a munkáltató időpontot ajánl, lemondhat és a lezajlott próbanapot értékeli;
 * a jelölt elfogadja vagy elutasítja. `compact`: a chat tetején csak a legutóbbi aktív próbanap.
 */
export function TrialPanel({
  applicationId,
  trials,
  role,
  canPropose,
  compact = false,
}: {
  applicationId: string;
  trials: TrialItem[];
  role: "employer" | "candidate";
  canPropose: boolean;
  compact?: boolean;
}) {
  const [showForm, setShowForm] = useState(false);
  const [now] = useState(() => Date.now());
  const active = trials.filter((t) => t.status === "proposed" || t.status === "accepted");
  const list = compact ? active.slice(0, 1) : trials;

  if (compact && !list.length && !(role === "employer" && canPropose)) return null;

  return (
    <section id="probanap" className={compact ? "mb-3 space-y-2" : "space-y-3"}>
      {!compact && <h2 className="text-lg font-bold">Próbanap</h2>}
      {list.map((t) => (
        <TrialRow key={t.id} t={t} role={role} applicationId={applicationId} past={new Date(t.starts_at).getTime() <= now} />
      ))}
      {!compact && !trials.length && <p className="text-sm text-muted">Még nincs próbanap.</p>}
      {role === "employer" && canPropose && (
        compact ? (
          !list.length && (
            <Link href={`/munkaltato/jelentkezes/${applicationId}#probanap`} className="block rounded-2xl bg-brand/5 px-4 py-2.5 text-center text-sm font-semibold text-brand">
              📅 Próbanap ajánlása
            </Link>
          )
        ) : showForm ? (
          <ProposeForm applicationId={applicationId} onDone={() => setShowForm(false)} />
        ) : (
          <Button variant="secondary" className="w-full" onClick={() => setShowForm(true)}>
            📅 Próbanap ajánlása
          </Button>
        )
      )}
    </section>
  );
}

function TrialRow({ t, role, applicationId, past }: { t: TrialItem; role: "employer" | "candidate"; applicationId: string; past: boolean }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const s = STATUS[t.status];

  const respond = (accept: boolean) =>
    start(async () => {
      const r = await respondTrial(t.id, applicationId, accept);
      if (!r.ok) setError(r.error);
      router.refresh();
    });

  return (
    <div className="space-y-2 rounded-2xl border border-line bg-white p-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-semibold">📅 {when.format(new Date(t.starts_at))}</p>
          <p className="text-sm text-muted">
            {hours(t.duration_minutes)} · {t.is_paid ? "díjazott" : "díjazás nélkül"}
          </p>
        </div>
        <Badge tone={s.tone}>{s.label}</Badge>
      </div>
      {t.note && <p className="whitespace-pre-line text-sm">{t.note}</p>}

      {role === "candidate" && t.status === "proposed" && !past && (
        <div className="flex gap-2">
          <Button className="flex-1 !min-h-11" disabled={pending} onClick={() => respond(true)}>
            Elfogadom
          </Button>
          <Button variant="secondary" className="flex-1 !min-h-11" disabled={pending} onClick={() => respond(false)}>
            Nem jó
          </Button>
        </div>
      )}
      {role === "employer" && t.status === "accepted" && past && (
        <Link href={`/munkaltato/probanap/${t.id}`} className="block rounded-xl bg-brand py-2.5 text-center font-semibold text-white">
          Próbanap értékelése
        </Link>
      )}
      {role === "employer" && (t.status === "proposed" || (t.status === "accepted" && !past)) && (
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            confirm("Lemondod a próbanapot? A jelölt értesítést kap.") &&
            start(async () => {
              await cancelTrial(t.id, applicationId);
              router.refresh();
            })
          }
          className="text-sm font-semibold text-danger disabled:opacity-50"
        >
          Lemondás
        </button>
      )}
      {error && <p className="text-sm text-danger">{error}</p>}
    </div>
  );
}

function ProposeForm({ applicationId, onDone }: { applicationId: string; onDone: () => void }) {
  const [state, action] = useActionState(proposeTrial.bind(null, applicationId), initialFormState);
  return (
    <form action={action} className="space-y-3 rounded-2xl bg-soft p-4">
      <Field label="Időpont" htmlFor="trial-starts">
        <Input id="trial-starts" name="starts" type="datetime-local" required />
      </Field>
      <Field label="Időtartam" htmlFor="trial-duration">
        <Select id="trial-duration" name="duration" defaultValue="240">
          {[60, 120, 180, 240, 300, 360, 480, 600, 720].map((m) => (
            <option key={m} value={m}>
              {hours(m)}
            </option>
          ))}
        </Select>
      </Field>
      <Checkbox name="is_paid" label="Díjazott próbanap" />
      <Field label="Megjegyzés (nem kötelező)" htmlFor="trial-note">
        <Textarea id="trial-note" name="note" maxLength={500} placeholder="Hova jöjjön, mit hozzon, kit keressen…" />
      </Field>
      <FormMessage state={state} />
      <div className="flex gap-2">
        <SubmitButton className="flex-1" pendingText="Küldés…">
          Ajánlat küldése
        </SubmitButton>
        <Button type="button" variant="ghost" onClick={onDone}>
          Mégse
        </Button>
      </div>
    </form>
  );
}
