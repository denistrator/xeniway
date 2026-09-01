# Migration Record

The current repository is the React/Bun implementation of Job Tracker. The previous implementation was used as a behavioral reference during migration, but its code, demonstration routes, schema, and data are not part of this repository.

## Result

- React/Vite replaced the former frontend.
- Bun/Elysia replaced the former backend runtime.
- PostgreSQL/Drizzle now stores users, sessions, and owned job applications.
- The public workflow is authenticated candidate tracking, not a library demonstration.
- Existing source data is intentionally not migrated. The new database starts from schema-only migrations, with optional development fixtures from `bun run db:seed`.

## Compatibility boundary

The React application and API are implemented as one typed system. Shared contracts in `packages/shared` are the compatibility boundary for future clients. The supported behavior is documented in [the API reference](api.md) and covered by Vitest and Playwright.

## Deferred work

New pages, integrations, deployment systems, external authentication, caching, object storage, and additional product features remain outside this migration and require explicit approval.
