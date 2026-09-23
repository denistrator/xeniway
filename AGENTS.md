# Repository Guidelines

## Purpose

Xenia Way is a candidate-facing workspace for recording employer conversations, job applications, follow-ups, and outcomes. Each signed-in candidate owns a private application board. Preserve the six-status workflow (`saved`, `applied`, `interview`, `offer`, `rejected`, and `withdrawn`), authenticated ownership boundary, separate archive and blacklist semantics, and shared API contracts when changing the code.

The repository describes the candidate-tracking product and its local development environment. Document only capabilities that are present in the current source and shared contracts.

## Structure

- `apps/web` contains the React/Vite SPA, routes, Redux Toolkit UI state, TanStack Query hooks, API client, Tailwind styles, and reusable primitives.
- `apps/web/src/features/applications/application-workspace` contains the per-application workspace for preparation, contacts, follow-ups, and activity; it shares the application's authenticated lifecycle and ownership rules.
- `apps/api` contains the Bun/Elysia server, domain-grouped routers under `src/routes/`, authentication and CSRF services, repositories, Drizzle schema, migrations, and development seed command. `src/routes/index.ts` composes health, auth, preferences, and application routers; application routes are grouped into collection, item, events, and board operations.
- `packages/shared` contains Zod input schemas and public TypeScript response types consumed by both applications.
- `tests/e2e` contains Playwright browser workflows; package tests live beside source files as `*.test.ts`.
- `docs` contains human and AI-facing architecture, API, database, operations, testing, and schema-change documentation.
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
- `bun run check:public`, `bun run lint`, `bun run typecheck`, `bun run test`, `bun run build`, and `bun run test:e2e` for verification.

Static checks do not require local services. Database migration and seed commands require PostgreSQL. `bun run check` requires PostgreSQL, Redis, and Mailpit. The E2E workflow expects PostgreSQL and Redis to be running and PostgreSQL to be migrated and seeded; it starts the API and web servers itself and requires Playwright Chromium. Mailpit is not required by E2E.

The newcomer setup sequence and current command table live in `README.md`; keep them synchronized with the root `package.json`, `.env.example`, and `infra/docker-compose.yml`. Technical behavior belongs in the linked documents under `docs/` rather than in undocumented assumptions.

## Coding conventions

Use TypeScript with two-space indentation, double-quoted imports and strings, semicolons, and trailing commas consistent with the existing source. Use `camelCase` for values and functions, `PascalCase` for React components and types, and kebab-case for route/page filenames. Keep API JSON camelCase and wrapped in the documented `data` or `error` envelope, except for the direct `/api/health` response. Prefer the shared Zod schemas at all browser/API boundaries.

Run `bun run format` after source edits and `bun run lint` before committing. Biome owns formatting and lint rules for the supported TypeScript and TSX files.

Add API endpoints to the matching domain router and register domain routers through `apps/api/src/routes/index.ts`; keep `apps/api/src/app.ts` focused on service construction, global middleware, and error handling. Reuse typed guards from `routes/support/auth-guard.ts` for authenticated reads and authenticated mutations. Use the CSRF-only guard for public credential/password-reset flows and logout, which may operate without an authenticated user context. Keep the public health probe and CSRF-session bootstrap outside authenticated guards, and leave route-specific validation, repository operations, response schemas, and exceptional error handling visible in their endpoint handlers. Do not add generic CRUD route factories.

Keep server state in TanStack Query and local presentation state in Redux Toolkit. Keep database access behind typed repositories. Every application repository operation must be scoped by authenticated user ID. Mutating authenticated requests require the session CSRF token.

Application activity is application-specific: system history is immutable and written transactionally with meaningful application mutations, while owner-created events can be edited or deleted. Activity reads and writes must remain owner-scoped; permanent application deletion cascades to events. Use shared event schemas and render user-entered event text as plain text.

Internationalization is owned by i18next/react-i18next, not Redux. Supported locales are `en`, `ru`, `uk`, and `he`; English is the fallback, all non-English dictionaries are dynamically imported, and Hebrew uses right-to-left document direction. The server preference contract is `selectedLanguage`, `selectedTheme`, `selectedFormPresentation`, and `wasIntroduced`. The browser stores `language`, `theme`, `formPresentation`, and `wasIntroduced` in one flat object under the local-storage key `userPreferences`. Apply the browser cache immediately, let non-null server selections and server `wasIntroduced` win after login or registration, never upload browser values automatically, and synchronize only explicit user actions after updating local state first. Do not add preference hydration gates. Translate UI copy and stable API error codes, preserve canonical status values and user-entered content, update `html[lang]` and `html[dir]`, and format dates with the active locale.

Password recovery must preserve the normal generic response for unknown accounts and successfully delivered known-account requests, while documentation and tests must acknowledge that known-account storage or delivery failures currently return a distinguishable server error. Reset tokens are random, single-use, time-limited, stored only as hashes in PostgreSQL, and successful resets invalidate all sessions. Keep mail delivery behind the injectable mailer interface; production requires SMTP and cannot use the console fallback. Outside production, use Mailpit for local SMTP testing or, only when SMTP is intentionally absent, the console mailer that logs the complete reset URL and raw token. Treat console output as sensitive, and never add a test-only production endpoint for raw reset tokens.

For frontend work, prefer semantic controls over ARIA recreation, associate every form control with a label, provide `name` and appropriate `autocomplete`, keep icon-only actions labeled, use `:focus-visible`, maintain keyboard alternatives for drag-and-drop, and preserve accessible modal/drawer behavior. Use `…` for loading copy and announce asynchronous status changes with an appropriate live region.

## Testing expectations

Use Vitest for shared contracts, authentication, repository mapping, seed invariants, and API behavior. Use Playwright for complete browser workflows. New routes, validation rules, security behavior, ownership rules, archive transitions, user-visible workflows, and accessibility behavior require focused regression coverage where practical. Exercise keyboard navigation and responsive states for changed UI.

Keep development seed data deterministic and aligned with the current application and workspace schema. When fixture counts or content change, update seed invariant tests and the setup/database documentation.

Application workspace changes must preserve owner-scoped API access, archive/blacklist behavior, saved preparation/contact/follow-up data, keyboard navigation, and focus entry/return behavior. Update the API, database, and testing docs when those contracts or workflows change.

Locale changes require focused dictionary/selector tests and a browser test covering language switching, `html[lang]`, `html[dir]`, and reload persistence. Keep all four dictionaries structurally aligned with the English source dictionary.

Before claiming a change is complete, run the checks relevant to the change. For a full change, run:

```bash
bun run typecheck
bun run test
bun run build
bun run db:seed
bun run test:e2e
```

## Security and configuration

Never commit `.env`, passwords, session IDs, or generated test artifacts. Use `.env.example` as the configuration template. Passwords are hashed with Argon2id; session IDs are stored in HttpOnly, SameSite=Lax cookies that must be `Secure` in production; CSRF tokens are stored server-side and sent in `x-csrf-token`; Redis stores only hashed-key rate-limit counters for login, registration, and password reset and these flows fail closed when Redis is unavailable. Production requires explicit non-local PostgreSQL, Redis, HTTPS app-origin, SMTP, and sender configuration; `CORS_ORIGIN` defaults to the app origin and must also be HTTPS. Reset tokens remain random, hashed at rest, one-hour, single-use values, and successful resets invalidate all sessions. Do not weaken ownership checks, cookie settings, origin validation, CSRF, or rate limiting to make tests pass.

## Change boundaries

Do not add new product features, pages, or infrastructure outside the documented candidate-tracking scope without explicit approval. If a requested change conflicts with the API contract or requires a data-bearing database change outside the current schema-only policy, stop and ask for direction.

## Documentation

When changing product behavior, setup, commands, environment variables, API contracts, schema, security behavior, tests, or supported locales, update the relevant current documentation and README links in the same change. Keep current documentation grounded in source, shared contracts, checked-in configuration, and executable commands.

## Project backlog

Use `docs/backlog.md` to track any worthwhile task discovered during development that is outside the scope of the current task, including features, bugs, documentation, security, operations, and refactoring. Do not expand the current task to implement it: add a concise, evidence-based record describing the affected area, why the work may help, a possible direction, and relevant behavior or test guardrails. Check for an existing entry first and update it instead of duplicating it. Backlog entries are not authorization to implement future work. Remove or revise entries when they are completed or no longer relevant.
