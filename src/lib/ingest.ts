import "server-only";
import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { serverEnv } from "@/lib/env";

/** Checks the shared secret that lets the Pathways CI push in. Returns an error response, or null when allowed. */
export function checkIngestToken(request: Request): NextResponse | null {
  const expected = serverEnv().INGEST_TOKEN;
  if (!expected) return NextResponse.json({ error: "Ingest is not configured on this portal." }, { status: 503 });
  const header = request.headers.get("authorization") ?? "";
  const given = header.startsWith("Bearer ") ? header.slice(7) : "";
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return NextResponse.json({ error: "Not allowed." }, { status: 401 });
  return null;
}
