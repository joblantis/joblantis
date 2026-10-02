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
`supabase/tests/supabase_stub.sql` → migrációk → seed → `supabase/tests/rls_test.sql`.
