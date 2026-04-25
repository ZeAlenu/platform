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
