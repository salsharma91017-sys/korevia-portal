import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireSession, can } from "@/lib/auth";
import type { ProfileRow } from "@/lib/types";
import { setRole } from "./actions";
import { fmtDate } from "@/lib/format";

type Props = { searchParams: Promise<{ ok?: string; error?: string }> };

export default async function TeamPage({ searchParams }: Props) {
  const s = await requireSession();
  if (!can.manageTeam(s.role)) notFound();
  const { ok, error } = await searchParams;
  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select("*").order("created_at");
  const people = (data ?? []) as ProfileRow[];

  return (
    <main className="portal">
      <h1>People</h1>
      <p className="lead">Everyone who can sign in to the portal, and what they may do.</p>
      {ok && <p className="notice" role="status">{ok}</p>}
      {error && <p className="error" role="alert">{error}</p>}
      <div className="card" style={{ padding: 0, overflowX: "auto" }}>
        <table>
          <thead><tr><th>Name</th><th>Email</th><th>Added</th><th>Role</th></tr></thead>
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
              </tr>
            ))}
          </tbody>
        </table>
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
