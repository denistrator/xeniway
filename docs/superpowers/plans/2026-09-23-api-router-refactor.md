# API Router Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Consolidate the API’s route modules by domain and remove repeated request-guard and response plumbing without changing externally observable API behavior.

**Architecture:** The route entrypoint composes health, auth, preference, and application routers. Shared support provides typed authentication/CSRF guards, validation, cookie, and response helpers; endpoint handlers retain explicit schemas, repository operations, status codes, and route-specific errors. Avoid generic CRUD factories.

**Tech Stack:** Bun workspaces, TypeScript, Elysia 1.4, Zod 4, Vitest, Biome.

## Global Constraints

- Preserve all current HTTP methods, paths, JSON envelopes, fields, status codes, and error codes.
- Scope every application repository operation to the authenticated user ID.
- Protect every authenticated mutation with CSRF validation.
- Keep health and CSRF session bootstrap routes public.
- Preserve malformed-JSON behavior, event immutability, and route-specific not-found behavior.
- Do not change repositories, database schema, shared contracts, or product behavior.
- Update `AGENTS.md` and API/architecture docs when their route guidance or structure changes.

---

## File Structure

- `apps/api/src/routes/index.ts`: compose/register health, auth, preference, and application domain routers.
- `apps/api/src/routes/health.ts`: remain the public health probe.
- `apps/api/src/routes/auth/`: public CSRF bootstrap, login/register/logout/current-user, and optional password-reset endpoints.
- `apps/api/src/routes/preferences.ts`: authenticated user preference endpoints.
- `apps/api/src/routes/applications/`: collection, item, events, and board operation endpoints.
- `apps/api/src/routes/support/`: focused auth/CSRF guard, validation, response, and cookie/session utilities, split only when it clarifies ownership.
- `apps/api/src/app.ts`: service construction, global CORS/error handling, and one domain-router registration per domain.
- `apps/api/src/app.test.ts`: API contract regression tests; preserve all existing integration assertions and add missing guard/error cases.
- `AGENTS.md`, `docs/api.md`, `docs/architecture.md`: current route authoring guidance and architecture descriptions.

## Tasks

### Task 1: Establish and test shared route guards

**Files:**
- Create: `apps/api/src/routes/support/auth-guard.ts`
- Modify: `apps/api/src/routes/support.ts`
- Test: `apps/api/src/app.test.ts`

**Interfaces:**
- Consumes: existing `AuthService`, `ResponseSet`, `AuthContext`, and route dependencies.
- Produces: `requireAuthenticatedUser(auth, set, request)` and `requireAuthenticatedMutation(auth, set, request)`, each returning `Promise<{ ok: true; context: AuthContext } | { ok: false; response: ApiError }>` and setting the same 401/403 statuses and bodies; existing cookie helpers remain behavior-compatible.

- [ ] Add integration assertions for unauthenticated GET and POST, authenticated POST with missing CSRF, and authenticated POST with valid CSRF; run `bun run --cwd apps/api test` and confirm new assertions fail only when the existing response contract is violated.
- [ ] Implement the two typed guard functions. The GET guard checks session authentication; the mutation guard checks authentication and then CSRF. In handlers use `const result = await requireAuthenticatedUser(auth, set, request); if (!result.ok) return result.response; const { userId } = result.context;`. Do not replace login/register CSRF handling or CSRF bootstrap.
- [ ] Migrate application and preference handlers to the guard while retaining each route’s own validation, repository call, and error mapping.
- [ ] Run `bun run --cwd apps/api test` and `bun run --cwd apps/api typecheck`; expect all API tests and typechecking to pass.
- [ ] Commit the guard and application/preferences adoption as `refactor(api): share authenticated route guards`.

### Task 2: Group application endpoints by responsibility

**Files:**
- Create: `apps/api/src/routes/applications/index.ts`
- Create: `apps/api/src/routes/applications/collection.ts`
- Create: `apps/api/src/routes/applications/item.ts`
- Create: `apps/api/src/routes/applications/events.ts`
- Create: `apps/api/src/routes/applications/boards.ts`
- Remove after migration: the existing top-level application route modules.
- Modify: `apps/api/src/app.test.ts`

**Interfaces:**
- Consumes: shared route guards and current application route dependencies.
- Produces: `applicationsRoute(dependencies): Elysia`, composing the collection, item, event, and board plugins without adding or removing a URL prefix.

- [ ] Move current list/archive/blacklist reads into `collection.ts`; detail/create/update/delete into `item.ts`; timeline endpoints into `events.ts`; archive/restore/blacklist/unblacklist/reorder/remove-all into `boards.ts`. Each exported factory returns an `Elysia` plugin and accepts `RouteDependencies`.
- [ ] Preserve every existing endpoint path and method exactly; keep different status and error behavior explicit instead of hiding it in a generic action factory.
- [ ] Add or retain regression assertions for list filters, invalid IDs, status codes, ownership isolation, event manual/system rules, board-state errors, reorder validation, and remove-all outcomes.
- [ ] Run `bun run --cwd apps/api test` and `bun run --cwd apps/api typecheck`; all existing application integration tests must pass unchanged.
- [ ] Commit as `refactor(api): group application routes by domain`.

### Task 3: Group authentication and password-reset endpoints

**Files:**
- Create: `apps/api/src/routes/auth/index.ts`
- Create: `apps/api/src/routes/auth/csrf.ts`
- Create: `apps/api/src/routes/auth/session.ts`
- Create: `apps/api/src/routes/auth/password-reset.ts`
- Remove after migration: existing top-level auth route modules.
- Modify: `apps/api/src/app.test.ts`

**Interfaces:**
- Consumes: auth guard support, `RouteDependencies`, and existing auth/password-reset services.
- Produces: `authRoutes(dependencies): Elysia` composing CSRF and session plugins, and conditionally composing password-reset routes only when `dependencies.passwordReset` exists.

- [ ] Move CSRF bootstrap to `csrf.ts` without requiring prior authentication; retain current-session token reuse and cookie creation behavior.
- [ ] Group login/register/logout/current-user handlers without merging their different CSRF, rate-limit, status, session-replacement, and cookie rules.
- [ ] Group password-reset request/confirm while preserving generic success behavior and current specific rate-limit/service failures.
- [ ] Run API tests and typecheck; specifically confirm invalid credentials, email-taken, Redis failure, reset unavailable/invalid/expired, cookie behavior, and CSRF flows.
- [ ] Commit as `refactor(api): group authentication routes`.

### Task 4: Compose domain routers and retire obsolete route support

**Files:**
- Create: `apps/api/src/routes/index.ts`
- Modify: `apps/api/src/app.ts`
- Move: `apps/api/src/routes/user-preferences.ts` to `apps/api/src/routes/preferences.ts` if it remains focused.
- Split: `apps/api/src/routes/support.ts` into focused support modules; keep exports only where used.
- Remove: obsolete top-level route files and unused support exports.
- Modify: `apps/api/src/app.test.ts`

**Interfaces:**
- Consumes: health, auth, preference, and application domain routers.
- Produces: `apiRoutes(dependencies): Elysia`, composed from health, auth, preference, and application plugins. `app.ts` registers this route composition once.

- [ ] Add a route-composition test proving existing method/path pairs remain registered and verify password-reset routes remain conditional.
- [ ] Replace the individual route `.use()` chain with `.use(apiRoutes(routeDependencies))` while leaving service construction, CORS, and global `onError` behavior unchanged.
- [ ] Search for old route imports/exports and remove only files and helpers proven unused by `rg` and typecheck.
- [ ] Run API tests and typecheck; no route path may be shadowed by parameterized application routes.
- [ ] Commit as `refactor(api): compose domain routers`.

### Task 5: Update repository guidance and run full verification

**Files:**
- Modify: `AGENTS.md`
- Modify if needed: `docs/api.md`
- Modify if needed: `docs/architecture.md`
- Test: repository verification scripts.

**Interfaces:**
- Consumes: final router tree and the passing API suite.
- Produces: accurate contributor guidance for where a route belongs and which shared guards to use.

- [ ] Update AGENTS guidance with the domain router structure, handler responsibility boundaries, shared guard usage, and explicit exception for public/auth bootstrap endpoints.
- [ ] Update API or architecture docs only if they describe obsolete router ownership or layout; do not restate endpoint contracts already covered elsewhere.
- [ ] Run `bun run format` then `bun run lint`, `bun run typecheck`, `bun run test`, and `bun run build`; run `git diff --check`.
- [ ] Review final `git diff` for changed endpoint behavior, missing route exports, and dead files; fix all findings and rerun impacted verification.
- [ ] Commit documentation and cleanup as `docs(api): document domain route structure`.

## Self-Review

- All routes are covered by health/infrastructure, auth, preferences, or application domains; the app-level route composition and conditional password-reset registration are explicit.
- Security, response compatibility, malformed body behavior, ownership, event immutability, and exceptional auth/reset flows are each called out in the task tests.
- Task interfaces use the same planned names: `requireAuthenticatedUser`, `requireAuthenticatedMutation`, `authRoutes`, `applicationsRoute`, and `apiRoutes`; use these exact names in implementation and tests.
- No generic CRUD factory or persistence/API contract change is included.
