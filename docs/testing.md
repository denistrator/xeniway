# Testing and CI

## Commands

Run static checks first from the repository root:

```bash
bun run check:public
bun run format:check
bun run lint
bun run typecheck
bun run test
bun run build
git diff --check
```

For a full change, continue with local services and browser tests:

```bash
bunx playwright install chromium
bun run up
bun run db:migrate
bun run db:seed
bun run test:e2e:offline
bun run test:e2e
```

Static checks need no running services. Migrations and seed need PostgreSQL; browser tests additionally need Redis and Chromium, start their own API/web servers, and seed disposable fixtures through global setup. Mailpit is not required. Run browser suites sequentially because they share fixtures and Redis database 15. Stop manual preview first: the offline suite uses ports 3101/4174 and rebuilds the output. See [Operations](operations.md#local-lifecycle) for prerequisites.

Root `test` runs Bun tests under `scripts` and the shared, API, and web Vitest suites. Root `typecheck` checks those workspaces plus `tests/tsconfig.json`; see [TypeScript configuration](architecture.md#typescript-configuration) for browser/Node/worker boundaries and the explicit HTML entry point.

## CI

`.github/workflows/ci.yml` has three ordered jobs:

1. Public repository hygiene checks index/tracked content for forbidden paths and likely secrets.
2. Fast checks install the lockfile dependencies, then run formatting, lint, typecheck, unit tests, and build without services.
3. Service checks start pinned PostgreSQL/Redis, install Chromium, migrate/seed, then run production offline and ordinary browser suites sequentially.

CI pins Bun 1.4.0 and matches Compose's PostgreSQL 16.15 and Redis 7.4.9. Service connection values are masked and scoped to steps that need them. `scripts/run-ci-check.ts` reports failed command names, exit status, and a bounded diagnostic tail with secrets, connection URLs, reset links, cookies, authorization values, email addresses, and reset-mail content redacted. Rerun the named command locally if the sanitized tail is insufficient.

## Test layers and coverage

| Layer | Location | Main coverage |
| --- | --- | --- |
| Repository scripts | `scripts/*.test.ts` | Public-content checks, CI sanitization, preview supervision, SEO/favicon and PWA metadata/assets |
| Shared contracts | `packages/shared/src/index.test.ts` | Input schemas and public response assumptions |
| API | `apps/api/src/**/*.test.ts` | Authentication/CSRF, rate limiting, reset tokens and mail delivery, owner isolation, validation, lifecycle history, repository mapping, seed invariants |
| Web | `apps/web/src/**/*.test.ts(x)` | API error handling, queries, UI behavior, preferences/locales, workspace editing, dialogs, offline lifecycle/storage |
| Browser | `tests/e2e/xeniway.spec.ts` | Real server/database workflows, locale/RTL persistence, welcome/preferences, application lifecycle, activity, keyboard/drag ordering, accessibility |
| Production offline | `tests/e2e/offline.spec.ts` | Built assets/worker, explicit consent, complete downloads, offline reload/navigation, lazy locales, reconnect, logout/account cleanup, storage failure/expiry |

The ordinary config excludes `offline.spec.ts`. The offline config uses fresh Chromium contexts and real seeded services rather than Vite development assets. Coverage describes checked-in assertions, not a guarantee that every current workflow passes. Export-specific tests were intentionally removed pending a [from-scratch rewrite](backlog.md#rewrite-export-tests-from-scratch); CSV/ZIP serialization, export endpoint security, client download handling, and export-button behavior currently have no dedicated automated coverage.

### Focused frontend regressions

- Session-query tests verify one shared `auth/me` request for late-mounting consumers under StrictMode, including signed-out/error results, explicit invalidation, and focus/reconnect recovery. Browser tests count startup, navigation, and reload requests.
- Layout tests verify no create-host mount before Add job, retained pending/error state after close/reopen, and account/logout/loading isolation. The cold-import test is separate because React.lazy caches resolved modules. Browser coverage delays the first import, moves focus while loading, and checks announcement, dialog entry, Escape return to the original opener, reopen, and modal/drawer switching.
- Welcome and preference tests cover completion actions, focus wrapping, backdrop/Escape, immediate local changes, server-authoritative login/register values, account isolation, and preservation of browser preferences on logout. The real-hook StrictMode preference integration catches query-cache notifications during render.
- Board tests preserve all movement keys, ignored/modifier keys, default prevention, canonical status order, and owner-scoped mutations. Locale tests cover four aligned dictionaries, lazy resources, dates, reload persistence, and Hebrew `html[lang]`/`html[dir]`.
- Activity tests cover immutable system events, manual CRUD, newest-first/tie ordering without input mutation, plain-text rendering, supplied-event query isolation, CSRF, failure drafts, and confirmation/focus return.
- Workspace domain tests cover one-field InlineEdit patches, dirty compact warnings, simultaneous drafts, validation, saved metadata, contacts/follow-ups, completion, lifecycle confirmations, offline cancellation, and focus return. Navigation tests cover all collection ordering, empty columns, wraparound, missing/single items, heading focus, and editor reset.

### Offline and PWA regressions

Unit tests use fake IndexedDB and controlled network/worker boundaries. Preserve these distinct regression groups:

- Pure connection/session/download transitions; runtime synchronous guards, scheduled query notifications, operation correlation, disposal/restart, and native channel self-delivery behavior.
- Allowlisted response persistence, corruption/expiry/future-record rejection, validation clocks after reads, generation-scoped writes/cleanup, same-owner supersession, account switching, and quota/storage failures.
- Complete three-board/four-concurrent-workspace preparation, empty collections, stale-detail pruning, progress, consent-only refresh, failed-run cleanup, and no readiness with missing details. Failed collection/detail workers settle before cleanup.
- Stale cold-session results across Retry/login/register, rejected restoration, delayed local/cross-tab logout responses, and no-download transient outages. Cached identity never becomes authentication; persisted mutations and replay remain absent.
- Read-only edit-entry guards, cancellation/focus and confirmation dismissal after disconnect; Retry/new sign-in restores write permission only with fresh proof, and cross-tab removal still revokes device fallback.
- Build revisions and exact public-asset allowlists, no API/token-navigation caches, no automatic/development registration, no initial HTML module hints but retained lazy-route preloading, and all lazy locales/RTL after offline reload.

Control tests use the real provider/runtime with controlled preparation boundaries, not a duplicate mocked lifecycle. Production tests verify actual served HTML, metadata/MIME handling, public assets, worker/cache behavior, IndexedDB downloads, and zero writes on reconnect. Browser warning text is not the preload regression gate.

Automated tests do not cover OS installation UI, standalone launch, icon masking, or Safari. Check those manually on target devices using [PWA installation](operations.md#pwa-installation).

## Test design rules

- Place unit/integration tests beside their source as `*.test.ts` or `*.test.tsx`; put complete browser workflows in `tests/e2e`.
- Add focused coverage for changed shared schemas, API/repository rules, authentication, ownership, lifecycle transitions, user-visible workflows, and accessibility. Keep schema changes data-empty and seed idempotency separate.
- Follow [AGENTS.md](../AGENTS.md#coding-conventions) for lint and rendering conventions. After control-flow extraction, verify narrowing, evaluation order, cancellation, and behavior—not just formatting.
- Test behavior, semantics, accessibility, persistence, and security, not class names/recipes/CSS/layout or visual snapshots. Primitive tests retain disabled state, forwarded refs, and asChild semantics.
- Use accessible roles/names and keyboard paths. Manually inspect light/dark/system, Hebrew RTL, narrow layouts, focus visibility, and reduced motion after styling changes. Preserve floating-label, board, and workspace CSS hooks.
- Workspace/activity tests explicitly call `apps/web/src/test/initialize-test-i18n.ts` to initialize shared i18n and reset English before any per-test locale change. Do not hide initialization in render helpers or impose it on unrelated tests.
- Browser channels are origin-scoped; provider unit tests disable Node's process-wide BroadcastChannel to prevent unrelated parallel test environments from receiving each other's messages.
- Preserve the flat `userPreferences` contract; do not restore deleted legacy keys. Its browser cache is separate from account-scoped IndexedDB downloads.
- The suite has no coverage threshold. Type safety, focused regressions, real database-backed browser flows, and CI checks provide the verification boundary.

## Bundle measurement

For styling/dependency/loading changes:

1. Build the web workspace with `bunx vite build --manifest --sourcemap hidden` for diagnostic manifests/maps. Do not publish diagnostic source maps; do not rebuild while preview measurements are running.
2. Compare fresh cold login, board, and workspace contexts plus actual board → workspace and first Add job navigation. Record build revision, locale/theme, viewport, worker state, and hosting compression/cache policy.
3. Wait for the destination UI and network idle, then collect JS/CSS Resource Timing. Deduplicate asset URLs for emitted totals; report encoded body and transfer bytes separately. Include shared styling/dependencies, not only the entry chunk.
4. Separate explicit offline preparation bytes from ordinary startup. Cached encoded sizes may represent previously downloaded bodies; never subtract cold-route totals to infer warm-navigation cost.
5. Profile representative-device read/edit interactions before claiming runtime improvements. Source-map attribution is approximate emitted bytes—not additive gzip cost, removable code, or CPU time.

Preserve InlineEdit, validation, focus/keyboard behavior, dirty warnings, and lazy locale/create-form boundaries. New optimization proposals belong in [the backlog](backlog.md#investigate-measured-frontend-bundle-costs), not a growing historical benchmark document.
