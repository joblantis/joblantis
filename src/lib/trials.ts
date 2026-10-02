import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Enums } from "@/types/database";

export type TrialView = {
  id: string;
  starts_at: string;
  duration_minutes: number;
  is_paid: boolean;
  note: string | null;
  status: Enums<"trial_status">;
};

/** Egy jelentkezés próbanapjai (RLS: a jelölt és a cég tagjai látják), legfrissebb elöl. */
export async function loadTrials(supabase: SupabaseClient<Database>, applicationId: string): Promise<TrialView[]> {
  const { data } = await supabase
    .from("trial_shifts")
    .select("id, starts_at, duration_minutes, is_paid, note, status")
    .eq("application_id", applicationId)
    .order("starts_at", { ascending: false });
  return data ?? [];
}
