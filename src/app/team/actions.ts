"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

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
