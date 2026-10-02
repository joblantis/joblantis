"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentType, SVGProps } from "react";
import { IconBriefcase, IconBuilding, IconCards, IconChat, IconHome, IconInbox, IconLogin, IconPin, IconSearch, IconUser } from "@/components/ui/Icons";
import type { Enums } from "@/types/database";

type Item = { href: string; label: string; icon: ComponentType<SVGProps<SVGSVGElement>>; exact?: boolean };

const NAV: Record<Enums<"user_role"> | "guest", Item[]> = {
  guest: [
    { href: "/", label: "Főoldal", icon: IconHome, exact: true },
    { href: "/allasok", label: "Állások", icon: IconSearch },
    { href: "/belepes", label: "Belépés", icon: IconLogin },
  ],
  candidate: [
    { href: "/jelolt/allaskereses", label: "Keresés", icon: IconCards },
    { href: "/allasok", label: "Lista", icon: IconSearch },
    { href: "/jelolt/jelentkezesek", label: "Jelentkezések", icon: IconInbox },
    { href: "/uzenetek", label: "Üzenetek", icon: IconChat },
    { href: "/jelolt", label: "Profilom", icon: IconUser, exact: true },
  ],
  employer: [
    { href: "/munkaltato", label: "Áttekintés", icon: IconHome, exact: true },
    { href: "/munkaltato/allasok", label: "Állásaim", icon: IconBriefcase },
    { href: "/uzenetek", label: "Üzenetek", icon: IconChat },
    { href: "/munkaltato/helyszinek", label: "Helyszínek", icon: IconPin },
    { href: "/munkaltato/ceg", label: "Cég", icon: IconBuilding },
  ],
  admin: [
    { href: "/allasok", label: "Állások", icon: IconSearch },
    { href: "/munkaltato", label: "Munkáltató", icon: IconBriefcase },
  ],
};

export function BottomNav({ role, unread = 0 }: { role: Enums<"user_role"> | null; unread?: number }) {
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
                <span className="relative">
                  <Icon className="size-6" />
                  {href === "/uzenetek" && unread > 0 && (
                    <span className="absolute -right-2.5 -top-1.5 min-w-5 rounded-full bg-danger px-1 text-center text-[11px] leading-5 text-white" aria-label={`${unread} olvasatlan`}>
                      {unread > 99 ? "99+" : unread}
                    </span>
                  )}
                </span>
                <span className="max-w-full truncate px-0.5">{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
