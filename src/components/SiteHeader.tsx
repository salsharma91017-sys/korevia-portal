import Link from "next/link";
import type { Session } from "@/lib/auth";
import { LOGO } from "@/lib/brand";
import { AgentBot } from "@/components/AgentBot";

export function SiteHeader({ session }: { session: Session }) {
  return (
    <header className="topbar">
      <div className="inner">
        <div className="brandwrap">
          <Link className="brand" href="/" aria-label="KoreVia client portal home">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={LOGO.wordmarkLight} alt="KoreVia" height={28} />
            <span className="sub">Client portal</span>
          </Link>
          <AgentBot />
        </div>
        <nav aria-label="Main">
          <Link href="/">Modules</Link>
          {session.role === "owner" && <Link href="/team">People</Link>}
        </nav>
        <span className="who">{session.name} &middot; {session.role}</span>
        <form action="/logout" method="post"><button className="secondary" type="submit">Sign out</button></form>
      </div>
    </header>
  );
}
