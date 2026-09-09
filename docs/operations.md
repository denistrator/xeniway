# Setup and Operations

## Environment

Copy `.env.example` to `.env` and set `DATABASE_URL` and `REDIS_URL`. `PORT` controls the API port. Set `APP_ORIGIN` to the web origin used in reset links. Local defaults send mail to Mailpit at `smtp://127.0.0.1:1025`, with the inbox available at `http://localhost:8025`. Configure `SMTP_URL` and `MAIL_FROM` for another SMTP server; without SMTP configuration the API uses a console mailer intended only for development. The web app uses Vite defaults unless `VITE_PORT` and `API_PORT` are supplied to the Vite process. `CORS_ORIGIN` may be set when the web origin is different from the default local origin. Login, registration, and password reset use a five-attempt, fifteen-minute distributed limit per normalized email, backed by Redis.

Never use seed credentials outside development. Never commit `.env` or generated test artifacts.

## Local lifecycle

```bash
bun install
bun run up
bun run db:migrate
bun run db:seed
bun run dev
```

Use `bun run check` to check PostgreSQL, Redis, and Mailpit together. Stop all local infrastructure with `bun run down`, or stop PostgreSQL only with `bun run db:down`, Redis only with `bun run redis:down`, and Mailpit only with `bun run mailpit:down`. The Compose volumes `job_tracker_postgres_data` and `job_tracker_redis_data` persist local data between container restarts; Mailpit mail is disposable.

Check Redis with `bun run redis:check`; a healthy instance responds with `PONG`.
Check Mailpit with `bun run mailpit:check`; a healthy instance returns its API metadata. Browse received messages at `http://localhost:8025`.

## Password recovery

The public forgot-password form always reports the same completion message so account existence is not disclosed. A known account receives a one-hour, single-use link. The raw token is sent only by mail, its SHA-256 hash is stored in PostgreSQL, and successful use changes the Argon2id password and invalidates every existing session. Older outstanding tokens are invalidated when a new request is created.

## Redis behavior

Redis is not the source of truth for application data or sessions. It stores only short-lived, hashed-key rate-limit counters for login, registration, and password reset. The API reports `REDIS_UNAVAILABLE` from `/api/health` when Redis cannot be reached, and authentication returns `RATE_LIMIT_UNAVAILABLE` with `503` rather than bypassing the limiter.

## CI

GitHub Actions starts PostgreSQL 16 and Redis 7, installs Bun dependencies from the lockfile, applies migrations, seeds development fixtures, and runs typecheck, Vitest, build, and Playwright. CI installs Chromium with `bunx playwright install --with-deps chromium`.

## Troubleshooting

- If the API cannot connect, verify Docker is running and `DATABASE_URL` points to port 5432.
- If authentication cannot reach its rate limiter, verify Redis is running on port 6379 and `REDIS_URL` is correct.
- If the browser redirects to login, run `bun run db:seed` and check that the API and Vite proxy ports match.
- If E2E cannot launch, install Chromium with `bunx playwright install chromium`.
- If the schema is missing, run `bun run db:migrate`; migrations intentionally do not create fixture data.
