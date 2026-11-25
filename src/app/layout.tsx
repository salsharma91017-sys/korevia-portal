import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { getSession } from "@/lib/auth";

export const metadata: Metadata = {
  title: "KoreVia Client Portal",
  description: "Module progress, test evidence and acceptance",
  robots: { index: false, follow: false },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  return (
    <html lang="en-AU">
      <body>
        <header className="topbar">
          <div className="inner">
            <Link className="brand" href="/">KoreVia client portal</Link>
            {session && (
              <>
                <Link href="/">Modules</Link>
                {session.role === "owner" && <Link href="/team">People</Link>}
                <span className="who">{session.name} &middot; {session.role}</span>
                <form action="/logout" method="post"><button className="secondary" type="submit">Sign out</button></form>
              </>
            )}
          </div>
        </header>
        {children}
      </body>
    </html>
  );
}
