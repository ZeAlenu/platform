import type { Metadata } from "next";
import {
  listResearcherFacets,
  listTagFacets,
  parseFilters,
  searchResearch,
} from "@/lib/research-search";
import { PaperCard } from "@/components/research/paper-card";
import { Pagination } from "@/components/research/pagination";
import { SearchForm } from "@/components/research/search-form";

export const metadata: Metadata = {
  title: "מחקרים",
  description: "ארכיון המחקרים של עמותת זה עלינו.",
};

// The catalog reads from Postgres at request time so query/tag/author filters
// reflect the live DB without needing a rebuild.
export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function ResearchIndex({ searchParams }: PageProps) {
  const raw = await searchParams;
  const filters = parseFilters(raw);

  const [{ papers, total, totalPages, matchedVia }, tagFacets, researcherFacets] =
    await Promise.all([
      searchResearch(filters),
      listTagFacets(),
      listResearcherFacets(),
    ]);

  return (
    <div className="container mx-auto w-full max-w-3xl px-6 py-16">
      <header className="mb-10">
        <h1 className="font-serif text-4xl tracking-tight md:text-5xl">מחקרים</h1>
        <p className="mt-3 text-muted-foreground">
          ארכיון פתוח של מחקרי המדיניות ופעילות השטח.
        </p>
      </header>

      <SearchForm
        filters={filters}
        tagFacets={tagFacets}
        researcherFacets={researcherFacets}
        basePath="/research"
      />

      {filters.q && (
        <p className="mb-6 text-sm text-muted-foreground" aria-live="polite">
          {total === 0
            ? `לא נמצאו תוצאות עבור "${filters.q}".`
            : `נמצאו ${total} תוצאות עבור "${filters.q}"${
                matchedVia === "trigram" ? " (התאמה חלקית)" : ""
              }.`}
        </p>
      )}

      {papers.length === 0 ? (
        <p className="text-muted-foreground">
          {filters.q ||
          filters.tagSlugs.length > 0 ||
          filters.researcherSlug ||
          filters.from ||
          filters.to
            ? "לא נמצאו מחקרים התואמים לסינון. נסו לשחרר את אחד הפילטרים."
            : "לא פורסמו עדיין מחקרים."}
        </p>
      ) : (
        <ul className="divide-y divide-border">
          {papers.map((paper) => (
            <li key={paper.slug}>
              <PaperCard paper={paper} />
            </li>
          ))}
        </ul>
      )}

      <Pagination
        basePath="/research"
        filters={filters}
        totalPages={totalPages}
      />
    </div>
  );
}
