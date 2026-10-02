"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { applyToJob } from "@/app/jelolt/jelentkezesek/actions";

export function ApplyButton({ jobId }: { jobId: string }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  return (
    <div className="space-y-1">
      <Button
        className="w-full"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const r = await applyToJob(jobId);
            if (!r.ok) setError(r.error);
            else router.refresh();
          })
        }
      >
        {pending ? "Jelentkezés…" : "Jelentkezem"}
      </Button>
      {error && <p className="text-center text-sm text-danger">{error}</p>}
    </div>
  );
}
