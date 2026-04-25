import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import {
  getResearcherProfile,
  type ResearcherLink,
  type ResearcherProfile,
} from "@/lib/researchers";
import { parseFilters, searchResearch } from "@/lib/research-search";
import { ResearcherAvatar } from "@/components/researchers/avatar";
import { Pagination } from "@/components/research/pagination";
import { SITE_LEGAL_NAME, SITE_NAME, SITE_URL, absoluteUrl } from "@/lib/site";

interface PageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export const dynamic = "force-dynamic";

const HE_DATE = new Intl.DateTimeFormat("he-IL", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

const LINK_LABELS: Record<ResearcherLink["kind"], string> = {
  email: "דוא״ל",
  x: "X",
  linkedin: "LinkedIn",
  github: "GitHub",
  website: "אתר",
  other: "קישור",
};

function profileCanonical(slug: string): string {
  return `/researchers/${encodeURIComponent(slug)}`;
}

function profileDescription(profile: ResearcherProfile): string {
  return profile.bio?.split("\n")[0] ?? `פרופיל החוקר/ת ${profile.displayName}.`;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const profile = await getResearcherProfile(slug);
  if (!profile) return {};
  const canonical = profileCanonical(profile.slug);
  const description = profileDescription(profile);
  return {
    title: profile.displayName,
    description,
    alternates: {
      canonical,
      languages: {
        he: absoluteUrl(canonical),
        "x-default": absoluteUrl(canonical),
      },
    },
    openGraph: {
      type: "profile",
      title: profile.displayName,
      description,
      url: absoluteUrl(canonical),
      siteName: SITE_NAME,
      locale: "he_IL",
      images: profile.photoUrl ? [{ url: profile.photoUrl }] : undefined,
    },
    twitter: {
      card: "summary",
      title: profile.displayName,
      description,
    },
  };
}

function buildPersonJsonLd(profile: ResearcherProfile): Record<string, unknown> {
  const url = absoluteUrl(profileCanonical(profile.slug));
  const sameAs = profile.links
    .filter((l) => /^https?:\/\//i.test(l.href))
    .map((l) => l.href);
  return {
    "@context": "https://schema.org",
    "@type": "Person",
    name: profile.displayName,
    description: profile.bio ?? undefined,
    url,
    image: profile.photoUrl ?? undefined,
    sameAs: sameAs.length > 0 ? sameAs : undefined,
    affiliation: {
      "@type": "Organization",
      name: SITE_LEGAL_NAME,
      url: SITE_URL,
    },
  };
}

export default async function ResearcherProfilePage({
  params,
  searchParams,
}: PageProps) {
  const { slug } = await params;
  const profile = await getResearcherProfile(slug);
  if (!profile) notFound();

  const raw = await searchParams;
  const filters = parseFilters({ ...raw, author: profile.slug });
  const { papers: research, totalPages } = await searchResearch(filters);
  const basePath = profileCanonical(profile.slug);
  const personJsonLd = buildPersonJsonLd(profile);

  return (
    <article className="container mx-auto w-full max-w-3xl px-6 py-16">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(personJsonLd) }}
      />
      <header className="flex flex-col items-start gap-6 sm:flex-row sm:items-center">
        <ResearcherAvatar
          displayName={profile.displayName}
          photoUrl={profile.photoUrl}
          size="lg"
        />
        <div className="min-w-0">
          <h1 className="font-serif text-4xl leading-tight tracking-tight md:text-5xl">
            {profile.displayName}
          </h1>
          {profile.links.length > 0 && (
            <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-sm">
              {profile.links.map((link, i) => (
                <li key={`${link.kind}-${i}`}>
                  <a
                    href={link.href}
                    className="text-muted-foreground hover:text-foreground hover:underline"
                    {...(link.kind !== "email"
                      ? { rel: "noopener noreferrer", target: "_blank" }
                      : {})}
                  >
                    {link.label ?? LINK_LABELS[link.kind]}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      </header>

      {profile.bio && (
        <section className="prose prose-rtl mt-10 max-w-none">
          {profile.bio.split(/\n{2,}/).map((para, i) => (
            <p key={i} className="leading-loose">
              {para}
            </p>
          ))}
        </section>
      )}

      <section className="mt-12 border-t border-border pt-10">
        <h2 className="font-serif text-2xl tracking-tight">מחקרים</h2>
        {research.length === 0 ? (
          <p className="mt-4 text-muted-foreground">טרם פורסמו מחקרים.</p>
        ) : (
          <ul className="mt-6 divide-y divide-border">
            {research.map((entry) => (
              <li key={entry.slug} className="py-5">
                <Link
                  href={`/research/${entry.slug}`}
                  className="group block focus:outline-none"
                >
                  <h3 className="font-serif text-xl leading-snug group-hover:underline">
                    {entry.title}
                  </h3>
                  {entry.excerpt && (
                    <p className="mt-1 text-sm text-muted-foreground">
                      {entry.excerpt}
                    </p>
                  )}
                  {entry.publishedAt && (
                    <p className="mt-2 text-xs text-muted-foreground">
                      <time dateTime={entry.publishedAt}>
                        {HE_DATE.format(new Date(entry.publishedAt))}
                      </time>
                    </p>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        )}
        <Pagination basePath={basePath} filters={filters} totalPages={totalPages} />
      </section>
    </article>
  );
}
