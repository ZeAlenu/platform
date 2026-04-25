import Link from "next/link";
import type { PaperListItem } from "@/lib/research-search";

const HE_DATE = new Intl.DateTimeFormat("he-IL", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

export function PaperCard({ paper }: { paper: PaperListItem }) {
  return (
    <article className="py-6">
      <Link
        href={`/research/${paper.slug}`}
        className="group block focus:outline-none"
      >
        <h2 className="font-serif text-2xl leading-snug tracking-tight group-hover:underline">
          {paper.title}
        </h2>
        {paper.excerpt && (
          <p className="mt-2 text-muted-foreground">{paper.excerpt}</p>
        )}
      </Link>
      <p className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
        {paper.publishedAt && (
          <time dateTime={paper.publishedAt}>
            {HE_DATE.format(new Date(paper.publishedAt))}
          </time>
        )}
        {paper.researchers.length > 0 && (
          <>
            <span aria-hidden>·</span>
            <span className="flex flex-wrap gap-x-2">
              {paper.researchers.map((r, i) => (
                <span key={r.slug}>
                  <Link
                    href={`/researchers/${r.slug}`}
                    className="hover:text-foreground hover:underline"
                  >
                    {r.displayName}
                  </Link>
                  {i < paper.researchers.length - 1 ? " ·" : ""}
                </span>
              ))}
            </span>
          </>
        )}
      </p>
      {paper.tags.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-2">
          {paper.tags.map((t) => (
            <li key={t.slug}>
              <Link
                href={`/tags/${encodeURIComponent(t.slug)}`}
                className="inline-flex rounded-full border border-border bg-muted/40 px-3 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                {t.nameHe}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}
