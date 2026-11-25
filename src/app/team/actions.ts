"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendTestEmail } from "@/lib/notify";

export async function setRole(formData: FormData) {
  const s = await requireRole(["owner"], "/team");
  const p = z.object({ id: z.string().uuid(), role: z.enum(["owner", "client", "tester", "viewer"]) }).safeParse({
    id: formData.get("id"), role: formData.get("role"),
  });
  if (!p.success) redirect("/team?error=" + encodeURIComponent("Choose a role."));
  if (p.data.id === s.userId) redirect("/team?error=" + encodeURIComponent("You cannot change your own role."));
  const { error } = await createAdminClient().from("profiles").update({ role: p.data.role }).eq("id", p.data.id);
  if (error) redirect("/team?error=" + encodeURIComponent("Could not save. Please try again."));
  redirect("/team?ok=" + encodeURIComponent("Role saved."));
}

export async function setNotify(formData: FormData) {
  await requireRole(["owner"], "/team");
  const id = z.string().uuid().safeParse(formData.get("id"));
  if (!id.success) redirect("/team?error=" + encodeURIComponent("Unknown person."));
  const on = formData.get("notify") === "on";
  const { error } = await createAdminClient().from("profiles").update({ notify_email: on }).eq("id", id.data);
  if (error) redirect("/team?error=" + encodeURIComponent("Could not save. Please try again."));
  redirect("/team?ok=" + encodeURIComponent(on ? "Emails switched on." : "Emails switched off."));
}

export async function sendTest() {
  const s = await requireRole(["owner"], "/team");
  const r = await sendTestEmail(s.email, s.name);
  if (!r.ok) redirect("/team?error=" + encodeURIComponent(r.detail));
  redirect("/team?ok=" + encodeURIComponent(`Test email sent to ${s.email}. Check your inbox (and spam) in a minute.`));
}
