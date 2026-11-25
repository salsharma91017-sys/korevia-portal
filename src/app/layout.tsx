import type { Metadata } from "next";
import "./globals.css";
import { getSession } from "@/lib/auth";
import { LOGO } from "@/lib/brand";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";

export const metadata: Metadata = {
  title: "KoreVia Client Portal",
  description: "Module progress, test evidence and acceptance, from KoreVia Solutions",
  robots: { index: false, follow: false },
  icons: { icon: LOGO.favicon, apple: LOGO.appleTouch },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  return (
    <html lang="en-AU">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@500;600;700&family=Public+Sans:wght@400;500;600;700&display=swap"
        />
      </head>
      <body>
        {session && <SiteHeader session={session} />}
        {children}
        {session && <SiteFooter />}
      </body>
    </html>
  );
}
