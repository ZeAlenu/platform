/**
 * Production smoke tests. Hits the published critical paths and asserts that
 * each returns 200 + the expected RTL/Hebrew markers. Run after a production
 * deploy:
 *
 *   pnpm tsx scripts/smoke.ts                # uses default https://zealenu.org.il
 *   SMOKE_BASE_URL=https://preview.url pnpm tsx scripts/smoke.ts
 *
 * Exits non-zero on any failure so it can plug into a CI step or post-deploy
 * webhook later.
 */

interface SmokeCheck {
  name: string;
  path: string;
  expect: RegExp[];
}

const BASE_URL = (
  process.env.SMOKE_BASE_URL ?? "https://zealenu.org.il"
).replace(/\/$/, "");

const CHECKS: SmokeCheck[] = [
  {
    name: "home",
    path: "/",
    expect: [/lang="he"/, /dir="rtl"/, /זה עלינו/],
  },
  {
    name: "catalog",
    path: "/research",
    expect: [/dir="rtl"/, /lang="he"/],
  },
  {
    name: "article",
    path: "/research/welcome",
    expect: [/dir="rtl"/, /article|main/i],
  },
  {
    name: "researcher",
    path: "/researchers/editorial",
    expect: [/dir="rtl"/, /lang="he"/],
  },
  {
    name: "sitemap",
    path: "/sitemap.xml",
    expect: [/<urlset|<sitemapindex/],
  },
  {
    name: "robots",
    path: "/robots.txt",
    expect: [/User-Agent|User-agent/i],
  },
];

interface CheckResult {
  name: string;
  url: string;
  ok: boolean;
  status: number;
  durationMs: number;
  failures: string[];
}

async function runCheck(check: SmokeCheck): Promise<CheckResult> {
  const url = `${BASE_URL}${check.path}`;
  const start = Date.now();
  const failures: string[] = [];
  let status = 0;
  try {
    const res = await fetch(url, {
      headers: { "user-agent": "zealenu-smoke/1.0" },
      redirect: "follow",
    });
    status = res.status;
    const body = await res.text();
    if (!res.ok) {
      failures.push(`status ${res.status}`);
    }
    for (const pattern of check.expect) {
      if (!pattern.test(body)) {
        failures.push(`missing pattern ${pattern}`);
      }
    }
  } catch (err) {
    failures.push(`fetch error: ${(err as Error).message}`);
  }
  return {
    name: check.name,
    url,
    ok: failures.length === 0,
    status,
    durationMs: Date.now() - start,
    failures,
  };
}

async function main() {
  console.log(`Running smoke checks against ${BASE_URL}`);
  const results = await Promise.all(CHECKS.map(runCheck));
  for (const r of results) {
    const tag = r.ok ? "PASS" : "FAIL";
    console.log(
      `${tag} ${r.name.padEnd(10)} ${r.status} ${r.durationMs}ms ${r.url}`,
    );
    for (const f of r.failures) console.log(`     - ${f}`);
  }
  const failed = results.filter((r) => !r.ok);
  if (failed.length > 0) {
    console.error(`\n${failed.length} smoke check(s) failed`);
    process.exit(1);
  }
  console.log(`\nAll ${results.length} smoke checks passed`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
