import { promises as fs } from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import GithubSlugger from "github-slugger";

export const RESEARCH_DIR = path.join(process.cwd(), "content", "research");

export interface ResearchFrontmatter {
  title: string;
  slug: string;
  authors: string[];
  published_at: string;
  tags: string[];
  excerpt: string;
  cover_image?: string;
  draft?: boolean;
  language?: string;
}

export interface ResearchListEntry extends ResearchFrontmatter {
  filePath: string;
}

export interface TocItem {
  id: string;
  title: string;
  depth: 2 | 3;
}

const FRONTMATTER_REQUIRED: ReadonlyArray<keyof ResearchFrontmatter> = [
  "title",
  "slug",
  "authors",
  "published_at",
  "tags",
  "excerpt",
];

function assertFrontmatter(
  data: { [k: string]: unknown },
  filePath: string,
): asserts data is ResearchFrontmatter & { [k: string]: unknown } {
  for (const key of FRONTMATTER_REQUIRED) {
    if (data[key] === undefined || data[key] === null) {
      throw new Error(
        `Missing required frontmatter field "${key}" in ${filePath}`,
      );
    }
  }
  if (!Array.isArray(data.authors) || !data.authors.every((a) => typeof a === "string")) {
    throw new Error(`Frontmatter "authors" must be string[] in ${filePath}`);
  }
  if (!Array.isArray(data.tags) || !data.tags.every((t) => typeof t === "string")) {
    throw new Error(`Frontmatter "tags" must be string[] in ${filePath}`);
  }
}

export async function readResearchFile(slug: string): Promise<{
  frontmatter: ResearchFrontmatter;
  content: string;
  filePath: string;
}> {
  const filePath = path.join(RESEARCH_DIR, `${slug}.mdx`);
  const raw = await fs.readFile(filePath, "utf8");
  const { data, content } = matter(raw);
  assertFrontmatter(data, filePath);
  return { frontmatter: data, content, filePath };
}

export async function listResearchFiles(): Promise<ResearchListEntry[]> {
  let entries: string[];
  try {
    entries = await fs.readdir(RESEARCH_DIR);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw err;
  }
  const mdx = entries.filter((e) => e.endsWith(".mdx"));
  const all = await Promise.all(
    mdx.map(async (entry) => {
      const filePath = path.join(RESEARCH_DIR, entry);
      const raw = await fs.readFile(filePath, "utf8");
      const { data } = matter(raw);
      assertFrontmatter(data, filePath);
      return { ...data, filePath };
    }),
  );
  return all
    .filter((e) => !e.draft)
    .sort((a, b) => (a.published_at < b.published_at ? 1 : -1));
}

const HEADING_RE = /^(##|###)\s+(.+?)\s*$/gm;

/**
 * Extract a 2-level TOC from MDX source. Uses `github-slugger` to mint the
 * same heading ids that `rehype-slug` produces at render time, so anchor
 * links resolve.
 */
export function extractToc(mdxContent: string): TocItem[] {
  const items: TocItem[] = [];
  const slugger = new GithubSlugger();
  for (const match of mdxContent.matchAll(HEADING_RE)) {
    const depth = match[1].length === 2 ? 2 : 3;
    const title = match[2].replace(/[*_`]/g, "");
    const id = slugger.slug(title);
    if (!id) continue;
    items.push({ id, title, depth });
  }
  return items;
}
