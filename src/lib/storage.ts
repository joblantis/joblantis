import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/types/database";

export type Bucket = "venue-photos" | "company-logos" | "candidate-media" | "intro-videos";

/**
 * Aláírt URL-ek privát bucketből.
 * - `client` megadásával a felhasználó jogaival (storage RLS) írjuk alá – ez az alapeset bejelentkezett felületen.
 * - `client` nélkül service role-lal: csak olyan útvonalakra, amelyeket a hívó RLS mellett már jogosultan
 *   lekérdezett (pl. nyilvános, aktív álláshoz tartozó helyszínfotó).
 */
export async function signedUrls(
  bucket: Bucket,
  paths: string[],
  opts: { client?: SupabaseClient<Database>; expiresIn?: number } = {},
) {
  const map = new Map<string, string>();
  const unique = [...new Set(paths.filter(Boolean))];
  if (!unique.length) return map;
  if (!opts.client && !process.env.SUPABASE_SERVICE_ROLE_KEY) return map;
  const client = opts.client ?? createAdminClient();
  const { data } = await client.storage.from(bucket).createSignedUrls(unique, opts.expiresIn ?? 60 * 60);
  for (const item of data ?? []) if (item.path && item.signedUrl) map.set(item.path, item.signedUrl);
  return map;
}
