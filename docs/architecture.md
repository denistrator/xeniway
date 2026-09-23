# Architecture

## Runtime

The browser runs a React/Vite single-page application. In development, Vite proxies `/api` to the Bun/Elysia server. The API owns authentication, authorization, validation, and persistence. PostgreSQL is the source of truth for users, sessions, applications, and password-reset tokens. Redis is a supporting dependency used only to rate-limit login, registration, and password-reset requests. SMTP is an outbound delivery dependency behind an injectable mailer interface.

The product boundary is a private candidate workspace for employer conversations, application progress, follow-ups, and outcomes. The shared workflow has exactly six statuses—`saved`, `applied`, `interview`, `offer`, `rejected`, and `withdrawn`. Archive and blacklist remain separate lifecycle states, not status values. Each application detail view combines the application with a newest-first activity timeline.

```text
React + React Router
        │
        ├── Redux Toolkit: filters, drawer, theme
        └── TanStack Query: authenticated server data and mutations
                │ fetch with credentials + CSRF header
                ▼
        Bun + Elysia + Zod
                │
        AuthService + typed repositories ──→ Drizzle ORM → PostgreSQL
                │
        Redis rate limiter (auth + password reset)
```

## Workspace boundaries

`packages/shared` is the contract boundary. It defines the six-status enum, registration/login schemas, application and manual-event input schemas, and public response types. The web and API packages import these definitions instead of duplicating validation or JSON shapes.

`apps/api/src/app.ts` is an injectable Elysia app factory. It owns dependency construction, global middleware, and error handling, then mounts the domain composition in `apps/api/src/routes/index.ts`. Health, auth, preferences, and application endpoints live in their own routers; application routes are grouped by collection, item, event, and board responsibilities. Shared request guards and cookie/response helpers live under `apps/api/src/routes/support/`. Typed repository dependencies allow route behavior to be tested with in-memory implementations. `apps/api/src/server.ts` wires the production Drizzle repositories, Redis rate limiter, and independent database/Redis health checks.

`apps/web/src/lib/api.ts` provides the typed HTTP client. `apps/web/src/lib/queries.ts` owns TanStack Query keys, authentication queries, CSRF acquisition, mutations, and cache invalidation. TanStack Query owns the server preference record; Redux contains immediate presentation state such as the active theme and welcome dialog.

The user-preferences repository and API store account-scoped `selectedLanguage`, `selectedTheme`, `selectedFormPresentation`, and `wasIntroduced` values separately from the `users` record. Selected values are nullable until explicitly chosen. The browser applies its flat `userPreferences` local-storage object (`language`, `theme`, `formPresentation`, and `wasIntroduced`) immediately. A successful login or registration fetches the account record, applies non-null selected values over the cache, and always applies server `wasIntroduced`; it never uploads browser defaults. Explicit user actions update local storage and the UI before sending best-effort authenticated writes. A successful login or registration creates an explicit frontend welcome trigger; the layout then reads preferences and renders the welcome dialog only when the account has not been introduced.

The UI follows an accessibility-first baseline: semantic controls and labels, keyboard-operable workflows including a keyboard alternative to drag-and-drop, visible focus indicators, managed focus within dialogs and drawers, live regions for asynchronous feedback, responsive layouts, and reduced-motion support. The document theme is initialized before React starts to avoid a flash of the wrong theme.

The UI language is owned by i18next/react-i18next. English is initialized before the first React render; Russian, Ukrainian, and Hebrew resources are dynamically imported before switching. Hebrew sets the document direction to right-to-left, while the other locales use left-to-right. The language selector persists the selected value in the flat `userPreferences` browser object and synchronizes it with the authenticated account. Theme, language, and job-form presentation share that key with the cached `wasIntroduced` value. Redux does not duplicate locale state, and local storage is never treated as account identity or authoritative onboarding state.

## Request lifecycle

1. The browser acquires a CSRF token from `GET /api/auth/csrf`; the server creates an anonymous session when needed.
2. Registration or login validates the shared schema, replaces the anonymous session, and sets an authenticated HttpOnly session cookie.
3. `GET /api/auth/me` restores the current user on page load.
4. Application reads require a valid session and are filtered by `userId` in the repository.
5. Application mutations require both a valid session and the CSRF token belonging to that session.
6. TanStack Query invalidates application lists and detail data after mutations so the UI reflects the server state. System events are inserted inside the same PostgreSQL transaction as their application mutation; manual event mutations invalidate only the relevant detail query.
7. After authentication, the preferences query applies the current account's non-null language, theme, and job-form presentation values to the UI and browser cache. Explicit preference changes update local storage and the UI first, then use `PATCH /api/user/preferences` with the authenticated session's CSRF token in the background. Account changes clear account-specific preference query state.

Locale-neutral API values are translated only at the presentation boundary. Application statuses and error codes remain canonical, candidate-entered data is never machine-translated, and displayed dates are formatted with the active locale while stored ISO timestamps remain unchanged.

Pre-feature applications have no persisted creation event because schema migrations do not insert application data. The detail route derives a read-only creation marker from their existing creation timestamp; all subsequent system history is persisted transactionally. Archived and blacklisted cards expose an expandable Activity section backed by the same detail query.

Login, registration, and password-reset requests consume an atomic Redis counter with a fifteen-minute fixed window and a limit of five attempts per normalized email. Counter keys contain a SHA-256 digest rather than the raw email. If Redis is unavailable, these flows fail closed with a `503` response instead of bypassing abuse protection.

## Data ownership

Applications and activity events are never addressed without an authenticated owner in repository calls. Archive is a state transition represented by `archivedAt`; blacklist is an independent exclusion state represented by `blacklistedAt` and `blacklistReason`. Active, archive, and blacklist lists are separate queries. Blacklisting preserves the six-status workflow and restores the job to its previous active status when removed from the blacklist. Permanent deletion is accepted for any owned application; the UI exposes it from archive and blacklist views, and database cascading deletion removes its activity history.

## Production security boundary

Password recovery obtains the anonymous CSRF session and rate-limits the normalized email. An unknown account and a known account whose token is stored and message is delivered receive the same generic success. Token-storage or mail-delivery failures for a known account return a distinguishable `500` server error. For an existing user PostgreSQL stores only the token hash. SMTP carries the raw token inside the reset link; when SMTP is intentionally absent outside production, the console mailer logs the complete reset URL and raw token. Confirmation consumes an unused, unexpired token, updates the Argon2id password, and removes all sessions for that user.

Production startup requires explicit non-local PostgreSQL, Redis, and SMTP service URLs, a non-local sender, and an explicit HTTPS `APP_ORIGIN`; missing SMTP configuration is rejected, so production cannot select the console mailer. `CORS_ORIGIN` defaults to `APP_ORIGIN` and must also be HTTPS. Session cookies are HttpOnly, SameSite=Lax, and `Secure` in production. CSRF tokens are stored with the session and required for mutations. Redis rate limits login, registration, and password-reset requests with hashed identifiers and fails closed if the limiter is unavailable. Reset tokens are random, expire after one hour, are stored only as SHA-256 hashes, can be used once, and successful resets invalidate all sessions.
