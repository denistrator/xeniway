# Testing and CI

## Test layers

- `packages/shared/src/index.test.ts` verifies shared schemas and public contract assumptions.
- `apps/api/src/*.test.ts` covers authentication, expiration, CSRF, row mapping, seed invariants, validation, CRUD, status filtering, archive transitions, error status codes, and ownership isolation using focused in-memory dependencies.
- `apps/web/src/lib/api.test.ts` covers client error parsing and query-key separation.
- `tests/e2e/job-tracker.spec.ts` logs in with development seed credentials and exercises the board, six statuses, search, create, native drag-and-drop, archive, and permanent deletion.

## Commands

```bash
bun run lint
bun run typecheck
bun run test
bun run build
bun run db:up
bun run db:migrate
bun run db:seed
bun run test:e2e
```

The root `test` command runs all Vitest workspaces. E2E requires a migrated and seeded PostgreSQL instance because it uses the real API and database.

## Test design rules

Add focused tests when changing a shared schema, API route, repository rule, authentication behavior, ownership boundary, archive transition, or visible workflow. Keep migrations data-empty and test seed idempotency separately. Use stable accessible labels and roles in browser tests.

The suite has no coverage threshold. Quality is enforced through type safety, focused behavior tests, a real database-backed browser flow, and the complete CI command sequence.
