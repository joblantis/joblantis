"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setJobStatus } from "./actions";
import { Button } from "@/components/ui/Button";
import type { Enums } from "@/types/database";

export function JobStatusActions({ jobId, status, expired }: { jobId: string; status: Enums<"job_status">; expired: boolean }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  function run(next: "active" | "closed" | "draft", confirmText?: string) {
    if (confirmText && !confirm(confirmText)) return;
    start(async () => {
      const res = await setJobStatus(jobId, next);
      if (res.error) setError(res.error);
      else router.refresh();
    });
  }

  return (
    <div className="space-y-2">
      {status === "active" && !expired && (
        <Button variant="danger" className="w-full" disabled={pending} onClick={() => run("closed", "Lezárod a hirdetést? Nem lesz többé látható.")}>
          Hirdetés lezárása
        </Button>
      )}
      {(status === "closed" || status === "expired" || expired) && (
        <p className="text-sm text-muted">Újraaktiváláshoz állíts be új lejárati dátumot lent, majd nyomd meg a „Közzététel” gombot.</p>
      )}
      {error && <p className="text-sm text-danger">{error}</p>}
    </div>
  );
}
