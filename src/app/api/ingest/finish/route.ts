import { NextResponse } from "next/server";
import { z } from "zod";
import { checkIngestToken } from "@/lib/ingest";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const body = z.object({
  runId: z.string().uuid(),
  uploaded: z.array(z.string().regex(/^[A-Za-z0-9._-]{1,150}$/)).max(500),
  packUploaded: z.boolean().optional(),
});

/** Step 2 of a CI push: records which files arrived, totals the results and marks the run finished. */
export async function POST(request: Request) {
  const denied = checkIngestToken(request);
  if (denied) return denied;
  const parsed = body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  const { runId, uploaded, packUploaded } = parsed.data;
  const db = createAdminClient();

  const { data: run } = await db.from("runs").select("id, module_n, complete").eq("id", runId).maybeSingle();
  if (!run) return NextResponse.json({ error: "Unknown run" }, { status: 404 });
  const r = run as { id: string; module_n: number; complete: boolean };
  if (r.complete) return NextResponse.json({ error: "Run already finished" }, { status: 409 });

  if (uploaded.length > 0) {
    const { error } = await db.from("run_screenshots").upsert(
      uploaded.map((name) => ({ run_id: runId, name, path: `runs/${r.module_n}/${runId}/${name}.png` })),
      { onConflict: "run_id,name" },
    );
    if (error) return NextResponse.json({ error: "Could not save screenshots", detail: error.message }, { status: 500 });
  }

  const { data: results } = await db.from("run_results").select("status").eq("run_id", runId);
  const rows = (results ?? []) as { status: string }[];
  const passed = rows.filter((x) => x.status === "pass").length;
  const update: Record<string, unknown> = { total: rows.length, passed, failed: rows.length - passed, complete: true };
  if (packUploaded) update.pack_path = `runs/${r.module_n}/${runId}/Pathways-Module-${r.module_n}-Test-Pack.docx`;
  const { error } = await db.from("runs").update(update).eq("id", runId);
  if (error) return NextResponse.json({ error: "Could not finish the run", detail: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, total: rows.length, passed, failed: rows.length - passed });
}
