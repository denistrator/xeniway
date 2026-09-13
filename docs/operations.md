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
| `NODE_ENV` | No locally | Runtime mode; accepted values are `development`, `test`, and `production`. The template sets `development`, while a production process must set `production` so secure-cookie and configuration checks apply |
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `REDIS_URL` | Yes | Redis connection string for rate limiting |
| `PORT` | No | API port; defaults to `3000` |
| `APP_ORIGIN` | In production | Web origin used in password-reset links; defaults to `http://localhost:5173` only outside production |
| `SMTP_URL` | No locally | SMTP connection string; local default targets Mailpit on port `1025` |
| `MAIL_FROM` | No locally | Password-reset sender address; must be configured together with `SMTP_URL` and both are required in production |
| `CORS_ORIGIN` | No | API CORS origin; defaults to `APP_ORIGIN` |
| `ALLOW_DEVELOPMENT_SEED` | For `db:seed` | Must be exactly `true` to load disposable fixtures; production and non-local database targets are still rejected |
| `VITE_PORT` | No | Vite web-server port; defaults to `5173` |
| `API_PORT` | No | API port used by the Vite development proxy; defaults to `3000` |

The API loads the root `.env` through Bun's `--env-file` scripts. Vite reads `VITE_PORT` and `API_PORT` from the process environment when its development server starts. `CI` is supplied by GitHub Actions or the local test runner rather than `.env`; Playwright uses it only for retries, focused-test rejection, and development-server reuse. Playwright intentionally uses and clears Redis logical database 15 between browser tests so repeated fixture logins do not share rate-limit counters; application rate limits remain unchanged. Compose supplies its fixed `POSTGRES_DB`, `POSTGRES_USER`, and `POSTGRES_PASSWORD` values directly to the local PostgreSQL container. If you change either application port, keep `PORT`, `APP_ORIGIN`, `CORS_ORIGIN`, and `API_PORT` consistent with the web origin and API address.

Production startup validates configuration before opening database or Redis connections. `DATABASE_URL`, `REDIS_URL`, `APP_ORIGIN`, `SMTP_URL`, and `MAIL_FROM` must all be explicit. `CORS_ORIGIN` may be explicit or defaults to `APP_ORIGIN`. Service URLs must use their expected schemes and must not target localhost or loopback addresses; both origins must resolve to HTTPS origins without credentials, paths, queries, or fragments; and `MAIL_FROM` must be a non-local email address.

Production sessions use a two-hour HttpOnly, SameSite=Lax, `Secure` cookie. CSRF tokens are stored with sessions and every mutation must present the matching value in `x-csrf-token`. Passwords are hashed with Argon2id. Redis rate limiting for login, registration, and password reset uses SHA-256-digested normalized-email keys, allows five attempts in fifteen minutes, and fails closed with `503` if Redis is unavailable. Production requires SMTP, a sender address, and the public app origin so password-reset links can be delivered with the intended HTTPS origin; startup rejects missing SMTP configuration, so production cannot use the console fallback.

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

The Compose volumes `xeniway_postgres_data` and `xeniway_redis_data` persist local data between container restarts. `bun run up` starts or reconciles the three services without deleting data. `bun run down` removes the local containers and network but does not remove the named volumes. Mailpit mail is disposable. No checked-in lifecycle command removes volumes.

`bun run db:seed` is deliberately limited to development. It requires `ALLOW_DEVELOPMENT_SEED=true`, rejects `NODE_ENV=production`, and accepts only PostgreSQL URLs on localhost or a loopback address. The example credentials and all generated applications are disposable fixtures.

Health checks:

- `bun run db:check` expects PostgreSQL to report ready.
- `bun run redis:check` expects `PONG` from Redis.
- `bun run mailpit:check` checks Mailpit's API metadata.
- `GET /api/health` reports database and Redis status and returns `503` if either dependency is unavailable.

Command prerequisites:

| Commands | Required local dependencies |
| --- | --- |
| `bun run check:public`, `bun run format`, `bun run lint`, `bun run typecheck`, `bun run test`, `bun run build` | Installed workspace dependencies only |
| `bun run db:up`, `bun run redis:up`, `bun run mailpit:up`, `bun run up` | Docker with Compose |
| `bun run db:check`, `bun run db:migrate`, `bun run db:seed` | Running PostgreSQL; seed also requires the development opt-in and a local database URL |
| `bun run redis:check` | Running Redis |
| `bun run mailpit:check` | Running Mailpit |
| `bun run check` | Running PostgreSQL, Redis, and Mailpit |
| `bun run dev` | Running PostgreSQL and Redis for complete API behavior; Mailpit when using the example SMTP configuration |
| `bun run test:e2e` | Running PostgreSQL and Redis, applied migrations, development fixtures, and Playwright Chromium; the command starts API/web servers |

### Bundle analysis

`vite-bundle-analyzer` is installed as a development dependency for inspecting the production web bundle. Run the build and then start the analyzer from the repository root:

```bash
bun run build
npx vite-bundle-analyzer
```

The command opens an interactive treemap in the browser. Run `npx vite-bundle-analyzer --help` for CLI options.

## Password recovery

The forgot-password form returns the same generic success for an unknown account and for a known account after its reset message is delivered. A storage or mail-delivery failure for a known account returns `PASSWORD_RESET_ERROR` (`500`), while an unknown account still succeeds, so operational failures can reveal that the two paths differ. A known account receives a one-hour, single-use link containing a token generated from 32 random bytes. Only its SHA-256 hash is stored in PostgreSQL, and successful use changes the Argon2id password and invalidates every existing session. Older outstanding tokens are invalidated when a new request is created.

The example local configuration delivers reset mail to Mailpit at [http://localhost:8025](http://localhost:8025). In non-production environments where both `SMTP_URL` and `MAIL_FROM` are intentionally absent, the API uses the console mailer and logs the complete reset URL, including the raw token. Treat that output as sensitive, keep it out of shared logs, and use this fallback only for local development. A partial SMTP configuration is rejected. In production, the API refuses to start unless both values are configured and therefore never falls back to console logging.

## Redis behavior

Redis is not the source of truth for application data or sessions. It stores only short-lived, hashed-key fixed-window counters for login, registration, and password reset: five attempts per normalized email in fifteen minutes. If Redis is unavailable, authentication and password-reset requests fail closed with `RATE_LIMIT_UNAVAILABLE` (`503`) rather than bypassing abuse protection.

## CI

The checked-in `.github/workflows/ci.yml` workflow runs on pushes and pull requests. It uses Bun 1.4.0 and the same PostgreSQL 16.15 and Redis 7.4.9 versions as local Compose, installs dependencies from the lockfile, applies migrations, explicitly enables and loads development fixtures against the CI-local database, runs typecheck, Vitest, build, installs Chromium, and runs Playwright. Run the same commands locally from [Testing](testing.md) before submitting changes.

## Troubleshooting

- If the API cannot connect, verify Docker is running and `DATABASE_URL` points to port `5432`.
- If authentication cannot reach its rate limiter, verify Redis is running on port `6379` and `REDIS_URL` is correct.
- If the browser redirects to login, run `bun run db:seed` and check that the API port and Vite proxy port match.
- If password-reset mail is not visible, check Mailpit at port `8025` and confirm the API is using `SMTP_URL=smtp://127.0.0.1:1025`; if local SMTP is intentionally disabled, inspect the local API console while protecting the logged reset URL as a secret.
- If the schema is missing, run `bun run db:migrate`; migrations intentionally do not create fixture data.
- If E2E cannot launch, install Chromium with `bunx playwright install chromium`.
