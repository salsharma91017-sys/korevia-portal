import { can, type Session } from "@/lib/auth";
import { fmtDateTime } from "@/lib/format";
import { ResultPill } from "@/components/Pill";
import ManualResultForm from "@/components/ManualResultForm";
import type { ModuleRow } from "@/lib/types";
import type { moduleDetail } from "@/lib/data";

type Detail = Awaited<ReturnType<typeof moduleDetail>>;

export default function ResultsTab({ m, d, urls, session }: { m: ModuleRow; d: Detail; urls: Record<string, string>; session: Session }) {
  if (d.cases.length === 0) {
    return <p className="panel muted">No test cases have been published for this module yet. They appear here after the first automatic test run.</p>;
  }
  const run = d.latest;
  const auto = new Map(d.results.map((r) => [r.case_id, r]));
  const manualBy = new Map<string, Detail["manual"]>();
  for (const r of d.manual) manualBy.set(r.case_id, [...(manualBy.get(r.case_id) ?? []), r]);
  const guideTitle = new Map(d.guides.map((g) => [g.feature_code, g.title]));
  const features = [...new Set(d.cases.map((c) => c.feature_code))];
  const canRecord = can.recordResult(session.role);

  const autoPass = d.results.filter((r) => r.status === "pass").length;
  const manualDone = d.cases.filter((c) => manualBy.has(c.case_id)).length;

  return (
    <>
      <div className="stats">
        <div className="stat"><b>{d.cases.length}</b><span>test cases</span></div>
        <div className="stat"><b>{run ? `${autoPass} of ${d.results.length}` : "-"}</b><span>passed automatically</span></div>
        <div className="stat"><b>{manualDone}</b><span>also tested by a person</span></div>
      </div>
      {run ? (
        <p className="muted">
          Automatic run: {fmtDateTime(run.created_at)}, build <span className="mono">{run.commit_sha.slice(0, 7)}</span>
          {run.run_url && <> &middot; <a href={run.run_url} target="_blank" rel="noreferrer">view the run</a></>}
        </p>
      ) : (
        <p className="panel muted">No automatic run yet.</p>
      )}

      {features.map((code) => (
        <section key={code}>
          <h2><span className="mono">{code}</span> {guideTitle.get(code)}</h2>
          {d.cases.filter((c) => c.feature_code === code).map((c) => {
            const a = auto.get(c.case_id);
            const mine = manualBy.get(c.case_id) ?? [];
            const shots = d.shots.filter((s) => s.name.startsWith(c.case_id + "-"));
            return (
              <details key={c.case_id} className="panel">
                <summary>
                  <span className="mono">{c.case_id}</span> {c.title}{" "}
                  {a ? <ResultPill status={a.status} /> : <span className="pill none">Not automated</span>}{" "}
                  {mine[0] && <span className="muted">Person: <ResultPill status={mine[0].status} /></span>}
                </summary>

                {a?.status === "fail" && a.error && <p className="warn mono" style={{ whiteSpace: "pre-wrap" }}>{a.error}</p>}
                {shots.length > 0 && (
                  <div className="thumbs">
                    {shots.map((s) => urls[s.path] && (
                      <figure key={s.name}>
                        <a href={urls[s.path]} target="_blank" rel="noreferrer">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={urls[s.path]} alt={s.name} loading="lazy" />
                        </a>
                        <figcaption className="mono">{s.name}</figcaption>
                      </figure>
                    ))}
                  </div>
                )}

                {mine.length > 0 && (
                  <table className="compact">
                    <thead><tr><th>Tested by</th><th>When</th><th>Result</th><th>Notes</th></tr></thead>
                    <tbody>
                      {mine.map((r) => (
                        <tr key={r.id}>
                          <td>{r.tester_name}</td>
                          <td>{fmtDateTime(r.created_at)}</td>
                          <td><ResultPill status={r.status} /></td>
                          <td>
                            {r.notes}
                            {r.screenshot_paths.length > 0 && (
                              <div className="thumbs">
                                {r.screenshot_paths.map((p) => urls[p] && (
                                  <a key={p} href={urls[p]} target="_blank" rel="noreferrer">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={urls[p]} alt="Tester screenshot" loading="lazy" />
                                  </a>
                                ))}
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}

                {canRecord ? (
                  <details>
                    <summary>Record my result</summary>
                    <ManualResultForm n={m.n} caseId={c.case_id} />
                  </details>
                ) : (
                  <p className="hint">Your login can view results but not record them.</p>
                )}
              </details>
            );
          })}
        </section>
      ))}
    </>
  );
}
