# זה עלינו · ZeAlenu

פלטפורמה ציבורית למחקרי מדיניות ופעילות שטח של עמותת זה עלינו.

Public platform for policy research and field activity by the ZeAlenu non-profit. Hebrew-first, RTL by default, content-static-first.

## Stack

- **Framework**: Next.js (App Router) + TypeScript strict
- **Styling**: Tailwind CSS 4 with logical properties (`ps`/`pe`/`ms`/`me`) for RTL
- **Fonts**: Frank Ruhl Libre (serif) + Assistant (sans) via `next/font/google`
- **Database**: Neon Postgres (serverless, scale-to-zero) + Drizzle ORM
- **Auth**: Clerk (Hebrew localization via `@clerk/localizations`)
- **Tests**: Vitest + Testing Library
- **Hosting**: Vercel
- **CI**: GitHub Actions (lint, typecheck, test, build on every PR)

Phase 1 keeps research articles as MDX in-repo. The DB indexes them for search and stores user/researcher/tag metadata.

## Local development

```bash
pnpm install
cp .env.example .env.local   # fill in Neon + Clerk credentials
pnpm db:migrate              # apply Drizzle migrations against DATABASE_URL
pnpm dev
```

Open <http://localhost:3000>.

## Scripts

| Command | What it does |
| --- | --- |
| `pnpm dev` | Next.js dev server (Turbopack) |
| `pnpm build` | Production build |
| `pnpm lint` | ESLint (Next + TS rules) |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm test` | Vitest run |
| `pnpm db:generate` | Generate a new Drizzle SQL migration from `src/db/schema.ts` |
| `pnpm db:migrate` | Apply pending migrations to `DATABASE_URL` |
| `pnpm db:push` | Push schema directly (dev only — bypasses migration files) |
| `pnpm db:studio` | Drizzle Studio UI |

## Database — Neon + Drizzle

Schema lives in [`src/db/schema.ts`](src/db/schema.ts). Tables: `users`, `researchers`, `tags`, `research_papers`, `research_authors`, `research_tags`. Research papers carry a `search_tsv` `tsvector` generated column with a GIN index for Postgres FTS (Hebrew uses the `simple` config — see plan doc for the trade-off).

Migrations live under [`drizzle/`](drizzle/). To change the schema:

1. Edit `src/db/schema.ts`.
2. `pnpm db:generate` — drizzle-kit writes a new SQL migration.
3. Review the SQL diff in PR.
4. `pnpm db:migrate` — applies on local; CI/Vercel runs it as part of deploy.

### Neon database branching for previews

Hook the [Neon ⇄ Vercel integration](https://neon.tech/docs/guides/vercel) on the Vercel project. Each preview deployment gets a fresh Neon branch with the `DATABASE_URL` injected automatically; previews never touch production data.

## Auth — Clerk

- Auth gating runs in [`proxy.ts`](proxy.ts) (Next 16 renames `middleware.ts` → `proxy.ts`).
- `ClerkProvider` is wired in [`src/app/layout.tsx`](src/app/layout.tsx) with `heIL` localization.
- Sign-in and sign-up live at `/sign-in` and `/sign-up`.
- Clerk → DB sync runs through the webhook at [`src/app/api/clerk/webhook/route.ts`](src/app/api/clerk/webhook/route.ts). Point the Clerk dashboard endpoint at `https://<host>/api/clerk/webhook` and copy the signing secret into `CLERK_WEBHOOK_SIGNING_SECRET`.

### Exit path: Clerk → Auth.js

Clerk is intentionally swappable. If pricing or product fit changes:

1. `pnpm add next-auth @auth/drizzle-adapter` and remove `@clerk/nextjs` + `@clerk/localizations`.
2. Replace `proxy.ts` with Auth.js's `auth()` middleware (same matcher).
3. Replace `src/lib/auth.ts` callers with Auth.js `getServerSession()`. Keep the `users` table — Clerk only owns `clerk_user_id`, so add an `auth_provider_id` column and backfill from the existing column.
4. Drop the `/api/clerk/webhook` route. Auth.js writes through the Drizzle adapter; the webhook is no longer needed.
5. Delete `ClerkProvider` from `layout.tsx`; replace `<SignIn>`/`<SignUp>` UI with Auth.js sign-in pages.

Estimated effort: one engineer-week.

## Deployment

Pushing to `main` triggers a Vercel production deployment. Pull requests get preview deployments automatically. Production env vars (Neon URL, Clerk keys, webhook secret) live in the Vercel project settings.

## Production cutover (one-time)

1. **Domain.** CEO purchases `zealenu.org.il` (primary) and `zealenu.org` (backup). In Vercel → Project → Settings → Domains, add both.
2. **DNS.** Point `zealenu.org.il` at Vercel (`A 76.76.21.21` for the apex, `CNAME cname.vercel-dns.com` for `www`). Configure `zealenu.org` as a 308 redirect to `zealenu.org.il` from Vercel's domain settings.
3. **SSL.** Vercel issues a Let's Encrypt certificate automatically once DNS verifies; no manual step.
4. **Site URL env var.** Set `NEXT_PUBLIC_SITE_URL=https://zealenu.org.il` in Vercel production env. Sitemap, robots, OG tags, and `hreflang` all key off this.
5. **Analytics.** Vercel Analytics + Speed Insights are wired in `src/components/site-analytics.tsx` and start reporting automatically once the site is on Vercel — no additional env var. For Plausible, set `NEXT_PUBLIC_PLAUSIBLE_DOMAIN` to the domain registered in Plausible (and `NEXT_PUBLIC_PLAUSIBLE_SCRIPT_SRC` if self-hosting Community Edition).
6. **Sentry.** In the Sentry project settings, copy the DSN into `NEXT_PUBLIC_SENTRY_DSN`. Create a build-only auth token (Settings → Auth Tokens, scopes: `project:releases`, `project:write`, `org:read`) and set `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT` in Vercel build env. Source maps upload on every production build via `withSentryConfig`.
7. **Smoke tests.** After the first production deploy, run `pnpm smoke` to verify home → catalog → article → researcher → sitemap → robots all return 200 with the expected RTL/Hebrew markers. Override the target with `SMOKE_BASE_URL=https://preview-url.vercel.app pnpm smoke` for previews.

## Researcher submissions — content-lead workflow

Submissions from `/submit` always persist to the `research_submissions` table (separate from published `research_papers`). GitHub PR automation and Resend notifications are layered on top and degrade independently — the cutover ships safely without either.

**With Tier 2 creds (preferred):**

1. Researcher submits via `/submit`; the form action calls `submitForReviewAction`.
2. If `getGithubConfig()` resolves (GitHub App or `GITHUB_TOKEN` + `GITHUB_OWNER`/`GITHUB_REPO`), a branch + PR open against `main` with the MDX rendered from the submission. The PR url is stored on the submission row.
3. If `getEmailConfig()` resolves (Resend `RESEND_API_KEY` + `CONTENT_LEAD_EMAIL` + `EMAIL_FROM`), the content lead receives an email with the PR link and submitter info.
4. Content lead reviews the PR, edits the MDX as needed, and merges. The article appears under `/research/<slug>` once the new commit deploys.

**Without Tier 2 creds (manual fallback — default until creds land):**

1. Researcher submits via `/submit`; the submission still persists.
2. The UI surfaces explicit warnings noting that GitHub PR / email notification did not run.
3. Content lead reviews submissions directly:
   - via Drizzle Studio (`pnpm db:studio`) — query `research_submissions` filtered to `status = 'submitted'`, OR
   - via a future internal admin route (out-of-scope for v1).
4. To publish, the content lead creates the MDX manually under `content/research/<slug>.mdx`, mirroring the structure of existing files (`content/research/welcome.mdx` is a good template). They commit on a feature branch, open a PR, and merge — same end state as the automated flow.
5. After publish, update the submission row's `status` to `published` (Drizzle Studio) so the researcher dashboard reflects it.

**Switching from manual to automated mid-flight:** the moment `GITHUB_TOKEN`/`RESEND_API_KEY` land in Vercel env, new submissions auto-PR and email — no code change. Submissions made under the manual path stay in DB; the content lead handles them as before.
