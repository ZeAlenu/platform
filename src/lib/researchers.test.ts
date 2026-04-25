import { describe, expect, it, vi } from "vitest";

vi.mock("@/db", () => ({
  db: new Proxy(
    {},
    {
      get() {
        throw new Error("db must not be called from these unit tests");
      },
    },
  ),
  schema: {},
}));

import {
  listResearcherFiles,
  matchResearchToResearcher,
  normalizeLinks,
  readResearcherFile,
  type ResearcherLink,
} from "./researchers";
import type { ResearchListEntry } from "./research";

const baseEntry = (overrides: Partial<ResearchListEntry>): ResearchListEntry => ({
  title: "t",
  slug: "s",
  authors: [],
  published_at: "2026-01-01T00:00:00.000Z",
  tags: [],
  excerpt: "e",
  filePath: "/x.mdx",
  ...overrides,
});

describe("normalizeLinks", () => {
  it("filters out non-objects and items missing href", () => {
    const out = normalizeLinks([
      null,
      { kind: "x" }, // missing href
      "string",
      { kind: "linkedin", href: "" }, // empty href
      { kind: "x", href: "https://x.com/a" },
    ]);
    expect(out).toEqual<ResearcherLink[]>([
      { kind: "x", href: "https://x.com/a", label: undefined },
    ]);
  });

  it("falls back to 'other' when kind is unknown", () => {
    const out = normalizeLinks([{ kind: "facebook", href: "https://fb" }]);
    expect(out[0].kind).toBe("other");
  });

  it("preserves label when string", () => {
    const out = normalizeLinks([
      { kind: "email", href: "mailto:a@b", label: "כתבו לי" },
    ]);
    expect(out[0].label).toBe("כתבו לי");
  });

  it("returns [] for non-array values", () => {
    expect(normalizeLinks(null)).toEqual([]);
    expect(normalizeLinks("nope")).toEqual([]);
    expect(normalizeLinks({ kind: "x", href: "y" })).toEqual([]);
  });
});

describe("matchResearchToResearcher", () => {
  const researcher = { slug: "noa-levin", displayName: "ד״ר נועה לוין" };

  it("matches when researcher_slugs contains the slug", () => {
    const entry = baseEntry({ researcher_slugs: ["noa-levin"] });
    const out = matchResearchToResearcher([entry], researcher);
    expect(out).toEqual([entry]);
  });

  it("falls back to displayName match in authors", () => {
    const entry = baseEntry({ authors: ["ד״ר נועה לוין"] });
    expect(matchResearchToResearcher([entry], researcher)).toEqual([entry]);
  });

  it("prefers researcher_slugs over authors when both present", () => {
    const matchedBySlug = baseEntry({
      slug: "a",
      researcher_slugs: ["noa-levin"],
      authors: ["someone-else"],
    });
    const onlyAuthors = baseEntry({ slug: "b", authors: ["ד״ר נועה לוין"] });
    const noMatch = baseEntry({ slug: "c", authors: ["other"] });
    const out = matchResearchToResearcher(
      [matchedBySlug, onlyAuthors, noMatch],
      researcher,
    );
    expect(out.map((e) => e.slug)).toEqual(["a", "b"]);
  });

  it("returns [] when nothing matches", () => {
    const entry = baseEntry({ authors: ["someone-else"] });
    expect(matchResearchToResearcher([entry], researcher)).toEqual([]);
  });
});

describe("readResearcherFile / listResearcherFiles (seed)", () => {
  it("loads the seeded editorial profile", async () => {
    const editorial = await readResearcherFile("editorial");
    expect(editorial.slug).toBe("editorial");
    expect(editorial.displayName).toBe("מערכת זה עלינו");
    expect(editorial.bio).toMatch(/המערכת/);
    const emailLink = editorial.links.find((l) => l.kind === "email");
    expect(emailLink?.href).toBe("mailto:contact@zealenu.org.il");
  });

  it("lists all seeded researchers, sorted alphabetically (he locale)", async () => {
    const all = await listResearcherFiles();
    const slugs = all.map((p) => p.slug).sort();
    expect(slugs).toEqual([
      "aviv-mizrahi",
      "editorial",
      "noa-levin",
      "oren-cohen",
    ]);
  });
});
