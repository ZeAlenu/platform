export function SiteFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="border-t border-border mt-16">
      <div className="mx-auto w-full max-w-5xl py-8 ps-6 pe-6 flex flex-col gap-2 text-sm text-muted sm:flex-row sm:justify-between">
        <p>© {year} עמותת זה עלינו · כל הזכויות שמורות</p>
        <p>פלטפורמה ציבורית למחקרי מדיניות ופעילות שטח</p>
      </div>
    </footer>
  );
}
