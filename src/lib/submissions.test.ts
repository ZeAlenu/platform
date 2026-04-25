import { describe, expect, it } from "vitest";

import { buildFrontmatterYaml, buildMdxFile, slugifyTitle } from "./submissions";

describe("slugifyTitle", () => {
  it("preserves Hebrew letters and hyphens lowercase ASCII words", () => {
    expect(slugifyTitle("מדיניות דיגיטלית 2026")).toBe("מדיניות-דיגיטלית-2026");
  });

  it("strips Hebrew niqqud", () => {
    expect(slugifyTitle("שָׁלוֹם")).toBe("שלום");
  });

  it("collapses repeated separators and trims", () => {
    expect(slugifyTitle("  Hello, World!  ")).toBe("hello-world");
  });

  it("limits length", () => {
    const long = "א".repeat(120);
    expect(slugifyTitle(long).length).toBeLessThanOrEqual(80);
  });
});

describe("buildFrontmatterYaml", () => {
  const base = {
    title: "כותרת",
    slug: "kotert",
    authors: ["דנה כהן"],
    publishedAt: "2026-04-25",
    tags: ["מדיניות"],
    excerpt: "תקציר",
  };

  it("renders required fields and lists", () => {
    const yaml = buildFrontmatterYaml(base);
    expect(yaml).toContain('title: "כותרת"');
    expect(yaml).toContain('slug: "kotert"');
    expect(yaml).toContain('  - "דנה כהן"');
    expect(yaml).toContain('published_at: "2026-04-25"');
    expect(yaml).toContain('  - "מדיניות"');
    expect(yaml).toContain("draft: true");
  });

  it("includes researcher_slugs when provided", () => {
    const yaml = buildFrontmatterYaml({ ...base, researcherSlug: "dana-cohen" });
    expect(yaml).toContain("researcher_slugs:");
    expect(yaml).toContain('  - "dana-cohen"');
  });

  it("omits language when default he", () => {
    expect(buildFrontmatterYaml(base)).not.toContain("language:");
    expect(buildFrontmatterYaml({ ...base, language: "en" })).toContain('language: "en"');
  });

  it("escapes embedded quotes", () => {
    const yaml = buildFrontmatterYaml({ ...base, title: 'שלום "עולם"' });
    expect(yaml).toContain('title: "שלום \\"עולם\\""');
  });

  it("renders empty arrays as []", () => {
    const yaml = buildFrontmatterYaml({ ...base, authors: [], tags: [] });
    expect(yaml).toContain("authors: []");
    expect(yaml).toContain("tags: []");
  });
});

describe("buildMdxFile", () => {
  it("wraps frontmatter and trims body", () => {
    const out = buildMdxFile(
      {
        title: "X",
        slug: "x",
        authors: ["A"],
        publishedAt: "2026-04-25",
        tags: [],
        excerpt: "tldr",
      },
      "\n\n## כותרת\n\nתוכן\n\n",
    );
    expect(out.startsWith("---\n")).toBe(true);
    expect(out).toContain("\n---\n\n## כותרת\n\nתוכן\n");
    expect(out.endsWith("\n")).toBe(true);
  });
});
