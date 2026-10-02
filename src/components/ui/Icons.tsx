import type { SVGProps } from "react";

function Svg(props: SVGProps<SVGSVGElement>) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden {...props} />;
}

export const IconSearch = (p: SVGProps<SVGSVGElement>) => (
  <Svg {...p}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></Svg>
);
export const IconBriefcase = (p: SVGProps<SVGSVGElement>) => (
  <Svg {...p}><rect x="3" y="7" width="18" height="13" rx="2" /><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 13h18" /></Svg>
);
export const IconUser = (p: SVGProps<SVGSVGElement>) => (
  <Svg {...p}><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></Svg>
);
export const IconHome = (p: SVGProps<SVGSVGElement>) => (
  <Svg {...p}><path d="m3 11 9-8 9 8" /><path d="M5 10v10h14V10" /></Svg>
);
export const IconPin = (p: SVGProps<SVGSVGElement>) => (
  <Svg {...p}><path d="M12 21s-7-6.5-7-12a7 7 0 0 1 14 0c0 5.5-7 12-7 12z" /><circle cx="12" cy="9" r="2.5" /></Svg>
);
export const IconBuilding = (p: SVGProps<SVGSVGElement>) => (
  <Svg {...p}><rect x="4" y="3" width="16" height="18" rx="1" /><path d="M9 21v-4h6v4M8 7h.01M12 7h.01M16 7h.01M8 11h.01M12 11h.01M16 11h.01" /></Svg>
);
export const IconLogin = (p: SVGProps<SVGSVGElement>) => (
  <Svg {...p}><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M15 12H3" /></Svg>
);
export const IconClock = (p: SVGProps<SVGSVGElement>) => (
  <Svg {...p}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></Svg>
);
export const IconWallet = (p: SVGProps<SVGSVGElement>) => (
  <Svg {...p}><rect x="3" y="6" width="18" height="14" rx="2" /><path d="M3 10h18M16 15h2" /></Svg>
);
export const IconCheck = (p: SVGProps<SVGSVGElement>) => (
  <Svg {...p}><path d="m5 12 5 5L20 7" /></Svg>
);
export const IconPlus = (p: SVGProps<SVGSVGElement>) => (
  <Svg {...p}><path d="M12 5v14M5 12h14" /></Svg>
);
export const IconSun = (p: SVGProps<SVGSVGElement>) => (
  <Svg {...p}><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></Svg>
);
export const IconImage = (p: SVGProps<SVGSVGElement>) => (
  <Svg {...p}><rect x="3" y="4" width="18" height="16" rx="2" /><circle cx="9" cy="10" r="2" /><path d="m21 16-5-5-9 9" /></Svg>
);
export const IconChat = (p: SVGProps<SVGSVGElement>) => (
  <Svg {...p}><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z" /></Svg>
);
export const IconCards = (p: SVGProps<SVGSVGElement>) => (
  <Svg {...p}><rect x="6" y="3" width="13" height="17" rx="2" transform="rotate(8 12 12)" /><rect x="4" y="4" width="13" height="17" rx="2" /></Svg>
);
export const IconInbox = (p: SVGProps<SVGSVGElement>) => (
  <Svg {...p}><path d="M3 13h5l1.5 3h5L16 13h5" /><path d="M5 5h14l2 8v6H3v-6z" /></Svg>
);
export const IconBookmark = (p: SVGProps<SVGSVGElement>) => (
  <Svg {...p}><path d="M6 3h12v18l-6-4-6 4z" /></Svg>
);
