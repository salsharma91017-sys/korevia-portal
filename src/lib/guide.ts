// Turns a feature guide (Markdown from docs/features in the Pathways repo) into simple blocks.
// Deliberately tiny and safe: it understands only the shapes the guides use, and never emits HTML.

export type Inline = { t: "text" | "bold" | "code"; v: string };
export type Block =
  | { k: "case"; id: string; title: string }
  | { k: "h"; text: string }
  | { k: "p"; inline: Inline[] }
  | { k: "step"; n: string; inline: Inline[] }
  | { k: "bullet"; inline: Inline[] }
  | { k: "shot"; name: string; note: string }
  | { k: "expected"; inline: Inline[] };

export function inline(text: string): Inline[] {
  return text
    .split(/(\*\*[^*]+\*\*|`[^`]+`)/)
    .filter(Boolean)
    .map((part): Inline =>
      part.startsWith("**") && part.endsWith("**") && part.length > 4
        ? { t: "bold", v: part.slice(2, -2) }
        : part.startsWith("`") && part.endsWith("`") && part.length > 2
          ? { t: "code", v: part.slice(1, -1) }
          : { t: "text", v: part },
    );
}

export function parseGuide(md: string): Block[] {
  const out: Block[] = [];
  for (const raw of md.replace(/^---\n[\s\S]*?\n---\n/, "").split("\n")) {
    const line = raw.replace(/\s+$/, "");
    if (!line.trim()) continue;
    let m: RegExpMatchArray | null;
    if (/^# /.test(line)) continue; // the title is shown by the page
    if ((m = line.match(/^## (F\d\d-\d\d) (.+)$/))) { out.push({ k: "case", id: m[1], title: m[2] }); continue; }
    if ((m = line.match(/^## (.+)$/))) { out.push({ k: "h", text: m[1] }); continue; }
    if ((m = line.match(/^\s+- Screenshot: `([^`]+)`\s*(.*)$/))) { out.push({ k: "shot", name: m[1], note: m[2].replace(/^\(|\)$/g, "") }); continue; }
    if ((m = line.match(/^(\d+)\. (.+)$/))) { out.push({ k: "step", n: m[1], inline: inline(m[2]) }); continue; }
    if (line.startsWith("**Result:**")) continue; // the portal records results itself
    if (line.startsWith("**Expected result.**")) { out.push({ k: "expected", inline: inline(line.replace("**Expected result.**", "").trim()) }); continue; }
    if ((m = line.match(/^- (.+)$/))) { out.push({ k: "bullet", inline: inline(m[1]) }); continue; }
    out.push({ k: "p", inline: inline(line.trim()) });
  }
  return out;
}

/** The case IDs a guide contains, in order (for tests and the CI bundle). */
export const caseIds = (md: string) => parseGuide(md).flatMap((b) => (b.k === "case" ? [b.id] : []));
