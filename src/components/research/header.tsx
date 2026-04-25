import type { ResearchFrontmatter } from "@/lib/research";

interface ResearchHeaderProps {
  frontmatter: ResearchFrontmatter;
}

const HE_DATE = new Intl.DateTimeFormat("he-IL", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

export function ResearchHeader({ frontmatter }: ResearchHeaderProps) {
  const published = new Date(frontmatter.published_at);

  return (
    <header className="mb-10 border-b border-border pb-8">
      <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
        <time dateTime={frontmatter.published_at}>
          {HE_DATE.format(published)}
        </time>
        {frontmatter.tags.length > 0 && (
          <>
            <span aria-hidden>·</span>
            <ul className="flex flex-wrap gap-x-2">
              {frontmatter.tags.map((tag) => (
                <li key={tag}>#{tag}</li>
              ))}
            </ul>
          </>
        )}
      </div>
      <h1 className="font-serif text-4xl leading-tight tracking-tight md:text-5xl">
        {frontmatter.title}
      </h1>
      {frontmatter.excerpt && (
        <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
          {frontmatter.excerpt}
        </p>
      )}
      {frontmatter.authors.length > 0 && (
        <p className="mt-6 text-sm">
          <span className="text-muted-foreground">מאת </span>
          {frontmatter.authors.join(" · ")}
        </p>
      )}
    </header>
  );
}
