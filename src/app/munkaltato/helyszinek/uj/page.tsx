import type { Metadata } from "next";
import { VenueForm } from "../VenueForm";
import { PageHeader } from "@/components/ui/PageHeader";
import { requireEmployerCompany } from "@/lib/auth";

export const metadata: Metadata = { title: "Új helyszín" };

export default async function NewVenuePage(props: PageProps<"/munkaltato/helyszinek/uj">) {
  await requireEmployerCompany("/munkaltato/helyszinek/uj");
  const { elso } = await props.searchParams;
  return (
    <div>
      <PageHeader
        title="Új helyszín"
        back="/munkaltato/helyszinek"
        subtitle={elso ? "A céged elkészült. Most add meg az első helyszínt, ahova munkatársat keresel." : undefined}
      />
      <VenueForm />
    </div>
  );
}
