import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type Role = "owner" | "client" | "tester" | "viewer";
export type Session = { userId: string; email: string; name: string; role: Role };

/** The signed-in person and their portal role, or null. */
export async function getSession(): Promise<Session | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase.from("profiles").select("full_name, email, role").eq("id", user.id).maybeSingle();
  if (!profile) return null; // signed in but not set up as a portal user
  return {
    userId: user.id,
    email: profile.email || user.email || "",
    name: profile.full_name || profile.email || user.email || "Unnamed",
    role: profile.role as Role,
  };
}

export async function requireSession(): Promise<Session> {
  const s = await getSession();
  if (!s) redirect("/login");
  return s;
}

/** For actions: stops (sends back to the page with an error) unless the role is allowed. */
export async function requireRole(roles: Role[], back: string): Promise<Session> {
  const s = await requireSession();
  if (!roles.includes(s.role)) redirect(`${back}${back.includes("?") ? "&" : "?"}error=${encodeURIComponent("Your login is not allowed to do that.")}`);
  return s;
}

export const can = {
  setStatus: (r: Role) => r === "owner",
  editModule: (r: Role) => r === "owner",
  manageTeam: (r: Role) => r === "owner",
  accept: (r: Role) => r === "client",
  requestChanges: (r: Role) => r === "client",
  recordResult: (r: Role) => r === "owner" || r === "client" || r === "tester",
};
