import { describe, expect, it } from "vitest";

import { SITE_URL, absoluteUrl } from "./site";

describe("absoluteUrl", () => {
  it("prefixes site URL to a leading-slash path", () => {
    expect(absoluteUrl("/research")).toBe(`${SITE_URL}/research`);
  });

  it("prefixes site URL to a path without a leading slash", () => {
    expect(absoluteUrl("research")).toBe(`${SITE_URL}/research`);
  });

  it("returns absolute URLs unchanged", () => {
    const u = "https://example.com/foo";
    expect(absoluteUrl(u)).toBe(u);
  });
});
