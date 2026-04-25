import Link from "next/link";
import type { Metadata } from "next";

import { SubmissionForm } from "@/components/dashboard/submission-form";
import { ensureDbUserFromClerk } from "@/lib/auth";

export const metadata: Metadata = {
  title: "הגשת מחקר חדש",
  description: "הגשת מחקר חדש לאתר",
  robots: { index: false, follow: false },
};

export default async function NewSubmissionPage() {
  const user = await ensureDbUserFromClerk();
  if (!user) {
    return (
      <section className="mx-auto w-full max-w-3xl px-6 py-12">
        <p>שגיאת התחברות. אנא התחברו מחדש.</p>
      </section>
    );
  }

  const defaultAuthors = user.displayName ?? user.email;

  return (
    <section className="mx-auto w-full max-w-3xl px-6 py-12 space-y-6">
      <header className="space-y-2">
        <p className="text-sm">
          <Link href="/dashboard" className="text-muted-foreground hover:underline">
            ← חזרה לדשבורד
          </Link>
        </p>
        <h1 className="text-3xl font-serif font-medium">הגשת מחקר חדש</h1>
        <p className="text-sm text-muted-foreground">
          ניתן לשמור טיוטה ולהמשיך אחר כך, או להגיש מיד לבדיקה. הגשה תיצור PR טיוטה אוטומטי.
        </p>
      </header>

      <SubmissionForm
        status="draft"
        defaultValues={{ authors: defaultAuthors }}
      />
    </section>
  );
}
