"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { approveReference, cancelReferenceRequest, setReferenceHidden } from "./actions";

export function ReferenceActions({ id, approved, hidden }: { id: string; approved: boolean; hidden: boolean }) {
  const [pending, start] = useTransition();
  if (!approved) {
    return (
      <div className="flex gap-2">
        <Button className="flex-1" disabled={pending} onClick={() => start(() => approveReference(id))}>
          Jóváhagyom
        </Button>
        <Button variant="secondary" className="flex-1" disabled={pending} onClick={() => start(() => setReferenceHidden(id, true))}>
          Elrejtem
        </Button>
      </div>
    );
  }
  return (
    <Button variant="secondary" className="w-full" disabled={pending} onClick={() => start(() => setReferenceHidden(id, !hidden))}>
      {hidden ? "Megjelenítés a profilon" : "Elrejtés a profilról"}
    </Button>
  );
}

export function CancelRequestButton({ id }: { id: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => confirm("Visszavonod a kérést? A link érvénytelen lesz.") && start(() => cancelReferenceRequest(id))}
      className="text-sm font-semibold text-danger disabled:opacity-50"
    >
      Visszavonás
    </button>
  );
}
