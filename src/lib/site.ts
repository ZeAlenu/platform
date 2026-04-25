/**
 * Single source of truth for canonical site URL + locale used by metadata,
 * sitemap, robots, and JSON-LD. Pulled from `NEXT_PUBLIC_SITE_URL` so preview
 * deploys (Vercel `VERCEL_URL`) can override the production default without a
 * code change.
 */

const RAW_SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ??
  "https://zealenu.org";

function trimTrailingSlash(url: string): string {
  return url.endsWith("/") ? url.slice(0, -1) : url;
}

export const SITE_URL = trimTrailingSlash(RAW_SITE_URL);

export const SITE_NAME = "זה עלינו";

export const SITE_LEGAL_NAME = "עמותת זה עלינו";

export const SITE_LOCALE = "he_IL";

export const SITE_LANG = "he";

export const SITE_DESCRIPTION =
  "פלטפורמה ציבורית למחקרי מדיניות ופעילות שטח של עמותת זה עלינו.";

export function absoluteUrl(pathname: string): string {
  if (/^https?:\/\//i.test(pathname)) return pathname;
  const path = pathname.startsWith("/") ? pathname : `/${pathname}`;
  return `${SITE_URL}${path}`;
}
