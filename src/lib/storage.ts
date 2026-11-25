import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

export const BUCKET = "evidence";

/** Short-lived links for private files, keyed by storage path. */
export async function signedUrls(paths: string[], seconds = 3600): Promise<Record<string, string>> {
  const unique = [...new Set(paths.filter(Boolean))];
  if (unique.length === 0) return {};
  const { data } = await createAdminClient().storage.from(BUCKET).createSignedUrls(unique, seconds);
  const out: Record<string, string> = {};
  for (const row of data ?? []) if (row.path && row.signedUrl) out[row.path] = row.signedUrl;
  return out;
}
