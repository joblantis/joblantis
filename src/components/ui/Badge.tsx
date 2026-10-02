import type { ReactNode } from "react";

type Tone = "brand" | "neutral" | "success" | "warning" | "danger";
const tones: Record<Tone, string> = {
  brand: "bg-brand/10 text-brand",
  neutral: "bg-soft text-ink",
  success: "bg-success/10 text-success",
  warning: "bg-amber-100 text-amber-800",
  danger: "bg-danger/10 text-danger",
};

export function Badge({ children, tone = "neutral" }: { children: ReactNode; tone?: Tone }) {
  return <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${tones[tone]}`}>{children}</span>;
}
