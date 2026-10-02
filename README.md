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
(illesztés, jelentkezés, jelentkezői lista, chat és értesítések jogosultságai).

## Illesztés és rangsor (3. fázis)

A pontszámot egyetlen helyen, az adatbázis `match_details()` függvénye számolja (a hívó jogaival, RLS mellett):
kötelező kompetenciák 45, előnyt jelentők 15, műszak 15, távolság 10, munkastílus 15 pont (≤ 20%).
Igazolt készség 1,5× súllyal számít. Hiányzó kötelező kompetenciánál a jelölt / állás a lista végére kerül, de látszik.
Az indoklást (`src/lib/match.ts`) ugyanebből a JSON-ból állítjuk elő.

## Értesítések

Az értesítéseket adatbázis-triggerek hozzák létre (új jelentkező, státuszváltás, udvarias elutasítás, új üzenet),
az alkalmazásban azonnal látszanak. Emailben a Resend küldi ki őket (`RESEND_API_KEY`, `EMAIL_FROM`, service role kell);
a napi Vercel Cron (`/api/cron/ertesitesek`, `CRON_SECRET`) a kimaradtakat pótolja.
