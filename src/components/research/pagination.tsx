import Link from "next/link";
import { buildSearchParams, type ParsedFilters } from "@/lib/research-search";

interface Props {
  basePath: string;
  filters: ParsedFilters;
  totalPages: number;
}

export function Pagination({ basePath, filters, totalPages }: Props) {
  if (totalPages <= 1) return null;
  const current = filters.page;
  const prev = current > 1 ? current - 1 : null;
  const next = current < totalPages ? current + 1 : null;

  const link = (page: number) => {
    const params = buildSearchParams(filters, { page });
    const qs = params.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  };

  return (
    <nav
      aria-label="עימוד"
      className="mt-10 flex items-center justify-between border-t border-border pt-6 text-sm"
    >
      <div>
        {prev !== null ? (
          <Link
            href={link(prev)}
            rel="prev"
            className="text-muted-foreground hover:text-foreground hover:underline"
          >
            ← הקודם
          </Link>
        ) : (
          <span aria-hidden className="text-muted-foreground/40">
            ← הקודם
          </span>
        )}
      </div>
      <p className="text-muted-foreground">
        עמוד {current} מתוך {totalPages}
      </p>
      <div>
        {next !== null ? (
          <Link
            href={link(next)}
            rel="next"
            className="text-muted-foreground hover:text-foreground hover:underline"
          >
            הבא →
          </Link>
        ) : (
          <span aria-hidden className="text-muted-foreground/40">
            הבא →
          </span>
        )}
      </div>
    </nav>
  );
}
