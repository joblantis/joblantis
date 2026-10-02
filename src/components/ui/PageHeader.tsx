import Link from "next/link";
import type { ReactNode } from "react";

export function PageHeader({ title, subtitle, back, action }: { title: string; subtitle?: string; back?: string; action?: ReactNode }) {
  return (
    <div className="mb-5 flex items-start gap-3">
      {back && (
        <Link href={back} aria-label="Vissza" className="-ml-2 grid size-11 shrink-0 place-items-center rounded-full text-ink hover:bg-soft">
          <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="m15 18-6-6 6-6" />
          </svg>
        </Link>
      )}
      <div className="min-w-0 flex-1">
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-1 text-muted">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
