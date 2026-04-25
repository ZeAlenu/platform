import Link from "next/link";
import type { Metadata } from "next";

import { SubmissionStatusBadge } from "@/components/dashboard/status-badge";
import { Button } from "@/components/ui/button";
import type { SubmissionStatus } from "@/db/schema";
import { ensureDbUserFromClerk } from "@/lib/auth";
import { listSubmissionsForUser } from "@/lib/submissions";

export const metadata: Metadata = {
  title: "הדשבורד שלי",
  description: "ניהול ההגשות וההמחקרים שלי",
  robots: { index: false, follow: false },
};

const dateFormatter = new Intl.DateTimeFormat("he-IL", {
  year: "numeric",
  month: "short",
  day: "numeric",
});

interface DashboardPageProps {
  searchParams: Promise<{ submitted?: string }>;
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const { submitted } = await searchParams;
  const user = await ensureDbUserFromClerk();
  if (!user) {
    return (
      <section className="mx-auto w-full max-w-3xl px-6 py-12">
        <p>שגיאת התחברות. אנא התחברו מחדש.</p>
      </section>
    );
  }

  const submissions = await listSubmissionsForUser(user.id);

  return (
    <section className="mx-auto w-full max-w-4xl px-6 py-12 space-y-8">
      <header className="flex items-end justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-serif font-medium">הדשבורד שלי</h1>
          <p className="text-sm text-muted-foreground">
            כאן אפשר להתחיל הגשת מחקר חדש ולעקוב אחרי הסטטוס של ההגשות שלך.
          </p>
        </div>
        <Button render={<Link href="/dashboard/new" />}>הגשה חדשה</Button>
      </header>

      {submitted ? (
        <div
          role="status"
          className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-200"
        >
          ההגשה התקבלה. נעדכן אותך כשהיא תיכנס ל-review.
        </div>
      ) : null}

      {submissions.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border px-6 py-12 text-center text-sm text-muted-foreground">
          אין הגשות עדיין. <Link href="/dashboard/new" className="underline">התחילו הגשה חדשה</Link>.
        </div>
      ) : (
        <ul className="divide-y divide-border rounded-lg border border-border">
          {submissions.map((s) => {
            const status = s.status as SubmissionStatus;
            return (
              <li key={s.id} className="px-4 py-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/dashboard/${s.id}`}
                      className="font-medium text-foreground hover:underline"
                    >
                      {s.titleHe}
                    </Link>
                    <SubmissionStatusBadge status={status} />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    עודכן {dateFormatter.format(new Date(s.updatedAt))}
                    {s.prUrl ? (
                      <>
                        {" · "}
                        <a
                          href={s.prUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="underline hover:text-foreground"
                        >
                          PR בגיטהאב
                        </a>
                      </>
                    ) : null}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    render={<Link href={`/dashboard/${s.id}`} />}
                  >
                    {status === "draft" ? "המשך עריכה" : "צפייה"}
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
