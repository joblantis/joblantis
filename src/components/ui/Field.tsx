import type { ComponentProps, ReactNode } from "react";

const control =
  "block w-full min-h-12 rounded-2xl border border-line bg-white px-4 text-base text-ink placeholder:text-muted focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20";

export function Field({ label, hint, error, children, htmlFor }: { label: string; hint?: string; error?: string; children: ReactNode; htmlFor?: string }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="block text-sm font-semibold text-ink">
        {label}
      </label>
      {children}
      {hint && !error && <p className="text-sm text-muted">{hint}</p>}
      {error && <p className="text-sm text-danger">{error}</p>}
    </div>
  );
}

export function Input({ className = "", ...props }: ComponentProps<"input">) {
  return <input className={`${control} ${className}`} {...props} />;
}

export function Select({ className = "", ...props }: ComponentProps<"select">) {
  return <select className={`${control} appearance-none bg-[length:16px] bg-[right_1rem_center] bg-no-repeat pr-10 ${className}`} style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%237A7A7A' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")" }} {...props} />;
}

export function Textarea({ className = "", ...props }: ComponentProps<"textarea">) {
  return <textarea className={`${control} min-h-28 py-3 ${className}`} {...props} />;
}

export function Checkbox({ label, ...props }: ComponentProps<"input"> & { label: ReactNode }) {
  return (
    <label className="flex min-h-12 cursor-pointer items-center gap-3 rounded-2xl border border-line px-4 has-[:checked]:border-brand has-[:checked]:bg-brand/5">
      <input type="checkbox" className="size-5 accent-[#001AA6]" {...props} />
      <span className="text-base">{label}</span>
    </label>
  );
}
