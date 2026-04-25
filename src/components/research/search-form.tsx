import {
  buildSearchParams,
  type FacetTag,
  type FacetResearcher,
  type ParsedFilters,
} from "@/lib/research-search";
import Link from "next/link";

interface Props {
  filters: ParsedFilters;
  tagFacets: FacetTag[];
  researcherFacets: FacetResearcher[];
  basePath: string;
}

export function SearchForm({
  filters,
  tagFacets,
  researcherFacets,
  basePath,
}: Props) {
  // Hidden inputs preserve the multi-tag selection across `q`/date submits,
  // since the input element only round-trips a single value cleanly.
  const hiddenTags = filters.tagSlugs.map((slug) => (
    <input key={slug} type="hidden" name="tag" value={slug} />
  ));

  const buildHref = (override: Partial<ParsedFilters>) => {
    const params = buildSearchParams(filters, { page: 1, ...override });
    const qs = params.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  };

  const toggleTag = (slug: string) => {
    const isOn = filters.tagSlugs.includes(slug);
    const next = isOn
      ? filters.tagSlugs.filter((s) => s !== slug)
      : [...filters.tagSlugs, slug];
    return buildHref({ tagSlugs: next });
  };

  const hasAnyFilter =
    !!filters.q ||
    filters.tagSlugs.length > 0 ||
    !!filters.researcherSlug ||
    !!filters.from ||
    !!filters.to;

  return (
    <section className="mb-10 space-y-6 border-b border-border pb-8">
      <form
        action={basePath}
        method="get"
        className="flex flex-col gap-4"
        role="search"
        aria-label="חיפוש מחקרים"
      >
        {hiddenTags}
        {filters.researcherSlug && (
          <input type="hidden" name="author" value={filters.researcherSlug} />
        )}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <label htmlFor="research-q" className="sr-only">
            חיפוש מחקרים
          </label>
          <input
            id="research-q"
            name="q"
            type="search"
            defaultValue={filters.q ?? ""}
            placeholder="חיפוש לפי כותרת, תקציר או טקסט"
            className="flex-1 rounded-md border border-border bg-background px-4 py-2 text-base focus:border-foreground focus:outline-none"
            autoComplete="off"
          />
          <button
            type="submit"
            className="rounded-md bg-foreground px-4 py-2 text-sm text-background hover:opacity-90"
          >
            חיפוש
          </button>
        </div>
        <fieldset className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
          <legend className="sr-only">סינון לפי טווח תאריכים</legend>
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>מתאריך</span>
            <input
              name="from"
              type="date"
              defaultValue={filters.from ? filters.from.slice(0, 10) : ""}
              className="rounded-md border border-border bg-background px-2 py-1 text-sm"
            />
          </label>
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>עד תאריך</span>
            <input
              name="to"
              type="date"
              defaultValue={filters.to ? filters.to.slice(0, 10) : ""}
              className="rounded-md border border-border bg-background px-2 py-1 text-sm"
            />
          </label>
        </fieldset>
      </form>

      {researcherFacets.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            לפי חוקר/ת
          </p>
          <ul className="flex flex-wrap gap-2">
            {researcherFacets.map((r) => {
              const isOn = filters.researcherSlug === r.slug;
              const href = buildHref({
                researcherSlug: isOn ? null : r.slug,
              });
              return (
                <li key={r.slug}>
                  <Link
                    href={href}
                    aria-pressed={isOn}
                    className={[
                      "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs",
                      isOn
                        ? "border-foreground bg-foreground text-background"
                        : "border-border bg-background text-muted-foreground hover:bg-muted",
                    ].join(" ")}
                  >
                    {r.displayName}
                    <span className="opacity-60">{r.count}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {tagFacets.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            לפי תגית
          </p>
          <ul className="flex flex-wrap gap-2">
            {tagFacets.map((t) => {
              const isOn = filters.tagSlugs.includes(t.slug);
              return (
                <li key={t.slug}>
                  <Link
                    href={toggleTag(t.slug)}
                    aria-pressed={isOn}
                    className={[
                      "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs",
                      isOn
                        ? "border-foreground bg-foreground text-background"
                        : "border-border bg-background text-muted-foreground hover:bg-muted",
                    ].join(" ")}
                  >
                    {t.nameHe}
                    <span className="opacity-60">{t.count}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {hasAnyFilter && (
        <p className="text-sm">
          <Link
            href={basePath}
            className="text-muted-foreground hover:text-foreground hover:underline"
          >
            ניקוי כל הסינונים
          </Link>
        </p>
      )}
    </section>
  );
}
