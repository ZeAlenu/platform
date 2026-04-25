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

export const dynamicParams = false;

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  const all = await listResearchFiles();
  return all.map((entry) => ({ slug: entry.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  try {
    const { frontmatter } = await readResearchFile(slug);
    return {
      title: frontmatter.title,
      description: frontmatter.excerpt,
      openGraph: {
        title: frontmatter.title,
        description: frontmatter.excerpt,
        type: "article",
        publishedTime: frontmatter.published_at,
        authors: frontmatter.authors,
        images: frontmatter.cover_image ? [frontmatter.cover_image] : undefined,
      },
    };
  } catch {
    return {};
  }
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
    </article>
  );
}
