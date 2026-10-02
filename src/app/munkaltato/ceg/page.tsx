import type { Metadata } from "next";
import { CompanyForm } from "./CompanyForm";
import { PageHeader } from "@/components/ui/PageHeader";
import { getEmployerCompany, requireRole } from "@/lib/auth";
import { signOut } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/Button";

export const metadata: Metadata = { title: "Cégadatok" };

export default async function CompanyPage() {
  const user = await requireRole(["employer", "admin"], "/munkaltato/ceg");
  const company = await getEmployerCompany(user.id);
  return (
    <div>
      <PageHeader
        title={company ? "Cégadatok" : "Hozd létre a céged"}
        subtitle={company ? undefined : "Egy céghez több helyszín (étterem, szálloda) is tartozhat."}
      />
      <CompanyForm company={company} />
      <form action={signOut} className="mt-10 border-t border-line pt-6">
        <p className="mb-3 text-sm text-muted">Bejelentkezve: {user.email}</p>
        <Button type="submit" variant="secondary" className="w-full">
          Kijelentkezés
        </Button>
      </form>
    </div>
  );
}
