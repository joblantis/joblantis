import type { Metadata } from "next";
import { requireRole } from "@/lib/auth";
import { PageHeader } from "@/components/ui/PageHeader";

export const metadata: Metadata = { title: "Admin" };

export default async function AdminHome() {
  await requireRole(["admin"], "/admin");
  return (
    <div>
      <PageHeader title="Admin" subtitle="Sablonok, kompetenciák, swipe kártyák szerkesztése és moderálás – az 5. fázisban." />
    </div>
  );
}
