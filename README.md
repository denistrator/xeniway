# Job Tracker

A small full-stack playground demonstrating the requested libraries in one request flow:

```text
React + Vite + TypeScript
Redux Toolkit + TanStack Query + React Router
Tailwind CSS + shadcn/ui-style primitives
Vitest + Playwright
        ↓
Bun + Elysia + Zod + Drizzle ORM
        ↓
PostgreSQL via Docker Compose
```

## Prerequisites

- Bun
- Docker Desktop or OrbStack with Docker Compose
- Playwright Chromium (`bunx playwright install chromium`)

## Run locally

```bash
cp .env.example .env
bun install
bun run db:up
bun run db:migrate
bun run dev
```

Open [http://localhost:5173](http://localhost:5173). The API is available at [http://localhost:3000](http://localhost:3000).

The local Compose database is PostgreSQL with database/user `job_tracker` and volume `job_tracker_postgres_data`.

## Scripts

| Command | Purpose |
| --- | --- |
| `bun run dev` | Start the API and Vite frontend together |
| `bun run db:up` | Start PostgreSQL in Docker |
| `bun run db:down` | Stop the local PostgreSQL container |
| `bun run db:migrate` | Apply the initial Drizzle SQL migration |
| `bun run typecheck` | Typecheck shared, API, and web packages |
| `bun run test` | Run shared contract and API tests with Vitest |
| `bun run test:e2e` | Run the Playwright browser smoke test |
| `bun run build` | Create the Vite production bundle and typecheck the API |

## Workspace map

- `apps/web` — React/Vite UI, Redux store, TanStack Query calls, routes, Tailwind styling, and shadcn/ui-style primitives.
- `apps/api` — Elysia routes, Bun entrypoint, Zod request validation, Drizzle schema/repository, and migration runner.
- `packages/shared` — shared Zod message input schema and response types.
- `infra/docker-compose.yml` — local PostgreSQL service.
- `.github/workflows/ci.yml` — PostgreSQL-backed typecheck, tests, build, and Playwright verification.

## API routes

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/api/health` | Checks API/database availability |
| `GET` | `/api/hello` | Returns the Bun/Elysia greeting |
| `GET` | `/api/messages` | Lists saved messages |
| `POST` | `/api/messages` | Validates and saves `{ "text": "..." }` |

The browser uses TanStack Query for API-backed state and invalidates the messages query after a successful mutation. The counter uses Redux Toolkit to demonstrate local state independently from the server cache. React Router provides the dashboard and about pages.

Redis and S3/R2 are intentionally not included: this demo has no cache or object-storage use case. They can be added later behind the same API boundary when the product needs them.
