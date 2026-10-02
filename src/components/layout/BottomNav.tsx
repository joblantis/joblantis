"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentType, SVGProps } from "react";
import { IconBriefcase, IconBuilding, IconImage, IconHome, IconLogin, IconPin, IconSearch, IconUser } from "@/components/ui/Icons";
import type { Enums } from "@/types/database";

type Item = { href: string; label: string; icon: ComponentType<SVGProps<SVGSVGElement>>; exact?: boolean };

const NAV: Record<Enums<"user_role"> | "guest", Item[]> = {
  guest: [
    { href: "/", label: "Főoldal", icon: IconHome, exact: true },
    { href: "/allasok", label: "Állások", icon: IconSearch },
    { href: "/belepes", label: "Belépés", icon: IconLogin },
  ],
  candidate: [
    { href: "/allasok", label: "Állások", icon: IconSearch },
    { href: "/jelolt/galeria", label: "Galéria", icon: IconImage },
    { href: "/jelolt", label: "Profilom", icon: IconUser, exact: true },
  ],
  employer: [
    { href: "/munkaltato", label: "Áttekintés", icon: IconHome, exact: true },
    { href: "/munkaltato/allasok", label: "Állásaim", icon: IconBriefcase },
    { href: "/munkaltato/helyszinek", label: "Helyszínek", icon: IconPin },
    { href: "/munkaltato/ceg", label: "Cég", icon: IconBuilding },
  ],
  admin: [
    { href: "/allasok", label: "Állások", icon: IconSearch },
    { href: "/munkaltato", label: "Munkáltató", icon: IconBriefcase },
  ],
};

export function BottomNav({ role }: { role: Enums<"user_role"> | null }) {
  const pathname = usePathname();
  const items = NAV[role ?? "guest"];
  return (
    <nav aria-label="Fő navigáció" className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
      <ul className="mx-auto flex max-w-screen-sm">
        {items.map(({ href, label, icon: Icon, exact }) => {
          const active = exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-16 flex-col items-center justify-center gap-1 text-xs font-semibold ${active ? "text-brand" : "text-muted"}`}
              >
                <Icon className="size-6" />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
