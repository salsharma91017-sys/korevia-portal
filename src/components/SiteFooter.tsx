import { LINKS, LOGO, TAGLINE } from "@/lib/brand";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="inner">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={LOGO.mark} alt="" width={28} height={24} />
        <div>
          <strong>KoreVia Solutions</strong> &middot; {TAGLINE}
          <div className="muted">
            <a href={LINKS.site}>korevia.solutions</a> &middot; <a href={`mailto:${LINKS.email}`}>{LINKS.email}</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
