import { LINKS, LOGO, PROMISE, SERVICES, TAGLINE } from "@/lib/brand";

/** The "Built and supported by KoreVia Solutions" block (same message as the CompIQ site). */
export function ServicesBand() {
  return (
    <section className="services-band" aria-labelledby="kv-band-h">
      <div className="services-brand">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="mark" src={LOGO.mark} alt="KoreVia" width={76} height={64} />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="wordmark" src={LOGO.wordmarkLight} alt="" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="solutions" src={LOGO.solutionsLight} alt="Solutions" />
        <p className="tagline">{TAGLINE}</p>
      </div>
      <div className="services-copy">
        <p className="eyebrow">Your technology partner</p>
        <h2 id="kv-band-h">Built and supported by KoreVia Solutions</h2>
        <p className="promise">{PROMISE}</p>
        <p>
          This portal is one of the platforms KoreVia Solutions designs, builds and runs. If your practice or business needs AI or
          automation, we can build it for you, and run it once it is live.
        </p>
        <ul className="service-grid">
          {SERVICES.map((s) => (
            <li key={s.title}><strong>{s.title}</strong><span>{s.body}</span></li>
          ))}
        </ul>
        <p className="product">
          See what we build: <a href={LINKS.compiq}>KoreVia CompIQ</a>, AI-powered competition management that draws the pools,
          schedules the courts and fills the finals automatically.
        </p>
        <div className="row">
          <a className="button teal" href={LINKS.site}>Visit korevia.solutions</a>
          <a className="button ghost" href={`mailto:${LINKS.email}`}>Email {LINKS.email}</a>
        </div>
      </div>
    </section>
  );
}
