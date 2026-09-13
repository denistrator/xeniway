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

Stores a user foreign key, unique SHA-256 token hash, expiry, nullable one-time-use timestamp, and creation time. PostgreSQL never stores the raw URL token. SMTP sends the raw value only inside the reset link; when SMTP is intentionally absent outside production, the console mailer logs the complete reset URL and token. Normal unknown-account and successfully delivered known-account requests return the same generic success, but token-storage or delivery failures for a known account return a distinguishable server error. User deletion cascades to reset tokens; indexes support user cleanup and token lookup.

### `job_applications`

Stores the owning user, company, position, optional job details, one of the six PostgreSQL `job_status` enum values, timestamps, nullable `archived_at`, and independent blacklist state in `blacklisted_at` plus an optional `blacklist_reason`. User deletion cascades to applications. Active and archive queries exclude blacklisted rows; the blacklist page uses the user/blacklist index.

`seed_key` is nullable and unique. It is used only by the development seed command to make fixture replacement idempotent; normal application-created rows leave it null.

## Migrations

Checked-in SQL migrations live in `apps/api/drizzle`. The migration runner uses a manually ordered ID/file registry, records applied IDs in `schema_migrations`, supports incremental migrations, and can safely be rerun. Apply them with:

```bash
bun run db:up
bun run db:migrate
```

Before iterating the registry, a compatibility branch checks for an existing `users` table or a predecessor initial-migration marker. If either exists, it records `0000_create_xeniway` with conflict-safe insertion. The normal loop then skips that registered ID, so the current initial SQL file is not necessarily executed by this runner even though its current ID is recorded. For all other unrecorded registry entries, the runner executes the paired SQL in a transaction and records the ID only after success.

Migrations create or evolve schema only and do not insert users, applications, or other fixture data. `0006_user_preference_values.sql` adds the nullable language and theme selections, and `0007_user_preference_form_presentation.sql` adds the nullable drawer/modal selection. Rerunning the runner skips recorded IDs.

## Development seed

Run `bun run db:seed` after migrations. The command is for local development only and upserts:

- `admin@example.com` / `password`
- `test_user@example.com` / `password`

The seed command resets all three selected values to `NULL` and `was_introduced` to `false` for these development accounts, making preference and welcome tests repeatable.

It creates 36 applications: three per status for each account. Re-running the command replaces only rows identified by its development seed keys. The seed command does not represent production data and should never be run against a production database.
