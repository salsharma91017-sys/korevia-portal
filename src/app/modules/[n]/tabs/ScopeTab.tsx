import type { FeatureRow, ModuleRow } from "@/lib/types";

export default function ScopeTab({ m, features }: { m: ModuleRow; features: FeatureRow[] }) {
  return (
    <>
      <p className="muted">What the agreement (Schedule A) says this module includes. {features.length} feature{features.length === 1 ? "" : "s"}.</p>
      <div className="card" style={{ padding: 0, overflowX: "auto" }}>
        <table>
          <thead><tr><th>#</th><th>Feature</th><th>Type</th><th>Phase</th></tr></thead>
          <tbody>
            {features.map((f) => (
              <tr key={f.id}>
                <td>{f.sort}</td>
                <td>{f.title}{f.note && <div className="hint">{f.note}</div>}</td>
                <td>{f.tier === "core" ? "Core" : "Optional"}</td>
                <td>{f.phase === 3 ? "Phase 3 (not included)" : `Phase ${f.phase}`}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {m.ai_assist && <p className="panel">{m.ai_assist}</p>}
      <p className="hint">
        Which of these features have been built, and how they are tested, is shown under Test guide and Results as each one is delivered.
        Core and Optional features are all included in the build price; Phase 3 is excluded.
      </p>
    </>
  );
}
