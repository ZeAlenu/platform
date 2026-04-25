import { sql } from "drizzle-orm";

import { db } from "@/db";

export const DEFAULT_PAGE_SIZE = 12;
export const MAX_PAGE_SIZE = 50;

export interface PaperListItem {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  publishedAt: string | null;
  language: string;
  tags: { slug: string; nameHe: string }[];
  researchers: { slug: string; displayName: string }[];
}

export interface ParsedFilters {
  q: string | null;
  tagSlugs: string[];
  researcherSlug: string | null;
  from: string | null;
  to: string | null;
  page: number;
  pageSize: number;
}

export interface PaperListResult {
  papers: PaperListItem[];
  total: number;
  totalPages: number;
  filters: ParsedFilters;
  matchedVia: "fts" | "trigram" | "none";
}

type RawSearchParams = Record<string, string | string[] | undefined>;

function pickString(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) return value[0] ?? null;
  if (typeof value === "string" && value.length > 0) return value;
  return null;
}

function pickStringArray(value: string | string[] | undefined): string[] {
  if (Array.isArray(value)) {
    return value.flatMap((v) => v.split(",")).map((v) => v.trim()).filter(Boolean);
  }
  if (typeof value === "string" && value.length > 0) {
    return value.split(",").map((v) => v.trim()).filter(Boolean);
  }
  return [];
}

function pickIsoDate(value: string | string[] | undefined): string | null {
  const raw = pickString(value);
  if (!raw) return null;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

function pickPositiveInt(value: string | string[] | undefined, fallback: number): number {
  const raw = pickString(value);
  if (!raw) return fallback;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 1) return fallback;
  return n;
}

export function parseFilters(input: RawSearchParams): ParsedFilters {
  const tagSlugs = Array.from(
    new Set([
      ...pickStringArray(input.tag),
      ...pickStringArray(input.tags),
    ]),
  );
  const requestedSize = pickPositiveInt(input.pageSize, DEFAULT_PAGE_SIZE);
  return {
    q: pickString(input.q)?.trim() || null,
    tagSlugs,
    researcherSlug: pickString(input.author) ?? pickString(input.researcher) ?? null,
    from: pickIsoDate(input.from),
    to: pickIsoDate(input.to),
    page: pickPositiveInt(input.page, 1),
    pageSize: Math.min(MAX_PAGE_SIZE, requestedSize),
  };
}

interface RawPaperRow {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  published_at: string | null;
  language: string;
  tags: unknown;
  researchers: unknown;
  total_count: string | number;
}

function normalizeTags(value: unknown): { slug: string; nameHe: string }[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(
      (v): v is { slug: string; nameHe: string } =>
        !!v && typeof v === "object" && typeof (v as { slug?: unknown }).slug === "string",
    )
    .map((v) => ({ slug: v.slug, nameHe: v.nameHe }));
}

function normalizeResearchers(value: unknown): { slug: string; displayName: string }[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(
      (v): v is { slug: string; displayName: string } =>
        !!v && typeof v === "object" && typeof (v as { slug?: unknown }).slug === "string",
    )
    .map((v) => ({ slug: v.slug, displayName: v.displayName }));
}

interface QueryArgs {
  filters: ParsedFilters;
  mode: "fts" | "trigram" | "none";
}

async function runQuery({ filters, mode }: QueryArgs): Promise<{ rows: RawPaperRow[]; total: number }> {
  const offset = (filters.page - 1) * filters.pageSize;

  // Build the q-dependent expressions per mode. We embed them via Drizzle's
  // `sql` helper so values flow as parameters, not as concatenated strings.
  const qVal = filters.q ?? "";

  const matchExpr =
    mode === "fts" && filters.q
      ? sql`rp.search_tsv @@ websearch_to_tsquery('simple', immutable_unaccent(${qVal}))`
      : mode === "trigram" && filters.q
        ? sql`(immutable_unaccent(rp.title) % immutable_unaccent(${qVal}) OR immutable_unaccent(coalesce(rp.excerpt, '')) % immutable_unaccent(${qVal}))`
        : sql`true`;

  const rankExpr =
    mode === "fts" && filters.q
      ? sql`ts_rank(rp.search_tsv, websearch_to_tsquery('simple', immutable_unaccent(${qVal})))`
      : mode === "trigram" && filters.q
        ? sql`GREATEST(similarity(immutable_unaccent(rp.title), immutable_unaccent(${qVal})), similarity(immutable_unaccent(coalesce(rp.excerpt, '')), immutable_unaccent(${qVal})))`
        : sql`0::float`;

  const orderExpr =
    mode === "none" || !filters.q
      ? sql`rp.published_at DESC NULLS LAST, rp.created_at DESC`
      : sql`rank DESC, rp.published_at DESC NULLS LAST`;

  const tagFilter =
    filters.tagSlugs.length > 0
      ? sql`AND (
          SELECT COUNT(DISTINCT t2.slug)
          FROM research_tags rt2
          JOIN tags t2 ON t2.id = rt2.tag_id
          WHERE rt2.paper_id = rp.id AND t2.slug = ANY(${filters.tagSlugs})
        ) = ${filters.tagSlugs.length}`
      : sql``;

  const researcherFilter = filters.researcherSlug
    ? sql`AND EXISTS (
          SELECT 1 FROM research_authors ra2
          JOIN researchers r2 ON r2.id = ra2.researcher_id
          WHERE ra2.paper_id = rp.id AND r2.slug = ${filters.researcherSlug}
        )`
    : sql``;

  const fromFilter = filters.from
    ? sql`AND rp.published_at >= ${filters.from}::timestamptz`
    : sql``;

  const toFilter = filters.to
    ? sql`AND rp.published_at <= ${filters.to}::timestamptz`
    : sql``;

  const stmt = sql`
    SELECT
      rp.id,
      rp.slug,
      rp.title,
      rp.excerpt,
      to_char(rp.published_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS published_at,
      rp.language,
      ${rankExpr} AS rank,
      COUNT(*) OVER () AS total_count,
      COALESCE(
        (
          SELECT jsonb_agg(jsonb_build_object('slug', t.slug, 'nameHe', t.name_he) ORDER BY t.name_he)
          FROM research_tags rt
          JOIN tags t ON t.id = rt.tag_id
          WHERE rt.paper_id = rp.id
        ),
        '[]'::jsonb
      ) AS tags,
      COALESCE(
        (
          SELECT jsonb_agg(jsonb_build_object('slug', r.slug, 'displayName', r.display_name) ORDER BY ra.position)
          FROM research_authors ra
          JOIN researchers r ON r.id = ra.researcher_id
          WHERE ra.paper_id = rp.id
        ),
        '[]'::jsonb
      ) AS researchers
    FROM research_papers rp
    WHERE rp.draft = false
      AND ${matchExpr}
      ${tagFilter}
      ${researcherFilter}
      ${fromFilter}
      ${toFilter}
    ORDER BY ${orderExpr}
    LIMIT ${filters.pageSize}
    OFFSET ${offset}
  `;

  const result = await db.execute(stmt);
  // neon-http returns either an array directly or an object with a `rows` key
  // depending on driver version. Normalise both shapes.
  const rows = (Array.isArray(result) ? result : (result as { rows?: unknown[] }).rows ?? []) as RawPaperRow[];
  if (rows.length === 0) {
    // No rows — fetch the count separately so callers still get an accurate
    // total even when offset is past the end of the result set.
    const countStmt = sql`
      SELECT COUNT(*)::int AS total
      FROM research_papers rp
      WHERE rp.draft = false
        AND ${matchExpr}
        ${tagFilter}
        ${researcherFilter}
        ${fromFilter}
        ${toFilter}
    `;
    const countRes = await db.execute(countStmt);
    const countRows = (Array.isArray(countRes) ? countRes : (countRes as { rows?: unknown[] }).rows ?? []) as { total: number | string }[];
    const total = Number(countRows[0]?.total ?? 0);
    return { rows, total };
  }
  const total = Number(rows[0]?.total_count ?? 0);
  return { rows, total };
}

export async function searchResearch(filters: ParsedFilters): Promise<PaperListResult> {
  // First pass: FTS (or no-query listing).
  const initialMode: "fts" | "none" = filters.q ? "fts" : "none";
  let { rows, total } = await runQuery({ filters, mode: initialMode });
  let matchedVia: PaperListResult["matchedVia"] = filters.q ? "fts" : "none";

  // Trigram fallback only when the user provided a query and FTS produced
  // zero matches. Avoids unnecessary similarity scans for the empty state.
  if (filters.q && total === 0) {
    const fallback = await runQuery({ filters, mode: "trigram" });
    rows = fallback.rows;
    total = fallback.total;
    matchedVia = total > 0 ? "trigram" : "none";
  }

  const papers: PaperListItem[] = rows.map((row) => ({
    id: row.id,
    slug: row.slug,
    title: row.title,
    excerpt: row.excerpt,
    publishedAt: row.published_at,
    language: row.language,
    tags: normalizeTags(row.tags),
    researchers: normalizeResearchers(row.researchers),
  }));

  return {
    papers,
    total,
    totalPages: Math.max(1, Math.ceil(total / filters.pageSize)),
    filters,
    matchedVia,
  };
}

export interface FacetTag {
  slug: string;
  nameHe: string;
  count: number;
}

export interface FacetResearcher {
  slug: string;
  displayName: string;
  count: number;
}

export async function listTagFacets(): Promise<FacetTag[]> {
  const stmt = sql`
    SELECT t.slug, t.name_he AS "nameHe", COUNT(rt.paper_id)::int AS count
    FROM tags t
    LEFT JOIN research_tags rt ON rt.tag_id = t.id
    LEFT JOIN research_papers rp ON rp.id = rt.paper_id AND rp.draft = false
    GROUP BY t.slug, t.name_he
    HAVING COUNT(rp.id) > 0
    ORDER BY count DESC, t.name_he ASC
  `;
  const result = await db.execute(stmt);
  const rows = (Array.isArray(result) ? result : (result as { rows?: unknown[] }).rows ?? []) as FacetTag[];
  return rows.map((r) => ({ ...r, count: Number(r.count) }));
}

export async function listResearcherFacets(): Promise<FacetResearcher[]> {
  const stmt = sql`
    SELECT r.slug, r.display_name AS "displayName", COUNT(ra.paper_id)::int AS count
    FROM researchers r
    LEFT JOIN research_authors ra ON ra.researcher_id = r.id
    LEFT JOIN research_papers rp ON rp.id = ra.paper_id AND rp.draft = false
    GROUP BY r.slug, r.display_name
    HAVING COUNT(rp.id) > 0
    ORDER BY count DESC, r.display_name ASC
  `;
  const result = await db.execute(stmt);
  const rows = (Array.isArray(result) ? result : (result as { rows?: unknown[] }).rows ?? []) as FacetResearcher[];
  return rows.map((r) => ({ ...r, count: Number(r.count) }));
}

export interface TagWithName {
  slug: string;
  nameHe: string;
}

export async function getTagBySlug(slug: string): Promise<TagWithName | null> {
  const stmt = sql`
    SELECT slug, name_he AS "nameHe"
    FROM tags
    WHERE slug = ${slug}
    LIMIT 1
  `;
  const result = await db.execute(stmt);
  const rows = (Array.isArray(result) ? result : (result as { rows?: unknown[] }).rows ?? []) as TagWithName[];
  return rows[0] ?? null;
}

/**
 * Build a stable, shareable querystring from the filter set. Drops empty
 * values and omits page when it equals 1, so the canonical URL for "no
 * filters" is `/research`.
 */
export function buildSearchParams(
  filters: Partial<ParsedFilters>,
  override: Partial<ParsedFilters> = {},
): URLSearchParams {
  const merged: Partial<ParsedFilters> = { ...filters, ...override };
  const params = new URLSearchParams();
  if (merged.q) params.set("q", merged.q);
  if (merged.tagSlugs && merged.tagSlugs.length > 0) {
    for (const t of merged.tagSlugs) params.append("tag", t);
  }
  if (merged.researcherSlug) params.set("author", merged.researcherSlug);
  if (merged.from) params.set("from", merged.from.slice(0, 10));
  if (merged.to) params.set("to", merged.to.slice(0, 10));
  if (merged.page && merged.page > 1) params.set("page", String(merged.page));
  return params;
}
