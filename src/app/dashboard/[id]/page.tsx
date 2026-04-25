import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { SubmissionStatusBadge } from "@/components/dashboard/status-badge";
import { SubmissionForm } from "@/components/dashboard/submission-form";
import type { SubmissionStatus } from "@/db/schema";
import { ensureDbUserFromClerk } from "@/lib/auth";
import { getSubmissionForUser } from "@/lib/submissions";

export const metadata: Metadata = {
  title: "עריכת הגשה",
  robots: { index: false, follow: false },
};

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function SubmissionEditPage({ params }: PageProps) {
  const { id } = await params;
  const user = await ensureDbUserFromClerk();
  if (!user) {
    return (
      <section className="mx-auto w-full max-w-3xl px-6 py-12">
        <p>שגיאת התחברות. אנא התחברו מחדש.</p>
      </section>
    );
  }

  const submission = await getSubmissionForUser(id, user.id);
  if (!submission) notFound();

  const status = submission.status as SubmissionStatus;
  const readOnly = status !== "draft" && status !== "changes_requested";

  return (
    <section className="mx-auto w-full max-w-3xl px-6 py-12 space-y-6">
      <header className="space-y-2">
        <p className="text-sm">
          <Link href="/dashboard" className="text-muted-foreground hover:underline">
            ← חזרה לדשבורד
          </Link>
        </p>
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-serif font-medium">{submission.titleHe}</h1>
          <SubmissionStatusBadge status={status} />
        </div>
        {submission.prUrl ? (
          <p className="text-sm">
            <a
              href={submission.prUrl}
              target="_blank"
              rel="noreferrer"
              className="text-muted-foreground underline hover:text-foreground"
            >
              צפייה ב-PR בגיטהאב
            </a>
          </p>
        ) : null}
      </header>

      <SubmissionForm
        submissionId={submission.id}
        status={status}
        readOnly={readOnly}
        defaultValues={{
          title: submission.titleHe,
          slug: submission.slug,
          excerpt: submission.excerpt ?? "",
          tags: ((submission.tagSlugs as string[]) ?? []).join(", "),
          authors: user.displayName ?? user.email,
          bodyMarkdown: submission.bodyMarkdown,
        }}
      />
    </section>
  );
}
