import Link from "next/link";
import { Logo } from "./Logo";
import type { SessionUser } from "@/lib/auth";

export function Header({ user }: { user: SessionUser | null }) {
  return (
    <header className="sticky top-0 z-30 border-b border-line/70 bg-white/90 backdrop-blur pt-[env(safe-area-inset-top)]">
      <div className="mx-auto flex h-14 max-w-screen-sm items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2" aria-label="JOBLANTIS főoldal">
          <Logo size={30} />
          <span className="text-lg font-extrabold tracking-[0.12em] text-brand">JOBLANTIS</span>
        </Link>
        {!user && (
          <Link href="/belepes" className="rounded-full px-4 py-2 text-sm font-semibold text-brand hover:bg-soft">
            Belépés
          </Link>
        )}
      </div>
    </header>
  );
}
