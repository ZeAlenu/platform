import * as Sentry from "@sentry/nextjs";

import { readSentryConfig } from "@/lib/sentry-config";

export async function register() {
  const config = readSentryConfig();
  if (!config) return;

  if (process.env.NEXT_RUNTIME === "nodejs") {
    Sentry.init({
      dsn: config.dsn,
      environment: config.environment,
      release: config.release,
      tracesSampleRate: config.tracesSampleRate,
    });
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    Sentry.init({
      dsn: config.dsn,
      environment: config.environment,
      release: config.release,
      tracesSampleRate: config.tracesSampleRate,
    });
  }
}

export const onRequestError = Sentry.captureRequestError;
