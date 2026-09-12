# Setup and Operations

This document covers local configuration, service lifecycle, password recovery, and troubleshooting for the Xenia Way candidate-tracking application.

## Environment

Copy the repository template before starting the API:

```bash
cp .env.example .env
```

The template contains local defaults:

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `REDIS_URL` | Yes | Redis connection string for rate limiting |
| `PORT` | No | API port; defaults to `3000` |
| `APP_ORIGIN` | No | Web origin used in password-reset links; defaults to `http://localhost:5173` |
| `SMTP_URL` | No locally | SMTP connection string; local default targets Mailpit on port `1025` |
| `MAIL_FROM` | No locally | Password-reset sender address; required with `SMTP_URL` in production |
| `CORS_ORIGIN` | No | API CORS origin when the web origin differs from the local default |
| `VITE_PORT` | No | Vite web-server port; defaults to `5173` |
| `API_PORT` | No | API port used by the Vite development proxy; defaults to `3000` |

The API loads the root `.env` through Bun's `--env-file` scripts. Vite reads `VITE_PORT` and `API_PORT` from the process environment when its development server starts. If you change either port, keep `PORT`, `APP_ORIGIN`, `CORS_ORIGIN`, and `API_PORT` consistent with the web origin and API address.

Never commit `.env`, seed credentials, or generated test artifacts. Never use seed credentials outside development.

## Local lifecycle

```bash
bun install
bun run up
bun run db:migrate
bun run db:seed
bun run dev
```

Use `bun run check` to check PostgreSQL, Redis, and Mailpit together. Stop all services with `bun run down`. Individual service commands are available when only one dependency needs to be started or stopped:

```bash
bun run db:up
bun run redis:up
bun run mailpit:up

bun run db:down
bun run redis:down
bun run mailpit:down
```

The Compose volumes `xeniway_postgres_data` and `xeniway_redis_data` persist local data between container restarts. `bun run down` stops services but does not remove these volumes. Mailpit mail is disposable.

Health checks:

- `bun run db:check` expects PostgreSQL to report ready.
- `bun run redis:check` expects `PONG` from Redis.
- `bun run mailpit:check` checks Mailpit's API metadata.
- `GET /api/health` reports database and Redis status and returns `503` if either dependency is unavailable.

## Password recovery

The public forgot-password form always reports the same completion message so account existence is not disclosed. A known account receives a one-hour, single-use link. The raw token is sent only by email, its SHA-256 hash is stored in PostgreSQL, and successful use changes the Argon2id password and invalidates every existing session. Older outstanding tokens are invalidated when a new request is created.

Local password-reset mail is delivered to Mailpit at [http://localhost:8025](http://localhost:8025). Configure `SMTP_URL` and `MAIL_FROM` for a real SMTP service. In production, the API refuses to start unless both are configured.

## Redis behavior

Redis is not the source of truth for application data or sessions. It stores only short-lived, hashed-key fixed-window counters for login, registration, and password reset: five attempts per normalized email in fifteen minutes. If Redis is unavailable, authentication and password-reset requests fail closed with `RATE_LIMIT_UNAVAILABLE` (`503`) rather than bypassing abuse protection.

## CI and deployment status

The checked-in `.github/workflows/ci.yml` workflow runs on pushes and pull requests. It starts PostgreSQL 16 and Redis 7 as GitHub Actions services, installs Bun dependencies from the lockfile, applies migrations, seeds development fixtures, runs typecheck, Vitest, build, installs Chromium, and runs Playwright. Run the same commands locally from [Testing](testing.md) before submitting changes.

The repository does not include deployment configuration or hosted infrastructure. Deployment work requires separate project approval.

## Troubleshooting

- If the API cannot connect, verify Docker is running and `DATABASE_URL` points to port `5432`.
- If authentication cannot reach its rate limiter, verify Redis is running on port `6379` and `REDIS_URL` is correct.
- If the browser redirects to login, run `bun run db:seed` and check that the API port and Vite proxy port match.
- If password-reset mail is not visible, check Mailpit at port `8025` and confirm the API is using `SMTP_URL=smtp://127.0.0.1:1025`.
- If the schema is missing, run `bun run db:migrate`; migrations intentionally do not create fixture data.
- If E2E cannot launch, install Chromium with `bunx playwright install chromium`.
