import LoginForm from "./LoginForm";
import { LINKS, LOGO, SERVICES, TAGLINE } from "@/lib/brand";

export default function LoginPage() {
  return (
    <div className="login-shell">
      <section className="login-hero">
        <div className="login-logo">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={LOGO.wordmarkLight} alt="KoreVia" height={40} />
          <span className="sub">Client portal</span>
        </div>
        <span className="badge"><i aria-hidden="true" /> Delivery, in plain sight</span>
        <h1>Every module.<br />Every test.<br /><span className="accent">Every sign-off.</span></h1>
        <p className="lede">
          Follow your build as it happens: what is in progress, the tests behind every feature, and a permanent record when you
          accept each module.
        </p>
        <ul className="login-points">
          <li><strong>Live progress</strong><span>Watch each module move from backlog to accepted.</span></li>
          <li><strong>Test evidence</strong><span>Step-by-step guides, automatic results and screenshots.</span></li>
          <li><strong>A clear sign-off</strong><span>Accept a module or ask for changes, with a record of both.</span></li>
        </ul>
        <div className="login-about">
          <p className="eyebrow">{TAGLINE}</p>
          <p>
            <strong>KoreVia Solutions</strong> designs, builds and runs AI agents, workflow automation and custom platforms
            for small business. This portal is one of them.
          </p>
          <p className="mini-services">{SERVICES.map((s) => s.title).join("  ·  ")}</p>
        </div>
      </section>
      <section className="login-pane">
        <div className="card login-card">
          <p className="eyebrow dark">Welcome back</p>
          <h2>Sign in to the portal</h2>
          <LoginForm />
          <p className="hint">
            Need a login or a password reset? Email <a href={`mailto:${LINKS.email}`}>{LINKS.email}</a>.
          </p>
        </div>
        <p className="login-foot">Built and supported by <a href={LINKS.site}>KoreVia Solutions</a></p>
      </section>
    </div>
  );
}
