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

### Offline browsing and deployment

Sign in, open “Offline access on this device,” check the storage-consent box, and choose “Make available offline on this device.” It preloads all active, archived and blacklisted applications plus every workspace's fields, activity, preparation, contacts and follow-up tasks into IndexedDB, and downloads public assets. Visiting each workspace first is unnecessary. Up to four workspace requests run concurrently; the live status reports completed/total workspaces. Readiness appears only after the complete validated download is saved. One account per browser profile is retained for seven days from preparation, not extended by local reads. Removing offline data or logging out clears private downloads. Offline logout cannot revoke the remote session: reconnect and sign out on the server if revocation is required.

For an existing same-account download, choose “Refresh offline data” while verified online. This explicit action reuses the stored consent, replaces the private download, and renews the seven-day period from the start of preparation. Refresh is unavailable offline or on the development server. The old ready download is removed when refresh begins; if any list/workspace/assets/storage step fails, no ready private download remains. Retry while online after fixing the problem. Workspaces created after preparation are unavailable offline until refreshed or read online; permanently deleted workspace responses are pruned during a successful full refresh. Separate server requests are not an atomic point-in-time backup. Existing older list-plus-visited downloads remain readable, but need an explicit refresh for complete workspace coverage.

A temporary server error does not send an already verified tab back to login: it keeps the requested route and any cached application data read-only, with Retry available even without a device download. Retry must verify the server session before editing or fetching fresh application data resumes. This in-memory recovery does not guarantee offline reloads without explicit preparation. If connectivity is lost while editing, Cancel remains available; open confirmations can still be dismissed with No, the backdrop, or Escape, but cannot confirm mutations. Confirmed authorization failures and logout still remove private access.

A transient session-check failure follows the same read-only recovery path. A background auth-cache update alone does not dismiss an outage; use Retry or reconnect to complete a fresh session check. Multiple Retry attempts are safe: only the current verification can restore remote access. Download removal is separate from sign-out and leaves a verified online session usable, but revokes local fallback until a fresh session verification.

Workers require HTTPS (localhost/loopback are exceptions), same-origin root deployment, and a production build. Development workers are disabled. Serve `/service-worker.js` and `/index.html` with revalidation/no-cache headers and hashed `/assets/*` with immutable caching. Keep previous hashed assets accessible during deployments for existing tabs. Updates never force a reload: finish edits, close all application tabs, and reopen online. The worker preserves the previous complete public cache until a replacement is explicitly prepared. API routes must never receive SPA fallback HTML.

The development UI explains that offline preparation requires a production build and does not offer the preparation controls or register/update workers. On the Vite development server, `/service-worker.js` is not generated and falls through to SPA HTML; attempting registration there would produce “unsupported MIME type ('text/html').” This is not a storage-permission failure.

Production HTML omits initial shared-chunk `modulepreload` hints to avoid Chromium's “cross-world service worker resource mismatch” warnings when the worker serves those modules from Cache Storage. Native module imports still load the shared chunks, and dynamic-import dependency preloading remains enabled for lazy routes and components. An already downloaded shell may retain the old hints until a new build is explicitly prepared and the existing worker's update lifecycle completes; clearing all site data is unnecessary and would remove private downloads and preferences.

For manual offline testing, keep PostgreSQL/Redis running and migrated/seeded, leave `.env` configured for local development, and run one command from the repository root:

```bash
bun run preview
```

The command first builds the frontend and typechecks the API. Only after a successful build does `concurrently -k` start the non-watching API on `PORT=3101` with app/CORS origin `http://127.0.0.1:4174`, and the loopback Vite preview on strict port 4174 with `API_PORT=3101` for its proxy. The API loads `.env`; the command does not override `NODE_ENV` or relax production configuration validation. It does not start Docker services, migrate, or reseed. Ctrl+C or either child exiting stops both servers. This is a local preview of production frontend assets, not production backend deployment or a production-grade static server.

Open `http://127.0.0.1:4174`, sign in, and explicitly prepare downloads before disconnecting. Stop preview before running `bun run test:e2e:offline`, which uses the same ports. Do not rebuild the output while testing downloads in a running preview. On a deployed production site, a `text/html` worker response instead means the generated worker is missing or incorrectly routed to SPA fallback; fix the deployment routing/file, not just its MIME header.

On preparation failure, check IndexedDB/Cache Storage permissions, disk space, HTTPS, and asset MIME types. Normal online use remains available. “Remove offline data” clears private downloads; clearing browser site data also removes preferences. Downloads are not encrypted device protection, may be evicted, and do not prove an active session. No queued writes or background sync are enabled.

The displayed last-download time describes the current list or workspace response, not a guarantee that every workspace was downloaded. Public shell/favicon/manifest/app-icon bytes are verified against build-generated SHA-256 revisions before readiness. Obsolete public build caches are pruned on activation only when no windows are open, retaining a complete previous fallback; storage usage can temporarily include multiple generations while tabs remain open.

### PWA installation

The production build generates `/manifest.webmanifest` and links it from the HTML shell. It declares Xenia Way, stable `/` app identity, `/` launch URL and scope, standalone display, and light-canvas launch colors. The existing theme initialization still applies the user's light/dark/system choice after launch. Public assets include `/pwa-192.png`, `/pwa-512.png`, `/pwa-maskable-512.png`, and `/apple-touch-icon.png` (180px); the maskable image has an opaque teal background and a padded ivory X. These are separate from the unchanged browser favicons.

Deploy the complete `apps/web/dist` at an HTTPS origin's root. Serve the manifest as `application/manifest+json` (or `application/json`) and icons as `image/png`; never route missing manifest/icons/worker files to SPA HTML fallback. Revalidate the unversioned manifest and icon URLs when deploying branding changes. HTTPS is required outside the localhost/loopback exception.

To check locally, run `bun run preview` and open `http://127.0.0.1:4174`. Inspect DevTools Application → Manifest for the name, launch settings and icons. On supported desktop browsers, use the browser's install action; on iOS/iPadOS, use Safari's Share → Add to Home Screen action. Browser/platform policy determines whether an install action is offered; there is no custom install button. Launch the installed app to manually confirm standalone behavior and icon masking on the target device. Automated Chromium tests verify metadata/assets and caching, not OS installation UI or Safari behavior.

Installation is independent of offline preparation. The app does not register a worker or save private application data just because metadata is loaded or the app is installed. Sign in and explicitly prepare downloads before expecting offline launches to work. Installing alone is not an offline-readiness guarantee; private downloads still expire after seven days and offline editing remains unsupported. Development workers stay disabled; use a production build for installation/offline testing. Worker updates retain the existing close-all-tabs/reopen-online lifecycle.

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
| `bun run preview` | Local development `.env`, running PostgreSQL/Redis, applied migrations/data, free ports 3101/4174; Mailpit when testing example SMTP |
| `bun run test:e2e`, `bun run test:e2e:offline` | Running PostgreSQL and Redis, applied migrations, development fixtures, and Playwright Chromium; the commands start API/web servers |

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

The checked-in `.github/workflows/ci.yml` workflow runs on pushes and pull requests. It uses Bun 1.4.0 and the same PostgreSQL 16.15 and Redis 7.4.9 versions as local Compose, installs dependencies from the lockfile, applies migrations, explicitly enables and loads development fixtures against the CI-local database, runs typecheck, Vitest, build, installs Chromium, and runs the production offline and ordinary development-server Playwright suites sequentially. Run the same commands locally from [Testing](testing.md) before submitting changes.

## Troubleshooting

- If the API cannot connect, verify Docker is running and `DATABASE_URL` points to port `5432`.
- If authentication cannot reach its rate limiter, verify Redis is running on port `6379` and `REDIS_URL` is correct.
- If the browser redirects to login, run `bun run db:seed` and check that the API port and Vite proxy port match.
- If password-reset mail is not visible, check Mailpit at port `8025` and confirm the API is using `SMTP_URL=smtp://127.0.0.1:1025`; if local SMTP is intentionally disabled, inspect the local API console while protecting the logged reset URL as a secret.
- If the schema is missing, run `bun run db:migrate`; migrations intentionally do not create fixture data.
- If E2E cannot launch, install Chromium with `bunx playwright install chromium`.
