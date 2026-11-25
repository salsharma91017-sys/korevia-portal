import { can, type Session } from "@/lib/auth";
import { fmtDate, fmtDateTime, fmtMoney, STATUS_LABEL, STATUS_ORDER } from "@/lib/format";
import { StatusPill } from "@/components/Pill";
import type { ModuleRow } from "@/lib/types";
import type { moduleDetail } from "@/lib/data";
import { acceptModule, requestChanges, setStatus, updateDetails } from "../actions";

type Detail = Awaited<ReturnType<typeof moduleDetail>>;

export default function StatusTab({ m, d, session, defaultUat, packUrl }: { m: ModuleRow; d: Detail; session: Session; defaultUat: string | null; packUrl?: string }) {
  const uat = m.uat_url || defaultUat;
  const openRequests = d.requests.filter((r) => !r.resolved_at);
  const run = d.latest;
  const accepted = d.acceptances[0];

  return (
    <>
      <ol className="row" style={{ listStyle: "none", padding: 0, margin: "0 0 1rem" }} aria-label="Pipeline">
        {STATUS_ORDER.map((s, i) => (
          <li key={s} className="row">
            <span className={`pill ${m.status === s ? s : "none"}`} aria-current={m.status === s ? "step" : undefined}>{STATUS_LABEL[s]}</span>
            {i < STATUS_ORDER.length - 1 && <span className="muted" aria-hidden>&rarr;</span>}
          </li>
        ))}
      </ol>

      <dl className="kv">
        <dt>Status since</dt><dd>{fmtDateTime(m.status_changed_at)}</dd>
        <dt>Target date</dt><dd>{fmtDate(m.due_date)}</dd>
        <dt>Payment on acceptance</dt><dd>{fmtMoney(m.amount_cents)} (section 5 of the agreement)</dd>
        <dt>Test it</dt>
        <dd>{uat ? <a href={uat} target="_blank" rel="noreferrer">{uat}</a> : <span className="muted">No link yet</span>} <span className="hint">Test site. Use fake data only.</span></dd>
        <dt>Latest automatic tests</dt>
        <dd>
          {run ? (
            <>
              <span className={run.failed > 0 ? "pill fail" : "pill pass"}>{run.passed} of {run.total} passed</span>{" "}
              <span className="muted">{fmtDateTime(run.created_at)}</span>
              {packUrl && <> &middot; <a href={packUrl}>Download the Word test pack</a></>}
            </>
          ) : (
            <span className="muted">No run yet</span>
          )}
        </dd>
      </dl>

      {accepted && (
        <div className="panel accent">
          <h3>Accepted</h3>
          <p>Accepted by {accepted.by_name} on {fmtDateTime(accepted.accepted_at)}. The record is under Evidence and cannot be changed.</p>
        </div>
      )}

      {openRequests.length > 0 && (
        <div className="panel">
          <h3>Open change requests</h3>
          {openRequests.map((r) => (
            <p key={r.id}><strong>{r.by_name}</strong> <span className="muted">{fmtDateTime(r.created_at)}</span><br />{r.body}</p>
          ))}
        </div>
      )}

      {can.accept(session.role) && m.status === "ready_for_review" && (
        <div className="panel accent">
          <h3>Your review</h3>
          <p>Test the module using the Test guide, then accept it or ask for changes. Accepting confirms it meets the scope in Schedule A and falls due for payment ({fmtMoney(m.amount_cents)}).</p>
          <form action={acceptModule}>
            <input type="hidden" name="n" value={m.n} />
            <label className="inline"><input type="checkbox" name="confirm" /> This module meets the agreed scope</label>
            <label htmlFor="typed_name">Type your full name to sign off ({session.name})</label>
            <input id="typed_name" name="typed_name" autoComplete="off" />
            <label htmlFor="comment">Comment (optional)</label>
            <textarea id="comment" name="comment" />
            <button type="submit">Accept this module</button>
          </form>
          <hr />
          <form action={requestChanges}>
            <input type="hidden" name="n" value={m.n} />
            <label htmlFor="body">Or ask for changes: what is not right?</label>
            <textarea id="body" name="body" />
            <p className="hint">Changes must relate to the agreed scope. New features or enhancements are quoted separately (section 7 of the agreement).</p>
            <button className="secondary" type="submit">Request changes</button>
          </form>
        </div>
      )}
      {can.accept(session.role) && m.status !== "ready_for_review" && m.status !== "accepted" && (
        <p className="panel muted">This module is not ready for your review yet. You will see the review form here when KoreVia sends it for review.</p>
      )}

      {can.setStatus(session.role) && m.status !== "accepted" && (
        <div className="panel">
          <h3>Change status (KoreVia)</h3>
          {(!run || run.failed > 0) && (
            <p className="warn">{!run ? "There is no automatic test run for this module yet." : `The latest automatic run has ${run.failed} failing test(s).`}</p>
          )}
          <form action={setStatus}>
            <input type="hidden" name="n" value={m.n} />
            <label htmlFor="status">New status</label>
            <select id="status" name="status" defaultValue="">
              <option value="" disabled>Choose...</option>
              {(["backlog", "in_development", "ready_for_review"] as const).filter((s) => s !== m.status).map((s) => (
                <option key={s} value={s}>{STATUS_LABEL[s]}</option>
              ))}
            </select>
            <label htmlFor="note">Note (shown in the history)</label>
            <input id="note" name="note" />
            <label className="inline"><input type="checkbox" name="acknowledge" /> Send for review even if there is no passing automatic run</label>
            <button type="submit">Save status</button>
          </form>
        </div>
      )}

      {can.editModule(session.role) && (
        <div className="panel">
          <h3>Target date and test link (KoreVia)</h3>
          <form action={updateDetails}>
            <input type="hidden" name="n" value={m.n} />
            <label htmlFor="due_date">Target date</label>
            <input id="due_date" name="due_date" type="date" defaultValue={m.due_date ?? ""} />
            <label htmlFor="uat_url">Link to the test site for this module (leave blank to use the default)</label>
            <input id="uat_url" name="uat_url" type="url" defaultValue={m.uat_url ?? ""} placeholder="https://uat.m-poweredpathways.com.au" />
            <button className="secondary" type="submit">Save</button>
          </form>
        </div>
      )}

      <h2>History</h2>
      {d.events.length === 0 ? (
        <p className="muted">No changes yet.</p>
      ) : (
        <table className="compact">
          <thead><tr><th>When</th><th>Change</th><th>By</th><th>Note</th></tr></thead>
          <tbody>
            {d.events.map((e) => (
              <tr key={e.id}>
                <td>{fmtDateTime(e.at)}</td>
                <td>{e.from_status ? <><StatusPill status={e.from_status} /> &rarr; </> : null}<StatusPill status={e.to_status} /></td>
                <td>{e.by_name}</td>
                <td>{e.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}
