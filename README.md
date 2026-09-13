# Xenia Way

Xenia Way is a candidate-facing workspace for keeping a reliable record of the job search: employer conversations, application details, follow-ups, and outcomes. It gives each signed-in candidate a private board for moving applications through six statuses—Saved, Applied, Interview, Offer, Rejected, and Withdrawn—without losing the notes and context around each opportunity.

Archive and blacklist are separate from the six-status workflow. Archive is for applications you want out of the active board but may restore or permanently delete later. Blacklist is for excluding an employer or opportunity from the active workflow while preserving its status and notes; it is not a seventh status.

This repository contains the current candidate-tracking product and its reproducible local development environment. The documentation describes only behavior implemented in this repository.

## Project status

Xenia Way is an actively developed, server-backed candidate-tracking application. This repository provides a reproducible local development environment and is suitable for local development and contribution.

## What you can do

- Create and edit applications with company, position, location, salary, job URL, description, applied date, notes, and status.
- Search applications and filter the board by status.
- Reorder applications within a status using drag-and-drop or keyboard controls.
- Archive applications, restore them, or permanently delete them from the archive.
- Blacklist applications with an optional reason and restore them from a dedicated blacklist page.
- Register, sign in, restore a session, sign out, and recover a password through a one-time email link.
- See a localized welcome introduction after the first successful login or registration, with links to the board and About page.
- Use light, dark, or system theme preferences.
- Use the English, Russian, Ukrainian, or Hebrew interface with locale-aware dates.
- Signed-in language, theme, job-form presentation, and welcome-introduction state are stored with the account. The server fields are `selectedLanguage`, `selectedTheme`, `selectedFormPresentation`, and `wasIntroduced`. The browser keeps the corresponding flat values `language`, `theme`, `formPresentation`, and `wasIntroduced` under the single local-storage key `userPreferences`.

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

- [Bun](https://bun.sh/) 1.4.0 (the version pinned in CI);
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

The seed step is optional for ordinary development, but it provides realistic data for exploring the board and is required by the end-to-end tests. The example environment explicitly enables it only for a local database, and the seed command refuses production or non-local targets. It creates these disposable local-only accounts; do not use them outside local development:

| Email | Password |
| --- | --- |
| `admin@example.com` | `password` |
| `test_user@example.com` | `password` |

Open:

- web app: [http://localhost:5173](http://localhost:5173)
- API health: [http://localhost:3000/api/health](http://localhost:3000/api/health)
- Mailpit inbox (local-only): [http://localhost:8025](http://localhost:8025)

The Vite development server proxies `/api` requests to the API. PostgreSQL listens on port `5432`, Redis on `6379`, the API on `3000`, and the web app on `5173` by default.

User preferences are account-scoped on the server. `GET /api/user/preferences` reads `selectedLanguage`, `selectedTheme`, `selectedFormPresentation`, and `wasIntroduced`; `PATCH /api/user/preferences` saves one or more selected values; and `POST /api/user/preferences/introduced` completes the welcome introduction. The selected values accept `en`/`ru`/`uk`/`he`, `light`/`dark`/`system`, and `drawer`/`modal`, respectively. Reads require authentication, writes require the authenticated session's CSRF token, and every operation uses the session user rather than a client-supplied user ID.

The browser applies its `userPreferences` cache immediately. After a successful login or registration, non-null account selections and the account's `wasIntroduced` value replace their browser counterparts; browser values are never uploaded automatically. An explicit user action updates the interface and local storage first, then synchronizes the corresponding account value in the background. This keeps the interface responsive while making the server authoritative when authentication starts.

Password recovery sends local mail to Mailpit through `smtp://127.0.0.1:1025`. For another SMTP server, set `APP_ORIGIN`, `SMTP_URL`, and `MAIL_FROM` in `.env`. Without both SMTP settings, non-production uses an intentional console fallback that logs the full reset URL and raw token; keep that output local and treat it as sensitive. Production startup requires explicit PostgreSQL, Redis, HTTPS app-origin, SMTP, and sender settings that do not use local addresses, so production cannot use the console fallback. `CORS_ORIGIN` defaults to the app origin; either way it must be an HTTPS origin in production. Production session cookies are `Secure` as well as HttpOnly and SameSite=Lax; mutating requests still require the session's server-issued CSRF token.

## Common commands

Run commands from the repository root.

| Command | Purpose |
| --- | --- |
| `bun run dev` | Start the API and Vite web app |
| `bun run up` | Start PostgreSQL, Redis, and Mailpit |
| `bun run down` | Stop all local infrastructure services |
| `bun run check` | Check PostgreSQL, Redis, and Mailpit |
| `bun run db:up` / `bun run db:down` / `bun run db:check` | Start, stop, or check PostgreSQL |
| `bun run redis:up` / `bun run redis:down` / `bun run redis:check` | Start, stop, or check Redis |
| `bun run mailpit:up` / `bun run mailpit:down` / `bun run mailpit:check` | Start, stop, or check Mailpit |
| `bun run db:migrate` | Apply checked-in SQL migrations |
| `bun run db:seed` | Recreate development accounts and deterministic fixtures |
| `bun run check:public` | Check staged Git content for forbidden paths and likely secrets |
| `bun run typecheck` | Typecheck shared, API, and web packages |
| `bun run test` | Run all Bun and Vitest unit suites |
| `bun run build` | Build the web bundle and typecheck the API |
| `bun run test:e2e` | Run the Playwright browser workflow |
| `bun run format` | Format supported source files with Biome |
| `bun run format:check` | Check formatting without changing files |
| `bun run lint` | Check formatting, imports, and lint rules with Biome |

`bun run up` starts or reconciles the Compose services and keeps PostgreSQL and Redis data in named local volumes. `bun run down` removes the local containers and network without removing those volumes. No checked-in lifecycle command deletes the named volumes. Mailpit messages are disposable.

The static checks (`check:public`, `format`, `lint`, `typecheck`, `test`, and `build`) do not require local services. Database migration and seed commands require PostgreSQL. `check` requires PostgreSQL, Redis, and Mailpit, while `test:e2e` requires PostgreSQL, Redis, applied migrations, development fixtures, and Playwright Chromium; the browser suite starts its own API and web servers. Mailpit is useful for manually inspecting local reset mail but is not required by the browser suite.

GitHub Actions treats CI as the publication gate. It checks tracked public content first, then runs formatting, lint, typecheck, unit tests, and the build without services. Only after those jobs pass does it start pinned PostgreSQL and Redis services for migrations, seed validation, and Playwright. Database and Redis URLs are masked before use and scoped only to the migration, seed, and browser-test steps that need them; setup and installation steps do not receive those values. A failed project check reports its name, exit status, and a bounded diagnostic tail after redacting sensitive environment values, connection URLs, reset links, cookies, authorization values, email addresses, and password-reset mail content.

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

The browser workflow covers language switching and reload persistence, server preference persistence and account override, account isolation, theme/language/form-presentation selectors, welcome completion after login and registration, public password recovery navigation and validation, authentication, the six statuses, search, create/edit flows, blacklist and restore, drag-and-drop, archive, and permanent deletion.

## Repository map

- `apps/web` — React routes, components, translations, Redux UI state, TanStack Query hooks, and the typed API client.
- `apps/api` — Elysia app factory, authentication, CSRF, rate limiting, repositories, Drizzle schema, migrations, and seed command.
- `packages/shared` — shared Zod input schemas and public response contracts.
- `apps/api/drizzle` — checked-in PostgreSQL migrations; migrations create schema but do not seed data.
- `infra/docker-compose.yml` — local PostgreSQL, Redis, and Mailpit services.
- `tests/e2e` — Playwright browser workflows.
- `docs` — current API, architecture, database, operations, testing, and schema-change documentation.

## Further documentation

- [API reference](docs/api.md)
- [Architecture](docs/architecture.md)
- [Database](docs/database.md)
- [Operations and troubleshooting](docs/operations.md)
- [Testing](docs/testing.md)
- [Database change policy](docs/migration.md)

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for runtime requirements, local setup, checks, test placement, migration rules, and pull-request expectations.

## License

Xenia Way is available under the [MIT License](LICENSE). Copyright © 2026 Denis Belevtsov (denistrator).

## Security

Read [SECURITY.md](SECURITY.md) for private vulnerability reporting and data-handling boundaries. Do not report security issues, secrets, session IDs, or personal data in public issues or pull requests.

## Support

For reproducible bugs and product suggestions, use the repository's [GitHub issue templates](https://github.com/denistrator/xeniway/issues/new/choose). For questions about local setup, start with [Operations and troubleshooting](docs/operations.md).

## Security and data boundaries

All application operations are scoped to the authenticated user. Sessions use HttpOnly, SameSite=Lax cookies that are also `Secure` in production; mutating requests require the server-issued CSRF token; and passwords use Argon2id. Login, registration, and password-reset limits use hashed Redis keys and fail closed when Redis is unavailable. Normal password-reset requests use the same generic success for unknown accounts and successfully delivered known accounts, but storage or delivery failures for a known account return a distinguishable server error. Password-reset tokens are cryptographically random, single-use, valid for one hour, and stored only as SHA-256 hashes; a successful reset invalidates every session for that user.

Do not use the seed credentials outside local development. Never commit `.env`, passwords, session IDs, or generated test artifacts.
