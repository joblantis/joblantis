"use client";

import { useState, useTransition } from "react";
import { deleteVenue } from "./actions";
import { Button } from "@/components/ui/Button";

export function DeleteVenueButton({ venueId }: { venueId: string }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="space-y-2">
      <Button
        variant="danger"
        className="w-full"
        disabled={pending}
        onClick={() => {
          if (!confirm("Biztosan törlöd a helyszínt?")) return;
          start(async () => {
            const res = await deleteVenue(venueId);
            if (res?.error) setError(res.error);
          });
        }}
      >
        Helyszín törlése
      </Button>
      {error && <p className="text-sm text-danger">{error}</p>}
    </div>
  );
}
