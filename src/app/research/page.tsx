import Link from "next/link";
import type { Metadata } from "next";
import { listResearchFiles } from "@/lib/research";

export const metadata: Metadata = {
  title: "מחקרים",
  description: "ארכיון המחקרים של עמותת זה עלינו.",
};

const HE_DATE = new Intl.DateTimeFormat("he-IL", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

export default async function ResearchIndex() {
  const all = await listResearchFiles();

  return (
    <div className="container mx-auto w-full max-w-3xl px-6 py-16">
      <header className="mb-10">
        <h1 className="font-serif text-4xl tracking-tight md:text-5xl">מחקרים</h1>
        <p className="mt-3 text-muted-foreground">
          ארכיון פתוח של מחקרי המדיניות ופעילות השטח.
        </p>
      </header>

      {all.length === 0 ? (
        <p className="text-muted-foreground">לא פורסמו עדיין מחקרים.</p>
      ) : (
        <ul className="divide-y divide-border">
          {all.map((entry) => (
            <li key={entry.slug} className="py-6">
              <article>
                <Link
                  href={`/research/${entry.slug}`}
                  className="group block focus:outline-none"
                >
                  <h2 className="font-serif text-2xl leading-snug tracking-tight group-hover:underline">
                    {entry.title}
                  </h2>
                  <p className="mt-2 text-muted-foreground">{entry.excerpt}</p>
                  <p className="mt-3 text-sm text-muted-foreground">
                    <time dateTime={entry.published_at}>
                      {HE_DATE.format(new Date(entry.published_at))}
                    </time>
                    {entry.authors.length > 0 && (
                      <>
                        <span className="mx-2" aria-hidden>
                          ·
                        </span>
                        {entry.authors.join(" · ")}
                      </>
                    )}
                  </p>
                </Link>
              </article>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
