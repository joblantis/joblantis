/**
 * TypeScript típusok generálása a public sémából (Supabase-kompatibilis `Database` típus).
 * Bármely Postgresen fut, amin a migrációk lefutottak:
 *   SUPABASE_DB_URL=... npm run db:types
 * (A hivatalos `supabase gen types` is használható helyette, ugyanebbe a fájlba.)
 */
import { writeFileSync, existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { Client } from "pg";

const root = path.resolve(__dirname, "..");
const outPath = path.join(root, "src", "types", "database.ts");

function loadEnvLocal() {
  const file = path.join(root, ".env.local");
  if (!existsSync(file)) return;
  for (const line of readFileSync(file, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

const scalar: Record<string, string> = {
  uuid: "string", text: "string", varchar: "string", bpchar: "string", citext: "string",
  date: "string", timestamptz: "string", timestamp: "string", time: "string", interval: "string",
  int2: "number", int4: "number", int8: "number", float4: "number", float8: "number", numeric: "number",
  bool: "boolean", json: "Json", jsonb: "Json", void: "undefined", record: "Json",
};

function tsType(udt: string, enums: Set<string>): string {
  if (udt.startsWith("_")) return `${tsType(udt.slice(1), enums)}[]`;
  if (enums.has(udt)) return `Database["public"]["Enums"]["${udt}"]`;
  return scalar[udt] ?? "unknown";
}

async function main() {
  loadEnvLocal();
  const url = process.env.SUPABASE_DB_URL;
  if (!url) throw new Error("Hiányzik a SUPABASE_DB_URL");
  const db = new Client({ connectionString: url, ssl: url.includes("localhost") || url.includes("/tmp/") ? false : { rejectUnauthorized: false } });
  await db.connect();

  const enumRows = (await db.query<{ name: string; labels: string[] }>(`
    select t.typname as name, array_agg(e.enumlabel order by e.enumsortorder)::text[] as labels
    from pg_type t join pg_enum e on e.enumtypid = t.oid join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public' group by t.typname order by t.typname`)).rows;
  const enums = new Set(enumRows.map((e) => e.name));

  const cols = (await db.query<{
    table_name: string; column_name: string; udt_name: string; is_nullable: string;
    column_default: string | null; is_identity: string; is_generated: string;
  }>(`
    select c.table_name, c.column_name, c.udt_name, c.is_nullable, c.column_default, c.is_identity, c.is_generated
    from information_schema.columns c
    join information_schema.tables t on t.table_schema = c.table_schema and t.table_name = c.table_name
    where c.table_schema = 'public' and t.table_type = 'BASE TABLE'
    order by c.table_name, c.ordinal_position`)).rows;

  const fks = (await db.query<{
    name: string; table_name: string; columns: string[]; ref_table: string; ref_columns: string[]; one_to_one: boolean;
  }>(`
    select con.conname as name, cl.relname as table_name,
      array(select a.attname from unnest(con.conkey) k join pg_attribute a on a.attrelid = con.conrelid and a.attnum = k)::text[] as columns,
      rcl.relname as ref_table,
      array(select a.attname from unnest(con.confkey) k join pg_attribute a on a.attrelid = con.confrelid and a.attnum = k)::text[] as ref_columns,
      exists (
        select 1 from pg_index i where i.indrelid = con.conrelid and (i.indisunique or i.indisprimary)
          and i.indkey::int2[] @> con.conkey and con.conkey @> i.indkey::int2[]
      ) as one_to_one
    from pg_constraint con
    join pg_class cl on cl.oid = con.conrelid join pg_namespace n on n.oid = cl.relnamespace
    join pg_class rcl on rcl.oid = con.confrelid join pg_namespace rn on rn.oid = rcl.relnamespace
    where con.contype = 'f' and n.nspname = 'public' and rn.nspname = 'public'
    order by cl.relname, con.conname`)).rows;

  const fns = (await db.query<{
    name: string; arg_names: string[] | null; all_types: string[]; arg_modes: string[] | null;
    ret: string; retset: boolean; nargs_default: number;
  }>(`
    select p.proname as name, p.proargnames::text[] as arg_names,
      array(
        select t.typname
        from unnest(coalesce(p.proallargtypes, p.proargtypes::oid[])) with ordinality a(oid, ord)
        join pg_type t on t.oid = a.oid
        order by a.ord
      )::text[] as all_types,
      p.proargmodes::text[] as arg_modes,
      rt.typname as ret, p.proretset as retset, p.pronargdefaults as nargs_default
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace join pg_type rt on rt.oid = p.prorettype
    where n.nspname = 'public' and rt.typname <> 'trigger' and p.prokind = 'f'
    order by p.proname`)).rows;
  await db.end();

  const tables = new Map<string, typeof cols>();
  for (const c of cols) tables.set(c.table_name, [...(tables.get(c.table_name) ?? []), c]);

  const q = (s: string) => (/^[a-z_][a-z0-9_]*$/.test(s) ? s : JSON.stringify(s));
  const lines: string[] = [];
  lines.push("// Generálta: scripts/gen-types.ts – ne szerkeszd kézzel.");
  lines.push("export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];");
  lines.push("");
  lines.push("export type Database = {");
  lines.push("  public: {");
  lines.push("    Tables: {");
  for (const [table, tcols] of tables) {
    lines.push(`      ${q(table)}: {`);
    lines.push("        Row: {");
    for (const c of tcols) lines.push(`          ${q(c.column_name)}: ${tsType(c.udt_name, enums)}${c.is_nullable === "YES" ? " | null" : ""};`);
    lines.push("        };");
    for (const kind of ["Insert", "Update"] as const) {
      lines.push(`        ${kind}: {`);
      for (const c of tcols) {
        if (c.is_generated === "ALWAYS") continue;
        const optional = kind === "Update" || c.is_nullable === "YES" || c.column_default !== null || c.is_identity === "YES";
        lines.push(`          ${q(c.column_name)}${optional ? "?" : ""}: ${tsType(c.udt_name, enums)}${c.is_nullable === "YES" ? " | null" : ""};`);
      }
      lines.push("        };");
    }
    lines.push("        Relationships: [");
    for (const fk of fks.filter((f) => f.table_name === table)) {
      lines.push(
        `          { foreignKeyName: ${JSON.stringify(fk.name)}; columns: ${JSON.stringify(fk.columns)}; isOneToOne: ${fk.one_to_one}; referencedRelation: ${JSON.stringify(fk.ref_table)}; referencedColumns: ${JSON.stringify(fk.ref_columns)} },`,
      );
    }
    lines.push("        ];");
    lines.push("      };");
  }
  lines.push("    };");
  lines.push("    Views: { [_ in never]: never };");
  lines.push("    Functions: {");
  for (const f of fns) {
    const names = f.arg_names ?? [];
    const modes = f.arg_modes ?? f.all_types.map(() => "i");
    const inputs = f.all_types.map((t, i) => ({ t, name: names[i] ?? `arg${i}`, mode: modes[i] })).filter((a) => a.mode === "i" || a.mode === "b");
    const outputs = f.all_types.map((t, i) => ({ t, name: names[i] ?? `col${i}`, mode: modes[i] })).filter((a) => a.mode === "t" || a.mode === "o");
    const firstDefault = inputs.length - f.nargs_default;
    const args = inputs.map((a, i) => `${q(a.name)}${i >= firstDefault ? "?" : ""}: ${tsType(a.t, enums)}`);
    const ret = outputs.length
      ? `{ ${outputs.map((o) => `${q(o.name)}: ${tsType(o.t, enums)} | null`).join("; ")} }${f.retset ? "[]" : ""}`
      : `${tsType(f.ret, enums)}${f.retset ? "[]" : ""}`;
    lines.push(`      ${q(f.name)}: { Args: ${args.length ? `{ ${args.join("; ")} }` : "Record<PropertyKey, never>"}; Returns: ${ret} };`);
  }
  lines.push("    };");
  lines.push("    Enums: {");
  for (const e of enumRows) lines.push(`      ${q(e.name)}: ${e.labels.map((l) => JSON.stringify(l)).join(" | ")};`);
  lines.push("    };");
  lines.push("    CompositeTypes: { [_ in never]: never };");
  lines.push("  };");
  lines.push("};");
  lines.push("");
  lines.push('type PublicSchema = Database["public"];');
  lines.push('export type Tables<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Row"];');
  lines.push('export type TablesInsert<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Insert"];');
  lines.push('export type TablesUpdate<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Update"];');
  lines.push('export type Enums<T extends keyof PublicSchema["Enums"]> = PublicSchema["Enums"][T];');
  lines.push("");
  writeFileSync(outPath, lines.join("\n"));
  console.log(`${tables.size} tábla, ${fns.length} függvény, ${enumRows.length} enum → ${path.relative(root, outPath)}`);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
