import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import {
  getResearcherProfile,
  getResearchForResearcher,
  type ResearcherLink,
} from "@/lib/researchers";
import { ResearcherAvatar } from "@/components/researchers/avatar";

interface PageProps {
  params: Promise<{ slug: string }>;
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

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const profile = await getResearcherProfile(slug);
  if (!profile) return {};
  return {
    title: profile.displayName,
    description: profile.bio?.split("\n")[0] ?? `פרופיל החוקר/ת ${profile.displayName}.`,
  };
}

export default async function ResearcherProfilePage({ params }: PageProps) {
  const { slug } = await params;
  const profile = await getResearcherProfile(slug);
  if (!profile) notFound();

  const research = await getResearchForResearcher(profile);

  return (
    <article className="container mx-auto w-full max-w-3xl px-6 py-16">
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
                  <p className="mt-1 text-sm text-muted-foreground">
                    {entry.excerpt}
                  </p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    <time dateTime={entry.published_at}>
                      {HE_DATE.format(new Date(entry.published_at))}
                    </time>
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </article>
  );
}
