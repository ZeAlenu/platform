import * as Sentry from "@sentry/nextjs";

import { readSentryConfig } from "@/lib/sentry-config";

const config = readSentryConfig();
if (config) {
  Sentry.init({
    dsn: config.dsn,
    environment: config.environment,
    release: config.release,
    tracesSampleRate: config.tracesSampleRate,
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0,
  });
}

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
