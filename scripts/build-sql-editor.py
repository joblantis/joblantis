"""A supabase/migrations és supabase/seed fájlokból két, a Supabase SQL Editorba bemásolható fájlt készít:
supabase/sql-editor/1_schema.sql és 2_seed.sql.  Futtatás: python3 scripts/build-sql-editor.py"""
import glob
import os

root = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "supabase")


def build(name, header, files, footer=()):
    out = list(header) + ["", "begin;", ""]
    for f in files:
        out += [f"-- ===== {os.path.basename(f)} =====", open(f).read().rstrip(), ""]
    out += list(footer) + ["commit;", ""]
    os.makedirs(os.path.join(root, "sql-editor"), exist_ok=True)
    open(os.path.join(root, "sql-editor", name), "w").write("\n".join(out))


migs = sorted(glob.glob(os.path.join(root, "migrations", "*.sql")))
build(
    "1_schema.sql",
    [
        "-- JOBLANTIS – 1/2: adatbázisséma (táblák, függvények, RLS, Storage).",
        "-- Supabase → SQL Editor → New query → másold be az egészet → Run. Csak egyszer kell lefuttatni.",
        "-- Generálta: scripts/build-sql-editor.py",
    ],
    migs,
    [
        "create schema if not exists joblantis_internal;",
        "create table if not exists joblantis_internal.migrations (name text primary key, applied_at timestamptz not null default now());",
        "insert into joblantis_internal.migrations (name) values\n  "
        + ",\n  ".join(f"('{os.path.basename(m)}')" for m in migs)
        + "\non conflict do nothing;",
        "",
    ],
)
build(
    "2_seed.sql",
    [
        "-- JOBLANTIS – 2/2: kezdő adatok (települések, kompetenciák, munkakörök, swipe kártyák).",
        "-- Az 1_schema.sql UTÁN futtasd. Többször is futtatható (frissíti az adatokat).",
        "-- Generálta: scripts/build-sql-editor.py",
    ],
    sorted(glob.glob(os.path.join(root, "seed", "*.sql"))),
)
print("supabase/sql-editor/1_schema.sql, 2_seed.sql kész")
