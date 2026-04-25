import type { TocItem } from "@/lib/research";

interface ResearchTocProps {
  items: TocItem[];
}

export function ResearchToc({ items }: ResearchTocProps) {
  if (items.length === 0) return null;

  return (
    <nav
      aria-label="תוכן עניינים"
      className="sticky top-24 hidden self-start lg:block"
    >
      <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        תוכן עניינים
      </p>
      <ol className="space-y-2 text-sm">
        {items.map((item) => (
          <li
            key={item.id}
            className={item.depth === 3 ? "ms-4 text-muted-foreground" : ""}
          >
            <a
              href={`#${item.id}`}
              className="block leading-snug hover:text-foreground hover:underline"
            >
              {item.title}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
