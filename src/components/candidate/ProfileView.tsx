import { Badge } from "@/components/ui/Badge";
import { AlbumTiles } from "@/components/media/AlbumTiles";
import { ReferenceCard } from "@/components/references/ReferenceCard";
import { formatDate, formatShifts, WAGE_PERIOD_LABELS } from "@/lib/format";
import type { CandidateProfileData } from "@/lib/candidate/profile";

const VERIFY_LABEL = { reference: "igazolt (referencia)", trial: "igazolt (próbanap)", admin: "igazolt" } as const;

function LevelDots({ level }: { level: number }) {
  return (
    <span className="flex gap-0.5" aria-label={`Szint: ${level}/5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <span key={n} className={`size-2 rounded-full ${n <= level ? "bg-brand" : "bg-line"}`} />
      ))}
    </span>
  );
}

/** Jelölti profil nézet – a jelölt saját előnézete, később a munkáltatói nézet alapja. */
export function ProfileView({ data }: { data: CandidateProfileData }) {
  const { profile, introVideo, skills, workStyle, roles, gallery, references } = data;
  const wage = profile.wage_expectation ? `${new Intl.NumberFormat("hu-HU").format(profile.wage_expectation)} ${WAGE_PERIOD_LABELS[profile.wage_period]}` : null;

  return (
    <div className="space-y-6">
      {introVideo && (
        <video src={introVideo.url} poster={introVideo.poster ?? undefined} controls playsInline preload="metadata" className="aspect-[9/16] max-h-[60vh] w-full rounded-3xl bg-black object-contain" />
      )}

      <div className="space-y-2">
        {profile.headline && <p className="text-lg font-semibold">{profile.headline}</p>}
        {roles.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {roles.map((r) => (
              <Badge key={r} tone="brand">
                {r}
              </Badge>
            ))}
          </div>
        )}
        {profile.bio && <p className="whitespace-pre-line text-ink/90">{profile.bio}</p>}
      </div>

      <dl className="grid grid-cols-2 gap-3 rounded-3xl bg-soft p-4 text-sm">
        <div>
          <dt className="text-muted">Lakhely</dt>
          <dd className="font-semibold">{profile.settlements ? `${profile.settlements.postal_code} ${profile.settlements.name}` : "–"}</dd>
        </div>
        <div>
          <dt className="text-muted">Utazna</dt>
          <dd className="font-semibold">{profile.travel_km != null ? `${profile.travel_km} km-ig` : "–"}</dd>
        </div>
        <div>
          <dt className="text-muted">Műszakok</dt>
          <dd className="font-semibold">{profile.availability.length ? formatShifts(profile.availability) : "–"}</dd>
        </div>
        <div>
          <dt className="text-muted">Bérigény</dt>
          <dd className="font-semibold">{wage ?? "–"}</dd>
        </div>
        <div className="col-span-2">
          <dt className="text-muted">Kezdés</dt>
          <dd className="font-semibold">{profile.start_date ? formatDate(profile.start_date) : "Azonnal"}</dd>
        </div>
      </dl>

      <section className="space-y-3">
        <h2 className="text-lg font-bold">Kompetenciák</h2>
        {skills.length === 0 ? (
          <p className="text-sm text-muted">Még nincs kompetencia.</p>
        ) : (
          <ul className="divide-y divide-line rounded-3xl border border-line">
            {skills.map((s) => (
              <li key={s.competencyId} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="font-medium">
                    {s.name}
                    {s.languageLevel && <span className="ml-1.5 text-sm text-muted">({s.languageLevel})</span>}
                  </p>
                  <div className="mt-1">
                    {s.status === "verified" ? (
                      <Badge tone="success">{VERIFY_LABEL[s.verificationType ?? "admin"]}</Badge>
                    ) : (
                      <Badge tone="neutral">bemondott</Badge>
                    )}
                  </div>
                </div>
                <LevelDots level={s.level} />
              </li>
            ))}
          </ul>
        )}
      </section>

      {workStyle.length > 0 && (
        <section className="space-y-3">
          <div>
            <h2 className="text-lg font-bold">Munkastílus</h2>
            <p className="text-sm text-muted">Kiegészítő szempont, legfeljebb 20%-ban számít.</p>
          </div>
          <ul className="space-y-3">
            {workStyle.map((w) => (
              <li key={w.name}>
                <div className="flex justify-between text-xs text-muted">
                  <span>{w.low_label}</span>
                  <span>{w.high_label}</span>
                </div>
                <div className="relative mt-1 h-2 rounded-full bg-line">
                  <span className="absolute top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-brand shadow" style={{ left: `${w.score}%` }} />
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {references.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-bold">Ajánlások</h2>
          {references.map((r) => (
            <ReferenceCard key={r.reference_id} r={r} />
          ))}
        </section>
      )}

      {gallery.some((a) => a.items.length) && (
        <section className="space-y-3">
          <h2 className="text-lg font-bold">Galéria</h2>
          <AlbumTiles albums={gallery} />
        </section>
      )}
    </div>
  );
}
