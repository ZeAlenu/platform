import type { NextConfig } from "next";
import createMDX from "@next/mdx";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  pageExtensions: ["ts", "tsx", "md", "mdx"],
};

const withMDX = createMDX({
  options: {
    remarkPlugins: ["remark-gfm"],
    rehypePlugins: ["rehype-slug"],
  },
});

// Source-map upload only happens when SENTRY_AUTH_TOKEN is set in the build
// environment. Without it the wrapper falls back to a no-op build, so local
// dev / CI without Sentry credentials keeps building cleanly.
const sentryEnabled = Boolean(process.env.SENTRY_AUTH_TOKEN);

const wrapped = withMDX(nextConfig);

export default sentryEnabled
  ? withSentryConfig(wrapped, {
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
      authToken: process.env.SENTRY_AUTH_TOKEN,
      silent: !process.env.CI,
      widenClientFileUpload: true,
      disableLogger: true,
    })
  : wrapped;
