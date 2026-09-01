# Repository Guidelines

## Purpose

Job Tracker is a candidate-facing application for recording employer conversations and application progress. Preserve the six-status workflow, authenticated ownership boundary, archive semantics, and shared API contracts when changing the code.

## Structure

- `apps/web` contains the React/Vite SPA, routes, Redux Toolkit UI state, TanStack Query hooks, API client, Tailwind styles, and reusable primitives.
- `apps/api` contains the Bun/Elysia server, authentication and CSRF services, repositories, Drizzle schema, migrations, and development seed command.
- `packages/shared` contains Zod input schemas and public TypeScript response types consumed by both applications.
- `tests/e2e` contains Playwright browser workflows; package tests live beside source files as `*.test.ts`.
- `docs` contains human and AI-facing architecture, API, database, operations, testing, and migration documentation.
- `infra/docker-compose.yml` defines the local PostgreSQL service.

## Development commands

Run `bun install` after cloning, copy `.env.example` to `.env`, then use:

- `bun run db:up` and `bun run db:down` to manage local PostgreSQL.
- `bun run db:migrate` to apply migrations.
- `bun run db:seed` to create or refresh development fixtures.
- `bun run dev` to run the API and web app together.
- `bun run typecheck`, `bun run test`, `bun run build`, and `bun run test:e2e` for verification.

The E2E workflow expects PostgreSQL to be migrated and seeded. Install Chromium with `bunx playwright install chromium` when needed.

## Coding conventions

Use TypeScript with two-space indentation, double-quoted imports and strings, semicolons, and trailing commas consistent with the existing source. Use `camelCase` for values and functions, `PascalCase` for React components and types, and kebab-case for route/page filenames. Keep API JSON camelCase and wrapped in the documented `data` or `error` envelope. Prefer the shared Zod schemas at all browser/API boundaries.

Run `bun run format` after source edits and `bun run lint` before committing. Biome owns formatting and lint rules for the supported TypeScript and TSX files.

Keep server state in TanStack Query and local presentation state in Redux Toolkit. Keep database access behind typed repositories. Every application repository operation must be scoped by authenticated user ID. Mutating authenticated requests require the session CSRF token.

## Testing expectations

Use Vitest for shared contracts, authentication, repository mapping, seed invariants, and API behavior. Use Playwright for complete browser workflows. New routes, validation rules, security behavior, ownership rules, archive transitions, and user-visible workflows require focused regression coverage.

Before claiming a change is complete, run the checks relevant to the change. For a full change, run:

```bash
bun run typecheck
bun run test
bun run build
bun run db:seed
bun run test:e2e
```

## Security and configuration

Never commit `.env`, passwords, session IDs, or generated test artifacts. Use `.env.example` as the configuration template. Passwords are hashed with Argon2id; session IDs are stored in HttpOnly cookies; CSRF tokens are stored server-side and sent in `x-csrf-token`. Do not weaken ownership checks or cookie settings to make tests pass.

## Change boundaries

Do not add new product features, pages, integrations, external authentication, caching, object storage, or deployment systems without explicit approval. If a requested change conflicts with the API contract or requires data migration outside the current empty-migration policy, stop and ask for direction.
