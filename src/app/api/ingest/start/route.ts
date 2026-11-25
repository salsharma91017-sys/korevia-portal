import { NextResponse } from "next/server";
import { z } from "zod";
import { checkIngestToken } from "@/lib/ingest";
import { createAdminClient } from "@/lib/supabase/admin";
import { publicEnv } from "@/lib/env";
import { BUCKET } from "@/lib/storage";

export const runtime = "nodejs";

const bundle = z.object({
  module: z.number().int().min(1).max(18),
  commit: z.string().min(7).max(64),
  branch: z.string().max(200).optional(),
  runUrl: z.string().url().max(500).optional(),
  guides: z.array(z.object({
    code: z.string().regex(/^F\d\d$/),
    title: z.string().min(1).max(200),
    roles: z.string().max(300).optional(),
    kbArticle: z.string().max(200).optional(),
    body: z.string().max(80_000),
    sort: z.number().int(),
    cases: z.array(z.object({ id: z.string().regex(/^F\d\d-\d\d$/), title: z.string().min(1).max(300), sort: z.number().int(), automated: z.boolean() })).max(60),
  })).max(80),
  notes: z.array(z.object({
    slug: z.string().regex(/^[a-z0-9][a-z0-9._-]{0,119}$/),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    title: z.string().min(1).max(300),
    type: z.string().max(60).optional(),
    deviation: z.string().max(60).optional(),
    needsApproval: z.string().max(100).optional(),
    migrations: z.string().max(300).optional(),
    body: z.string().max(60_000),
  })).max(300),
  results: z.array(z.object({ caseId: z.string().regex(/^F\d\d-\d\d$/), status: z.enum(["pass", "fail"]), error: z.string().max(2000).optional() })).max(1000),
  screenshots: z.array(z.string().regex(/^[A-Za-z0-9._-]{1,150}$/)).max(500),
  pack: z.boolean().optional(),
});

/** Step 1 of a CI push: saves the guides, cases, notes and results, and hands back one-time upload links for the files. */
export async function POST(request: Request) {
  const denied = checkIngestToken(request);
  if (denied) return denied;

  const parsed = bundle.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid bundle", issues: parsed.error.issues.slice(0, 5) }, { status: 400 });
  const b = parsed.data;
  const db = createAdminClient();

  const { data: mod, error: modError } = await db.from("modules").select("n").eq("n", b.module).maybeSingle();
  if (modError) {
    // Usually the server key in Vercel (SUPABASE_SECRET_KEY) is wrong or belongs to a different Supabase project.
    return NextResponse.json({ error: "The portal could not read its own database. Check SUPABASE_SECRET_KEY and SUPABASE_PROJECT_REF in Vercel.", detail: modError.message, code: modError.code }, { status: 500 });
  }
  if (!mod) return NextResponse.json({ error: `Module ${b.module} is not in the portal database. Run the two migration files, in order, in the portal's Supabase project.` }, { status: 400 });

  // Guides and their cases (the latest push wins) -------------------------------------------------
  for (const g of b.guides) {
    const { error } = await db.from("guides").upsert({
      feature_code: g.code, module_n: b.module, title: g.title, roles: g.roles ?? null, body_md: g.body,
      kb_article: g.kbArticle ?? null, sort: g.sort, updated_at: new Date().toISOString(),
    }, { onConflict: "feature_code" });
    if (error) return NextResponse.json({ error: "Could not save a guide", detail: error.message }, { status: 500 });
    if (g.cases.length > 0) {
      const { error: ce } = await db.from("guide_cases").upsert(
        g.cases.map((c) => ({ case_id: c.id, feature_code: g.code, module_n: b.module, title: c.title, sort: c.sort, automated: c.automated })),
        { onConflict: "case_id" },
      );
      if (ce) return NextResponse.json({ error: "Could not save test cases", detail: ce.message }, { status: 500 });
      await db.from("guide_cases").delete().eq("feature_code", g.code).not("case_id", "in", `(${g.cases.map((c) => c.id).join(",")})`);
    }
  }

  // Change notes: the module a note belongs to is fixed the first time it is seen --------------------
  if (b.notes.length > 0) {
    const { data: existing } = await db.from("change_notes").select("slug").in("slug", b.notes.map((n) => n.slug));
    const have = new Set((existing ?? []).map((r: { slug: string }) => r.slug));
    for (const n of b.notes) {
      const fields = {
        note_date: n.date ?? null, title: n.title, note_type: n.type ?? null, deviation: n.deviation ?? null,
        needs_approval: n.needsApproval ?? null, migrations: n.migrations ?? null, body_md: n.body, updated_at: new Date().toISOString(),
      };
      const res = have.has(n.slug)
        ? await db.from("change_notes").update(fields).eq("slug", n.slug)
        : await db.from("change_notes").insert({ slug: n.slug, module_n: b.module, ...fields });
      if (res.error) return NextResponse.json({ error: "Could not save a change note", detail: res.error.message }, { status: 500 });
    }
  }

  // The run itself -----------------------------------------------------------------------------------
  const { data: run, error: runErr } = await db.from("runs")
    .insert({ module_n: b.module, commit_sha: b.commit, branch: b.branch ?? null, run_url: b.runUrl ?? null }).select("id").single();
  if (runErr || !run) return NextResponse.json({ error: "Could not create the run", detail: runErr?.message }, { status: 500 });
  const runId = (run as { id: string }).id;

  if (b.results.length > 0) {
    const { error } = await db.from("run_results").insert(b.results.map((r) => ({ run_id: runId, case_id: r.caseId, status: r.status, error: r.error ?? null })));
    if (error) return NextResponse.json({ error: "Could not save results", detail: error.message }, { status: 500 });
  }

  // One-time upload links for the screenshots and the Word pack ------------------------------------
  const names = [...b.screenshots];
  const uploads: { name: string; path: string; token: string }[] = [];
  for (let i = 0; i < names.length; i += 10) {
    const chunk = await Promise.all(names.slice(i, i + 10).map(async (name) => {
      const path = `runs/${b.module}/${runId}/${name}.png`;
      const { data, error } = await db.storage.from(BUCKET).createSignedUploadUrl(path, { upsert: true });
      if (error || !data) throw new Error(error?.message ?? "no upload link");
      return { name, path, token: data.token };
    })).catch(() => null);
    if (!chunk) return NextResponse.json({ error: "Could not prepare uploads" }, { status: 500 });
    uploads.push(...chunk);
  }
  let pack: { path: string; token: string } | null = null;
  if (b.pack) {
    const path = `runs/${b.module}/${runId}/Pathways-Module-${b.module}-Test-Pack.docx`;
    const { data, error } = await db.storage.from(BUCKET).createSignedUploadUrl(path, { upsert: true });
    if (error || !data) return NextResponse.json({ error: "Could not prepare the pack upload" }, { status: 500 });
    pack = { path, token: data.token };
  }

  const env = publicEnv();
  return NextResponse.json({
    runId,
    uploadBase: `${env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/upload/sign/${BUCKET}/`,
    apiKey: env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    uploads,
    pack,
  });
}
