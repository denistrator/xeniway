# Documentation Alignment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Xenia Way's onboarding and technical Markdown documentation accurately explain the candidate-facing product, local setup, workflows, and repository boundaries.

**Architecture:** Keep `README.md` as the newcomer entry point and preserve the existing focused technical documents as linked references. Update claims from repository evidence: package scripts, environment examples, Compose services, routes, schema, tests, and UI behavior.

**Tech Stack:** Markdown, Bun workspace scripts, Docker Compose, React/Vite, Bun/Elysia, Drizzle/PostgreSQL, Redis, Mailpit, Vitest, and Playwright.

## Global Constraints

- Preserve the six canonical statuses: `saved`, `applied`, `interview`, `offer`, `rejected`, and `withdrawn`.
- Preserve authenticated ownership isolation, archive semantics, blacklist semantics, and shared API contracts.
- Do not describe unavailable deployment, integrations, or product features as implemented; document the checked-in CI workflow accurately.
- Keep `docs/superpowers/` plans and specs as historical records unless a claim is actively misleading outside its historical context.
- Do not edit application source code or generated files.

### Task 1: Align the README with the product and setup

**Files:**
- Modify: `README.md`

- [x] **Step 1: Replace the opening description with the product goal**

Describe Xenia Way as a candidate-facing workspace for keeping a reliable record of employer conversations, job applications, follow-ups, and outcomes. Explain that each signed-in candidate owns their records and that the six statuses are the workflow backbone.

- [x] **Step 2: Document workflow semantics**

Explain that archive is a separate lifecycle state, blacklist is a separate exclusion list, blacklisting is not a seventh status, and permanent deletion is available only from archive.

- [x] **Step 3: Make local setup self-contained**

Document Bun, Docker with Compose support, and Chromium as prerequisites. Include `.env.example` values, the order `bun install`, `bun run up`, `bun run db:migrate`, `bun run db:seed`, and `bun run dev`, plus the web/API/Mailpit URLs and development credentials.

- [x] **Step 4: Document the command surface and repository map**

Keep the command table synchronized with root `package.json`, clarify which commands require infrastructure, explain that seed data is development-only, and link every current technical document.

### Task 2: Correct current technical documentation

**Files:**
- Modify: `docs/api.md`
- Modify: `docs/architecture.md`
- Modify: `docs/database.md`
- Modify: `docs/operations.md`
- Modify: `docs/testing.md`
- Modify: `docs/migration.md`

- [x] **Step 1: Align API behavior**

Clarify the exception that `/api/health` returns an unwrapped health object, keep application/auth responses in their documented envelopes, and document the actual CSRF, ownership, archive, blacklist, and password-reset rules.

- [x] **Step 2: Align architecture and data documentation**

Describe Redis as the rate-limit dependency for login, registration, and password reset; describe SMTP/Mailpit as password-recovery delivery; and ensure archive and blacklist are documented as independent fields and queries.

- [x] **Step 3: Make operations instructions implementation-backed**

Document every variable in `.env.example` and the optional `VITE_PORT`, `API_PORT`, and `CORS_ORIGIN` settings. Remove or qualify the unsupported GitHub Actions section. Include lifecycle, health checks, persistence, production SMTP requirements, and troubleshooting.

- [x] **Step 4: Align testing and migration status**

Describe the real Vitest and Playwright coverage, required database/Redis setup, and the checked-in CI workflow. Keep migration notes explicitly historical and separate from current onboarding.

### Task 3: Update repository guidance and perform consistency review

**Files:**
- Modify: `AGENTS.md`
- Inspect: `docs/superpowers/**/*.md`

- [x] **Step 1: Update `AGENTS.md`**

Add the canonical product description, documentation ownership rules, current setup sequence, command expectations, and a requirement that README and technical docs remain synchronized with code and configuration.

- [x] **Step 2: Scan historical plans and specs**

Search for current-state claims that could mislead a contributor. Leave implementation-history details intact unless they contradict the repository guidance when read in context.

- [x] **Step 3: Review the complete Markdown diff**

Run `git diff --check`, inspect changed files, and search for stale claims such as unsupported CI, old project names, missing setup steps, or incorrect dependency roles.

- [x] **Step 4: Run repository verification**

Run `bun run lint`, `bun run typecheck`, `bun run test`, and `bun run build`. Run `bun run db:seed` only if local PostgreSQL is available; otherwise report that infrastructure-dependent verification was not run.
