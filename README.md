# Xenia Way

Xenia Way is a candidate-facing workspace for keeping a reliable record of the job search: employer conversations, application details, follow-ups, and outcomes. It gives each signed-in candidate a private board for moving applications through six statuses—Saved, Applied, Interview, Offer, Rejected, and Withdrawn—without losing the notes and context around each opportunity.

Archive and blacklist are separate from the six-status workflow. Archive is for applications you want out of the active board but may restore or permanently delete later. Blacklist is for excluding an employer or opportunity from the active workflow while preserving its status and notes; it is not a seventh status.

This repository contains the candidate-tracking product and its local development environment. It does not include external authentication, deployment configuration, integrations, background jobs, or data migration from the previous application.

## What you can do

- Create and edit applications with company, position, location, salary, job URL, description, applied date, notes, and status.
- Search applications and filter the board by status.
- Reorder applications within a status using drag-and-drop or keyboard controls.
- Archive applications, restore them, or permanently delete them from the archive.
- Blacklist applications with an optional reason and remove them from a dedicated blacklist page.
- Register, sign in, restore a session, sign out, and recover a password through a one-time email link.
- Use light, dark, or system theme preferences.
- Use the English, Russian, or Ukrainian interface with locale-aware dates.

The application is designed as an accessibility-sensitive product surface: it uses semantic controls, associated labels, visible focus states, keyboard-operable workflows, managed dialog focus, live announcements, responsive touch targets, and reduced-motion support.

## Technology

| Layer | Technology |
| --- | --- |
| Web | React 19, TypeScript, Vite, React Router, i18next |
| Client state | TanStack Query for server state, Redux Toolkit for local UI state |
| UI | Tailwind CSS v4 and local shadcn/ui-style primitives |
| API | Bun, Elysia, Zod |
| Persistence | Drizzle ORM and PostgreSQL 16 |
| Rate limiting | Redis 7 for login, registration, and password-reset limits |
| Password recovery | Nodemailer with Mailpit for local development |
| Tests | Vitest and Playwright |
| Local infrastructure | Docker Compose |

The repository is a Bun workspace with three packages: `apps/web` for the React SPA, `apps/api` for the API and database services, and `packages/shared` for Zod schemas and public TypeScript contracts shared by both applications.

## Requirements

For local development you need:

- [Bun](https://bun.sh/) 1.4 or newer;
- Docker with the Docker Compose plugin;
- a browser for the application; and
- Chromium installed through Playwright if you want to run the browser tests.

Check the installed tools before starting:

```bash
bun --version
docker compose version
```

## Install and run locally

From the repository root:

```bash
cp .env.example .env
bun install
bun run up
bun run db:migrate
bun run db:seed
bun run dev
```

The seed step is optional for ordinary development, but it provides realistic data for exploring the board and is required by the end-to-end tests. It creates these development-only accounts:

| Email | Password |
| --- | --- |
| `admin@example.com` | `password` |
| `test_user@example.com` | `password` |

Open:

- web app: [http://localhost:5173](http://localhost:5173)
- API health: [http://localhost:3000/api/health](http://localhost:3000/api/health)
- Mailpit inbox: [http://localhost:8025](http://localhost:8025)

The Vite development server proxies `/api` requests to the API. PostgreSQL listens on port `5432`, Redis on `6379`, the API on `3000`, and the web app on `5173` by default.

Password recovery sends local mail to Mailpit through `smtp://127.0.0.1:1025`. For another SMTP server, set `APP_ORIGIN`, `SMTP_URL`, and `MAIL_FROM` in `.env`. In production, `SMTP_URL` and `MAIL_FROM` are required; the console mailer is intended only for local development when SMTP is intentionally absent.

## Common commands

Run commands from the repository root.

| Command | Purpose |
| --- | --- |
| `bun run dev` | Start the API and Vite web app |
| `bun run up` | Start PostgreSQL, Redis, and Mailpit |
| `bun run down` | Stop all local infrastructure services |
| `bun run check` | Check PostgreSQL, Redis, and Mailpit |
| `bun run db:up` / `bun run db:down` | Start or stop PostgreSQL |
| `bun run redis:up` / `bun run redis:down` | Start or stop Redis |
| `bun run mailpit:up` / `bun run mailpit:down` | Start or stop Mailpit |
| `bun run db:migrate` | Apply checked-in SQL migrations |
| `bun run db:seed` | Recreate development accounts and deterministic fixtures |
| `bun run typecheck` | Typecheck shared, API, and web packages |
| `bun run test` | Run all Vitest suites |
| `bun run build` | Build the web bundle and typecheck the API |
| `bun run test:e2e` | Run the Playwright browser workflow |
| `bun run format` | Format supported source files with Biome |
| `bun run lint` | Check formatting, imports, and lint rules with Biome |

`bun run up` recreates the Compose services safely and keeps PostgreSQL and Redis data in named local volumes. `bun run down` stops the services without removing those volumes. Mailpit messages are disposable.

## Browser tests

Install Chromium once if it is not already available:

```bash
bunx playwright install chromium
```

Then ensure PostgreSQL and Redis are running, apply migrations, seed the database, and run:

```bash
bun run up
bun run db:migrate
bun run db:seed
bun run test:e2e
```

The browser workflow covers language switching and reload persistence, public password recovery navigation and validation, authentication, the six statuses, search, create/edit flows, blacklist and restore, drag-and-drop, archive, and permanent deletion.

## Repository map

- `apps/web` — React routes, components, translations, Redux UI state, TanStack Query hooks, and the typed API client.
- `apps/api` — Elysia app factory, authentication, CSRF, rate limiting, repositories, Drizzle schema, migrations, and seed command.
- `packages/shared` — shared Zod input schemas and public response contracts.
- `apps/api/drizzle` — checked-in PostgreSQL migrations; migrations create schema but do not seed data.
- `infra/docker-compose.yml` — local PostgreSQL, Redis, and Mailpit services.
- `tests/e2e` — Playwright browser workflows.
- `docs` — current API, architecture, database, operations, testing, and migration documentation.

## Further documentation

- [API reference](docs/api.md)
- [Architecture](docs/architecture.md)
- [Database](docs/database.md)
- [Operations and troubleshooting](docs/operations.md)
- [Testing](docs/testing.md)
- [Migration record](docs/migration.md)

## Security and data boundaries

All application operations are scoped to the authenticated user. Sessions use HttpOnly cookies, mutating authenticated requests require the server-issued CSRF token, passwords use Argon2id, and authentication/password-reset rate limits fail closed when Redis is unavailable. Password-reset tokens are random, single-use, time-limited, and stored only as hashes.

Do not use the seed credentials outside local development. Never commit `.env`, passwords, session IDs, or generated test artifacts.
