/**
 * Magyar települések seed generálása a GeoNames irányítószám-exportjából.
 * Forrás: https://download.geonames.org/export/zip/HU.zip (CC BY 4.0, © GeoNames)
 *
 * Használat:
 *   1. Tedd a HU.txt fájlt a scripts/data/ mappába (vagy hagyd, hogy a szkript letöltse).
 *   2. npm run seed:settlements
 * Kimenet: supabase/seed/01_settlements.sql
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const root = path.resolve(__dirname, "..");
const dataDir = path.join(root, "scripts", "data");
const txtPath = path.join(dataDir, "HU.txt");
const zipPath = path.join(dataDir, "HU.zip");
const outPath = path.join(root, "supabase", "seed", "01_settlements.sql");
const SOURCE_URL = "https://download.geonames.org/export/zip/HU.zip";

async function ensureSource() {
  if (existsSync(txtPath)) return;
  mkdirSync(dataDir, { recursive: true });
  if (!existsSync(zipPath)) {
    console.log(`Letöltés: ${SOURCE_URL}`);
    const res = await fetch(SOURCE_URL);
    if (!res.ok) {
      throw new Error(
        `A letöltés nem sikerült (${res.status}). Töltsd le kézzel a HU.zip-et, és tedd ide: ${dataDir}`,
      );
    }
    writeFileSync(zipPath, Buffer.from(await res.arrayBuffer()));
  }
  execFileSync("unzip", ["-o", zipPath, "HU.txt", "-d", dataDir], { stdio: "inherit" });
}

const sql = (s: string) => `'${s.replace(/'/g, "''")}'`;

async function main() {
  await ensureSource();
  const rows = readFileSync(txtPath, "utf8").split("\n").filter(Boolean);
  const seen = new Set<string>();
  const values: string[] = [];

  for (const line of rows) {
    // country, postal, place, admin1(county), code1, admin2, code2, admin3, code3, lat, lng, accuracy
    const cols = line.split("\t");
    const [country, postal, place, county] = cols;
    const lat = Number(cols[9]);
    const lng = Number(cols[10]);
    if (country !== "HU" || !postal || !place || !Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    const name = place.trim();
    const key = `${postal}|${name}`;
    if (seen.has(key)) continue;
    seen.add(key);
    values.push(
      `(${sql(postal.trim())}, ${sql(name)}, ${county ? sql(county.trim()) : "null"}, ${lat}, ${lng})`,
    );
  }

  if (values.length < 1000) throw new Error(`Gyanúsan kevés sor: ${values.length}`);

  const out = [
    "-- JOBLANTIS seed – magyar települések irányítószámmal és koordinátával",
    "-- Forrás: GeoNames (https://www.geonames.org), CC BY 4.0. Generálta: scripts/generate-settlements.ts",
    "insert into public.settlements (postal_code, name, county, lat, lng) values",
    values.join(",\n"),
    "on conflict (postal_code, name) do update set county = excluded.county, lat = excluded.lat, lng = excluded.lng;",
    "",
  ].join("\n");
  writeFileSync(outPath, out);
  console.log(`${values.length} irányítószám–település pár → ${path.relative(root, outPath)}`);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
