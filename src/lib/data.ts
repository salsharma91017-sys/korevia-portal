import "server-only";
import { createClient } from "@/lib/supabase/server";
import type {
  AcceptanceRow, CaseRow, ChangeNoteRow, ChangeRequestRow, FeatureRow, GuideRow, ManualResultRow, ModuleRow,
  RunResultRow, RunRow, ScreenshotRow, StatusEventRow,
} from "@/lib/types";

export async function listModules(): Promise<ModuleRow[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("modules").select("*").order("n");
  return (data ?? []) as ModuleRow[];
}

export async function getModule(n: number): Promise<ModuleRow | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("modules").select("*").eq("n", n).maybeSingle();
  return (data as ModuleRow | null) ?? null;
}

/** The newest finished test run for each module. */
export async function latestRuns(): Promise<Record<number, RunRow>> {
  const supabase = await createClient();
  const { data } = await supabase.from("runs").select("*").eq("complete", true).order("created_at", { ascending: false });
  const out: Record<number, RunRow> = {};
  for (const r of (data ?? []) as RunRow[]) if (!out[r.module_n]) out[r.module_n] = r;
  return out;
}

export async function moduleDetail(n: number) {
  const supabase = await createClient();
  const [features, guides, cases, runs, notes, events, requests, acceptances, manual] = await Promise.all([
    supabase.from("features").select("*").eq("module_n", n).order("sort"),
    supabase.from("guides").select("*").eq("module_n", n).order("sort"),
    supabase.from("guide_cases").select("*").eq("module_n", n).order("sort"),
    supabase.from("runs").select("*").eq("module_n", n).eq("complete", true).order("created_at", { ascending: false }).limit(30),
    supabase.from("change_notes").select("*").eq("module_n", n).order("note_date", { ascending: false }).order("updated_at", { ascending: false }),
    supabase.from("status_events").select("*").eq("module_n", n).order("id", { ascending: false }),
    supabase.from("change_requests").select("*").eq("module_n", n).order("created_at", { ascending: false }),
    supabase.from("acceptances").select("*").eq("module_n", n).order("accepted_at", { ascending: false }),
    supabase.from("manual_results").select("*").eq("module_n", n).order("created_at", { ascending: false }),
  ]);
  const runRows = (runs.data ?? []) as RunRow[];
  const latest = runRows[0] ?? null;
  let results: RunResultRow[] = [];
  let shots: ScreenshotRow[] = [];
  if (latest) {
    const [r, s] = await Promise.all([
      supabase.from("run_results").select("*").eq("run_id", latest.id),
      supabase.from("run_screenshots").select("*").eq("run_id", latest.id),
    ]);
    results = (r.data ?? []) as RunResultRow[];
    shots = (s.data ?? []) as ScreenshotRow[];
  }
  return {
    features: (features.data ?? []) as FeatureRow[],
    guides: (guides.data ?? []) as GuideRow[],
    cases: (cases.data ?? []) as CaseRow[],
    runs: runRows,
    latest,
    results,
    shots,
    notes: (notes.data ?? []) as ChangeNoteRow[],
    events: (events.data ?? []) as StatusEventRow[],
    requests: (requests.data ?? []) as ChangeRequestRow[],
    acceptances: (acceptances.data ?? []) as AcceptanceRow[],
    manual: (manual.data ?? []) as ManualResultRow[],
  };
}
