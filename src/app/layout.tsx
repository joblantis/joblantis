import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/layout/Header";
import { BottomNav } from "@/components/layout/BottomNav";
import { ServiceWorkerRegister } from "@/components/layout/ServiceWorkerRegister";
import { getSessionUser } from "@/lib/auth";
import { publicEnv } from "@/lib/env";

const inter = Inter({ subsets: ["latin", "latin-ext"], variable: "--font-inter", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(publicEnv.siteUrl),
  title: { default: "JOBLANTIS – Vendéglátós és szállodai állások", template: "%s | JOBLANTIS" },
  description:
    "Állások a vendéglátásban és a szállodaiparban. Ellenőrizhető kompetenciák alapján, nem önbevallásból. Raise your future.",
  applicationName: "JOBLANTIS",
  appleWebApp: { capable: true, title: "JOBLANTIS", statusBarStyle: "default" },
  formatDetection: { telephone: false },
  icons: { apple: "/icons/apple-touch-icon.png" },
  openGraph: { type: "website", locale: "hu_HU", siteName: "JOBLANTIS" },
};

export const viewport: Viewport = {
  themeColor: "#001AA6",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const user = await getSessionUser();
  return (
    <html lang="hu" className={`${inter.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <Header user={user} />
        <main className="mx-auto w-full max-w-screen-sm flex-1 px-4 pb-28 pt-5">{children}</main>
        <BottomNav role={user?.profile.role ?? null} />
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
