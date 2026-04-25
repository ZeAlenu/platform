import { describe, expect, it } from "vitest";
import { extractToc } from "./research";

describe("extractToc", () => {
  it("extracts h2 + h3 headings with stable ids", () => {
    const md = `## תקציר מנהלים\n\nblah\n\n### שיטה\n\nmore\n\n## ממצאים מרכזיים\n`;
    const toc = extractToc(md);
    expect(toc).toEqual([
      { id: "תקציר-מנהלים", title: "תקציר מנהלים", depth: 2 },
      { id: "שיטה", title: "שיטה", depth: 3 },
      { id: "ממצאים-מרכזיים", title: "ממצאים מרכזיים", depth: 2 },
    ]);
  });

  it("strips inline markdown from heading text", () => {
    const md = `## **bold** and \`code\`\n`;
    const [item] = extractToc(md);
    expect(item.title).toBe("bold and code");
  });

  it("disambiguates duplicate titles with numeric suffixes", () => {
    const md = `## רקע\n\n## רקע\n`;
    const toc = extractToc(md);
    expect(toc.map((t) => t.id)).toEqual(["רקע", "רקע-1"]);
  });

  it("ignores h1 and h4+", () => {
    const md = `# top\n## keep\n#### too-deep\n`;
    const toc = extractToc(md);
    expect(toc.map((t) => t.title)).toEqual(["keep"]);
  });
});
