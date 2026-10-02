import type { Metadata } from "next";
import { requireRole } from "@/lib/auth";
import { signOut } from "@/app/(auth)/actions";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

export const metadata: Metadata = { title: "Profilom" };

export default async function CandidateHome() {
  const user = await requireRole(["candidate", "admin"], "/jelolt");
  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold text-muted">Szia,</p>
        <h1 className="text-2xl font-bold">{user.profile.full_name || user.email}</h1>
      </div>
      <Card className="space-y-2">
        <p className="font-semibold">A húzogatós profilépítés hamarosan érkezik</p>
        <p className="text-sm text-muted">
          Kiválasztod a munkaköröket, majd kártyákon válaszolsz konkrét szakmai állításokra. Ebből áll össze a kompetenciaprofilod, amit
          ajánlások és próbanapok tesznek igazolttá.
        </p>
      </Card>
      <ButtonLink href="/allasok" variant="secondary" className="w-full">
        Állások böngészése
      </ButtonLink>
      <form action={signOut}>
        <Button type="submit" variant="ghost" className="w-full">
          Kijelentkezés
        </Button>
      </form>
    </div>
  );
}
