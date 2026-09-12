# Repository Guidelines

## Purpose

Xenia Way is a candidate-facing workspace for recording employer conversations, job applications, follow-ups, and outcomes. Each signed-in candidate owns a private application board. Preserve the six-status workflow (`saved`, `applied`, `interview`, `offer`, `rejected`, and `withdrawn`), authenticated ownership boundary, separate archive and blacklist semantics, and shared API contracts when changing the code.

The repository describes the candidate-tracking product and its local development environment. Do not present external authentication, deployment configuration, integrations, background jobs, or a migration from the previous application as current capabilities without explicit approval.

## Structure

- `apps/web` contains the React/Vite SPA, routes, Redux Toolkit UI state, TanStack Query hooks, API client, Tailwind styles, and reusable primitives.
- `apps/api` contains the Bun/Elysia server, authentication and CSRF services, repositories, Drizzle schema, migrations, and development seed command.
- `packages/shared` contains Zod input schemas and public TypeScript response types consumed by both applications.
- `tests/e2e` contains Playwright browser workflows; package tests live beside source files as `*.test.ts`.
- `docs` contains human and AI-facing architecture, API, database, operations, testing, and migration documentation.
- `infra/docker-compose.yml` defines the local PostgreSQL, Redis, and Mailpit services.

The web UI is an accessibility-sensitive product surface. Preserve semantic HTML, keyboard access, visible focus indicators, dialog focus management, accessible names, live announcements for async states, responsive touch targets, and reduced-motion behavior.

## Development commands

Run `bun install` after cloning, copy `.env.example` to `.env`, then use:

- `bun run db:up` and `bun run db:down` to manage local PostgreSQL.
- `bun run redis:up`, `bun run redis:down`, and `bun run redis:check` to manage and check local Redis.
- `bun run mailpit:up`, `bun run mailpit:down`, and `bun run mailpit:check` to manage and check the local SMTP test inbox.
- `bun run up`, `bun run check`, and `bun run down` to manage or check all local infrastructure services together.
- `bun run db:migrate` to apply migrations.
- `bun run db:seed` to create or refresh development fixtures.
- `bun run dev` to run the API and web app together.
- `bun run typecheck`, `bun run test`, `bun run build`, and `bun run test:e2e` for verification.

The E2E workflow expects PostgreSQL and Redis to be running, and PostgreSQL to be migrated and seeded. Install Chromium with `bunx playwright install chromium` when needed.

The newcomer setup sequence and current command table live in `README.md`; keep them synchronized with the root `package.json`, `.env.example`, and `infra/docker-compose.yml`. Technical behavior belongs in the linked documents under `docs/` rather than in undocumented assumptions.

## Coding conventions

Use TypeScript with two-space indentation, double-quoted imports and strings, semicolons, and trailing commas consistent with the existing source. Use `camelCase` for values and functions, `PascalCase` for React components and types, and kebab-case for route/page filenames. Keep API JSON camelCase and wrapped in the documented `data` or `error` envelope, except for the direct `/api/health` response. Prefer the shared Zod schemas at all browser/API boundaries.

Run `bun run format` after source edits and `bun run lint` before committing. Biome owns formatting and lint rules for the supported TypeScript and TSX files.

Keep server state in TanStack Query and local presentation state in Redux Toolkit. Keep database access behind typed repositories. Every application repository operation must be scoped by authenticated user ID. Mutating authenticated requests require the session CSRF token.

Internationalization is owned by i18next/react-i18next, not Redux. Supported locales are `en`, `ru`, and `uk`; English is the fallback and Russian/Ukrainian dictionaries are dynamically imported. Persist explicit browser choices only under `xeniway-language`; never add locale fields to API or database contracts. Translate UI copy and stable API error codes, preserve canonical status values and user-entered content, update `html[lang]`, and format dates with the active locale.

Password recovery must remain enumeration-safe: reset tokens are random, single-use, time-limited, stored only as hashes, and successful resets invalidate all sessions. Keep mail delivery behind the injectable mailer interface; use Mailpit for local SMTP testing, the console mailer only when SMTP is intentionally absent, and never add a test-only production endpoint for raw reset tokens.

For frontend work, prefer semantic controls over ARIA recreation, associate every form control with a label, provide `name` and appropriate `autocomplete`, keep icon-only actions labeled, use `:focus-visible`, maintain keyboard alternatives for drag-and-drop, and preserve accessible modal/drawer behavior. Use `…` for loading copy and announce asynchronous status changes with an appropriate live region.

## Testing expectations

Use Vitest for shared contracts, authentication, repository mapping, seed invariants, and API behavior. Use Playwright for complete browser workflows. New routes, validation rules, security behavior, ownership rules, archive transitions, user-visible workflows, and accessibility behavior require focused regression coverage where practical. Exercise keyboard navigation and responsive states for changed UI.

Locale changes require focused dictionary/selector tests and a browser test covering language switching, `html[lang]`, and reload persistence. Keep all three dictionaries structurally aligned with the English source dictionary.

Before claiming a change is complete, run the checks relevant to the change. For a full change, run:

```bash
bun run typecheck
bun run test
bun run build
bun run db:seed
bun run test:e2e
```

## Security and configuration

Never commit `.env`, passwords, session IDs, or generated test artifacts. Use `.env.example` as the configuration template. Passwords are hashed with Argon2id; session IDs are stored in HttpOnly cookies; CSRF tokens are stored server-side and sent in `x-csrf-token`; Redis stores only hashed-key rate-limit counters for login, registration, and password reset. Do not weaken ownership checks, cookie settings, or fail-closed rate limiting to make tests pass.

## Change boundaries

Do not add new product features, pages, integrations, external authentication, caching, object storage, or deployment systems without explicit approval. If a requested change conflicts with the API contract or requires data migration outside the current empty-migration policy, stop and ask for direction.

## Documentation

When changing product behavior, setup, commands, environment variables, API contracts, schema, security behavior, tests, or supported locales, update the relevant current documentation and README links in the same change. Treat `docs/superpowers/plans/` and `docs/superpowers/specs/` as historical implementation records; preserve them unless they contain a claim that would actively mislead contributors outside its historical context.
