# Architecture

## Runtime

The browser runs a React/Vite single-page application. In development, Vite proxies `/api` to the Bun/Elysia server. The API owns authentication, authorization, validation, and persistence. PostgreSQL is the source of truth for users, sessions, and applications.

```text
React + React Router
        │
        ├── Redux Toolkit: filters, sorting, drawer, theme
        └── TanStack Query: authenticated server data and mutations
                │ fetch with credentials + CSRF header
                ▼
        Bun + Elysia + Zod
                │
        AuthService + typed repositories
                │
        Drizzle ORM → PostgreSQL
```

## Workspace boundaries

`packages/shared` is the contract boundary. It defines the six-status enum, registration/login schemas, application create/update schemas, and public response types. The web and API packages import these definitions instead of duplicating validation or JSON shapes.

`apps/api/src/app.ts` is an injectable Elysia app factory. Its dependencies are typed repository interfaces, which allows route behavior to be tested with in-memory implementations. `apps/api/src/server.ts` wires the production Drizzle repositories and database health check.

`apps/web/src/lib/api.ts` provides the typed HTTP client. `apps/web/src/lib/queries.ts` owns TanStack Query keys, authentication queries, CSRF acquisition, mutations, and cache invalidation. Redux contains only local UI preferences and controls.

## Request lifecycle

1. The browser acquires a CSRF token from `GET /api/auth/csrf`; the server creates an anonymous session when needed.
2. Registration or login validates the shared schema, replaces the anonymous session, and sets an authenticated HttpOnly session cookie.
3. `GET /api/auth/me` restores the current user on page load.
4. Application reads require a valid session and are filtered by `userId` in the repository.
5. Application mutations require both a valid session and the CSRF token belonging to that session.
6. TanStack Query invalidates active/archive lists after mutations so the UI reflects the server state.

## Data ownership

Applications are never addressed without an authenticated owner in repository calls. Archive is a state transition represented by `archivedAt`; active and archive lists are separate queries. Permanent deletion is accepted only for an archived application.

## Deliberate non-goals

The current system does not include external authentication, Redis, object storage, background jobs, deployment configuration, or an application data migration from another project. These require separate approval.
