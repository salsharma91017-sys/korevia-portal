"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export type LoginState = { error?: string; email?: string } | undefined;

const schema = z.object({ email: z.string().trim().toLowerCase().email(), password: z.string().min(1).max(200) });
const GENERIC = "We could not sign you in. Check your email and password.";

export async function signIn(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "");
  const parsed = schema.safeParse({ email, password: formData.get("password") });
  if (!parsed.success) return { error: GENERIC, email };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return { error: GENERIC, email };

  // Signed in but not set up as a portal person: treat as a failure and sign straight out.
  const { data: ok } = await supabase.rpc("portal_is_user");
  if (ok !== true) {
    await supabase.auth.signOut();
    return { error: GENERIC, email };
  }
  redirect("/");
}
