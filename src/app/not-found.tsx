import { ButtonLink } from "@/components/ui/Button";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center gap-4 pt-16 text-center">
      <p className="text-5xl font-extrabold text-brand">404</p>
      <p className="text-muted">Ez az oldal nem található, vagy a hirdetés már lejárt.</p>
      <ButtonLink href="/allasok">Vissza az állásokhoz</ButtonLink>
    </div>
  );
}
