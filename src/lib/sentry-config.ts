/**
 * Shared Sentry config helpers. The DSN, environment, and release are pulled
 * from env vars so that a deploy without Sentry credentials is a no-op rather
 * than a crash.
 */

export interface SentryRuntimeConfig {
  dsn: string;
  environment: string;
  release: string | undefined;
  tracesSampleRate: number;
}

export function readSentryConfig(): SentryRuntimeConfig | null {
  const dsn =
    process.env.NEXT_PUBLIC_SENTRY_DSN ?? process.env.SENTRY_DSN ?? "";
  if (!dsn) return null;

  const environment =
    process.env.SENTRY_ENVIRONMENT ??
    process.env.VERCEL_ENV ??
    process.env.NODE_ENV ??
    "production";

  const release =
    process.env.SENTRY_RELEASE ??
    process.env.VERCEL_GIT_COMMIT_SHA ??
    undefined;

  const rawSampleRate = process.env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE;
  const parsed = rawSampleRate ? Number(rawSampleRate) : NaN;
  const tracesSampleRate =
    Number.isFinite(parsed) && parsed >= 0 && parsed <= 1
      ? parsed
      : environment === "production"
        ? 0.1
        : 1.0;

  return { dsn, environment, release, tracesSampleRate };
}
