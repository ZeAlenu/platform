import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "צרו קשר",
  description: "דרכי יצירת קשר עם עמותת זה עלינו — דוא״ל, עיתונות, ושיתופי פעולה.",
};

const CONTACTS: Array<{
  label: string;
  description: string;
  href: string;
  display: string;
}> = [
  {
    label: "דוא״ל כללי",
    description: "פניות כלליות, שאלות, והצעות לשיתוף פעולה.",
    href: "mailto:contact@zealenu.org.il",
    display: "contact@zealenu.org.il",
  },
  {
    label: "עיתונות",
    description: "כתבות, ראיונות, ובקשות לתגובה. מענה תוך 48 שעות.",
    href: "mailto:press@zealenu.org.il",
    display: "press@zealenu.org.il",
  },
  {
    label: "מחקר ושותפויות",
    description: "הצעות מחקר, שיתופי פעולה אקדמיים ומיזמים מקבילים.",
    href: "mailto:research@zealenu.org.il",
    display: "research@zealenu.org.il",
  },
];

export default function ContactPage() {
  return (
    <article className="container mx-auto w-full max-w-3xl px-6 py-16">
      <header className="mb-10">
        <h1 className="font-serif text-4xl tracking-tight md:text-5xl">צרו קשר</h1>
        <p className="mt-3 text-lg leading-relaxed text-muted-foreground">
          אנחנו עונים על כל פנייה. לטיפול מהיר, בחרו את הכתובת המתאימה לסוג
          הפנייה.
        </p>
      </header>

      <ul className="divide-y divide-border">
        {CONTACTS.map((c) => (
          <li key={c.href} className="py-6">
            <p className="font-serif text-xl tracking-tight">{c.label}</p>
            <p className="mt-1 text-muted-foreground">{c.description}</p>
            <p className="mt-3">
              <a
                href={c.href}
                className="font-mono text-sm hover:underline"
                dir="ltr"
              >
                {c.display}
              </a>
            </p>
          </li>
        ))}
      </ul>

      <section className="mt-12 border-t border-border pt-8 text-sm text-muted-foreground">
        <p>
          עמותת זה עלינו · רשומה כעמותה ציבורית בישראל · מספר עמותה יישלם בהמשך.
        </p>
      </section>
    </article>
  );
}
