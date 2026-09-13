# Contributing to Xenia Way

Thank you for helping improve Xenia Way. Contributions should keep the project candidate-focused, local-first, and safe for each authenticated candidate's private application data.

## Before you start

Please check existing issues and pull requests before opening a new one. For a larger change, open an issue first so the scope and approach can be agreed on. Keep changes focused and do not add product features, external integrations, deployment systems, or data migrations without explicit maintainer approval.

## Runtime requirements and local setup

Xenia Way uses Bun 1.4.0, Docker with the Docker Compose plugin, and a browser. Chromium is also required for browser tests. The Bun version and the PostgreSQL and Redis image versions are pinned identically in CI and local development. From the repository root:

```bash
cp .env.example .env
bun install
bun run up
bun run db:migrate
bun run db:seed
bun run dev
```

The seed accounts and Mailpit inbox are for local development only. Never use the seed credentials against a hosted or production system, and never commit `.env`, credentials, session IDs, personal data, or generated test artifacts.

## Checks

Before opening a pull request, run the checks relevant to your change. For a full change, run:

```bash
bun run check:public
bun run format:check
bun run lint
bun run typecheck
bun run test
bun run build
bun run up
bun run db:migrate
bun run db:seed
bun run test:e2e
git diff --check
```

The public-content check is the first publication gate. Formatting, lint, typecheck, unit tests, and build are fast checks that do not need services. Migration, seed, and end-to-end checks run only after the fast checks pass; they require PostgreSQL and Redis to be running, migrations to be applied, development fixtures to be seeded, and Playwright Chromium to be installed. Use `bunx playwright install chromium` when needed. CI masks service URLs before use and supplies them only to the migration, seed, and browser-test steps that need them. On failure, project checks show the check name, exit status, and a bounded diagnostic tail with sensitive environment values, connection URLs, reset links, cookies, authorization values, email addresses, and password-reset mail content redacted. Rerun the named command locally when the sanitized tail is insufficient.

## Tests and migrations

Place unit and integration tests beside the source they cover using the `*.test.ts` or `*.test.tsx` convention. Put complete browser workflows in `tests/e2e` and use accessible roles, names, keyboard paths, and responsive checks for changed UI behavior.

Database migrations belong in `apps/api/drizzle` as checked-in, incremental SQL files. Keep migrations data-empty: fixture creation belongs in the development seed command and must be covered by seed invariants. Every repository operation involving application data must remain scoped to the authenticated user ID.

## Pull requests

Use the pull request template and describe the user or maintainer need, the exact scope, and any behavior that intentionally remains unchanged. Each pull request must state:

- what tests and checks were run;
- whether a database migration is included and why;
- whether documentation was added or updated;
- whether there is any security or privacy impact; and
- whether authentication, CSRF, ownership, rate limiting, password recovery, or personal-data boundaries were affected.

Keep API JSON camelCase and preserve the documented `data`/`error` envelopes. Preserve the six application statuses (`saved`, `applied`, `interview`, `offer`, `rejected`, and `withdrawn`), with archive and blacklist remaining separate concepts.

## Security and conduct

Do not disclose vulnerabilities, secrets, session IDs, or personal data in public issues or pull requests. Follow [SECURITY.md](SECURITY.md) for private vulnerability reporting and [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) for community expectations.
