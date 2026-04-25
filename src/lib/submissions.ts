import { and, desc, eq } from "drizzle-orm";

import { db } from "@/db";
import {
  type ResearchSubmission,
  SUBMISSION_STATUSES,
  type SubmissionStatus,
  researchSubmissions,
} from "@/db/schema";

export const STATUS_LABELS: Record<SubmissionStatus, string> = {
  draft: "טיוטה",
  submitted: "הוגש",
  under_review: "בבדיקה",
  changes_requested: "נדרשים תיקונים",
  published: "פורסם",
  rejected: "נדחה",
};

export function isSubmissionStatus(v: unknown): v is SubmissionStatus {
  return typeof v === "string" && (SUBMISSION_STATUSES as readonly string[]).includes(v);
}

export function slugifyTitle(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[֑-ׇ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9א-ת]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function suffixSlug(slug: string, suffix: string): string {
  return `${slug}-${suffix}`.replace(/^-+|-+$/g, "");
}

export interface SubmissionFrontmatterInput {
  title: string;
  slug: string;
  authors: string[];
  researcherSlug?: string | null;
  publishedAt: string;
  tags: string[];
  excerpt: string;
  language?: string;
}

export function buildFrontmatterYaml(input: SubmissionFrontmatterInput): string {
  const yamlList = (items: string[]) =>
    items.length === 0 ? " []" : `\n${items.map((i) => `  - ${quote(i)}`).join("\n")}`;
  const lines: string[] = [
    `title: ${quote(input.title)}`,
    `slug: ${quote(input.slug)}`,
    `authors:${yamlList(input.authors)}`,
  ];
  if (input.researcherSlug) {
    lines.push(`researcher_slugs:${yamlList([input.researcherSlug])}`);
  }
  lines.push(
    `published_at: ${quote(input.publishedAt)}`,
    `tags:${yamlList(input.tags)}`,
    `excerpt: ${quote(input.excerpt)}`,
    `draft: true`,
  );
  if (input.language && input.language !== "he") {
    lines.push(`language: ${quote(input.language)}`);
  }
  return lines.join("\n");
}

export function buildMdxFile(
  frontmatter: SubmissionFrontmatterInput,
  body: string,
): string {
  const fm = buildFrontmatterYaml(frontmatter);
  const trimmed = body.trim();
  return `---\n${fm}\n---\n\n${trimmed}\n`;
}

function quote(s: string): string {
  return `"${s.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

export async function listSubmissionsForUser(
  userId: string,
): Promise<ResearchSubmission[]> {
  return db
    .select()
    .from(researchSubmissions)
    .where(eq(researchSubmissions.userId, userId))
    .orderBy(desc(researchSubmissions.updatedAt));
}

export async function getSubmissionForUser(
  id: string,
  userId: string,
): Promise<ResearchSubmission | null> {
  const rows = await db
    .select()
    .from(researchSubmissions)
    .where(and(eq(researchSubmissions.id, id), eq(researchSubmissions.userId, userId)))
    .limit(1);
  return rows[0] ?? null;
}

export async function getSubmissionBySlug(
  slug: string,
): Promise<ResearchSubmission | null> {
  const rows = await db
    .select()
    .from(researchSubmissions)
    .where(eq(researchSubmissions.slug, slug))
    .limit(1);
  return rows[0] ?? null;
}
