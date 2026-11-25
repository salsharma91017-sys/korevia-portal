"use server";

import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { can, requireRole, requireSession, type Session } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { BUCKET } from "@/lib/storage";
import { notifyModuleEvent } from "@/lib/notify";
import type { ModuleRow, RunRow } from "@/lib/types";

const num = z.coerce.number().int().min(1).max(99);

function back(n: number, tab: string, kind: "ok" | "error", msg: string): never {
  revalidatePath(`/modules/${n}`);
  revalidatePath("/");
  redirect(`/modules/${n}?tab=${tab}&${kind}=${encodeURIComponent(msg)}`);
}

async function loadModule(n: number): Promise<ModuleRow | null> {
  const { data } = await createAdminClient().from("modules").select("*").eq("n", n).maybeSingle();
  return (data as ModuleRow | null) ?? null;
}

async function latestRun(n: number): Promise<RunRow | null> {
  const { data } = await createAdminClient()
    .from("runs").select("*").eq("module_n", n).eq("complete", true).order("created_at", { ascending: false }).limit(1).maybeSingle();
  return (data as RunRow | null) ?? null;
}

async function logStatus(s: Session, n: number, from: string | null, to: string, note: string | null) {
  await createAdminClient().from("status_events").insert({ module_n: n, from_status: from, to_status: to, by_id: s.userId, by_name: s.name, note });
}

// Owner: move a module through Backlog -> In development -> Ready for review ----------------------
export async function setStatus(formData: FormData) {
  const n = num.parse(formData.get("n"));
  const s = await requireRole(["owner"], `/modules/${n}?tab=status`);
  const to = z.enum(["backlog", "in_development", "ready_for_review"]).safeParse(formData.get("status"));
  if (!to.success) back(n, "status", "error", "Choose a status.");
  const note = String(formData.get("note") ?? "").trim().slice(0, 1000) || null;
  const acknowledge = formData.get("acknowledge") === "on";

  const m = await loadModule(n);
  if (!m) back(n, "status", "error", "Module not found.");
  if (m!.status === "accepted") back(n, "status", "error", "This module is already accepted, so its status cannot be changed.");
  if (m!.status === to.data) back(n, "status", "error", "The module already has that status.");

  const db = createAdminClient();
  let testLine: string | null = null;
  if (to.data === "ready_for_review") {
    const run = await latestRun(n);
    testLine = run ? `${run.passed} of ${run.total} passed` : null;
    if (!run && !acknowledge) back(n, "status", "error", "There is no automatic test run for this module yet. Tick the box to send it for review anyway.");
    if (run && run.failed > 0 && !acknowledge) back(n, "status", "error", `The latest automatic run has ${run.failed} failing test(s). Fix them, or tick the box to send it for review anyway.`);
    await db.from("change_requests").update({ resolved_at: new Date().toISOString(), resolved_note: note ?? "Addressed in the resubmitted module" })
      .eq("module_n", n).is("resolved_at", null);
  }
  const { error } = await db.from("modules").update({ status: to.data, status_changed_at: new Date().toISOString(), status_changed_by: s.userId }).eq("n", n);
  if (error) back(n, "status", "error", "Could not save the status. Please try again.");
  await logStatus(s, n, m!.status, to.data, note);
  if (to.data === "ready_for_review") {
    notifyModuleEvent({ event: "ready_for_review", moduleN: n, moduleName: m!.name, actor: s.name, note, testLine });
  }
  back(n, "status", "ok", `Status changed to ${to.data.replace(/_/g, " ")}.`);
}

// Owner: target date and UAT link --------------------------------------------------------------
export async function updateDetails(formData: FormData) {
  const n = num.parse(formData.get("n"));
  await requireRole(["owner"], `/modules/${n}?tab=status`);
  const due = String(formData.get("due_date") ?? "").trim();
  const uat = String(formData.get("uat_url") ?? "").trim();
  if (due && !/^\d{4}-\d{2}-\d{2}$/.test(due)) back(n, "status", "error", "Enter the date as day, month and year.");
  if (uat && !/^https:\/\/[^\s]+$/.test(uat)) back(n, "status", "error", "The UAT link must start with https://");
  const { error } = await createAdminClient().from("modules").update({ due_date: due || null, uat_url: uat || null }).eq("n", n);
  if (error) back(n, "status", "error", "Could not save. Please try again.");
  back(n, "status", "ok", "Details saved.");
}

// Client: accept or ask for changes ------------------------------------------------------------
export async function acceptModule(formData: FormData) {
  const n = num.parse(formData.get("n"));
  const s = await requireRole(["client"], `/modules/${n}?tab=status`);
  const m = await loadModule(n);
  if (!m) back(n, "status", "error", "Module not found.");
  if (m!.status !== "ready_for_review") back(n, "status", "error", "This module is not waiting for review.");
  if (formData.get("confirm") !== "on") back(n, "status", "error", "Tick the box to confirm the module meets the agreed scope.");
  const typed = String(formData.get("typed_name") ?? "").trim();
  if (typed.toLowerCase() !== s.name.trim().toLowerCase()) back(n, "status", "error", "Type your full name exactly as shown to sign off.");
  const comment = String(formData.get("comment") ?? "").trim().slice(0, 2000) || null;

  const db = createAdminClient();
  const { count: open } = await db.from("change_requests").select("id", { count: "exact", head: true }).eq("module_n", n).is("resolved_at", null);
  if ((open ?? 0) > 0) back(n, "status", "error", "There are open change requests on this module. KoreVia needs to resolve them before it can be accepted.");

  const run = await latestRun(n);
  const { data: manual } = await db.from("manual_results").select("case_id, status, created_at").eq("module_n", n).order("created_at", { ascending: false });
  const latestManual = new Map<string, string>();
  for (const r of (manual ?? []) as { case_id: string; status: string }[]) if (!latestManual.has(r.case_id)) latestManual.set(r.case_id, r.status);
  const summary = {
    automatic: run ? { passed: run.passed, failed: run.failed, total: run.total, run_at: run.created_at } : null,
    manual: { pass: [...latestManual.values()].filter((x) => x === "pass").length, fail: [...latestManual.values()].filter((x) => x === "fail").length },
  };

  const { error } = await db.from("acceptances").insert({
    module_n: n, by_id: s.userId, by_name: s.name, by_email: s.email, typed_name: typed, comment,
    amount_cents: m!.amount_cents, run_id: run?.id ?? null, commit_sha: run?.commit_sha ?? null, summary,
  });
  if (error) back(n, "status", "error", "Could not record the acceptance. Please try again.");
  await db.from("modules").update({ status: "accepted", status_changed_at: new Date().toISOString(), status_changed_by: s.userId }).eq("n", n);
  await logStatus(s, n, m!.status, "accepted", comment);
  notifyModuleEvent({
    event: "accepted", moduleN: n, moduleName: m!.name, actor: s.name, note: comment,
    testLine: run ? `${run.passed} of ${run.total} passed` : null,
  });
  back(n, "evidence", "ok", "Module accepted. The acceptance is recorded below.");
}

export async function requestChanges(formData: FormData) {
  const n = num.parse(formData.get("n"));
  const s = await requireRole(["client"], `/modules/${n}?tab=status`);
  const body = String(formData.get("body") ?? "").trim();
  if (body.length < 10) back(n, "status", "error", "Please describe what needs to change (at least a sentence).");
  const m = await loadModule(n);
  if (!m || m.status !== "ready_for_review") back(n, "status", "error", "This module is not waiting for review.");
  const db = createAdminClient();
  await db.from("change_requests").insert({ module_n: n, by_id: s.userId, by_name: s.name, body: body.slice(0, 4000) });
  await db.from("modules").update({ status: "in_development", status_changed_at: new Date().toISOString(), status_changed_by: s.userId }).eq("n", n);
  await logStatus(s, n, m!.status, "in_development", "Changes requested");
  notifyModuleEvent({ event: "changes_requested", moduleN: n, moduleName: m!.name, actor: s.name, note: body });
  back(n, "status", "ok", "Changes requested. The module is back in development.");
}

// Anyone who tests: record a result, with optional screenshots ----------------------------------
const ALLOWED_TYPES: Record<string, string> = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp" };

export async function prepareUploads(n: number, caseId: string, files: { type: string; size: number }[]) {
  const s = await requireSession();
  if (!can.recordResult(s.role)) return { error: "Your login is not allowed to record results." } as const;
  if (!/^F\d\d-\d\d$/.test(caseId) || files.length === 0 || files.length > 5) return { error: "Attach between 1 and 5 screenshots." } as const;
  const db = createAdminClient();
  const out: { path: string; token: string }[] = [];
  for (const f of files) {
    const ext = ALLOWED_TYPES[f.type];
    if (!ext) return { error: "Screenshots must be PNG, JPG or WebP images." } as const;
    if (f.size > 8 * 1024 * 1024) return { error: "Each screenshot must be under 8 MB." } as const;
    const path = `manual/${n}/${caseId}/${randomUUID()}.${ext}`;
    const { data, error } = await db.storage.from(BUCKET).createSignedUploadUrl(path);
    if (error || !data) return { error: "Could not prepare the upload. Please try again." } as const;
    out.push({ path, token: data.token });
  }
  return { uploads: out } as const;
}

export async function recordResult(input: { n: number; caseId: string; status: "pass" | "fail"; notes: string; screenshotPaths: string[] }) {
  const s = await requireSession();
  if (!can.recordResult(s.role)) return { error: "Your login is not allowed to record results." };
  const parsed = z
    .object({
      n: num, caseId: z.string().regex(/^F\d\d-\d\d$/), status: z.enum(["pass", "fail"]),
      notes: z.string().trim().max(2000), screenshotPaths: z.array(z.string()).max(5),
    })
    .safeParse(input);
  if (!parsed.success) return { error: "Please check the form." };
  const v = parsed.data;
  if (v.status === "fail" && v.notes.length < 5) return { error: "Please say what went wrong when you mark a test as failed." };
  if (v.screenshotPaths.some((p) => !p.startsWith(`manual/${v.n}/${v.caseId}/`) || p.includes(".."))) return { error: "Invalid screenshot." };

  const db = createAdminClient();
  const { data: c } = await db.from("guide_cases").select("case_id").eq("case_id", v.caseId).eq("module_n", v.n).maybeSingle();
  if (!c) return { error: "That test case is not part of this module." };
  const { error } = await db.from("manual_results").insert({
    module_n: v.n, case_id: v.caseId, status: v.status, notes: v.notes || null, screenshot_paths: v.screenshotPaths,
    tester_id: s.userId, tester_name: s.name,
  });
  if (error) return { error: "Could not save the result. Please try again." };
  revalidatePath(`/modules/${v.n}`);
  return { ok: true as const };
}
