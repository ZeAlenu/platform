import "dotenv/config";
import { promises as fs } from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { and, eq, inArray, notInArray, sql } from "drizzle-orm";
import GithubSlugger from "github-slugger";

import { db } from "../src/db";
import {
  researchAuthors,
  researchPapers,
  researchTags,
  researchers,
  tags,
} from "../src/db/schema";

interface SyncFrontmatter {
  title: string;
  slug: string;
  authors: string[];
  researcher_slugs?: string[];
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

async function syncTags(paperId: string, tagNames: string[]): Promise<void> {
  const slugger = new GithubSlugger();
  const desired = tagNames.map((name) => ({
    slug: slugger.slug(name),
    nameHe: name,
  }));

  const tagIdsForPaper: string[] = [];
  for (const t of desired) {
    const upserted = await db
      .insert(tags)
      .values({ slug: t.slug, nameHe: t.nameHe })
      .onConflictDoUpdate({
        target: tags.slug,
        set: { nameHe: sql`excluded.name_he` },
      })
      .returning({ id: tags.id });
    tagIdsForPaper.push(upserted[0].id);
  }

  if (tagIdsForPaper.length === 0) {
    await db.delete(researchTags).where(eq(researchTags.paperId, paperId));
    return;
  }

  for (const tagId of tagIdsForPaper) {
    await db
      .insert(researchTags)
      .values({ paperId, tagId })
      .onConflictDoNothing();
  }
  await db
    .delete(researchTags)
    .where(
      and(
        eq(researchTags.paperId, paperId),
        notInArray(researchTags.tagId, tagIdsForPaper),
      ),
    );
}

async function syncAuthors(
  paperId: string,
  frontmatter: SyncFrontmatter,
): Promise<void> {
  const explicit = frontmatter.researcher_slugs ?? [];
  const fromAuthors = frontmatter.authors;

  const seen = new Set<string>();
  const ordered: string[] = [];

  if (explicit.length > 0) {
    for (const slug of explicit) {
      if (!seen.has(slug)) {
        seen.add(slug);
        ordered.push(slug);
      }
    }
  } else {
    const matched = await db
      .select({ id: researchers.id, slug: researchers.slug, displayName: researchers.displayName })
      .from(researchers)
      .where(inArray(researchers.displayName, fromAuthors));
    const byName = new Map(matched.map((r) => [r.displayName, r.slug]));
    for (const name of fromAuthors) {
      const slug = byName.get(name);
      if (slug && !seen.has(slug)) {
        seen.add(slug);
        ordered.push(slug);
      }
    }
  }

  if (ordered.length === 0) {
    await db.delete(researchAuthors).where(eq(researchAuthors.paperId, paperId));
    return;
  }

  const rows = await db
    .select({ id: researchers.id, slug: researchers.slug })
    .from(researchers)
    .where(inArray(researchers.slug, ordered));
  const idBySlug = new Map(rows.map((r) => [r.slug, r.id]));

  const wantedIds: string[] = [];
  for (let i = 0; i < ordered.length; i++) {
    const id = idBySlug.get(ordered[i]);
    if (!id) {
      console.warn(
        `  ! researcher slug "${ordered[i]}" not found, skipping (run sync-researchers first)`,
      );
      continue;
    }
    wantedIds.push(id);
    await db
      .insert(researchAuthors)
      .values({ paperId, researcherId: id, position: i })
      .onConflictDoUpdate({
        target: [researchAuthors.paperId, researchAuthors.researcherId],
        set: { position: sql`excluded.position` },
      });
  }

  if (wantedIds.length > 0) {
    await db
      .delete(researchAuthors)
      .where(
        and(
          eq(researchAuthors.paperId, paperId),
          notInArray(researchAuthors.researcherId, wantedIds),
        ),
      );
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
      .returning({
        id: researchPapers.id,
        createdAt: researchPapers.createdAt,
        updatedAt: researchPapers.updatedAt,
      });

    const row = result[0];
    if (row && row.createdAt.getTime() === row.updatedAt.getTime()) {
      inserted++;
    } else {
      updated++;
    }

    await syncTags(row.id, data.tags);
    await syncAuthors(row.id, data);

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
