# Testing and CI

## Test layers

- `packages/shared/src/index.test.ts` verifies shared schemas and public contract assumptions.
- `apps/api/src/*.test.ts` covers authentication, expiration, CSRF, password-reset token lifecycle, mailer/service behavior, row mapping, seed invariants, validation, CRUD, status filtering, archive and blacklist transitions, error status codes, and ownership isolation using focused in-memory dependencies.
- `apps/web/src/lib/api.test.ts` covers client error parsing, query-key separation, and CSRF headers on password-reset mutations.
- `apps/web/src/i18n/i18n.test.ts`, `format.test.ts`, and `components/language-selector.test.tsx` cover locale resolution, lazy resource selection, browser persistence, date formatting, compact labels, and accessible language names.
- `apps/web/src/components/job/job-status.test.ts` protects the shared six-status display order and translated labels used by the board, filters, and form.
- `apps/web/src/pages/password-reset-page.test.tsx` verifies a user-visible validation message after switching locale.
- `tests/e2e/xeniway.spec.ts` covers language switching and reload persistence, public password recovery navigation and validation, then logs in with development seed credentials and exercises the board, six statuses, search, create, blacklist with reason, blacklist restore, native drag-and-drop, archive, and permanent deletion.

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

The root `test` command runs all Vitest workspaces. E2E requires Docker, running PostgreSQL and Redis, a migrated and seeded database, the API and web servers, and a Playwright Chromium installation because it uses the real API and database. The checked-in `.github/workflows/ci.yml` workflow runs the same verification sequence on pushes and pull requests using PostgreSQL and Redis service containers.

## Test design rules

Add focused tests when changing a shared schema, API route, repository rule, authentication behavior, ownership boundary, archive transition, visible workflow, or accessibility behavior. Keep migrations data-empty and test seed idempotency separately. Use stable accessible labels and roles in browser tests. For UI changes, verify keyboard access, focus behavior, live announcements, mobile layout, theme behavior, and reduced-motion behavior as applicable.

The suite has no coverage threshold. Quality is enforced through type safety, focused behavior tests, a real database-backed browser flow, and the complete CI command sequence.
