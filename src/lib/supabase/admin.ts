import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { publicEnv } from "@/lib/env";

/**
 * Service role kliens – megkerüli az RLS-t. KIZÁRÓLAG szerveroldalon, ellenőrzött műveletekhez
 * (aláírt URL-ek nyilvános oldalon, cron, token alapú űrlapok). A `server-only` import miatt
 * kliens komponensbe húzva a build elhasal.
 */
export function createAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("Hiányzó környezeti változó: SUPABASE_SERVICE_ROLE_KEY");
  return createClient<Database>(publicEnv.supabaseUrl, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
