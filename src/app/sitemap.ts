import type { MetadataRoute } from "next";
import { sql } from "drizzle-orm";

import { db } from "@/db";
import { listResearchFiles } from "@/lib/research";
import { absoluteUrl } from "@/lib/site";

export const dynamic = "force-dynamic";

interface DbSlug {
  slug: string;
  updated_at: string | null;
}

async function listResearcherSlugs(): Promise<DbSlug[]> {
  try {
    const stmt = sql`
      SELECT slug, to_char(updated_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS updated_at
      FROM researchers
      ORDER BY display_name
    `;
    const result = await db.execute(stmt);
    const rows = (Array.isArray(result) ? result : (result as { rows?: unknown[] }).rows ?? []) as DbSlug[];
    return rows;
  } catch {
    return [];
  }
}

async function listTagSlugs(): Promise<DbSlug[]> {
  try {
    // Only surface tags that are attached to at least one published paper, to
    // match the tag pages' "no empty buckets" UX and avoid pointing crawlers
    // at empty result pages.
    const stmt = sql`
      SELECT t.slug, to_char(MAX(rp.published_at), 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS updated_at
      FROM tags t
      JOIN research_tags rt ON rt.tag_id = t.id
      JOIN research_papers rp ON rp.id = rt.paper_id AND rp.draft = false
      GROUP BY t.slug
      ORDER BY t.slug
    `;
    const result = await db.execute(stmt);
    const rows = (Array.isArray(result) ? result : (result as { rows?: unknown[] }).rows ?? []) as DbSlug[];
    return rows;
  } catch {
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const research = await listResearchFiles();
  const [researchers, tags] = await Promise.all([
    listResearcherSlugs(),
    listTagSlugs(),
  ]);

  const latestResearchDate =
    research.length > 0 ? new Date(research[0].published_at) : now;

  const staticEntries: MetadataRoute.Sitemap = [
    {
      url: absoluteUrl("/"),
      lastModified: latestResearchDate,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: absoluteUrl("/research"),
      lastModified: latestResearchDate,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: absoluteUrl("/researchers"),
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: absoluteUrl("/about"),
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: absoluteUrl("/contact"),
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.4,
    },
  ];

  const researchEntries: MetadataRoute.Sitemap = research.map((entry) => ({
    url: absoluteUrl(`/research/${entry.slug}`),
    lastModified: new Date(entry.published_at),
    changeFrequency: "yearly",
    priority: 0.8,
  }));

  const researcherEntries: MetadataRoute.Sitemap = researchers.map((row) => ({
    url: absoluteUrl(`/researchers/${row.slug}`),
    lastModified: row.updated_at ? new Date(row.updated_at) : now,
    changeFrequency: "monthly",
    priority: 0.6,
  }));

  const tagEntries: MetadataRoute.Sitemap = tags.map((row) => ({
    url: absoluteUrl(`/tags/${row.slug}`),
    lastModified: row.updated_at ? new Date(row.updated_at) : now,
    changeFrequency: "weekly",
    priority: 0.5,
  }));

  return [
    ...staticEntries,
    ...researchEntries,
    ...researcherEntries,
    ...tagEntries,
  ];
}
