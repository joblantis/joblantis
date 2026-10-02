/* eslint-disable @next/next/no-img-element -- aláírt, lejáró URL-ek: a Next képoptimalizáló cache-e itt nem segít */
import type { ComponentProps } from "react";

export function LazyImage({ alt, ...props }: ComponentProps<"img"> & { alt: string }) {
  return <img alt={alt} loading="lazy" decoding="async" {...props} />;
}
