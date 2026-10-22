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

Static checks need no running services. Migrations and seed need PostgreSQL; browser tests additionally need Redis and Chromium, start and own their API/web servers, and seed disposable fixtures through global setup. Mailpit is not required. Run browser suites sequentially because they share fixtures and Redis database 15. Ordinary browser tests use ports 3102/4175; the offline suite uses ports 3101/4174 and rebuilds the output. Neither uses or stops `bun run dev`. See [Operations](operations.md#local-lifecycle) for prerequisites.

Root `test` runs Bun tests under `scripts` and the shared, API, and web Vitest suites. Root `typecheck` checks those workspaces plus `tests/tsconfig.json`; see [TypeScript configuration](architecture.md#typescript-configuration) for browser/Node/worker boundaries and automatic browser source discovery. Component behavior tests use `foo.test.tsx`; optional focused view-model tests use `foo.model.test.ts`. Avoid same-basename `.test.ts`/`.test.tsx` pairs so both files remain discoverable.

## CI

`.github/workflows/ci.yml` has three ordered jobs:

1. Public repository hygiene checks index/tracked content for forbidden paths and likely secrets.
2. Fast checks install the lockfile dependencies, then run formatting, lint, typecheck, unit tests, and build without services.
3. Service checks start pinned PostgreSQL/Redis, install Chromium, migrate/seed, then run production offline and ordinary browser suites sequentially.

CI pins Bun 1.4.0 and matches Compose's PostgreSQL 16.15 and Redis 7.4.9. Service connection values are masked and scoped to steps that need them. `scripts/run-ci-check.ts` reports failed command names, exit status, and a bounded diagnostic tail with secrets, connection URLs, reset links, cookies, authorization values, email addresses, and reset-mail content redacted. Rerun the named command locally if the sanitized tail is insufficient.

## Test layers and coverage

`apps/web/src/pages/about-page.test.tsx` covers the public product guide, six canonical status labels, data-access limits, localized headings, and aligned About dictionaries. Browser coverage checks anonymous access, keyboard opening/closing of the technology disclosure, and Hebrew language/direction after reload at a mobile viewport. Do not add layout or class assertions; inspect the page visually in both directions.

| Layer | Location | Main coverage |
| --- | --- | --- |
| Repository scripts | `scripts/*.test.ts` | Public-content checks, CI sanitization, preview supervision, SEO/favicon and PWA metadata/assets |
| Shared contracts | `packages/shared/src/index.test.ts` | Input schemas and public response assumptions |
| API | `apps/api/src/**/*.test.ts` | Authentication/CSRF, rate limiting, reset tokens and mail delivery, owner isolation, validation, lifecycle history, repository mapping, seed invariants |
| Web | `apps/web/src/**/*.test.ts(x)` | API error handling, queries, UI behavior, preferences/locales, workspace editing, dialogs, offline lifecycle/storage |
| Browser | `tests/e2e/xeniway.spec.ts`, `tests/e2e/export.spec.ts`, `tests/e2e/confirmation.spec.ts` | Real server/database workflows, locale/RTL persistence, welcome/preferences, application lifecycle, activity, keyboard/drag ordering, confirmation focus, accessibility, decoded export downloads and retry |
| Production offline | `tests/e2e/offline.spec.ts` | Built assets/worker, explicit consent, complete downloads, offline reload/navigation, lazy locales, reconnect, logout/account cleanup, storage failure/expiry |

The ordinary config excludes `offline.spec.ts`. The offline config uses fresh Chromium contexts and real seeded services rather than Vite development assets. Coverage describes checked-in assertions, not a guarantee that every current workflow passes.

### Export regression coverage

The export tests were rewritten against the current [CSV/ZIP contract](api.md#data-export). Test-only `csv-parse` and `fflate` dependencies parse CSV records and unzip downloads; `tests/support/export.ts` contains expected headers independently of the production field definitions and preserves the UTF-8 BOM while decoding ZIP entries. No visual or style assertions are used.

- `apps/api/src/routes/applications/export-csv.test.ts`: ordered application/contact/follow-up allowlists, field mapping and exclusions, all board labels, formula-like prefixes including whitespace/BOM, quoting/newlines/Unicode, nullable fields, BOM and CRLF, and header-only exports.
- `apps/api/src/export.test.ts`: anonymous/invalid-session rejection before repository reads, owner isolation across every file and board, ignored caller-supplied owner IDs, response headers and filenames, CSV/ZIP agreement, missing preparation defaults, empty packages, and generic repository-failure responses.
- `apps/web/src/lib/api-export.test.ts`: session credentials, binary payload and filenames, safe filename fallback, expired-session notification, structured/non-JSON/network failures, and offline/unverified request blocking.
- `apps/web/src/features/data-export/csv-export-button.test.tsx`: real query/mutation flow, pending duplicate-click prevention, named download/temporary URL cleanup, accessible errors and retry, offline disabling, and suppression of a prior owner's pending download after logout or account switching. Only the network and browser download APIs unavailable in jsdom are substituted.
- `tests/e2e/export.spec.ts`: keyboard download from Settings against real PostgreSQL-backed endpoints; ZIP entry names, decoded records from active/archive/blacklist boards, related parent IDs, exclusion of a second account's records, private-field omissions, formula protection, and failure/pending/retry behavior. Download paths are Playwright-managed artifacts. Fresh accounts isolate fixtures from development seed users.

Settings/header regressions additionally cover the action's location, signed-out absence, online availability, offline disabling, and translated section semantics. The known inability to join related rows to application rows using the ZIP alone remains a [separate backlog item](backlog.md#make-exported-related-records-joinable); tests preserve the current contract rather than adding identifiers.

### Focused frontend regressions

- Shared confirmation tests cover Tab/Shift+Tab containment, disabled confirmation, Escape/backdrop/button dismissal, opener and page-fallback restoration, explicit caller focus destinations, StrictMode, callback updates, stacked/replacement dialogs, and inert-background restoration. Confirmations render through body-level portals; background isolation operates on body siblings, so updates inside the application remain isolated without observing document mutations. Keyboard handling is bound to the dialog rather than a document listener. Activity retains its Add activity/disabled-section focus destination through `returnFocusRef`; restoration runs after dialog removal. The focused browser workflow opens both bulk-deletion stages, cancels without sending a deletion request, and verifies real Chromium focus containment and return. Do not add class or layout assertions.
- Board JobCards are links with application URLs. Cover normal in-app clicks, Enter activation, modified-click/new-tab behavior, pointer drag-and-drop, and keyboard reordering. Keep card locators semantic (`link` rather than `button`); do not assert decorative styling.

- Board-wide deletion tests render the real Home, Archive, and Blacklist pages with query-backed collections. They verify unfiltered scope/count, pending/failure/retry, a synchronous duplicate-submit guard, cancellation, empty/read-only disabling, real invalidation and focus after rows disappear. Pending tests use controlled promises; only the active board's existing five-second countdown uses a fake clock. Browser regressions create fresh test-owned accounts with records on multiple boards, hold/reject the first request, then explicitly retry against the real endpoint and verify that the other board survives. Keep destructive browser requests confined to those disposable accounts. Active-board cancellation coverage retains both confirmations, countdown and keyboard containment; Archive/Blacklist keep their single confirmation.

- Settings contains the expanded Offline access section; other routes show only the disconnected header indicator. Cover browser-offline and API-unavailable states, Retry recovery, route changes during preparation, signed-out access, locale/RTL names, and production offline reloads. Preserve consent, refresh/removal, account isolation, and live status announcements; do not assert decorative icon styling.
- Settings Theme and Language selects share their update handlers with the header shortcuts. Cover keyboard selection and focus return, synchronization in both directions, authenticated preference saves, translated labels, RTL, and reload persistence. Keep theme and language locally usable without authentication or while offline; do not add style assertions.
- Header selector tests cover complete accessible names in all four locales. Browser workflows use localized names after language changes and reloads. Manually inspect signed-in and signed-out headers at 320, 390, 768, and 1280 px in LTR and Hebrew RTL, including long emails, keyboard focus, and the open language menu. Keep layout and overflow measurements out of automated style tests.
- Layout tests gate the real lazy form-host import with a controlled promise, verify no import before authenticated opening and the pending loading announcement, then await actual module completion inside async React `act`. Do not rely on a one-second DOM query to measure cold import performance. The browser dialog test separately delays the module request and checks focus return. Workspace navigation tests paste and assert an unsaved draft before navigating; they retain editor-reset, column order, wraparound, and destination-focus assertions without simulating unnecessary per-character input.

- Session-query tests verify one shared `auth/me` request for late-mounting consumers under StrictMode, including signed-out/error results, explicit invalidation, and focus/reconnect recovery. Browser tests count startup, navigation, and reload requests.
- Layout tests verify no create-host mount before Add job, retained pending/error state after close/reopen, and account/logout/loading isolation. The cold-import test is separate because React.lazy caches resolved modules. Browser coverage delays the first import, moves focus while loading, and checks announcement, dialog entry, Escape return to the original opener, reopen, and modal/drawer switching.
- Welcome and preference tests cover completion actions, focus wrapping, backdrop/Escape, immediate local changes, server-authoritative login/register values, account isolation, and preservation of browser preferences on logout. The real-hook StrictMode preference integration catches query-cache notifications during render.
- Board tests preserve all movement keys, ignored/modifier keys, default prevention, canonical status order, and owner-scoped mutations. Locale tests cover four aligned dictionaries, lazy resources, dates, reload persistence, and Hebrew `html[lang]`/`html[dir]`.
- Activity tests cover immutable system events, manual CRUD, newest-first/tie ordering without input mutation, plain-text rendering, supplied-event query isolation, CSRF, failure drafts, and confirmation/focus return.
- Workspace domain tests cover one-field InlineEdit patches, dirty compact warnings, simultaneous drafts, validation, saved metadata, contacts/follow-ups, completion, lifecycle confirmations, offline cancellation, and focus return. Navigation tests cover all collection ordering, empty columns, wraparound, missing/single items, heading focus, and editor reset.
- Dirty compact-warning regressions preserve exact whitespace and editor focus through Escape, backdrop, Keep editing, offline dismissal and a failed save; they check zero writes until explicit Save, one-field payloads, cancellation of a pending field switch, and explicit discard before switching. `tests/e2e/confirmation.spec.ts` exercises these choices against the real API, then checks the Hebrew labels/direction and language persistence after reload at a mobile viewport. Related-record switching and route departure remain separate pending work; do not describe these compact tests as whole-workspace draft protection.

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
