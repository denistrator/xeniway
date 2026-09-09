# Job Tracker

Job Tracker helps job candidates keep a reliable record of conversations and progress with potential employers. Each application belongs to the signed-in user and moves through six workflow statuses: Saved, Applied, Interview, Offer, Rejected, and Withdrawn.

The application is a Bun workspace with a React SPA, a typed Elysia API, shared Zod contracts, Drizzle ORM, PostgreSQL, and Redis-backed authentication rate limiting.

## Features

- Registration, login, logout, and session restoration.
- Enumeration-safe password recovery with one-time reset links.
- Argon2id password hashing, secure HttpOnly sessions, and CSRF protection.
- Create, read, update, and archive job applications.
- Search, status filtering, and native drag-and-drop status changes with keyboard alternatives.
- Archive restore and permanent deletion with confirmation.
- Blacklist jobs with an optional reason and restore them from a dedicated blacklist page.
- Light, dark, and system themes with a persisted browser preference.
- Accessible UI with semantic controls, visible focus states, keyboard navigation, live status updates, and reduced-motion support.
- Per-user ownership isolation for all application operations.
- Development seed accounts and 36 deterministic fixture applications.

## Stack

| Layer | Technology |
| --- | --- |
| Web | React, TypeScript, Vite, React Router |
| Client state | TanStack Query for server state, Redux Toolkit for UI state |
| UI | Tailwind CSS and local shadcn/ui-style primitives |
| API | Bun, Elysia, Zod |
| Persistence | Drizzle ORM and PostgreSQL |
| Abuse protection | Redis-backed distributed authentication and password-reset rate limiting |
| Tests | Vitest and Playwright |
| Local infrastructure | Docker Compose |

## Local setup

Prerequisites: Bun, Docker Compose, and a Playwright Chromium installation for browser tests.

```bash
cp .env.example .env
bun install
bun run up
bun run db:migrate
bun run db:seed       # optional development fixtures
bun run dev
```

Open the web app at [http://localhost:5173](http://localhost:5173). The API listens at [http://localhost:3000](http://localhost:3000). The Vite development server proxies `/api` requests to the API.

Seed credentials are `admin@example.com` / `password` and `test_user@example.com` / `password`. Seed data is development-only and is not created by migrations.

Password recovery uses the local Mailpit SMTP inbox by default. Open [http://localhost:8025](http://localhost:8025) to inspect messages. Use `bun run mailpit:down` to stop it. Configure `APP_ORIGIN`, `SMTP_URL`, and `MAIL_FROM` for another SMTP server.

## Commands

| Command | Purpose |
| --- | --- |
| `bun run dev` | Start the API and Vite web app |
| `bun run up` | Start PostgreSQL, Redis, and Mailpit |
| `bun run check` | Check PostgreSQL, Redis, and Mailpit |
| `bun run down` | Stop all local infrastructure services |
| `bun run db:up` | Start local PostgreSQL |
| `bun run db:down` | Stop local PostgreSQL only |
| `bun run db:check` | Check local PostgreSQL connectivity |
| `bun run redis:up` | Start local Redis |
| `bun run redis:down` | Stop local Redis |
| `bun run redis:check` | Check local Redis connectivity |
| `bun run mailpit:up` | Start the local SMTP test inbox |
| `bun run mailpit:down` | Stop the local SMTP test inbox |
| `bun run mailpit:check` | Check the local SMTP test inbox |
| `bun run db:migrate` | Apply checked-in SQL migrations |
| `bun run db:seed` | Idempotently recreate development accounts and fixtures |
| `bun run typecheck` | Typecheck shared, API, and web packages |
| `bun run test` | Run all Vitest suites |
| `bun run build` | Build the web bundle and typecheck the API |
| `bun run test:e2e` | Run the Playwright browser workflow |
| `bun run format` | Format supported source files with Biome |
| `bun run lint` | Check formatting, imports, and lint rules with Biome |

For E2E testing, start PostgreSQL and Redis, apply migrations, seed the database, and install Chromium with `bunx playwright install chromium`.

## Repository map

- `apps/web` — React routes, components, Redux UI state, TanStack Query hooks, and typed API client.
- `apps/api` — Elysia app factory, authentication, repositories, Drizzle schema, migration runner, and seed command.
- `packages/shared` — shared Zod request schemas and TypeScript response contracts.
- `apps/api/drizzle` — checked-in PostgreSQL migrations.
- `infra/docker-compose.yml` — local PostgreSQL and Redis services with persistent volumes.
- `tests/e2e` — Playwright browser workflows.
- `docs` — architecture, API, database, operations, testing, and migration notes.

See [API documentation](docs/api.md), [database documentation](docs/database.md), [operations documentation](docs/operations.md), and [testing documentation](docs/testing.md) for details.

## Accessibility

Accessibility is a first-class UI goal. Preserve semantic HTML, associated form labels and autocomplete metadata, visible `:focus-visible` states, keyboard alternatives for drag-and-drop interactions, focus management for dialogs, polite announcements for asynchronous states, responsive touch targets, and `prefers-reduced-motion` support. Verify user-visible changes with keyboard navigation and the accessible roles and names used by Playwright tests.

## Scope and deferred work

This repository intentionally contains only the candidate job-tracking workflow. New product features, integrations, external authentication, caching, object storage, and deployment systems are deferred until separately approved.
