# JOBLANTIS

Vendéglátós és szállodai álláskereső PWA. A teljes specifikáció a `CLAUDE.md`-ben van.

## Indítás

```bash
cp .env.example .env.local   # valódi Supabase / Resend kulcsokkal
npm install
npm run seed:settlements     # GeoNames HU → supabase/seed/01_settlements.sql
npm run db:apply             # migrációk + seed (SUPABASE_DB_URL kell)
npm run db:types             # src/types/database.ts frissítése
npm run icons                # PWA ikonok a public/logo.png-ből
npm run dev
```

## Ellenőrzés

`npm run lint`, `npm run typecheck`, `npm run build`. Az RLS-teszt helyi Postgresen fut:
`supabase/tests/supabase_stub.sql` → migrációk → seed → `supabase/tests/rls_test.sql`, majd `supabase/tests/phase3_test.sql`
(illesztés, jelentkezés, jelentkezői lista, chat és értesítések jogosultságai), `supabase/tests/phase4_test.sql`
(ajánlások, próbanap, igazolt státuszok) és `supabase/tests/phase5_test.sql` (nincs ghosting, utókövetés, admin).

## Illesztés és rangsor (3. fázis)

A pontszámot egyetlen helyen, az adatbázis `match_details()` függvénye számolja (a hívó jogaival, RLS mellett):
kötelező kompetenciák 45, előnyt jelentők 15, műszak 15, távolság 10, munkastílus 15 pont (≤ 20%).
Igazolt készség 1,5× súllyal számít. Hiányzó kötelező kompetenciánál a jelölt / állás a lista végére kerül, de látszik.
Az indoklást (`src/lib/match.ts`) ugyanebből a JSON-ból állítjuk elő.

## Értesítések

Az értesítéseket adatbázis-triggerek hozzák létre (új jelentkező, státuszváltás, udvarias elutasítás, új üzenet),
az alkalmazásban azonnal látszanak. Emailben a Resend küldi ki őket (`RESEND_API_KEY`, `EMAIL_FROM`, service role kell);
a napi Vercel Cron (`/api/cron/ertesitesek`, `CRON_SECRET`) a kimaradtakat pótolja.

## Ajánlások és próbanap (4. fázis)

- Ajánláskérés: a referens emailben kap egy egyszer használatos linket (`/ajanlas/<token>`), az adatbázisba csak a token
  SHA-256 hash-e kerül. 7 nap után a napi cron egyszer emlékeztet (új linkkel, a régi is él), 30 nap után lejár.
- A beérkezett ajánlást a jelölt jóváhagyja (vissza nem vonható, csak elrejthető). Jóváhagyáskor a referens által igazolt
  kompetenciák „igazolt (referencia)” státuszt kapnak; elrejtéskor ez visszaáll.
- Próbanap: a munkáltató a chatből, a jelölt profiljáról vagy a pipeline-ból ajánl időpontot, a jelölt elfogadja.
  Utána az állás kompetenciáit 1–5-ig pontozza; a legalább 4-es pontot kapottak „igazolt (próbanap)” státuszt kapnak.

## Ütemezett feladatok, utókövetés, admin (5. fázis)

- **Nincs ghosting:** a 3. napon a munkáltató emlékeztetőt kap, az 5. napon a jelentkezés automatikusan lezárul, és a jelölt
  udvarias értesítést kap. A `run_scheduled_jobs()` adatbázis-függvény óránként fut a Supabase pg_cronból (`joblantis-hourly`),
  és naponta a Vercel Cron is meghívja.
- **Utókövetés:** felvételkor 30, 90 és 180 napos kérdés ütemeződik (`followups` tábla, külön a tanításhoz). A napi cron
  emailben küldi a cég tagjainak; a válasz bejelentkezés nélkül, a `/utokovetes/<token>` oldalon adható meg.
- **Admin:** `/admin` – statisztika, munkakör-sablonok (kompetenciák, munkastílus-célprofil), kompetenciák, swipe kártyák,
  moderálás (állás lezárása, média törlése, szerepkörök). Az első admint SQL-ből kell kinevezni:
  `update public.profiles set role = 'admin' where email = '...';`
- **Emailek** (Resend): minden értesítés (új jelentkező, státusz, elutasítás/lezárás, chat, próbanap, ajánlás, emlékeztető)
  azonnal kimegy a műveletek után, a kimaradtakat a napi cron pótolja. A Vercel Hobby csomagon a cron naponta egyszer fut
  (09:00 körül); Pro csomagon a `vercel.json` ütemezése sűríthető.

## Minta adatok

`supabase/seed/demo/demo_jobs.sql`: 8 kitalált cég (a nevükben „(minta)”), 12 helyszín és 26 aktív állás –
minden munkakörben 2–3 –, a sablon szerinti kompetencia-követelményekkel. Újrafuttatható (a lejáratot 60 napra frissíti).
Eltávolítás: `supabase/seed/demo/remove_demo.sql`. A minta-munkáltató fióknak nincs jelszava.
