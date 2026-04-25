import { promises as fs } from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { asc, eq } from "drizzle-orm";

import { db } from "@/db";
import { researchers } from "@/db/schema";
import { listResearchFiles, type ResearchListEntry } from "@/lib/research";

export const RESEARCHERS_DIR = path.join(process.cwd(), "content", "researchers");

export type ResearcherLinkKind =
  | "email"
  | "x"
  | "linkedin"
  | "github"
  | "website"
  | "other";

export interface ResearcherLink {
  kind: ResearcherLinkKind;
  href: string;
  label?: string;
}

export interface ResearcherProfile {
  slug: string;
  displayName: string;
  bio: string | null;
  photoUrl: string | null;
  links: ResearcherLink[];
}

export interface ResearcherProfileWithBody extends ResearcherProfile {
  bodyMarkdown: string;
}

const VALID_KINDS: ReadonlySet<ResearcherLinkKind> = new Set([
  "email",
  "x",
  "linkedin",
  "github",
  "website",
  "other",
]);

export function normalizeLinks(value: unknown): ResearcherLink[] {
  if (!Array.isArray(value)) return [];
  const out: ResearcherLink[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const rec = item as { kind?: unknown; href?: unknown; label?: unknown };
    if (typeof rec.href !== "string" || rec.href.length === 0) continue;
    const kind: ResearcherLinkKind =
      typeof rec.kind === "string" && VALID_KINDS.has(rec.kind as ResearcherLinkKind)
        ? (rec.kind as ResearcherLinkKind)
        : "other";
    out.push({
      kind,
      href: rec.href,
      label: typeof rec.label === "string" ? rec.label : undefined,
    });
  }
  return out;
}

interface ResearcherFileFrontmatter {
  slug: string;
  displayName: string;
  photoUrl?: string;
  links?: unknown;
}

function assertResearcherFrontmatter(
  data: { [k: string]: unknown },
  filePath: string,
): asserts data is ResearcherFileFrontmatter & { [k: string]: unknown } {
  if (typeof data.slug !== "string" || data.slug.length === 0) {
    throw new Error(`Researcher file ${filePath} is missing string "slug"`);
  }
  if (typeof data.displayName !== "string" || data.displayName.length === 0) {
    throw new Error(`Researcher file ${filePath} is missing string "displayName"`);
  }
}

export async function readResearcherFile(slug: string): Promise<ResearcherProfileWithBody> {
  const filePath = path.join(RESEARCHERS_DIR, `${slug}.md`);
  const raw = await fs.readFile(filePath, "utf8");
  const { data, content } = matter(raw);
  assertResearcherFrontmatter(data, filePath);
  if (data.slug !== slug) {
    throw new Error(`slug mismatch: file ${slug}.md declares slug "${data.slug}"`);
  }
  return {
    slug: data.slug,
    displayName: data.displayName,
    bio: content.trim() || null,
    bodyMarkdown: content.trim(),
    photoUrl: data.photoUrl ?? null,
    links: normalizeLinks(data.links),
  };
}

export async function listResearcherFiles(): Promise<ResearcherProfileWithBody[]> {
  let entries: string[];
  try {
    entries = await fs.readdir(RESEARCHERS_DIR);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw err;
  }
  const md = entries.filter((e) => e.endsWith(".md"));
  const all = await Promise.all(
    md.map((entry) => readResearcherFile(path.basename(entry, ".md"))),
  );
  return all.sort((a, b) => a.displayName.localeCompare(b.displayName, "he"));
}

export async function listResearcherProfiles(): Promise<ResearcherProfile[]> {
  const rows = await db
    .select()
    .from(researchers)
    .orderBy(asc(researchers.displayName));
  return rows.map((row) => ({
    slug: row.slug,
    displayName: row.displayName,
    bio: row.bio,
    photoUrl: row.photoUrl,
    links: normalizeLinks(row.links),
  }));
}

export async function getResearcherProfile(slug: string): Promise<ResearcherProfile | null> {
  const rows = await db
    .select()
    .from(researchers)
    .where(eq(researchers.slug, slug))
    .limit(1);
  const row = rows[0];
  if (!row) return null;
  return {
    slug: row.slug,
    displayName: row.displayName,
    bio: row.bio,
    photoUrl: row.photoUrl,
    links: normalizeLinks(row.links),
  };
}

/**
 * Filter research entries to those linked to a researcher. Prefers the
 * explicit `researcher_slugs` frontmatter field; falls back to matching the
 * researcher's display name in the `authors` array.
 */
export function matchResearchToResearcher(
  entries: ResearchListEntry[],
  researcher: Pick<ResearcherProfile, "slug" | "displayName">,
): ResearchListEntry[] {
  return entries.filter((entry) => {
    if (entry.researcher_slugs?.includes(researcher.slug)) return true;
    return entry.authors.includes(researcher.displayName);
  });
}

export async function getResearchForResearcher(
  researcher: Pick<ResearcherProfile, "slug" | "displayName">,
): Promise<ResearchListEntry[]> {
  const all = await listResearchFiles();
  return matchResearchToResearcher(all, researcher);
}
