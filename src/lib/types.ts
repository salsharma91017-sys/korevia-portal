export type ModuleRow = {
  n: number;
  name: string;
  amount_cents: number;
  due_date: string | null;
  uat_url: string | null;
  ai_assist: string | null;
  status: "backlog" | "in_development" | "ready_for_review" | "accepted";
  status_changed_at: string;
};
export type FeatureRow = { id: number; module_n: number; sort: number; title: string; tier: "core" | "optional"; phase: number; note: string | null };
export type GuideRow = { feature_code: string; module_n: number; title: string; roles: string | null; body_md: string; kb_article: string | null; sort: number; updated_at: string };
export type CaseRow = { case_id: string; feature_code: string; module_n: number; title: string; sort: number; automated: boolean };
export type RunRow = {
  id: string; module_n: number; commit_sha: string; branch: string | null; run_url: string | null;
  total: number; passed: number; failed: number; pack_path: string | null; complete: boolean; created_at: string;
};
export type RunResultRow = { run_id: string; case_id: string; status: "pass" | "fail"; error: string | null };
export type ScreenshotRow = { run_id: string; name: string; path: string };
export type ManualResultRow = {
  id: string; module_n: number; case_id: string; status: "pass" | "fail"; notes: string | null; screenshot_paths: string[];
  tester_name: string; created_at: string;
};
export type ChangeNoteRow = {
  slug: string; module_n: number; note_date: string | null; title: string; note_type: string | null; deviation: string | null;
  needs_approval: string | null; migrations: string | null; body_md: string; updated_at: string;
};
export type StatusEventRow = { id: number; module_n: number; from_status: string | null; to_status: string; by_name: string; note: string | null; at: string };
export type ChangeRequestRow = { id: string; module_n: number; by_name: string; body: string; created_at: string; resolved_at: string | null; resolved_note: string | null };
export type AcceptanceRow = {
  id: string; module_n: number; by_name: string; by_email: string; typed_name: string; comment: string | null; amount_cents: number;
  run_id: string | null; commit_sha: string | null; summary: Record<string, unknown>; accepted_at: string;
};
export type ProfileRow = { id: string; email: string; full_name: string | null; role: "owner" | "client" | "tester" | "viewer"; created_at: string };
