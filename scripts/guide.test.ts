import { test } from "node:test";
import assert from "node:assert/strict";
import { caseIds, inline, parseGuide } from "../src/lib/guide.ts";

const SAMPLE = `---
feature: F04
---

# F04 Sign in

**What it does.** Signs people in.

## F04-01 Sign in

1. Open the page. Press **Sign in**.
   - Screenshot: \`F04-01-s1-sign-in-page\`
2. Enter the code.

**Expected result.** You land on the dashboard.

   - Screenshot: \`F04-01-s2-dashboard\` (optional note)

**Result:** Pass / Fail   **Tester:**

## Known gaps

- Nothing yet.
`;

test("finds the cases and screenshots, skips the title and the result line", () => {
  const blocks = parseGuide(SAMPLE);
  assert.deepEqual(caseIds(SAMPLE), ["F04-01"]);
  assert.equal(blocks.filter((b) => b.k === "shot").length, 2);
  assert.ok(!blocks.some((b) => b.k === "p" && JSON.stringify(b).includes("Tester")));
  assert.ok(!blocks.some((b) => b.k === "h" && b.text === "F04 Sign in"));
  const expected = blocks.find((b) => b.k === "expected");
  assert.ok(expected && expected.k === "expected" && expected.inline[0].v.startsWith("You land"));
});

test("inline formatting never produces markup", () => {
  assert.deepEqual(inline("Press **Go** then `x`"), [
    { t: "text", v: "Press " }, { t: "bold", v: "Go" }, { t: "text", v: " then " }, { t: "code", v: "x" },
  ]);
  assert.deepEqual(inline("<script>alert(1)</script>"), [{ t: "text", v: "<script>alert(1)</script>" }]);
});
