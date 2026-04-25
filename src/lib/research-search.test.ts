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
  buildSearchParams,
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  parseFilters,
} from "./research-search";

describe("parseFilters", () => {
  it("returns defaults when nothing is supplied", () => {
    const f = parseFilters({});
    expect(f.q).toBeNull();
    expect(f.tagSlugs).toEqual([]);
    expect(f.researcherSlug).toBeNull();
    expect(f.from).toBeNull();
    expect(f.to).toBeNull();
    expect(f.page).toBe(1);
    expect(f.pageSize).toBe(DEFAULT_PAGE_SIZE);
  });

  it("trims q and treats empty string as null", () => {
    expect(parseFilters({ q: "  " }).q).toBeNull();
    expect(parseFilters({ q: "  hello  " }).q).toBe("hello");
  });

  it("collects multi-tag from repeated query params and from comma-list", () => {
    expect(parseFilters({ tag: ["a", "b"] }).tagSlugs).toEqual(["a", "b"]);
    expect(parseFilters({ tag: "a,b,c" }).tagSlugs).toEqual(["a", "b", "c"]);
    expect(parseFilters({ tags: "x,y", tag: "y,z" }).tagSlugs).toEqual([
      "y",
      "z",
      "x",
    ]);
  });

  it("dedupes tags across query/array forms", () => {
    expect(parseFilters({ tag: ["x", "x", "y"] }).tagSlugs).toEqual(["x", "y"]);
  });

  it("accepts both `author` and `researcher` for the researcher slug", () => {
    expect(parseFilters({ author: "noa-levin" }).researcherSlug).toBe(
      "noa-levin",
    );
    expect(parseFilters({ researcher: "noa-levin" }).researcherSlug).toBe(
      "noa-levin",
    );
    // `author` wins when both are set
    expect(
      parseFilters({ author: "a", researcher: "b" }).researcherSlug,
    ).toBe("a");
  });

  it("normalises ISO dates and rejects garbage", () => {
    expect(parseFilters({ from: "2026-01-01" }).from).toBe(
      new Date("2026-01-01").toISOString(),
    );
    expect(parseFilters({ from: "not-a-date" }).from).toBeNull();
  });

  it("clamps page and pageSize to safe bounds", () => {
    expect(parseFilters({ page: "0" }).page).toBe(1);
    expect(parseFilters({ page: "-3" }).page).toBe(1);
    expect(parseFilters({ pageSize: "999" }).pageSize).toBe(MAX_PAGE_SIZE);
    expect(parseFilters({ pageSize: "1" }).pageSize).toBe(1);
  });
});

describe("buildSearchParams", () => {
  it("omits page=1 and empty fields", () => {
    const params = buildSearchParams({ q: "x", page: 1 });
    expect(params.toString()).toBe("q=x");
  });

  it("emits multiple `tag` entries for multi-select", () => {
    const params = buildSearchParams({ tagSlugs: ["a", "b"] });
    expect(params.getAll("tag")).toEqual(["a", "b"]);
  });

  it("override replaces specific fields without dropping the rest", () => {
    const base = parseFilters({
      q: "hi",
      tag: ["a", "b"],
      author: "noa",
      page: "3",
    });
    const params = buildSearchParams(base, { page: 1 });
    // page=1 omitted, but tags and author preserved
    expect(params.get("page")).toBeNull();
    expect(params.getAll("tag")).toEqual(["a", "b"]);
    expect(params.get("author")).toBe("noa");
    expect(params.get("q")).toBe("hi");
  });

  it("trims dates to YYYY-MM-DD form", () => {
    const params = buildSearchParams({
      from: "2026-01-01T00:00:00.000Z",
      to: "2026-12-31T00:00:00.000Z",
    });
    expect(params.get("from")).toBe("2026-01-01");
    expect(params.get("to")).toBe("2026-12-31");
  });
});
