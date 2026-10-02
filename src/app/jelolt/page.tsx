import Link from "next/link";
import type { Metadata } from "next";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { loadCandidateProfile } from "@/lib/candidate/profile";
import { signOut } from "@/app/(auth)/actions";
import { ProfileView } from "@/components/candidate/ProfileView";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

export const metadata: Metadata = { title: "Profilom" };

const NEXT_STEP: Record<string, { title: string; text: string; href: string; cta: string }> = {
  roles: {
    title: "Kezdjük a profiloddal!",
    text: "Válaszd ki, milyen munkakörökben keresel munkát. Utána konkrét szakmai kártyákat kapsz – nem önéletrajzot kell írnod.",
    href: "/jelolt/munkakorok",
    cta: "Munkakörök kiválasztása",
  },
  cards: {
    title: "Jöhetnek a kártyák",
    text: "Húzd jobbra, ami megy, balra, ami nem, felfelé, amiben kifejezetten erős vagy.",
    href: "/jelolt/kartyak",
    cta: "Kártyák indítása",
  },
  basics: {
    title: "Még pár alapadat",
    text: "Műszakok, lakhely, utazás, bérigény, kezdés – egy perc az egész.",
    href: "/jelolt/alapadatok",
    cta: "Alapadatok megadása",
  },
};

export default async function CandidateHome(props: PageProps<"/jelolt">) {
  const user = await requireRole(["candidate", "admin"], "/jelolt");
  const { kesz } = await props.searchParams;
  const supabase = await createClient();
  const data = await loadCandidateProfile(supabase, user.id);
  const step = data?.profile.onboarding_step ?? "roles";
  const next = NEXT_STEP[step];
  const hasMedia = data?.gallery.some((a) => a.items.length);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold text-muted">Profilom</p>
        <h1 className="text-2xl font-bold">{user.profile.full_name || user.email}</h1>
      </div>

      {kesz && (
        <p role="status" className="rounded-2xl bg-success/10 px-4 py-3 text-sm font-medium text-success">
          Elkészült a profilod! Tölts fel bemutatkozó videót és fotókat a munkáidról, hogy kitűnj.
        </p>
      )}

      {next ? (
        <Card className="space-y-3 border-brand/30 bg-brand/5">
          <p className="text-lg font-bold">{next.title}</p>
          <p className="text-sm text-muted">{next.text}</p>
          <ButtonLink href={next.href} className="w-full">
            {next.cta}
          </ButtonLink>
        </Card>
      ) : (
        <>
        <ButtonLink href="/jelolt/allaskereses" className="w-full">
          Álláskeresés illeszkedés szerint
        </ButtonLink>
        <div className="grid grid-cols-2 gap-3">
          {[
            ["/jelolt/bemutatkozo", data?.introVideo ? "Bemutatkozó videó ✓" : "Bemutatkozó videó"],
            ["/jelolt/galeria", hasMedia ? "Galéria ✓" : "Galéria"],
            ["/jelolt/kartyak", "Kártyák újra"],
            ["/jelolt/alapadatok", "Alapadatok"],
            ["/jelolt/munkakorok", "Munkakörök"],
            ["/jelolt/mentett", "Mentett állások"],
          ].map(([href, label]) => (
            <Link key={href} href={href} className="flex min-h-14 items-center rounded-2xl border border-line px-4 text-sm font-semibold hover:border-brand">
              {label}
            </Link>
          ))}
        </div>
        </>
      )}

      {data && step === "done" && <ProfileView data={data} />}

      <form action={signOut} className="border-t border-line pt-6">
        <Button type="submit" variant="ghost" className="w-full">
          Kijelentkezés
        </Button>
      </form>
    </div>
  );
}
