# Database

## PostgreSQL

Local development uses PostgreSQL 16 from `infra/docker-compose.yml`:

- database: `xeniway`
- user: `xeniway`
- password: `xeniway`
- port: `5432`

Configure the connection through `DATABASE_URL`; do not commit `.env`.

## Tables

### `users`

Stores normalized unique email addresses, Argon2id password hashes, optional first/last names, and creation time. Password hashes are never returned by the API.

### `sessions`

Stores the random session ID, optional owning user ID, server-side CSRF token, and expiration time. Anonymous rows support CSRF acquisition before login. User deletion cascades to sessions.

### `user_preferences`

Stores account-scoped onboarding and selected UI preferences. `user_id` is the primary key and cascades from `users`. `was_introduced` defaults to `false`; `selected_language` is nullable and constrained to `en`, `ru`, `uk`, or `he`; `selected_theme` is nullable and constrained to `light`, `dark`, or `system`; and `selected_form_presentation` is nullable and constrained to `drawer` or `modal`. Timestamps record row creation and updates. Null selected values mean that the account has no explicit selection for that setting; authentication does not copy browser defaults into these columns.

### `password_reset_tokens`

Stores a user foreign key, unique SHA-256 token hash, expiry, nullable one-time-use timestamp, and creation time. PostgreSQL never stores the raw URL token. User deletion cascades to reset tokens; indexes support user cleanup and token lookup. Delivery and response behavior belong to [API authentication](api.md#health-and-authentication).

### `job_applications`

Stores the owning user, company, position, optional job details, one of the six PostgreSQL `job_status` enum values, timestamps, nullable `archived_at`, and independent blacklist state in `blacklisted_at` plus an optional `blacklist_reason`. User deletion cascades to applications. Active and archive queries exclude blacklisted rows; the blacklist page uses the user/blacklist index.

`seed_key` is nullable and unique. It is used only by the development seed command to make fixture replacement idempotent; normal application-created rows leave it null.

### `application_events`

Stores one application's system history and user-entered activity. Each row has an explicit `user_id` ownership scope and cascading foreign keys to `users` and `job_applications`. `type`, nonempty `title`, nullable plain-text `description`, timezone-aware `occurred_at`, audit timestamps, constrained JSONB status-change `metadata`, and `is_system` distinguish immutable system history from editable manual events. The `(application_id, occurred_at DESC, id DESC)` index supports stable timeline order; `(user_id, occurred_at DESC)` supports owner-scoped reads. Deleting an application removes its events through the foreign key cascade.

The migration is schema-only: it does not backfill event rows. The detail API derives a read-only creation marker from `job_applications.created_at` for pre-existing records, without claiming to reconstruct their earlier edits or transitions.

### Application workspace tables

`application_workspaces` stores one optional preparation record per application: company research, talking points, and interviewer questions. Its application ID is the primary key; both application and user foreign keys cascade on deletion.

`application_contacts` stores a candidate's people associated with an application, including name, role, optional email, phone, HTTP(S) profile URL, and notes. `application_follow_up_tasks` stores a required title and due date, optional notes, and nullable completion time. Both tables include explicit `user_id` ownership, cascading application/user foreign keys, timestamps, and indexes for ordered application reads and owner-scoped access. Deleting an application cascades to its workspace, contacts, and follow-ups. Repository operations also scope by authenticated user ID; the explicit owner columns do not replace those checks.

## Migrations

Checked-in SQL lives in [apps/api/drizzle](../apps/api/drizzle). With local PostgreSQL running and `.env` configured, `bun run db:migrate` applies it without creating fixtures.

The [migration runner](../apps/api/src/db/migrate.ts) contains a manually ordered registry pairing each migration ID with a SQL filename. For each unregistered entry, it executes the SQL and records the ID in `schema_migrations` within one transaction. Rerunning the command skips recorded IDs; the table stores IDs, not filenames.

Before the registry loop, a compatibility branch checks for an existing `users` table or a predecessor initial-migration marker. If either exists, it records `0000_create_xeniway` without executing the current initial SQL. This supports the existing initial schema; it is not a general schema-repair or application-data import mechanism.

### Change policy

After a migration is shared, its SQL and registry entry are forward-only: append a new ID/file pair for corrections instead of editing an applied entry. Keep migrations schema-only. Accounts, application records, preference values, and fixtures belong to the guarded development seed command, not migration SQL.

Preserve the [table constraints](#tables), [public API contracts](api.md), and [ownership/security guardrails](../AGENTS.md#security-and-configuration). Do not merge archive/blacklist into statuses, weaken owner scoping or cascades, backfill application history, or copy browser defaults into nullable account preferences. Data-bearing changes or incompatible shared/API contract changes require explicit maintainer direction before implementation.

For an accepted schema change, update this document, the API reference, focused tests, and development seed invariants together.

### Migration verification

On a disposable local development database, run:

```bash
bun run db:migrate
bun run db:seed
bun run typecheck
bun run test
```

Seeding replaces fixtures; see [Development seed](#development-seed). For user-visible/API changes, also run the relevant [browser suites](testing.md#commands), which require Redis and Chromium in addition to PostgreSQL.

## Development seed

Run `bun run db:seed` after migrations. The command is for local development only and upserts:

- `admin@example.com` / `password`
- `test_user@example.com` / `password`

The seed command resets all three selected values to `NULL` and `was_introduced` to `false` for these development accounts, making preference and welcome tests repeatable.

It creates 32 applications per account (64 total): 20 active applications, six archived applications, and six blacklisted applications. The active board has three examples per status plus two extra saved records: `MINIMAL` has only its required company and position, while `MAXED` fills the applicable application and workspace fields with realistic detail. Each account's archive and blacklist contain one application per status.

Workspace fixtures vary deterministically: interview-preparation fields may be empty, contacts and follow-ups range from zero to three, and follow-ups span overdue, due-today, and future dates with both open and completed states. Activity events range from zero to three per application, have dates, and include descriptions for roughly half of ordinary events; `MAXED` fills them all. The `MINIMAL` record has no preparation row, contacts, follow-ups, or stored activity. Follow-up and activity dates are based on the date the seed is run, while record selection and optional-field variation remain deterministic.

Re-running the command replaces the seeded applications and their cascading workspace records using development seed keys. The operation does not touch non-seed application records. The seed command does not represent production data and should never be run against a production database.
