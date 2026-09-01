# Setup and Operations

## Environment

Copy `.env.example` to `.env` and set `DATABASE_URL`. `PORT` controls the API port. The web app uses Vite defaults unless `VITE_PORT` and `API_PORT` are supplied to the Vite process. `CORS_ORIGIN` may be set when the web origin is different from the default local origin. Login and registration use a process-local five-attempt, fifteen-minute limit per normalized email; deploy multi-instance rate limiting separately if that becomes necessary.

Never use seed credentials outside development. Never commit `.env` or generated test artifacts.

## Local lifecycle

```bash
bun install
bun run db:up
bun run db:migrate
bun run db:seed
bun run dev
```

Stop PostgreSQL with `bun run db:down`. The Compose volume is named `job_tracker_postgres_data` and persists local data between container restarts.

## CI

GitHub Actions starts PostgreSQL 16, installs Bun dependencies from the lockfile, applies migrations, seeds development fixtures, and runs typecheck, Vitest, build, and Playwright. CI installs Chromium with `bunx playwright install --with-deps chromium`.

## Troubleshooting

- If the API cannot connect, verify Docker is running and `DATABASE_URL` points to port 5432.
- If the browser redirects to login, run `bun run db:seed` and check that the API and Vite proxy ports match.
- If E2E cannot launch, install Chromium with `bunx playwright install chromium`.
- If the schema is missing, run `bun run db:migrate`; migrations intentionally do not create fixture data.
