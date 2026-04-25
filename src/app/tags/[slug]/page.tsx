import type { Metadata } from "next";
import { notFound } from "next/navigation";

import {
  getTagBySlug,
  parseFilters,
  searchResearch,
} from "@/lib/research-search";
import { PaperCard } from "@/components/research/paper-card";
import { Pagination } from "@/components/research/pagination";
import { SITE_NAME, absoluteUrl } from "@/lib/site";

interface PageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const decoded = decodeURIComponent(slug);
  const tag = await getTagBySlug(decoded);
  if (!tag) return {};
  const title = `תגית: ${tag.nameHe}`;
  const description = `מחקרים שתויגו בתגית "${tag.nameHe}".`;
  const canonical = `/tags/${encodeURIComponent(tag.slug)}`;
  return {
    title,
    description,
    alternates: {
      canonical,
      languages: {
        he: absoluteUrl(canonical),
        "x-default": absoluteUrl(canonical),
      },
    },
    openGraph: {
      type: "website",
      title,
      description,
      url: absoluteUrl(canonical),
      siteName: SITE_NAME,
      locale: "he_IL",
    },
    twitter: { card: "summary", title, description },
  };
}

export default async function TagPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const decoded = decodeURIComponent(slug);
  const tag = await getTagBySlug(decoded);
  if (!tag) notFound();

  const raw = await searchParams;
  const filters = parseFilters({ ...raw, tag: tag.slug });
  const { papers, total, totalPages } = await searchResearch(filters);

  const basePath = `/tags/${encodeURIComponent(tag.slug)}`;

  return (
    <div className="container mx-auto w-full max-w-3xl px-6 py-16">
      <header className="mb-10">
        <p className="text-sm text-muted-foreground">תגית</p>
        <h1 className="mt-2 font-serif text-4xl tracking-tight md:text-5xl">
          {tag.nameHe}
        </h1>
        <p className="mt-3 text-muted-foreground">
          {total === 0
            ? "טרם פורסמו מחקרים בתגית זו."
            : `${total} מחקרים בתגית זו.`}
        </p>
      </header>

      {papers.length > 0 && (
        <ul className="divide-y divide-border">
          {papers.map((paper) => (
            <li key={paper.slug}>
              <PaperCard paper={paper} />
            </li>
          ))}
        </ul>
      )}

      <Pagination basePath={basePath} filters={filters} totalPages={totalPages} />
    </div>
  );
}
