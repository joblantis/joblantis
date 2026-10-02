import type { ComponentProps } from "react";

export function Card({ className = "", ...props }: ComponentProps<"div">) {
  return <div className={`rounded-3xl border border-line bg-white p-5 shadow-[0_1px_2px_rgba(10,10,10,0.04)] ${className}`} {...props} />;
}
