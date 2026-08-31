# Repository Guidelines

## Project Structure & Module Organization

This is a Bun workspace monorepo:

- `apps/web` contains the React/Vite UI, routes, Redux store, TanStack Query integration, Tailwind styles, and reusable UI primitives.
- `apps/api` contains the Bun/Elysia server, Zod validation, Drizzle schema/repository code, and database migrations in `apps/api/drizzle`.
- `packages/shared` contains types and Zod schemas shared by the frontend and API.
- `tests/e2e` contains Playwright browser tests; package-level tests live beside source files as `*.test.ts`.
- `infra/docker-compose.yml` defines the local PostgreSQL service. Keep secrets in `.env`, using `.env.example` as the template.

## Build, Test, and Development Commands

Run `bun install` after cloning. Common workflows:

- `bun run db:up` / `bun run db:down` — start or stop local PostgreSQL.
- `bun run db:migrate` — apply Drizzle SQL migrations.
- `bun run dev` — run the API and Vite frontend together.
- `bun run typecheck` — typecheck shared, API, and web workspaces.
- `bun run test` — run Vitest tests for shared contracts and the API.
- `bun run test:e2e` — run the Chromium Playwright smoke test.
- `bun run build` — build the web bundle and typecheck the API.

For local E2E runs, start PostgreSQL, migrate it, and install Chromium with `bunx playwright install chromium` first.

## Coding Style & Naming Conventions

Use TypeScript with two-space indentation, double-quoted imports/strings, semicolons, and trailing commas consistent with existing files. Use `camelCase` for variables/functions, `PascalCase` for React components and types, and kebab-case for route/page filenames (for example, `home-page.tsx`). No lint or formatter script is currently configured; preserve the surrounding style when editing.

## Testing Guidelines

Use Vitest for unit and API behavior tests, with descriptive behavior-oriented test names such as `rejects invalid messages`. Use Playwright for user-flow or cross-layer changes. There is no configured coverage threshold; every new route, schema rule, or user-visible flow should include focused regression coverage.

## Commit & Pull Request Guidelines

Recent commits use short, lowercase summaries (for example, `init project skeleton`); keep commits concise and focused. Pull requests should explain the change, mention validation commands run, call out schema/migration or environment changes, and include screenshots for UI changes. Ensure CI-equivalent checks pass: typecheck, Vitest, build, and Playwright.

## Security & Configuration Tips

Never commit `.env` or credentials. Use the local PostgreSQL values documented in `README.md` and update `.env.example` when introducing a required configuration variable.
