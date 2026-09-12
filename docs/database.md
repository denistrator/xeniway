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

### `password_reset_tokens`

Stores a user foreign key, unique SHA-256 token hash, expiry, nullable one-time-use timestamp, and creation time. The API never stores or logs the raw URL token. User deletion cascades to reset tokens; indexes support user cleanup and token lookup.

### `job_applications`

Stores the owning user, company, position, optional job details, one of the six PostgreSQL `job_status` enum values, timestamps, nullable `archived_at`, and independent blacklist state in `blacklisted_at` plus an optional `blacklist_reason`. User deletion cascades to applications. Active and archive queries exclude blacklisted rows; the blacklist page uses the user/blacklist index.

`seed_key` is nullable and unique. It is used only by the development seed command to make fixture replacement idempotent; normal application-created rows leave it null.

## Migrations

Checked-in SQL migrations live in `apps/api/drizzle`. The migration runner records applied IDs in `schema_migrations`, supports incremental migrations, and can safely be rerun. Apply them with:

```bash
bun run db:up
bun run db:migrate
```

Migrations create schema only and do not insert users or applications. Existing data from the former application is intentionally not migrated.

## Development seed

Run `bun run db:seed` after migrations. The command is for local development only and upserts:

- `admin@example.com` / `password`
- `test_user@example.com` / `password`

It creates 36 applications: three per status for each account. Re-running the command replaces only rows identified by its development seed keys. The seed command does not represent production data and should never be run against a production database.
