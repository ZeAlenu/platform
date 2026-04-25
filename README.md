# זה עלינו · ZeAlenu

פלטפורמה ציבורית למחקרי מדיניות ופעילות שטח של עמותת זה עלינו.

Public platform for policy research and field activity by the ZeAlenu non-profit. Hebrew-first, RTL by default, content-static-first.

## Stack

- **Framework**: Next.js (App Router) + TypeScript strict
- **Styling**: Tailwind CSS 4 with logical properties (`ps`/`pe`/`ms`/`me`) for RTL
- **Fonts**: Frank Ruhl Libre (serif) + Assistant (sans) via `next/font/google`
- **Tests**: Vitest + Testing Library
- **Hosting**: Vercel
- **CI**: GitHub Actions (lint, typecheck, test, build on every PR)

Phase 1 keeps research articles as MDX in-repo. Database (Neon Postgres + Drizzle) and auth (Clerk) land alongside the content pipeline in week 2.

## Local development

```bash
pnpm install
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

## Deployment

Pushing to `main` triggers a Vercel production deployment. Pull requests get preview deployments automatically.
