"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { db } from "@/db";
import { researchers, researchSubmissions, type SubmissionStatus } from "@/db/schema";
import { ensureDbUserFromClerk } from "@/lib/auth";
import { getEmailConfig, notifyContentLead } from "@/lib/email";
import { getGithubConfig, openSubmissionPr } from "@/lib/github";
import { absoluteUrl } from "@/lib/site";
import {
  buildMdxFile,
  getSubmissionForUser,
  slugifyTitle,
  suffixSlug,
} from "@/lib/submissions";

const baseSchema = z.object({
  id: z.string().uuid().optional().or(z.literal("").transform(() => undefined)),
  title: z.string().trim().min(4, "כותרת קצרה מדי").max(200),
  slug: z
    .string()
    .trim()
    .min(3)
    .max(80)
    .regex(/^[a-z0-9-]+$/, "Slug חייב להכיל אותיות לטיניות קטנות, ספרות ומקפים בלבד")
    .optional()
    .or(z.literal("").transform(() => undefined)),
  excerpt: z.string().trim().min(20, "תקציר קצר מדי").max(500),
  tags: z.string().trim().max(400).optional().default(""),
  authors: z.string().trim().max(400).optional().default(""),
  bodyMarkdown: z.string().trim().min(40, "תוכן קצר מדי"),
});

export type SubmissionFormState = {
  ok: boolean;
  message?: string;
  fieldErrors?: Partial<Record<keyof z.infer<typeof baseSchema>, string>>;
  submissionId?: string;
  status?: SubmissionStatus;
  prUrl?: string | null;
  warnings?: string[];
};

function fieldErrorsFromZod(
  err: z.ZodError<z.infer<typeof baseSchema>>,
): SubmissionFormState["fieldErrors"] {
  const out: SubmissionFormState["fieldErrors"] = {};
  for (const issue of err.issues) {
    const key = issue.path[0] as keyof z.infer<typeof baseSchema> | undefined;
    if (!key || out[key]) continue;
    out[key] = issue.message;
  }
  return out;
}

function parseList(input: string | undefined): string[] {
  if (!input) return [];
  return input
    .split(/[,\n]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

async function persistDraft(formData: FormData): Promise<
  | { ok: false; state: SubmissionFormState }
  | { ok: true; submissionId: string; status: SubmissionStatus }
> {
  const user = await ensureDbUserFromClerk();
  if (!user) {
    return { ok: false, state: { ok: false, message: "יש להתחבר מחדש" } };
  }

  const raw = {
    id: formData.get("id")?.toString() ?? "",
    title: formData.get("title")?.toString() ?? "",
    slug: formData.get("slug")?.toString() ?? "",
    excerpt: formData.get("excerpt")?.toString() ?? "",
    tags: formData.get("tags")?.toString() ?? "",
    authors: formData.get("authors")?.toString() ?? "",
    bodyMarkdown: formData.get("bodyMarkdown")?.toString() ?? "",
  };

  const parsed = baseSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      state: {
        ok: false,
        message: "אנא תקנו את שגיאות הטופס",
        fieldErrors: fieldErrorsFromZod(parsed.error),
      },
    };
  }

  const data = parsed.data;
  const slugCandidate = (data.slug ?? slugifyTitle(data.title)).trim();
  const slug = /^[a-z0-9-]+$/.test(slugCandidate)
    ? slugCandidate
    : slugifyTitle(data.title) || `submission-${Date.now()}`;

  const tags = parseList(data.tags);
  const authors = parseList(data.authors);
  const userDisplay = user.displayName ?? user.email;
  if (authors.length === 0) authors.push(userDisplay);

  const existing = data.id ? await getSubmissionForUser(data.id, user.id) : null;
  if (data.id && !existing) {
    return { ok: false, state: { ok: false, message: "טיוטה לא נמצאה" } };
  }

  const now = new Date();

  if (existing) {
    await db
      .update(researchSubmissions)
      .set({
        slug: existing.slug,
        titleHe: data.title,
        excerpt: data.excerpt,
        tagSlugs: tags,
        bodyMarkdown: data.bodyMarkdown,
        updatedAt: now,
      })
      .where(eq(researchSubmissions.id, existing.id));
    return { ok: true, submissionId: existing.id, status: existing.status as SubmissionStatus };
  }

  const finalSlug = await ensureUniqueSlug(slug);
  const inserted = await db
    .insert(researchSubmissions)
    .values({
      userId: user.id,
      slug: finalSlug,
      titleHe: data.title,
      excerpt: data.excerpt,
      tagSlugs: tags,
      bodyMarkdown: data.bodyMarkdown,
      status: "draft",
    })
    .returning();
  const row = inserted[0];
  if (!row) throw new Error("Failed to insert submission");
  return { ok: true, submissionId: row.id, status: row.status as SubmissionStatus };
}

async function ensureUniqueSlug(slug: string): Promise<string> {
  const existing = await db
    .select({ id: researchSubmissions.id })
    .from(researchSubmissions)
    .where(eq(researchSubmissions.slug, slug))
    .limit(1);
  if (existing.length === 0) return slug;
  const suffix = Math.random().toString(36).slice(2, 7);
  return suffixSlug(slug, suffix);
}

export async function saveDraftAction(
  _prev: SubmissionFormState,
  formData: FormData,
): Promise<SubmissionFormState> {
  const result = await persistDraft(formData);
  if (!result.ok) return result.state;
  revalidatePath("/dashboard");
  return {
    ok: true,
    message: "הטיוטה נשמרה",
    submissionId: result.submissionId,
    status: result.status,
  };
}

export async function submitForReviewAction(
  _prev: SubmissionFormState,
  formData: FormData,
): Promise<SubmissionFormState> {
  const result = await persistDraft(formData);
  if (!result.ok) return result.state;

  const user = await ensureDbUserFromClerk();
  if (!user) return { ok: false, message: "יש להתחבר מחדש" };

  const submission = await getSubmissionForUser(result.submissionId, user.id);
  if (!submission) return { ok: false, message: "טיוטה לא נמצאה" };

  const warnings: string[] = [];
  let prUrl: string | null = submission.prUrl;
  let prNumber: number | null = submission.prNumber;
  let branchName: string | null = submission.branchName;

  const githubCfg = getGithubConfig();
  if (githubCfg && !prUrl) {
    try {
      const matchedResearcher = await matchResearcherForUser(user.id);
      const today = new Date().toISOString().slice(0, 10);
      const tags = (submission.tagSlugs as string[]) ?? [];
      const authors = [user.displayName ?? user.email];
      const mdx = buildMdxFile(
        {
          title: submission.titleHe,
          slug: submission.slug,
          authors,
          researcherSlug: matchedResearcher,
          publishedAt: today,
          tags,
          excerpt: submission.excerpt ?? "",
          language: submission.language,
        },
        submission.bodyMarkdown,
      );
      const branch = `submissions/${submission.slug}-${submission.id.slice(0, 8)}`;
      const opened = await openSubmissionPr(githubCfg, {
        branchName: branch,
        filePath: `content/research/${submission.slug}.mdx`,
        fileContents: mdx,
        commitMessage: `feat(content): submit "${submission.titleHe}" for review`,
        prTitle: `Submission: ${submission.titleHe}`,
        prBody: [
          `הגשת מחקר חדשה ל-review.`,
          ``,
          `**Submitter:** ${user.displayName ?? user.email}`,
          `**Excerpt:** ${submission.excerpt ?? ""}`,
          ``,
          `Submission id: \`${submission.id}\``,
        ].join("\n"),
      });
      prUrl = opened.prUrl;
      prNumber = opened.prNumber;
      branchName = opened.branchName;
    } catch (err) {
      warnings.push(
        `יצירת PR בגיטהאב נכשלה: ${err instanceof Error ? err.message : "unknown error"}. ההגשה נשמרה ועדיין תיבדק.`,
      );
    }
  } else if (!githubCfg) {
    warnings.push("GitHub אינו מוגדר — ההגשה תיבדק ידנית ללא PR אוטומטי.");
  }

  const submittedAt = submission.submittedAt ?? new Date();
  await db
    .update(researchSubmissions)
    .set({
      status: "submitted",
      submittedAt,
      prUrl,
      prNumber,
      branchName,
      updatedAt: new Date(),
    })
    .where(eq(researchSubmissions.id, submission.id));

  if (!getEmailConfig()) {
    warnings.push("Resend אינו מוגדר — Content Lead לא יקבל אימייל אוטומטי.");
  } else {
    try {
      await notifyContentLead({
        submissionTitle: submission.titleHe,
        submissionExcerpt: submission.excerpt ?? "",
        submitterName: user.displayName ?? user.email,
        submitterEmail: user.email,
        prUrl,
        dashboardUrl: absoluteUrl("/dashboard"),
      });
    } catch (err) {
      warnings.push(
        `שליחת אימייל ל-Content Lead נכשלה: ${err instanceof Error ? err.message : "unknown error"}.`,
      );
    }
  }

  revalidatePath("/dashboard");
  redirect(`/dashboard?submitted=${submission.id}`);
}

async function matchResearcherForUser(userId: string): Promise<string | null> {
  const rows = await db
    .select({ slug: researchers.slug })
    .from(researchers)
    .where(eq(researchers.userId, userId))
    .limit(1);
  return rows[0]?.slug ?? null;
}

export async function deleteSubmissionAction(formData: FormData): Promise<void> {
  const user = await ensureDbUserFromClerk();
  if (!user) return;
  const id = formData.get("id")?.toString();
  if (!id) return;
  const submission = await getSubmissionForUser(id, user.id);
  if (!submission || submission.status !== "draft") return;
  await db.delete(researchSubmissions).where(eq(researchSubmissions.id, id));
  revalidatePath("/dashboard");
}
