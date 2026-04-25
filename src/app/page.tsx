import Link from "next/link";

export default function Home() {
  return (
    <div className="mx-auto w-full max-w-3xl flex-1 ps-6 pe-6 py-20 flex flex-col gap-10">
      <section className="flex flex-col gap-5">
        <p className="text-sm uppercase tracking-widest text-muted">
          עמותת זה עלינו
        </p>
        <h1 className="text-4xl sm:text-5xl font-serif leading-tight">
          מחקרי מדיניות ופעילות שטח
          <br />
          לציונות יהודית בישראל.
        </h1>
        <p className="text-lg leading-relaxed text-muted max-w-2xl">
          פלטפורמה ציבורית, בעברית, לפרסום מחקרים, נתונים, וניירות עמדה. הכל
          פתוח, הכל נגיש, הכל ניתן לציטוט.
        </p>
        <div className="flex flex-wrap gap-3 pt-2">
          <Link
            href="/research"
            className="inline-flex items-center rounded-full bg-foreground text-background ps-5 pe-5 py-2.5 text-sm font-medium hover:opacity-90 transition-opacity"
          >
            לכל המחקרים
          </Link>
          <Link
            href="/about"
            className="inline-flex items-center rounded-full border border-border ps-5 pe-5 py-2.5 text-sm font-medium hover:bg-border/40 transition-colors"
          >
            על העמותה
          </Link>
        </div>
      </section>

      <section className="border-t border-border pt-10">
        <p className="text-sm text-muted">
          האתר בהקמה. תוכן ראשון יעלה במהלך השבועות הקרובים.
        </p>
      </section>
    </div>
  );
}
