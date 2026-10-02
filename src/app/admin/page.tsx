import type { Metadata } from "next";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/PageHeader";
import { AdminTabs } from "@/components/admin/AdminNotice";

export const metadata: Metadata = { title: "Admin" };

const LABELS: [string, string][] = [
  ["candidates", "Jelölt"],
  ["employers", "Munkáltató"],
  ["companies", "Cég"],
  ["active_jobs", "Aktív állás"],
  ["applications", "Jelentkezés"],
  ["applications_new", "Válaszra vár"],
  ["auto_closed", "Automatikusan lezárt"],
  ["hired", "Felvétel"],
  ["references", "Ajánlás"],
  ["trials_completed", "Értékelt próbanap"],
  ["followups_sent", "Kiküldött utókövetés"],
  ["followups_answered", "Megválaszolt utókövetés"],
  ["emails_pending", "Kiküldésre váró email"],
];

export default async function AdminHome() {
  await requireRole(["admin"], "/admin");
  const supabase = await createClient();
  const { data } = await supabase.rpc("admin_stats");
  const stats = (data ?? {}) as Record<string, number>;
  const ghostRate = stats.applications ? Math.round((100 * (stats.auto_closed ?? 0)) / stats.applications) : 0;

  return (
    <div>
      <PageHeader title="Admin" subtitle="Katalógus szerkesztése és moderálás" />
      <AdminTabs active="/admin" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {LABELS.map(([key, label]) => (
          <div key={key} className="rounded-3xl bg-soft p-4">
            <p className="text-2xl font-bold text-brand">{stats[key] ?? 0}</p>
            <p className="text-sm text-muted">{label}</p>
          </div>
        ))}
      </div>
      <p className="mt-4 text-sm text-muted">
        Ghosting arány (5 nap válasz nélkül lezárt jelentkezések): <b className="text-ink">{ghostRate}%</b>. Az ütemezett feladatok óránként a Supabase
        pg_cronból, az emailek a napi Vercel Cronból és közvetlenül a műveletek után mennek ki.
      </p>
    </div>
  );
}
