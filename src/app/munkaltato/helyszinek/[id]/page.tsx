import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { VenueForm } from "../VenueForm";
import { VenuePhotos } from "../VenuePhotos";
import { DeleteVenueButton } from "../DeleteVenueButton";
import { PageHeader } from "@/components/ui/PageHeader";
import { ButtonLink } from "@/components/ui/Button";
import { requireEmployerCompany } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { signedUrls } from "@/lib/storage";

export const metadata: Metadata = { title: "Helyszín szerkesztése" };

export default async function VenuePage(props: PageProps<"/munkaltato/helyszinek/[id]">) {
  const { id } = await props.params;
  const { uj } = await props.searchParams;
  const { company } = await requireEmployerCompany(`/munkaltato/helyszinek/${id}`);
  const supabase = await createClient();
  const { data: venue } = await supabase
    .from("venues")
    .select("id, name, address, description, settlements(id, postal_code, name, county), venue_photos(id, path, sort_order)")
    .eq("id", id)
    .eq("company_id", company.id)
    .maybeSingle();
  if (!venue) notFound();

  const photos = [...venue.venue_photos].sort((a, b) => a.sort_order - b.sort_order);
  const urls = await signedUrls("venue-photos", photos.map((p) => p.path), { client: supabase });

  return (
    <div className="space-y-8">
      <PageHeader title={venue.name} back="/munkaltato/helyszinek" />
      {uj && (
        <div className="space-y-3 rounded-3xl bg-brand/5 p-4">
          <p className="font-semibold text-brand">A helyszín elkészült!</p>
          <p className="text-sm text-muted">Tölts fel néhány fotót – ez jelenik meg a jelöltek állaskártyáin.</p>
          <ButtonLink href={`/munkaltato/allasok/uj`} variant="secondary" className="w-full">
            Tovább az állásfeladáshoz
          </ButtonLink>
        </div>
      )}
      <section className="space-y-3">
        <h2 className="text-lg font-bold">Fotók</h2>
        <VenuePhotos companyId={company.id} venueId={venue.id} photos={photos.map((p) => ({ id: p.id, url: urls.get(p.path) ?? null }))} />
      </section>
      <section className="space-y-3">
        <h2 className="text-lg font-bold">Adatok</h2>
        <VenueForm venue={{ id: venue.id, name: venue.name, address: venue.address, description: venue.description, settlement: venue.settlements }} />
      </section>
      <DeleteVenueButton venueId={venue.id} />
    </div>
  );
}
