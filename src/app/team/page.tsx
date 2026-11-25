import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireSession, can } from "@/lib/auth";
import type { NotificationLogRow, ProfileRow } from "@/lib/types";
import { setNotify, setRole, sendTest } from "./actions";
import { fmtDate, fmtDateTime } from "@/lib/format";
import { emailConfigured } from "@/lib/notify";

type Props = { searchParams: Promise<{ ok?: string; error?: string }> };

export default async function TeamPage({ searchParams }: Props) {
  const s = await requireSession();
  if (!can.manageTeam(s.role)) notFound();
  const { ok, error } = await searchParams;
  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select("*").order("created_at");
  const people = (data ?? []) as ProfileRow[];
  const { data: logData } = await supabase.from("notification_log").select("*").order("created_at", { ascending: false }).limit(15);
  const log = (logData ?? []) as NotificationLogRow[];
  const configured = emailConfigured();

  return (
    <main className="portal">
      <h1>People</h1>
      <p className="lead">Everyone who can sign in to the portal, and what they may do.</p>
      {ok && <p className="notice" role="status">{ok}</p>}
      {error && <p className="error" role="alert">{error}</p>}
      <div className="card" style={{ padding: 0, overflowX: "auto" }}>
        <table>
          <thead><tr><th>Name</th><th>Email</th><th>Added</th><th>Role</th><th>Emails</th></tr></thead>
          <tbody>
            {people.map((p) => (
              <tr key={p.id}>
                <td>{p.full_name || "-"}</td>
                <td>{p.email}</td>
                <td>{fmtDate(p.created_at)}</td>
                <td>
                  {p.id === s.userId ? (
                    <span>{p.role} (you)</span>
                  ) : (
                    <form action={setRole} className="row">
                      <input type="hidden" name="id" value={p.id} />
                      <select name="role" defaultValue={p.role} aria-label={`Role for ${p.email}`}>
                        <option value="owner">owner</option><option value="client">client</option>
                        <option value="tester">tester</option><option value="viewer">viewer</option>
                      </select>
                      <button className="secondary" type="submit">Save</button>
                    </form>
                  )}
                </td>
                <td>
                  <form action={setNotify} className="row">
                    <input type="hidden" name="id" value={p.id} />
                    <label className="inline" style={{ margin: 0 }}>
                      <input type="checkbox" name="notify" defaultChecked={p.notify_email} aria-label={`Send portal emails to ${p.email}`} /> On
                    </label>
                    <button className="secondary" type="submit">Save</button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="panel">
        <h3>Email notifications</h3>
        <p>
          {configured ? <span className="pill pass">Email is set up</span> : <span className="pill fail">Email is not set up yet</span>}{" "}
          Clients get an email when a module is ready for review. KoreVia and the clients both get one when a module is accepted or changes are requested.
        </p>
        {!configured && <p className="warn">Add RESEND_API_KEY in Vercel (see the README), redeploy, then send yourself a test email here.</p>}
        <form action={sendTest}><button className="secondary" type="submit">Send me a test email</button></form>
        {log.length > 0 && (
          <>
            <h3 style={{ marginTop: "1.25rem" }}>Recent emails</h3>
            <div style={{ overflowX: "auto" }}>
              <table className="compact">
                <thead><tr><th>When</th><th>To</th><th>Subject</th><th>Result</th></tr></thead>
                <tbody>
                  {log.map((l) => (
                    <tr key={l.id}>
                      <td>{fmtDateTime(l.created_at)}</td>
                      <td>{l.to_email}</td>
                      <td>{l.subject}</td>
                      <td>{l.ok ? <span className="pill pass">Sent</span> : <span className="pill fail" title={l.detail ?? ""}>Not sent</span>}{!l.ok && l.detail && <div className="hint">{l.detail}</div>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
      <div className="panel">
        <h3>What each role can do</h3>
        <p><strong>owner</strong> (KoreVia): everything except accepting a module; sets status, dates and roles.</p>
        <p><strong>client</strong> (M-Powered Pathways director): accepts a module or asks for changes, and records test results.</p>
        <p><strong>tester</strong>: records test results and screenshots.</p>
        <p><strong>viewer</strong>: reads only. Every new login starts as a viewer.</p>
        <p className="hint">To add someone, create their login in Supabase (Authentication, Users, Add user), then set their role here. Passwords are always entered by the person themselves or by you in Supabase, never by Claude.</p>
      </div>
    </main>
  );
}
