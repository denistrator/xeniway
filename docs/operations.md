# Setup and Operations

## Environment

Copy `.env.example` to `.env` and set `DATABASE_URL` and `REDIS_URL`. `PORT` controls the API port. The web app uses Vite defaults unless `VITE_PORT` and `API_PORT` are supplied to the Vite process. `CORS_ORIGIN` may be set when the web origin is different from the default local origin. Login and registration use a five-attempt, fifteen-minute distributed limit per normalized email, backed by Redis.

Never use seed credentials outside development. Never commit `.env` or generated test artifacts.

## Local lifecycle

```bash
bun install
bun run db:up
bun run redis:up
bun run db:migrate
bun run db:seed
bun run dev
```

Stop PostgreSQL with `bun run db:down` and Redis with `bun run redis:down`. The Compose volumes `job_tracker_postgres_data` and `job_tracker_redis_data` persist local data between container restarts.

Check Redis with `bun run redis:check`; a healthy instance responds with `PONG`.

## Redis behavior

Redis is not the source of truth for application data or sessions. It stores only short-lived, hashed-key rate-limit counters for login and registration. The API reports `REDIS_UNAVAILABLE` from `/api/health` when Redis cannot be reached, and authentication returns `RATE_LIMIT_UNAVAILABLE` with `503` rather than bypassing the limiter.

## CI

GitHub Actions starts PostgreSQL 16 and Redis 7, installs Bun dependencies from the lockfile, applies migrations, seeds development fixtures, and runs typecheck, Vitest, build, and Playwright. CI installs Chromium with `bunx playwright install --with-deps chromium`.

## Troubleshooting

- If the API cannot connect, verify Docker is running and `DATABASE_URL` points to port 5432.
- If authentication cannot reach its rate limiter, verify Redis is running on port 6379 and `REDIS_URL` is correct.
- If the browser redirects to login, run `bun run db:seed` and check that the API and Vite proxy ports match.
- If E2E cannot launch, install Chromium with `bunx playwright install chromium`.
- If the schema is missing, run `bun run db:migrate`; migrations intentionally do not create fixture data.
