import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { latestRuns, listModules } from "@/lib/data";
import { fmtDate, fmtMoney, isPaid, STATUS_LABEL, STATUS_ORDER } from "@/lib/format";
import { StatusPill } from "@/components/Pill";
import { ServicesBand } from "@/components/ServicesBand";

export default async function Home() {
  await requireSession();
  const [modules, runs] = await Promise.all([listModules(), latestRuns()]);
  const counts = Object.fromEntries(STATUS_ORDER.map((s) => [s, modules.filter((m) => m.status === s).length]));
  const paid = modules.reduce((a, m) => a + m.paid_cents, 0);
  const total = modules.reduce((a, m) => a + m.amount_cents, 0);

  return (
    <main className="portal">
      <p className="eyebrow dark">Client portal</p>
      <h1>M-Powered Pathways build</h1>
      <p className="lead">Progress, test results and acceptance for each of the 18 modules in Schedule A.</p>

      <div className="stats">
        {STATUS_ORDER.map((s) => (
          <div className="stat" key={s}><b>{counts[s]}</b><span>{STATUS_LABEL[s]}</span></div>
        ))}
        <div className="stat"><b>{fmtMoney(paid)}</b><span>paid of {fmtMoney(total)}</span></div>
        <div className="stat"><b>{fmtMoney(total - paid)}</b><span>invoiced as modules are accepted</span></div>
      </div>

      <div className="card" style={{ padding: 0, overflowX: "auto" }}>
        <table>
          <thead>
            <tr><th>#</th><th>Module</th><th>Status</th><th>Target date</th><th>Latest automatic tests</th><th className="right">Payment</th></tr>
          </thead>
          <tbody>
            {modules.map((m) => {
              const r = runs[m.n];
              return (
                <tr key={m.n}>
                  <td>{m.n}</td>
                  <td><Link href={`/modules/${m.n}`}>{m.name}</Link></td>
                  <td><StatusPill status={m.status} /></td>
                  <td>{fmtDate(m.due_date)}</td>
                  <td>
                    {r ? (
                      <span className={r.failed > 0 ? "pill fail" : "pill pass"}>{r.passed} of {r.total} passed</span>
                    ) : (
                      <span className="muted">No run yet</span>
                    )}
                  </td>
                  <td className="right">
                    {isPaid(m) ? <><span className="pill pass">Paid</span> <span className="muted">{fmtMoney(m.amount_cents)}</span></> : <>{fmtMoney(m.amount_cents)} <span className="muted">on acceptance</span></>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="hint">Amounts are the module build costs in section 5 of the agreement. Module 1 is covered by the $5,000 project initiation fee, which has been paid. Every other module is invoiced when it is accepted.</p>
      <ServicesBand />
    </main>
  );
}
