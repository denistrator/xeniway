# Redis Rate Limiting Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add Redis as the shared authentication rate-limit store without moving sessions or application data out of PostgreSQL.

**Architecture:** The API will depend on an asynchronous `RateLimiter` interface. Tests and injected app dependencies will keep using the deterministic in-memory limiter; production `server.ts` will create one Redis client and inject a Redis-backed fixed-window limiter. Redis health will be checked independently from PostgreSQL.

**Tech Stack:** Bun, Elysia, TypeScript, official `redis` client, Redis, PostgreSQL, Vitest, Docker Compose.

## Global Constraints

- PostgreSQL remains authoritative for users, sessions, CSRF tokens, and applications.
- Redis is used only for distributed authentication rate limiting in this change.
- Rate-limit keys must not contain raw email addresses.
- The rate limiter must atomically increment and expire counters.
- Redis failure must fail closed for login and registration rather than silently bypassing protection.
- Existing uncommitted `.gitignore` and editorial UI spec changes must remain untouched.

### Task 1: Add local Redis infrastructure

Files: `infra/docker-compose.yml`, `.env.example`, root `package.json`, `docs/operations.md`.

- Add a Redis service with port `6379`, `redis-cli ping` healthcheck, and a named volume.
- Add `REDIS_URL=redis://localhost:6379` to the environment template.
- Add `redis:up`, `redis:down`, and `redis:check` commands.
- Preserve PostgreSQL lifecycle commands.
- Verify the Compose file and Redis health command, then commit `chore: add local redis service`.

### Task 2: Add the Redis client and async limiter contract

Files: `apps/api/package.json`, `apps/api/src/redis/client.ts`, `apps/api/src/services/rate-limit.ts`, tests beside the changed services.

- Add the official `redis` package and verify it can connect under Bun.
- Change the limiter contract to `consume(key): Promise<RateLimitResult>`.
- Keep the in-memory limiter behavior and injectable clock, but make `consume` asynchronous.
- Add a Redis client factory with error handling and explicit connect/close ownership.
- Add tests proving the in-memory limiter still preserves current behavior.
- Verify focused tests and typecheck, then commit `feat: add redis client`.

### Task 3: Implement the Redis-backed limiter

Files: `apps/api/src/services/redis-rate-limit.ts`, `apps/api/src/services/redis-rate-limit.test.ts`.

- Use Redis `INCR` plus `EXPIRE` atomically through an EVAL script.
- Use a namespaced key containing the operation and SHA-256 of the normalized identifier:

```text
job-tracker:rate-limit:v1:<operation>:<sha256(normalizedEmail)>
```

- Preserve the five-attempt, fifteen-minute production policy.
- Return `retryAfterSeconds` from Redis TTL when blocked.
- Surface Redis errors as a typed infrastructure error.
- Unit-test with an injected Redis command adapter; do not require Redis for ordinary Vitest runs.
- Verify allowed, blocked, independent-key, TTL, privacy, and error behavior, then commit `feat: add redis rate limiter`.

### Task 4: Wire production authentication and health

Files: `apps/api/src/server.ts`, `apps/api/src/app.ts`, `apps/api/src/routes/types.ts`, auth routes, health route, shared health types, and focused API tests.

- Inject the Redis limiter in production while preserving the in-memory test default.
- Await limiter checks in login and registration routes.
- Return a stable `503` infrastructure error when Redis is unavailable; never bypass the limiter.
- Add Redis health alongside database health and return `503` when either dependency is unavailable.
- Update health and rate-limit API tests, including the fail-closed path.
- Verify API tests and typecheck, then commit `feat: use redis for auth rate limiting`.

### Task 5: Complete operations and architecture documentation

Files: `docs/architecture.md`, `docs/api.md`, `docs/operations.md`, `docs/testing.md`, `AGENTS.md`, and relevant README files.

- Document Redis’s limited role, environment configuration, local commands, health behavior, key privacy, fixed-window policy, and failure mode.
- Remove Redis from deliberate non-goals while keeping caching, queues, pub/sub, and Redis-backed sessions out of scope.
- Add Redis to local and CI setup instructions.
- Run `bun run typecheck`, `bun run test`, `bun run build`, `bun run lint`, `bun run redis:check`, and the available E2E suite.
- Review the diff and commit `docs: document redis rate limiting`.

## Final verification

```bash
bun install
bun run redis:up
bun run db:up
bun run db:migrate
bun run typecheck
bun run test
bun run build
bun run lint
bun run redis:check
bun run test:e2e
```
