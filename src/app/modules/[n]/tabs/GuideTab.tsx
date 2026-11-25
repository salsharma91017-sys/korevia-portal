import GuideView from "@/components/GuideView";
import type { GuideRow, ScreenshotRow } from "@/lib/types";

export default function GuideTab({ guides, shots, urls }: { guides: GuideRow[]; shots: ScreenshotRow[]; urls: Record<string, string> }) {
  if (guides.length === 0) {
    return <p className="panel muted">No test guides have been published for this module yet. They appear here automatically as features are built.</p>;
  }
  const byName: Record<string, string> = {};
  for (const s of shots) if (urls[s.path]) byName[s.name] = urls[s.path];
  return (
    <>
      <p className="muted">
        How to test each feature, step by step. The pictures are the screenshots from the latest automatic test run, so you can see what each
        screen should look like. Do the steps yourself in the UAT site, then record your result under Results.
      </p>
      {guides.map((g) => (
        <details key={g.feature_code} className="panel" open={guides.length === 1}>
          <summary><span className="mono">{g.feature_code}</span> {g.title}</summary>
          {g.roles && <p className="hint">Who: {g.roles}</p>}
          <GuideView md={g.body_md} shots={byName} />
        </details>
      ))}
    </>
  );
}
