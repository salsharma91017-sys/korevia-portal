import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { getModule, moduleDetail } from "@/lib/data";
import { fmtDate, fmtMoney } from "@/lib/format";
import { signedUrls } from "@/lib/storage";
import { serverEnv } from "@/lib/env";
import { StatusPill } from "@/components/Pill";
import StatusTab from "./tabs/StatusTab";
import ScopeTab from "./tabs/ScopeTab";
import GuideTab from "./tabs/GuideTab";
import ResultsTab from "./tabs/ResultsTab";
import EvidenceTab from "./tabs/EvidenceTab";

type Props = { params: Promise<{ n: string }>; searchParams: Promise<{ tab?: string; ok?: string; error?: string }> };

const TABS = [
  ["status", "Status and accept"],
  ["scope", "Scope"],
  ["guide", "Test guide"],
  ["results", "Results"],
  ["evidence", "Evidence"],
] as const;

export default async function ModulePage({ params, searchParams }: Props) {
  const session = await requireSession();
  const n = Number((await params).n);
  if (!Number.isInteger(n)) notFound();
  const m = await getModule(n);
  if (!m) notFound();
  const sp = await searchParams;
  const tab = TABS.some(([k]) => k === sp.tab) ? (sp.tab as (typeof TABS)[number][0]) : "status";
  const d = await moduleDetail(n);

  // Links to private screenshots and packs are signed only for the tab that shows them.
  const shotPaths = d.shots.map((s) => s.path);
  const manualPaths = d.manual.flatMap((r) => r.screenshot_paths);
  const packPaths = d.runs.map((r) => r.pack_path).filter((p): p is string => Boolean(p));
  const urls = await signedUrls(tab === "guide" ? shotPaths : tab === "results" ? [...shotPaths, ...manualPaths] : tab === "evidence" ? [...packPaths, ...manualPaths] : tab === "status" ? packPaths.slice(0, 1) : []);

  const defaultUat = serverEnv().DEFAULT_UAT_URL ?? null;

  return (
    <main className="portal">
      <p className="hint"><Link href="/">&larr; All modules</Link></p>
      <div className="row" style={{ justifyContent: "space-between" }}>
        <h1 style={{ margin: 0 }}>{m.n}. {m.name}</h1>
        <StatusPill status={m.status} />
      </div>
      <p className="lead" style={{ margin: ".25rem 0 0" }}>
        Target {fmtDate(m.due_date)} &middot; {fmtMoney(m.amount_cents)} on acceptance
      </p>

      <nav className="tabs" aria-label="Module sections">
        {TABS.map(([key, label]) => (
          <Link key={key} href={`/modules/${m.n}?tab=${key}`} aria-current={tab === key ? "page" : undefined}>{label}</Link>
        ))}
      </nav>

      {sp.ok && <p className="notice" role="status">{sp.ok}</p>}
      {sp.error && <p className="error" role="alert">{sp.error}</p>}

      {tab === "status" && <StatusTab m={m} d={d} session={session} defaultUat={defaultUat} packUrl={d.latest?.pack_path ? urls[d.latest.pack_path] : undefined} />}
      {tab === "scope" && <ScopeTab m={m} features={d.features} />}
      {tab === "guide" && <GuideTab guides={d.guides} shots={d.shots} urls={urls} />}
      {tab === "results" && <ResultsTab m={m} d={d} urls={urls} session={session} />}
      {tab === "evidence" && <EvidenceTab d={d} urls={urls} />}
    </main>
  );
}
