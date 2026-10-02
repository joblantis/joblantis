"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { applyToJob, unsaveJob } from "../jelentkezesek/actions";

export function SavedJobActions({ jobId }: { jobId: string }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="space-y-1">
      <div className="flex gap-2">
        <Button
          variant="secondary"
          className="flex-1"
          disabled={pending}
          onClick={() => start(async () => {
            const r = await unsaveJob(jobId);
            if (!r.ok) setError(r.error);
          })}
        >
          Eltávolítás
        </Button>
        <Button
          className="flex-1"
          disabled={pending}
          onClick={() => start(async () => {
            const r = await applyToJob(jobId);
            if (!r.ok) setError(r.error);
          })}
        >
          Jelentkezem
        </Button>
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}
    </div>
  );
}
