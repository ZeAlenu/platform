import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  extractToc,
  listResearchFiles,
  readResearchFile,
  type ResearchFrontmatter,
} from "@/lib/research";
import { ResearchHeader } from "@/components/research/header";
import { ResearchToc } from "@/components/research/toc";
import {
  SITE_LANG,
  SITE_LEGAL_NAME,
  SITE_NAME,
  SITE_URL,
  absoluteUrl,
} from "@/lib/site";

export const dynamicParams = false;

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  const all = await listResearchFiles();
  return all.map((entry) => ({ slug: entry.slug }));
}

function articleCanonical(slug: string): string {
  return `/research/${slug}`;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  try {
    const { frontmatter } = await readResearchFile(slug);
    const canonical = articleCanonical(slug);
    return {
      title: frontmatter.title,
      description: frontmatter.excerpt,
      alternates: {
        canonical,
        languages: {
          he: absoluteUrl(canonical),
          "x-default": absoluteUrl(canonical),
        },
      },
      openGraph: {
        type: "article",
        title: frontmatter.title,
        description: frontmatter.excerpt,
        url: absoluteUrl(canonical),
        publishedTime: frontmatter.published_at,
        authors: frontmatter.authors,
        tags: frontmatter.tags,
        locale: "he_IL",
        siteName: SITE_NAME,
        // If frontmatter declares a cover image, surface it here. The
        // segment-level `opengraph-image.tsx` provides a generated fallback.
        images: frontmatter.cover_image
          ? [{ url: frontmatter.cover_image }]
          : undefined,
      },
      twitter: {
        card: "summary_large_image",
        title: frontmatter.title,
        description: frontmatter.excerpt,
      },
    };
  } catch {
    return {};
  }
}

function buildArticleJsonLd(
  slug: string,
  frontmatter: ResearchFrontmatter,
): Record<string, unknown> {
  const url = absoluteUrl(articleCanonical(slug));
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: frontmatter.title,
    description: frontmatter.excerpt,
    inLanguage: frontmatter.language ?? SITE_LANG,
    datePublished: frontmatter.published_at,
    dateModified: frontmatter.published_at,
    keywords: frontmatter.tags,
    url,
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    image: frontmatter.cover_image
      ? [absoluteUrl(frontmatter.cover_image)]
      : [`${url}/opengraph-image`],
    author: frontmatter.authors.map((name) => ({
      "@type": "Person",
      name,
    })),
    publisher: {
      "@type": "Organization",
      name: SITE_LEGAL_NAME,
      url: SITE_URL,
    },
  };
}

export default async function ResearchPage({ params }: PageProps) {
  const { slug } = await params;

  let frontmatter: ResearchFrontmatter;
  let content: string;
  try {
    const file = await readResearchFile(slug);
    frontmatter = file.frontmatter;
    content = file.content;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") notFound();
    throw err;
  }

  const toc = extractToc(content);
  const { default: Body } = await import(`@content/research/${slug}.mdx`);
  const articleJsonLd = buildArticleJsonLd(slug, frontmatter);

  return (
    <article className="container mx-auto grid w-full max-w-7xl grid-cols-1 gap-12 px-6 py-12 lg:grid-cols-[1fr_16rem]">
      <div className="min-w-0">
        <ResearchHeader frontmatter={frontmatter} />
        <div className="prose prose-rtl max-w-none">
          <Body />
        </div>
      </div>
      <aside className="lg:order-last">
        <ResearchToc items={toc} />
      </aside>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
      />
    </article>
  );
}
