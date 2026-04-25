import "dotenv/config";
import { promises as fs } from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { sql } from "drizzle-orm";
import { db } from "../src/db";
import { researchPapers } from "../src/db/schema";

interface SyncFrontmatter {
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

const REQUIRED: ReadonlyArray<keyof SyncFrontmatter> = [
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
): asserts data is SyncFrontmatter & { [k: string]: unknown } {
  for (const key of REQUIRED) {
    if (data[key] === undefined || data[key] === null) {
      throw new Error(`Missing "${key}" in ${filePath}`);
    }
  }
  if (!Array.isArray(data.authors)) {
    throw new Error(`"authors" must be array in ${filePath}`);
  }
  if (!Array.isArray(data.tags)) {
    throw new Error(`"tags" must be array in ${filePath}`);
  }
}

async function main() {
  const dir = path.join(process.cwd(), "content", "research");
  const entries = await fs.readdir(dir);
  const mdx = entries.filter((e) => e.endsWith(".mdx"));

  console.log(`[sync-research] processing ${mdx.length} files from ${dir}`);

  let inserted = 0;
  let updated = 0;
  for (const entry of mdx) {
    const filePath = path.join(dir, entry);
    const raw = await fs.readFile(filePath, "utf8");
    const { data, content } = matter(raw);
    assertFrontmatter(data, filePath);

    if (data.slug !== path.basename(entry, ".mdx")) {
      throw new Error(
        `slug mismatch: file ${entry} declares slug "${data.slug}"`,
      );
    }

    const result = await db
      .insert(researchPapers)
      .values({
        slug: data.slug,
        title: data.title,
        excerpt: data.excerpt,
        bodyMarkdown: content,
        language: data.language ?? "he",
        publishedAt: new Date(data.published_at),
        draft: data.draft ?? false,
      })
      .onConflictDoUpdate({
        target: researchPapers.slug,
        set: {
          title: sql`excluded.title`,
          excerpt: sql`excluded.excerpt`,
          bodyMarkdown: sql`excluded.body_markdown`,
          language: sql`excluded.language`,
          publishedAt: sql`excluded.published_at`,
          draft: sql`excluded.draft`,
          updatedAt: sql`now()`,
        },
      })
      .returning({ id: researchPapers.id, createdAt: researchPapers.createdAt, updatedAt: researchPapers.updatedAt });

    const row = result[0];
    if (row && row.createdAt.getTime() === row.updatedAt.getTime()) {
      inserted++;
    } else {
      updated++;
    }
    console.log(`  ✓ ${data.slug}`);
  }

  console.log(
    `[sync-research] done: ${inserted} inserted, ${updated} updated, ${mdx.length} total`,
  );
}

main().catch((err) => {
  console.error("[sync-research] failed:", err);
  process.exit(1);
});
