import Link from "next/link";
import type { Metadata } from "next";

import { listResearcherProfiles } from "@/lib/researchers";
import { ResearcherAvatar } from "@/components/researchers/avatar";
import { SITE_NAME, absoluteUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: "חוקרות וחוקרים",
  description: "צוות החוקרות והחוקרים של עמותת זה עלינו.",
  alternates: {
    canonical: "/researchers",
    languages: {
      he: absoluteUrl("/researchers"),
      "x-default": absoluteUrl("/researchers"),
    },
  },
  openGraph: {
    type: "website",
    title: "חוקרות וחוקרים",
    description: "צוות החוקרות והחוקרים של עמותת זה עלינו.",
    url: absoluteUrl("/researchers"),
    siteName: SITE_NAME,
    locale: "he_IL",
  },
};

// Researchers come from the DB (Clerk-synced + seeded). Render at request time
// so a build can succeed without a live DB connection.
export const dynamic = "force-dynamic";

export default async function ResearchersIndex() {
  const all = await listResearcherProfiles();

  return (
    <div className="container mx-auto w-full max-w-4xl px-6 py-16">
      <header className="mb-10">
        <h1 className="font-serif text-4xl tracking-tight md:text-5xl">חוקרות וחוקרים</h1>
        <p className="mt-3 text-lg leading-relaxed text-muted-foreground">
          הצוות שמאחורי המחקרים. כל פרופיל כולל ביוגרפיה קצרה, דרכי קשר, ורשימת
          המחקרים שפורסמו.
        </p>
      </header>

      {all.length === 0 ? (
        <p className="text-muted-foreground">
          טרם נוצרו פרופילי חוקרים. הריצו{" "}
          <code className="font-mono text-sm">pnpm content:sync</code>{" "}
          כדי לטעון את הזרעים.
        </p>
      ) : (
        <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          {all.map((profile) => (
            <li key={profile.slug}>
              <Link
                href={`/researchers/${profile.slug}`}
                className="group flex items-start gap-4 rounded-lg border border-border bg-card p-5 transition-colors hover:bg-muted/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <ResearcherAvatar
                  displayName={profile.displayName}
                  photoUrl={profile.photoUrl}
                  size="md"
                />
                <div className="min-w-0">
                  <p className="font-serif text-xl leading-snug group-hover:underline">
                    {profile.displayName}
                  </p>
                  {profile.bio && (
                    <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-muted-foreground">
                      {profile.bio}
                    </p>
                  )}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
