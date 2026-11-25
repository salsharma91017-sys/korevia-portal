import { parseGuide, type Inline } from "@/lib/guide";

function Inl({ parts }: { parts: Inline[] }) {
  return (
    <>
      {parts.map((p, i) =>
        p.t === "bold" ? <strong key={i}>{p.v}</strong> : p.t === "code" ? <code key={i}>{p.v}</code> : <span key={i}>{p.v}</span>,
      )}
    </>
  );
}

/** Renders a feature guide. `shots` maps a screenshot name to a (signed) image address, when one exists. */
export default function GuideView({ md, shots }: { md: string; shots: Record<string, string> }) {
  const blocks = parseGuide(md);
  return (
    <div className="guide">
      {blocks.map((b, i) => {
        switch (b.k) {
          case "case":
            return <h4 key={i} id={b.id} className="case-h"><span className="mono">{b.id}</span> {b.title}</h4>;
          case "h":
            return <h4 key={i} className="case-h">{b.text}</h4>;
          case "p":
            return <p key={i}><Inl parts={b.inline} /></p>;
          case "step":
            return <p key={i} className="step"><span className="step-n">{b.n}.</span> <Inl parts={b.inline} /></p>;
          case "bullet":
            return <p key={i} className="bullet">&bull; <Inl parts={b.inline} /></p>;
          case "expected":
            return <p key={i} className="expected"><strong>Expected result.</strong> <Inl parts={b.inline} /></p>;
          case "shot":
            return shots[b.name] ? (
              <figure key={i} className="shot">
                <a href={shots[b.name]} target="_blank" rel="noreferrer">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={shots[b.name]} alt={b.name} loading="lazy" />
                </a>
                <figcaption className="mono">{b.name}</figcaption>
              </figure>
            ) : (
              <p key={i} className="shot-missing mono">Screenshot: {b.name} (taken at the next test run)</p>
            );
        }
      })}
    </div>
  );
}
