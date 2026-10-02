import Link from "next/link";
import { Logo } from "@/components/layout/Logo";
import { ButtonLink } from "@/components/ui/Button";
import { getSessionUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";

export default async function HomePage() {
  const user = await getSessionUser();
  let templates: { slug: string; name: string }[] = [];
  if (isSupabaseConfigured) {
    const supabase = await createClient();
    const { data } = await supabase.from("job_role_templates").select("slug, name").eq("is_active", true).order("sort_order");
    templates = data ?? [];
  }

  return (
    <div className="space-y-10">
      <section className="flex flex-col items-center pt-8 text-center">
        <Logo size={88} />
        <h1 className="mt-4 text-4xl font-extrabold tracking-[0.14em] text-brand">JOBLANTIS</h1>
        <p className="mt-2 text-lg font-medium text-ink">Raise your future</p>
        <p className="mt-4 max-w-sm text-muted">
          Állások a vendéglátásban és a szállodákban. Itt az számít, amit igazolhatóan tudsz – nem az, amit egy önéletrajz ígér.
        </p>
        <div className="mt-8 flex w-full max-w-sm flex-col gap-3">
          <ButtonLink href="/allasok">Állások böngészése</ButtonLink>
          {!user && (
            <>
              <ButtonLink href="/regisztracio?szerep=candidate" variant="secondary">
                Állást keresek
              </ButtonLink>
              <ButtonLink href="/regisztracio?szerep=employer" variant="ghost">
                Munkaerőt keresek
              </ButtonLink>
            </>
          )}
          {user?.profile.role === "employer" && (
            <ButtonLink href="/munkaltato" variant="secondary">
              Munkáltatói felület
            </ButtonLink>
          )}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-bold">Hogyan működik?</h2>
        <ol className="space-y-3">
          {[
            ["Húzd a kártyákat", "Munkakörhöz kötött, konkrét állításokra válaszolsz: jobbra igen, balra nem, fel: ebben erős vagyok."],
            ["Igazold, amit tudsz", "Korábbi munkáltatók ajánlása és próbanap teszi a készségeidet „igazolt”-tá."],
            ["Kapj illeszkedő állást", "A rangsort a kompetenciák döntik el. A munkastílus legfeljebb 20%-ot számít."],
          ].map(([title, text], i) => (
            <li key={title} className="flex gap-4 rounded-3xl bg-soft p-4">
              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-brand text-sm font-bold text-white">{i + 1}</span>
              <div>
                <p className="font-semibold">{title}</p>
                <p className="text-sm text-muted">{text}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {templates.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-bold">Munkakörök</h2>
          <div className="flex flex-wrap gap-2">
            {templates.map((t) => (
              <Link key={t.slug} href={`/allasok?munkakor=${t.slug}`} className="rounded-full border border-line px-4 py-2.5 text-sm font-semibold hover:border-brand hover:text-brand">
                {t.name}
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
