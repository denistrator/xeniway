# Public Repository Cleanup Implementation Plan

> For agentic workers: use subagent-driven development or executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Prepare Xenia Way for publication as a clear, safe, reproducible, and contributor-friendly public repository without changing core product behavior.

**Architecture:** Treat the cleanup as four boundaries: public project identity, local-development configuration, automated verification, and final security/release review. Keep development infrastructure explicit while preserving authentication, ownership, CSRF, password recovery, preferences, and the six-status workflow.

**Tech Stack:** Bun workspaces, TypeScript, React/Vite, Elysia, Drizzle/PostgreSQL, Redis, Docker Compose, Biome, Vitest, Playwright, and GitHub Actions.

## Global Constraints

- Do not publish .env, credentials, session IDs, generated artifacts, IDE metadata, dependency directories, or test reports.
- Do not weaken authentication, CSRF validation, ownership scoping, rate limiting, cookie settings, password hashing, or password-reset token handling.
- Preserve the six canonical application statuses; archive and blacklist remain separate lifecycle concepts.
- Preserve local-first preference updates and the single userPreferences browser-storage key.
- Keep the root workspace package private so it is not accidentally published as an npm package.
- Use the existing toolchain; do not add deployment systems or external integrations.
- Every task ends with focused verification and a separate commit.

---

### Task 1: Establish public repository policies

**Files:**
- Create: LICENSE
- Create: CONTRIBUTING.md
- Create: SECURITY.md
- Create: CODE_OF_CONDUCT.md
- Create: .github/ISSUE_TEMPLATE/bug-report.yml
- Create: .github/ISSUE_TEMPLATE/feature-request.yml
- Create: .github/pull_request_template.md
- Modify: README.md

- [ ] Confirm the copyright holder and year before adding a complete OSI-approved permissive license. Do not invent legal ownership details.
- [ ] Add contributor guidance covering runtime requirements, local setup, required checks, test placement, migration rules, and security/data-boundary notes in pull requests.
- [ ] Add a vulnerability policy that directs private reports through the repository’s configured GitHub security channel and prohibits secrets or personal data in public issues.
- [ ] Add a recognized Contributor Covenant document using the repository’s configured enforcement contact without inventing a personal email address.
- [ ] Add structured bug, feature-request, and pull-request templates with reproduction, scope, security impact, tests, migrations, and documentation fields.
- [ ] Update README with project status, license, contributing, security, and support sections. Mark seed accounts and Mailpit as local-only and state that production deployment configuration is intentionally absent.
- [ ] Run:

~~~bash
bun run lint
git diff --check
~~~

- [ ] Commit: docs: define public repository policies

### Task 2: Make setup and configuration safe and reproducible

**Files:**
- Modify: .env.example
- Modify: README.md
- Modify: docs/operations.md
- Modify: infra/docker-compose.yml
- Modify: package.json
- Modify: .github/workflows/ci.yml
- Review: playwright.config.ts
- Review: apps/api/src/server.ts
- Review: apps/api/src/app.ts

- [ ] Inventory every environment variable across API startup, Compose, Playwright, README, and operations documentation. Every runtime variable must be documented or intentionally generated.
- [ ] Ensure production startup rejects missing or unsafe DATABASE_URL, REDIS_URL, APP_ORIGIN, SMTP_URL, and MAIL_FROM values while retaining documented local Mailpit behavior.
- [ ] Add configuration tests for clear failure behavior where the current code has no focused coverage.
- [ ] Keep seed credentials disposable and ensure seeding cannot accidentally target a production database without an explicit development-safe guard.
- [ ] Review root scripts for stale names, duplicate commands, and surprising data-loss behavior; update operations documentation when behavior is retained.
- [ ] Replace bun-version: latest in CI with the documented stable Bun version and align service versions with local Compose.
- [ ] Run:

~~~bash
bun run lint
bun run typecheck
bun run test
git diff --check
~~~

- [ ] Commit: chore: harden public development setup

### Task 3: Add publication hygiene checks

**Files:**
- Modify: .gitignore
- Create: scripts/check-public-repository.ts
- Modify: package.json
- Review: all tracked files and reachable Git history

- [ ] Define a denylist for tracked .env files except .env.example, private keys/certificates, credential files, node_modules, dist, Playwright reports/results, IDE metadata, worktrees, and database dumps.
- [ ] Add conservative content checks for private-key headers, common cloud-token prefixes, and non-placeholder credentials. Report paths and rule names, never matched content.
- [ ] Review all reachable commits for accidentally committed secrets or private files. If a real secret exists, stop and obtain explicit approval before revocation or history rewriting.
- [ ] Implement the check using the Git tracked-file list and add the package script check:public.
- [ ] Run:

~~~bash
bun run check:public
bun run lint
bun run test
git diff --check
~~~

- [ ] Commit: chore: add public repository hygiene checks

### Task 4: Reconcile product and technical documentation

**Files:**
- Modify: README.md
- Modify: docs/api.md
- Modify: docs/architecture.md
- Modify: docs/database.md
- Modify: docs/operations.md
- Modify: docs/testing.md
- Modify: docs/migration.md
- Modify: AGENTS.md

- [ ] Use the README’s candidate-facing description as the source of truth: employer conversations and application progress, six statuses, archive and blacklist outside the status workflow.
- [ ] Document selectedLanguage, selectedTheme, selectedFormPresentation, wasIntroduced, the userPreferences local-storage key, server-wins synchronization on login/registration, and local-first synchronization after explicit user actions.
- [ ] Remove references to deleted predecessor handling and unsupported deployment, integrations, or background jobs.
- [ ] Document production requirements for secure cookies, CSRF, Argon2id, Redis fail-closed rate limiting, SMTP, origin configuration, and reset-token handling.
- [ ] Verify every documented command exists and identify which checks require PostgreSQL, Redis, Mailpit, or Playwright Chromium.
- [ ] Run:

~~~bash
bun run check:public
bun run lint
git diff --check
# Run the Task 4 stale-term audit from the execution brief.
~~~

- [ ] Commit: docs: reconcile public project documentation

### Task 5: Make CI the publication gate

**Files:**
- Modify: .github/workflows/ci.yml
- Modify: package.json
- Modify: README.md
- Modify: CONTRIBUTING.md

- [ ] Run check:public before service setup.
- [ ] Keep formatting, lint, typecheck, and unit tests in a fast job; keep migration, seed, and Playwright checks in the service-backed job.
- [ ] Pin the runtime selected in Task 2 and keep PostgreSQL/Redis versions aligned with local development.
- [ ] Confirm CI failures do not print environment variables, reset URLs, cookies, database connection strings, or mail contents.
- [ ] Run:

~~~bash
bun run check:public
bun run lint
bun run typecheck
bun run test
bun run build
git diff --check
~~~

- [ ] With local infrastructure available, run bun run up, bun run db:migrate, bun run db:seed, and bun run test:e2e.
- [ ] Commit: ci: make public release checks explicit

### Task 6: Perform final publication review

**Files:**
- Review: Git status, diff, log, root metadata, docs, and CI

- [ ] Validate from a fresh checkout with bun install --frozen-lockfile and follow the README exactly.
- [ ] Run the complete browser suite and manually verify registration, login, welcome completion, preference persistence, archive/blacklist boundaries, password recovery, and logout without deleting local preferences.
- [ ] Check every documentation link, repository URL, package name, workflow badge, license reference, security-reporting path, and maintainer contact.
- [ ] Confirm the final tree is clean, check:public passes, and cleanup commits contain no unrelated product changes.
- [ ] Obtain explicit maintainer approval before changing repository visibility, tagging, enabling branch protection, publishing, rotating secrets, or rewriting history.
- [ ] Commit any final corrections: chore: finalize public repository readiness

## Self-review

- Product identity, setup, security boundaries, contribution rules, license, conduct, CI, and publication hygiene each have a task.
- The plan preserves authentication, ownership, preferences, and status semantics.
- The plan does not depend on removed private planning artifacts.
- External publication actions remain outside the plan’s authorization.
