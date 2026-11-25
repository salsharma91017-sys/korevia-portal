"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { prepareUploads, recordResult } from "@/app/modules/[n]/actions";

export default function ManualResultForm({ n, caseId }: { n: number; caseId: string }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<"pass" | "fail">("pass");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      const files = Array.from(fileRef.current?.files ?? []);
      let screenshotPaths: string[] = [];
      if (files.length > 0) {
        const prep = await prepareUploads(n, caseId, files.map((f) => ({ type: f.type, size: f.size })));
        if ("error" in prep) throw new Error(prep.error);
        const supabase = createClient();
        for (let i = 0; i < files.length; i++) {
          const { path, token } = prep.uploads[i];
          const { error } = await supabase.storage.from("evidence").uploadToSignedUrl(path, token, files[i], { contentType: files[i].type });
          if (error) throw new Error("A screenshot could not be uploaded. Please try again.");
          screenshotPaths.push(path);
        }
      }
      const res = await recordResult({ n, caseId, status, notes, screenshotPaths });
      if ("error" in res && res.error) throw new Error(res.error);
      setMessage({ kind: "ok", text: "Result saved." });
      setNotes("");
      if (fileRef.current) fileRef.current.value = "";
      router.refresh();
    } catch (err) {
      setMessage({ kind: "error", text: err instanceof Error ? err.message : "Something went wrong. Please try again." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate>
      <p style={{ margin: ".5rem 0 0" }}>
        <label className="inline"><input type="radio" name={`r-${caseId}`} checked={status === "pass"} onChange={() => setStatus("pass")} /> Pass</label>
        <label className="inline"><input type="radio" name={`r-${caseId}`} checked={status === "fail"} onChange={() => setStatus("fail")} /> Fail</label>
      </p>
      <label htmlFor={`n-${caseId}`}>Notes {status === "fail" ? "(what went wrong?)" : "(optional)"}</label>
      <textarea id={`n-${caseId}`} value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={2000} />
      <label htmlFor={`f-${caseId}`}>Screenshots (optional, up to 5)</label>
      <input id={`f-${caseId}`} ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" multiple />
      {message && <p className={message.kind === "ok" ? "notice" : "error"} role={message.kind === "ok" ? "status" : "alert"}>{message.text}</p>}
      <button type="submit" disabled={busy}>{busy ? "Saving..." : "Save my result"}</button>
    </form>
  );
}
