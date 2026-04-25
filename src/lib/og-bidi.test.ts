import { describe, expect, it } from "vitest";

import { bidiReorder, bidiWrapLines } from "./og-bidi";

describe("bidiReorder", () => {
  it("reverses a pure-Hebrew string into visual order", () => {
    // Logical: ז,ה — visual when laid out LTR-in-source: ה,ז
    expect(bidiReorder("זה")).toBe("הז");
  });

  it("keeps embedded Latin/digit runs in LTR order", () => {
    const reordered = bidiReorder("גרסה 12 בפברואר 2026");
    // Hebrew words flip but the years stay 2026 / 12 (not 6202 / 21).
    expect(reordered).toContain("12");
    expect(reordered).toContain("2026");
  });

  it("returns empty for empty input", () => {
    expect(bidiReorder("")).toBe("");
  });
});

describe("bidiWrapLines", () => {
  it("breaks long text on word boundaries before reordering", () => {
    const lines = bidiWrapLines("זכויות דיגיטליות וגישת השב״כ לנתוני אזרחים", 20);
    expect(lines.length).toBeGreaterThan(1);
    for (const line of lines) {
      expect(line.length).toBeLessThanOrEqual(28);
    }
  });

  it("returns one line when text fits", () => {
    const lines = bidiWrapLines("זה עלינו", 50);
    expect(lines).toHaveLength(1);
  });

  it("returns empty array for empty input", () => {
    expect(bidiWrapLines("", 10)).toEqual([]);
  });
});
