import type { Metadata } from "next";
import { SignUpForm } from "./SignUpForm";
import { PageHeader } from "@/components/ui/PageHeader";

export const metadata: Metadata = { title: "Regisztráció", robots: { index: false } };

export default async function SignUpPage(props: PageProps<"/regisztracio">) {
  const { szerep } = await props.searchParams;
  const role = szerep === "employer" || szerep === "candidate" ? szerep : undefined;
  return (
    <div className="pt-4">
      <PageHeader title="Regisztráció" subtitle="Ingyenes, és pár perc az egész." />
      <SignUpForm defaultRole={role} />
    </div>
  );
}
