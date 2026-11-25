import { z } from "zod";

const publicSchema = z.object({
  NEXT_PUBLIC_SITE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
});

export function publicEnv() {
  // Each variable must be referenced literally so Next.js can inline it for the browser.
  const parsed = publicSchema.safeParse({
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  });
  if (!parsed.success) {
    throw new Error("Invalid public environment configuration: " + parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "));
  }
  return parsed.data;
}

export function serverEnv() {
  const pub = publicEnv();
  const parsed = z
    .object({
      SUPABASE_SECRET_KEY: z.string().min(1),
      SUPABASE_PROJECT_REF: z.string().min(1),
      INGEST_TOKEN: z.string().min(32).optional(),
      DEFAULT_UAT_URL: z.string().url().optional(),
    })
    .safeParse({
      SUPABASE_SECRET_KEY: process.env.SUPABASE_SECRET_KEY,
      SUPABASE_PROJECT_REF: process.env.SUPABASE_PROJECT_REF,
      INGEST_TOKEN: process.env.INGEST_TOKEN || undefined,
      DEFAULT_UAT_URL: process.env.DEFAULT_UAT_URL || undefined,
    });
  if (!parsed.success) {
    throw new Error("Invalid server environment configuration: " + parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "));
  }
  const host = new URL(pub.NEXT_PUBLIC_SUPABASE_URL).hostname;
  const local = host === "localhost" || host === "127.0.0.1";
  if (!local && !host.startsWith(`${parsed.data.SUPABASE_PROJECT_REF}.`)) {
    throw new Error("Refusing to start: NEXT_PUBLIC_SUPABASE_URL does not match SUPABASE_PROJECT_REF.");
  }
  return { ...pub, ...parsed.data };
}
