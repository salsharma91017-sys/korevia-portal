import GuideView from "@/components/GuideView";
import { fmtDate, fmtDateTime, fmtMoney } from "@/lib/format";
import type { moduleDetail } from "@/lib/data";

type Detail = Awaited<ReturnType<typeof moduleDetail>>;

const badge = (text: string, cls = "none") => <span className={`pill ${cls}`}>{text}</span>;

export default function EvidenceTab({ d, urls }: { d: Detail; urls: Record<string, string> }) {
  return (
    <>
      <h2>Acceptance</h2>
      {d.acceptances.length === 0 ? (
        <p className="muted">Not accepted yet.</p>
      ) : (
        d.acceptances.map((a) => {
          const auto = (a.summary as { automatic?: { passed: number; failed: number; total: number } | null }).automatic;
          const manual = (a.summary as { manual?: { pass: number; fail: number } }).manual;
          return (
            <div key={a.id} className="panel accent">
              <p><strong>Accepted by {a.by_name}</strong> ({a.by_email}) on {fmtDateTime(a.accepted_at)}. Signed off by typing: <em>{a.typed_name}</em>.</p>
              <p>{a.amount_cents === 0 ? "No invoice triggered (already paid)." : `Payment triggered: ${fmtMoney(a.amount_cents)}.`} Build: <span className="mono">{a.commit_sha?.slice(0, 7) ?? "n/a"}</span>.</p>
              <p className="muted">
                At acceptance: {auto ? `${auto.passed} of ${auto.total} automatic tests passed` : "no automatic run"}; {manual?.pass ?? 0} passed and {manual?.fail ?? 0} failed by hand.
              </p>
              {a.comment && <p>Comment: {a.comment}</p>}
            </div>
          );
        })
      )}

      <h2>Change requests</h2>
      {d.requests.length === 0 ? (
        <p className="muted">None.</p>
      ) : (
        <table className="compact">
          <thead><tr><th>When</th><th>From</th><th>Request</th><th>Status</th></tr></thead>
          <tbody>
            {d.requests.map((r) => (
              <tr key={r.id}>
                <td>{fmtDateTime(r.created_at)}</td><td>{r.by_name}</td><td>{r.body}</td>
                <td>{r.resolved_at ? <>{badge("Resolved", "pass")} <span className="muted">{fmtDate(r.resolved_at)}</span></> : badge("Open", "in_development")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <h2>Automatic test runs</h2>
      {d.runs.length === 0 ? (
        <p className="muted">No runs yet.</p>
      ) : (
        <table className="compact">
          <thead><tr><th>When</th><th>Build</th><th>Result</th><th>Test pack</th></tr></thead>
          <tbody>
            {d.runs.map((r) => (
              <tr key={r.id}>
                <td>{fmtDateTime(r.created_at)}</td>
                <td>{r.run_url ? <a className="mono" href={r.run_url} target="_blank" rel="noreferrer">{r.commit_sha.slice(0, 7)}</a> : <span className="mono">{r.commit_sha.slice(0, 7)}</span>}</td>
                <td>{badge(`${r.passed} of ${r.total} passed`, r.failed > 0 ? "fail" : "pass")}</td>
                <td>{r.pack_path && urls[r.pack_path] ? <a href={urls[r.pack_path]}>Word pack</a> : <span className="muted">-</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <h2>Changes made during this module</h2>
      <p className="muted">Each entry records a change to the design or scope, why it was made, and whether the agreement needs updating.</p>
      {d.notes.length === 0 ? (
        <p className="muted">None published yet.</p>
      ) : (
        d.notes.map((n) => (
          <details key={n.slug} className="panel">
            <summary>
              {fmtDate(n.note_date)} &middot; {n.title}{" "}
              {n.note_type && badge(n.note_type)}{" "}
              {n.deviation && n.deviation !== "none" && badge(`Differs from: ${n.deviation}`, "in_development")}{" "}
              {n.needs_approval && /^approved/i.test(n.needs_approval) && badge("Approved by client", "accepted")}
              {n.needs_approval && n.needs_approval !== "none" && !/^approved/i.test(n.needs_approval) && badge("Needs approval", "ready_for_review")}
            </summary>
            {n.migrations && n.migrations !== "none" && <p className="hint">Database changes: {n.migrations}</p>}
            <GuideView md={n.body_md} shots={{}} />
          </details>
        ))
      )}
    </>
  );
}
