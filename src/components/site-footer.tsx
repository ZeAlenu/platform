import Link from "next/link";

const FOOTER_LINKS = [
  { href: "/research", label: "מחקרים" },
  { href: "/researchers", label: "חוקרים" },
  { href: "/about", label: "אודות" },
  { href: "/contact", label: "צור קשר" },
];

export function SiteFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="border-t border-border mt-16">
      <div className="mx-auto w-full max-w-5xl py-10 ps-6 pe-6 flex flex-col gap-6 text-sm text-muted-foreground sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-1">
          <p className="font-serif text-base text-foreground">זה עלינו</p>
          <p>פלטפורמה ציבורית למחקרי מדיניות ופעילות שטח</p>
          <p>© {year} עמותת זה עלינו · כל הזכויות שמורות</p>
        </div>
        <nav aria-label="ניווט בתחתית" className="flex flex-wrap gap-x-4 gap-y-2">
          {FOOTER_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="hover:text-foreground transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}
