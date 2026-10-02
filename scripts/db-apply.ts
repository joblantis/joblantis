/**
 * Migrációk és seed futtatása a Supabase Postgres adatbázison.
 * Kell hozzá: SUPABASE_DB_URL (a .env.local-ban vagy a környezetben).
 *
 *   npm run db:apply            – új migrációk + minden seed (idempotens)
 *   npm run db:apply -- --no-seed
 */
import { readdirSync, readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { Client } from "pg";

const root = path.resolve(__dirname, "..");

function loadEnvLocal() {
  const file = path.join(root, ".env.local");
  if (!existsSync(file)) return;
  for (const line of readFileSync(file, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

async function main() {
  loadEnvLocal();
  const url = process.env.SUPABASE_DB_URL;
  if (!url) {
    console.error("Hiányzik a SUPABASE_DB_URL. Add meg a .env.local-ban vagy a környezeti változók között.");
    process.exit(1);
  }
  const withSeed = !process.argv.includes("--no-seed");
  const client = new Client({ connectionString: url, ssl: url.includes("localhost") ? false : { rejectUnauthorized: false } });
  await client.connect();

  await client.query(`
    create schema if not exists joblantis_internal;
    create table if not exists joblantis_internal.migrations (
      name text primary key,
      applied_at timestamptz not null default now()
    );
  `);
  const { rows } = await client.query<{ name: string }>("select name from joblantis_internal.migrations");
  const applied = new Set(rows.map((r) => r.name));

  const migDir = path.join(root, "supabase", "migrations");
  for (const file of readdirSync(migDir).filter((f) => f.endsWith(".sql")).sort()) {
    if (applied.has(file)) continue;
    process.stdout.write(`migráció: ${file} … `);
    await client.query("begin");
    try {
      await client.query(readFileSync(path.join(migDir, file), "utf8"));
      await client.query("insert into joblantis_internal.migrations (name) values ($1)", [file]);
      await client.query("commit");
      console.log("ok");
    } catch (e) {
      await client.query("rollback");
      console.log("HIBA");
      throw e;
    }
  }

  if (withSeed) {
    const seedDir = path.join(root, "supabase", "seed");
    for (const file of readdirSync(seedDir).filter((f) => f.endsWith(".sql")).sort()) {
      process.stdout.write(`seed: ${file} … `);
      await client.query(readFileSync(path.join(seedDir, file), "utf8"));
      console.log("ok");
    }
  }
  await client.end();
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
