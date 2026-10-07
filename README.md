# Xenia Way

Xenia Way is a candidate-facing workspace for keeping a reliable record of the job search: employer conversations, application details, follow-ups, and outcomes. It gives each signed-in candidate a private board for moving applications through six statuses—Saved, Applied, Interview, Offer, Rejected, and Withdrawn—without losing the notes and context around each opportunity.

Archive and blacklist are separate from the six-status workflow. Archive is for applications you want out of the active board but may restore or permanently delete later. Blacklist is for excluding an employer or opportunity from the active workflow while preserving its status and notes; it is not a seventh status.

This repository contains the current candidate-tracking product and its reproducible local development environment. The documentation describes only behavior implemented in this repository.

## What you can do

- Create applications in the modal or drawer, then edit company, position, location, salary, job URL, description, applied date, notes, and status directly in each application workspace.
- Review each application's activity timeline, including automatic history for creation, edits, status changes, archive, and blacklist transitions. Add, edit, and remove dated notes, emails, calls, interviews, offers, rejections, and follow-ups.
- Expand activity directly from archived and blacklisted cards without restoring the application first.
- Download a ZIP package from Settings → Export data containing application/preparation, contact, and follow-up CSV files across all three boards. Export requires a verified online session. Activity history and salary are not included; see the [export contract](docs/api.md#data-export).
- Search applications and filter the board by status.
- Opt into seven-day, read-only downloads of all three boards and every application workspace on one browser profile, including activity, preparation, contacts, and follow-ups. Explicitly refresh downloads before going offline. See [offline privacy and deployment limits](docs/operations.md#offline-browsing-and-deployment); offline edits and automatic synchronization are not supported.
- Install the production web app through a supported browser's native installation or Add to Home Screen action. Installation does not prepare private offline downloads. See [PWA installation](docs/operations.md#pwa-installation).
- Reorder applications within a status using drag-and-drop or keyboard controls.
- Archive applications, restore them, or permanently delete them from the archive.
- Blacklist applications with an optional reason and restore them from a dedicated blacklist page.
- Register, sign in, restore a session, sign out, and recover a password through a one-time email link.
- See a localized welcome introduction after the first successful login or registration, with links to the board and About page.
- Use light, dark, or system theme preferences.
- Open Settings using the header cog before the theme control. Offline access is an always-expanded section there; the cog and section title show a disconnected icon when the browser is offline or the API is unavailable. Theme and Language sections follow it, with icon-and-text selects. The header shortcuts remain available and share the same preferences.
- Use the English, Russian, Ukrainian, or Hebrew interface with locale-aware dates.
- Save language, theme, job-form presentation, and welcome-introduction preferences with your account.

The application is designed as an accessibility-sensitive product surface: it uses semantic controls, associated labels, visible focus states, keyboard-operable workflows, managed dialog focus, live announcements, responsive touch targets, and reduced-motion support.

## Technology

| Layer | Technology |
| --- | --- |
| Web | React 19, TypeScript, Vite, React Router, i18next |
| Client state | TanStack Query for server state, Redux Toolkit for local UI state |
| UI | Tailwind CSS v4, Tailwind Variants, and local shadcn/ui-style primitives |
| API | Bun, Elysia, Zod |
| Persistence | Drizzle ORM and PostgreSQL 16 |
| Rate limiting | Redis 7 for login, registration, and password-reset limits |
| Password recovery | Nodemailer with Mailpit for local development |
| Tests | Vitest and Playwright |
| Local infrastructure | Docker Compose |

The repository is a Bun workspace with three packages: `apps/web` for the React SPA, `apps/api` for the API and database services, and `packages/shared` for Zod schemas and public TypeScript contracts shared by both applications.

## Requirements

For local development you need:

- Git to clone the repository;
- [Bun](https://bun.com/docs/installation) 1.4.0 (the version pinned in CI);
- [Node.js](https://nodejs.org/en/download) 22.12 or newer for the development tooling; Vite runs through its Node.js executable;
- [Docker with Compose](https://docs.docker.com/compose/install/), with the Docker engine running; Docker Desktop includes both;
- `curl` for the Mailpit health check;
- a browser for the application; and
- Chromium installed through Playwright if you want to run the browser tests.

Check the installed tools before starting:

```bash
bun --version
node --version
docker compose version
docker info
```

## Install and run locally

The commands below use a Bash-compatible terminal on macOS, Linux, or Windows with WSL. Start Docker Desktop (or your Docker engine) first. You do not need to install PostgreSQL, Redis, or an SMTP server separately; Compose runs them locally.

### 1. Get the project and install dependencies

```bash
git clone https://github.com/denistrator/xeniway.git
cd xeniway
bun install
cp .env.example .env
```

If you already have a checkout, open a terminal in its root instead of cloning again. Copy `.env.example` only for first-time setup; do not overwrite an existing `.env`. Its defaults work with the checked-in local services without editing. Keep `.env` private and uncommitted.

### 2. Start and check the local services

```bash
bun run up
bun run check
```

The first start downloads container images. Wait until `check` succeeds before continuing; if a service is still starting, wait a few seconds and run `bun run check` again. PostgreSQL should report that it accepts connections, Redis should report `PONG`, and the Mailpit check should return its server information.

### 3. Initialize the database

```bash
bun run db:migrate
bun run db:seed
```

The seed step is optional for ordinary development, but it provides realistic data for exploring the board and is required by the end-to-end tests. The example environment explicitly enables it only for a local database, and the seed command refuses production or non-local targets. It creates these disposable local-only accounts; do not use them outside local development:

| Email | Password |
| --- | --- |
| `admin@example.com` | `password` |
| `test_user@example.com` | `password` |

Each account receives 32 applications: 20 on the active board, six archived, and six blacklisted. The saved column includes `MINIMAL` and `MAXED` examples; workspace fixtures cover interview preparation, contacts, follow-ups, and dated activity.

### 4. Start development

```bash
bun run dev
```

Keep this terminal open: it runs both the API and web app and reloads them as you edit. Once both servers have started, open the web app and sign in with a seed account above, or register your own account if you skipped the seed.

Local addresses:

- web app: [http://localhost:5173](http://localhost:5173)
- API health: [http://localhost:3000/api/health](http://localhost:3000/api/health)
- Mailpit inbox (local-only): [http://localhost:8025](http://localhost:8025)

The Vite development server proxies `/api` requests to the API. PostgreSQL listens on port `5432`, Redis on `6379`, the API on `3000`, and the web app on `5173` by default.

The example password-recovery configuration sends mail to Mailpit. For other environments, see [environment configuration](docs/operations.md#environment) and [password recovery](docs/operations.md#password-recovery). The non-production console-mailer fallback logs sensitive reset links; production requires SMTP and rejects local service configuration.

### Coming back to the project

From the repository root, with Docker running:

```bash
bun run up
bun run check
bun run db:migrate
bun run dev
```

Run `bun install` again when dependencies change. Migrations are safe to rerun and skip already applied entries. Do not seed on every startup: seeding replaces the fixture applications and resets the seed accounts' preferences. Your non-seed applications are left alone.

To stop development, press `Ctrl+C` in the terminal running `dev`. Run `bun run down` to stop the infrastructure too; PostgreSQL and Redis data remain in Docker volumes for the next start.

### If setup fails

| Symptom | What to check |
| --- | --- |
| `bun`, `node`, or `docker` is not found | Install the missing prerequisite, reopen the terminal, and check its version |
| Docker cannot connect to its daemon | Start Docker Desktop or the Docker engine, then retry `docker info` |
| A port is already in use | Check ports `5432`, `6379`, `1025`, `8025`, `3000`, and `5173`; stop the conflicting local service or follow the [configuration guide](docs/operations.md#environment) |
| Database connection fails | Run `bun run db:check` and compare `.env` with `.env.example` |
| Tables are missing or seed login fails | Apply migrations first; seed the disposable accounts if you want to use them |
| Authentication or password recovery fails | Check Redis and Mailpit with `bun run check`, then use the [troubleshooting guide](docs/operations.md#troubleshooting) |

## Common commands

Run commands from the repository root.

| Command | Purpose |
| --- | --- |
| `bun run dev` | Start the API and Vite web app |
| `bun run preview` | Build the production web bundle, then start the API and local production preview together at `http://127.0.0.1:4174` |
| `bun run up` | Start PostgreSQL, Redis, and Mailpit |
| `bun run down` | Stop all local infrastructure services |
| `bun run check` | Check PostgreSQL, Redis, and Mailpit |
| `bun run db:up` / `bun run db:down` / `bun run db:check` | Start, stop, or check PostgreSQL |
| `bun run redis:up` / `bun run redis:down` / `bun run redis:check` | Start, stop, or check Redis |
| `bun run mailpit:up` / `bun run mailpit:down` / `bun run mailpit:check` | Start, stop, or check Mailpit |
| `bun run db:migrate` | Apply checked-in SQL migrations |
| `bun run db:seed` | Recreate development accounts and deterministic fixtures |
| `bun run check:public` | Check staged Git content for forbidden paths and likely secrets |
| `bun run typecheck` | Typecheck shared, API, web, and Playwright E2E TypeScript projects |
| `bun run test` | Run all Bun and Vitest unit suites |
| `bun run build` | Build the web bundle and typecheck the API |
| `bun run test:e2e` | Run the Playwright browser workflow |
| `bun run test:e2e:offline` | Build and run the production-preview offline browser suite |
| `bun run format` | Format supported source files with Biome |
| `bun run format:check` | Check formatting without changing files |
| `bun run lint` | Check formatting, imports, and lint rules with Biome |

Static checks need no running services. See [command prerequisites and service lifecycle](docs/operations.md#local-lifecycle) for service-dependent commands, [local production preview](docs/operations.md#offline-browsing-and-deployment), and [verification and CI](docs/testing.md). Preview is not a production hosting server.

## Browser tests

Install Chromium once if it is not already available:

```bash
bunx playwright install chromium
```

After the local setup above, run `bun run test:e2e` and `bun run test:e2e:offline` sequentially. Both require PostgreSQL and Redis; they start their own API/web servers and seed disposable fixtures. Stop manual preview first because the offline suite uses the same ports. See [Testing](docs/testing.md) for coverage, known limitations, and the full verification sequence.

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
- [Documentation index and where to change what](docs/README.md)
- [Database change policy](docs/database.md#migrations)

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for contribution scope and pull-request expectations, and [AGENTS.md](AGENTS.md) for repository coding rules.

## License

Xenia Way is available under the [MIT License](LICENSE). Copyright © 2026 Denis Belevtsov (denistrator).

## Security

Read [SECURITY.md](SECURITY.md) for private vulnerability reporting and data-handling boundaries. Do not report security issues, secrets, session IDs, or personal data in public issues or pull requests.

## Support

For reproducible bugs and product suggestions, use the repository's [GitHub issue templates](https://github.com/denistrator/xeniway/issues/new/choose). For questions about local setup, start with [Operations and troubleshooting](docs/operations.md).
