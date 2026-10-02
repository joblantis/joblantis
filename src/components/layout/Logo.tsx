"use client";

/* eslint-disable @next/next/no-img-element -- kis statikus logó, hiány esetén elrejtjük */
import { useEffect, useRef, useState } from "react";

export function Logo({ size = 32 }: { size?: number }) {
  const ref = useRef<HTMLImageElement>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    // a hiba a hidratálás előtt is bekövetkezhet, ezért betöltés után is ellenőrizzük
    const img = ref.current;
    if (img?.complete && img.naturalWidth === 0) setFailed(true);
  }, []);
  if (failed) return null;
  return (
    <img
      ref={ref}
      src="/logo.png"
      alt=""
      width={size}
      height={size}
      className="shrink-0 object-contain"
      style={{ width: size, height: size }}
      onError={() => setFailed(true)}
    />
  );
}
