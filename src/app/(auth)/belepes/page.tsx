import type { Metadata } from "next";
import { LoginForm } from "./LoginForm";
import { PageHeader } from "@/components/ui/PageHeader";

export const metadata: Metadata = { title: "Belépés", robots: { index: false } };

export default async function LoginPage(props: PageProps<"/belepes">) {
  const { next, hiba } = await props.searchParams;
  return (
    <div className="pt-4">
      <PageHeader title="Belépés" subtitle="Lépj be a JOBLANTIS fiókodba." />
      {hiba && <p className="mb-4 rounded-2xl bg-danger/5 px-4 py-3 text-sm text-danger">A link lejárt vagy érvénytelen. Lépj be, vagy kérj újat.</p>}
      <LoginForm next={typeof next === "string" ? next : undefined} />
    </div>
  );
}
