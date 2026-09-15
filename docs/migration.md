# Database Change Policy

This page defines how the current PostgreSQL schema changes. It is not an application-data import guide.

## Checked-in schema changes

Incremental SQL files live in `apps/api/drizzle` and are applied by:

```bash
bun run db:up
bun run db:migrate
```

The runner contains a manually ordered registry whose entries pair a migration ID with a SQL filename. Before the normal registry loop, a compatibility branch checks for an existing `users` table or a predecessor initial-migration marker. If either exists, it inserts the current ID `0000_create_xeniway` into `schema_migrations` with conflict handling. The loop then sees that ID as registered and skips the current initial SQL file; this means the initial ID can be recorded without this runner executing `0000_create_xeniway.sql`.

For every other unregistered entry, the runner iterates the registry in source order, executes the paired SQL file in a transaction, and records the migration ID only after the SQL succeeds. Rerunning the command skips registered IDs. IDs and filenames currently share numbered stems, but `schema_migrations` stores IDs rather than filenames. Schema files and registry entries are forward-only after they are shared; append a new ID/file pair for a correction instead of editing an applied entry.

Keep schema changes data-empty. Do not insert accounts, application records, preference values, or test fixtures from a schema file. Development fixtures belong exclusively to `bun run db:seed`, which is guarded for local development and can be rerun independently.

## Current contract boundaries

- `job_status` has exactly six values: `saved`, `applied`, `interview`, `offer`, `rejected`, and `withdrawn`.
- Archive and blacklist are independent columns and query paths outside the status workflow.
- Every application row has an owning `user_id`, and application repository operations must include the authenticated owner.
- Every activity row has an owning `user_id` and a cascading application foreign key. Manual event mutations are owner-scoped; system events are written transactionally with application mutations.
- `user_preferences` stores `selected_language`, `selected_theme`, `selected_form_presentation`, and `was_introduced`; selected values are nullable until the user explicitly chooses them.
- Password-reset rows store only token hashes and their expiry/use state.

Any proposed data-bearing change or incompatible shared/API contract change requires explicit maintainer direction before implementation. Update [Database](database.md), [API reference](api.md), tests, and development seed invariants with every accepted schema change.

## Verification

With local PostgreSQL running and `.env` configured:

```bash
bun run db:migrate
bun run db:seed
bun run typecheck
bun run test
```

Run `bun run test:e2e` as well when the change affects a user-visible or API workflow; it additionally requires Redis, development fixtures, and Playwright Chromium.
