import Script from "next/script";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";

/**
 * Vercel Analytics + Speed Insights are no-ops when not running on Vercel,
 * so they are safe to include unconditionally. Plausible is opt-in via env
 * vars so the script tag is omitted in environments without it (local dev,
 * preview deploys without analytics, etc.).
 *
 * `NEXT_PUBLIC_PLAUSIBLE_DOMAIN` is the registered domain in Plausible (e.g.
 * `zealenu.org.il`). `NEXT_PUBLIC_PLAUSIBLE_SCRIPT_SRC` lets us point at a
 * self-hosted Plausible Community Edition instance; defaults to the hosted
 * `plausible.io` script when unset.
 */
export function SiteAnalytics() {
  const plausibleDomain = process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN;
  const plausibleScriptSrc =
    process.env.NEXT_PUBLIC_PLAUSIBLE_SCRIPT_SRC ??
    "https://plausible.io/js/script.js";

  return (
    <>
      <Analytics />
      <SpeedInsights />
      {plausibleDomain ? (
        <Script
          id="plausible-analytics"
          src={plausibleScriptSrc}
          data-domain={plausibleDomain}
          strategy="afterInteractive"
          defer
        />
      ) : null}
    </>
  );
}
