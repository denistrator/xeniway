# Project backlog

This document tracks worthwhile future tasks across product features, bugs, documentation, security, operations, and refactoring. Entries are ideas, not approval to implement them. Re-check the current code and requirements before starting an item; keep implementation scoped and covered by focused tests. Update or remove entries when the code or project direction changes.

## Open tasks

### Full offline synchronization

- **Area:** Offline application writes beyond read-only downloads.
- **Why:** Read-only device downloads do not permit creating or changing server data while disconnected. Durable local drafts remain separately planned; automatic replay is not implemented.
- **Possible direction:** Define server idempotency, atomic record versions/conflict resolution, temporary-ID dependencies, and ordered recoverable queues before considering full sync.
- **Guardrails:** Require renewed authentication/CSRF, owner isolation, explicit conflict UX, ambiguous-create handling, and regression coverage for retry, deletion, logout, and account switching. This entry does not authorize implementation.

### Choose activity timeline sorting direction

- **Area:** Application activity timeline.
- **Why:** Activity currently always appears newest first. A future user-selected oldest-first view could help review an application's history chronologically.
- **Possible direction:** Add an accessible, localized sorting-direction control. Keep newest first as the default; sorting remains a presentation concern, not an API or stored-event mutation.
- **Guardrails:** Preserve ordering by occurrence time with deterministic ID tie-breaking, leave the supplied event array unchanged, and retain immutable system history and owner-scoped activity access.

### Extend the application workspace

- **Area:** Application management.
- **Why:** The first application workspace should focus on contacts, interview preparation, dated follow-up tasks, and the existing activity timeline. Related capabilities may be useful later but are intentionally outside that first scope.
- **Possible direction:** Consider attaching files and links, integrating calendar or email workflows, and sending scheduled reminders for due follow-up tasks.
- **Guardrails:** Reassess user needs and privacy/security implications before implementation. Keep integrations opt-in, owner-scoped, and separately approved; do not imply attachments, external sync, or automatic reminders exist until implemented.

### Complete data portability with import and JSON

- **Area:** User data portability.
- **Why:** The first CSV export is implemented. The planned portability feature will also support JSON and user-selected formats for import and export.
- **Possible direction:** Add JSON as the structured backup/restore format alongside CSV for spreadsheet use, then provide a consistent format choice for import and export.
- **Guardrails:** Keep all imports and exports scoped to the authenticated user. Define validation, duplicate handling, and failure behavior before implementing import. Never include credentials, sessions, or CSRF tokens in exported data.

### Clean up old read notifications

- **Area:** Backend notification retention.
- **Why:** A persistent notification center will accumulate read notification records over time.
- **Possible direction:** Add a backend cleanup task that deletes notifications read more than 10 days ago.
- **Guardrails:** Never delete unread notifications; test the exact age cutoff and ensure cleanup is safe to run repeatedly. Keep retention cleanup independent from the user-facing notification center workflow.

## Open refactoring tasks

### Investigate order-dependent password-recovery browser failure

- **Area:** Public password-recovery form and browser test initialization.
- **Why:** During workspace-navigation verification, the recovery workflow passed in isolation but failed twice immediately after the new navigation/registration workflow. The captured form had an empty email field and no success status despite the test filling and submitting it. The cause is not established.
- **Possible direction:** Trace form initialization and submission timing across sequential browser contexts; check whether late initialization resets user input. Reproduce before changing implementation or test waits.
- **Guardrails:** Preserve generic unknown-account responses, CSRF, rate limiting, and normal user input. Do not mask the issue with arbitrary delays or weaker assertions.

### Finish the immutable offline/PWA security report

- **Area:** Security-review tooling for the `d487081..3fbb00a` offline/PWA change.
- **Why:** The source review covered 96 changed artifacts, but candidate normalization checked immutable provider line ranges against the shortened workingtree file and rejected them. The scan remains unsealed, with a deferred auth-transition/consent-persistence hypothesis rather than a confirmed vulnerability. The rewrite adds cancellation and regression coverage for stale pre-sign-in responses and cold reconnect checks; these do not prove the entire original persistence hypothesis.
- **Possible direction:** Correct the tool's immutable source binding, then finish validation and report generation against the original revisions. Separately exercise cross-tab account changes with delayed session responses and inspect the final persisted snapshot owner.
- **Guardrails:** Never change the review revisions or falsify locations to satisfy normalization. Preserve owner/consent boundaries, generation-scoped cleanup, and the distinction between a concurrency bug and demonstrated cross-account private-data persistence.

### Track the offline worker bundler deprecation

- **Where:** `apps/web/vite.config.ts` custom injectManifest worker build.
- **Why:** The production PWA build currently emits a nonfatal `inlineDynamicImports` deprecation warning from its bundler integration.
- **Possible direction:** Reassess compatible `vite-plugin-pwa`/bundler versions when that integration supports the replacement option; avoid overriding its generated worker configuration speculatively.
- **Guardrails:** Preserve consent-only preparation, lazy application chunks, generated asset revisions, API exclusion, and production offline browser coverage.

### Keep authenticated header actions within narrow viewports

- **Where:** `apps/web/src/components/site-header.tsx`, the authenticated action/language-control groups.
- **Why:** A production-preview check at 390×844 measured a 411 px document width, with the trailing language control beyond the viewport. The overflow existed before opening the create dialog and remained identical afterward; the dialog itself stayed within the viewport.
- **Additional evidence:** The workspace status-decoration browser check at 390×844 in Hebrew measured a 399 px document width with both the original heading classes and the decorated heading. The RTL overflow therefore also needs coverage independently of the workspace decoration.
- **Possible direction:** Let action groups wrap or adapt their layout at narrow widths while keeping account, Add job, export, theme, and language controls discoverable. Do not conceal the issue with document-wide overflow clipping.
- **Guardrails:** Preserve action order, accessible labels, keyboard focus, touch targets, theme/language behavior, and all four locales including Hebrew RTL. Add narrow-viewport browser assertions.

### Align the CSV browser test with the current export label

- **Where:** `tests/e2e/xeniway.spec.ts` CSV download workflow and `apps/web/src/i18n/locales/en.ts`.
- **Why:** The checked-in UI and component test use “Export package”, but the browser workflow expects “Export CSV” twice. This fails the serial suite before the remaining workflows can run.
- **Possible direction:** Align the browser assertions with the intended current copy, or explicitly approve a copy change across dictionaries and tests.
- **Guardrails:** Preserve header action order, authenticated download behavior, CSV filename/content assertions, and all four locales. Do not skip this workflow in the permanent test configuration.

### Investigate measured frontend bundle costs

- **Where:** The shared web entry chunk and `apps/web/src/features/applications/application-workspace` workspace chunk.
- **Why:** After deferring the create form until first use, the [October 2026 route measurements and byte attribution](frontend-bundle-cost.md) show about 182 KB compressed JS/CSS body for login, 192 KB for the board, and 283 KB for a direct workspace load. Board → workspace still adds about 101 KB compressed. Approximately 113 KB of the workspace's 332 KB emitted JavaScript is feature-gate/Statsig dependency code; the entry is dominated by React DOM (207 KB) and Zod (82 KB). The shared styling chunk remains about 15 KB modeled gzip. Smaller or differently named chunks alone do not establish a net saving.
- **Possible direction:** Investigate a supported upstream way to reduce the feature-gate dependency graph while preserving the existing false-flag resolver and InlineEdit behavior. Inspect shared-contract/preference import boundaries for unnecessary eager schema construction without duplicating validators or removing validation. Profile representative devices and deployment compression/cache behavior before approving further optimization; compare complete route sets and edit responsiveness. On-demand create-form loading is complete and should not be reintroduced as a global eager import.
- **Guardrails:** Preserve accessible read/edit controls, keyboard focus, status selection, validation, and the compact-field unsaved-change warning. Treat a different editor library or return to custom controls as a separate product/architecture decision.

### Reassess CSV export memory use for larger boards

- **Where:** `apps/api/src/db/repositories/applications.ts` (`listForExport`) and `apps/api/src/routes/applications/export-csv.ts` (`serializeApplicationsCsv`).
- **Why:** Export currently loads every owned application and event, then builds a second in-memory CSV string. This is simple for current board sizes but scales memory with the full export.
- **Possible direction:** If board sizes or export latency become a concern, consider a database cursor/batched read and streamed CSV response while keeping event grouping bounded per application.
- **Guardrails:** Preserve user scoping, stable column/order semantics, CSV quoting and formula-injection protection, and inclusion of the derived application-created event. Keep failure handling from returning a misleading partial export.

### Split API in-memory test support by domain

- **Where:** `apps/api/src/app-test-support.ts` (currently a 538-line module).
- **Why:** `createDependencies()` builds in-memory implementations for accounts, sessions, applications and their events, password resets, and preferences in one function. The size makes it harder to locate a fixture's state and behavior.
- **Possible direction:** Keep one explicit shared state store for cross-domain invariants, and move application/workspace repository behavior and other cohesive domains into focused modules. Avoid splitting every small helper into its own file.
- **Guardrails:** Preserve application ownership checks, event history behavior, and the dependency factory used by API tests. Run the API test suite and retain cross-account isolation coverage.

### Reassess database repository test organization if it grows

- **Where:** `apps/api/src/db/repository.test.ts` (currently 334 lines).
- **Why:** It covers row mapping, application-history transactions, password resets, and user preferences in one test file.
- **Possible direction:** Split by independently understandable workflow only if ongoing changes make navigation or ownership difficult. Its current `describe` groups may be sufficient, so this is not urgent.
- **Guardrails:** Keep database setup shared where that improves clarity; do not split solely to meet a line-count target.

### Make offline preparation failures diagnosable without exposing private data

- **Where:** `apps/web/src/features/offline/offline-access-runtime.ts`, `prepare-offline.ts`, and the worker preparation message boundary.
- **Why:** Preparation discards the caught exception and shows the same storage-oriented message for API failures, worker activation/MIME/revision failures, ownership changes, and IndexedDB/Cache Storage errors. A reported failure currently requires caught-exception breakpoints or worker inspection to identify its stage.
- **Possible direction:** Add a bounded, sanitized diagnostic stage/error code for local troubleshooting while retaining translated user-facing copy. Do not log complete API responses, application content, email addresses, cookies, CSRF tokens, or raw persisted snapshots.
- **Guardrails:** Preserve failure cleanup, no partial readiness, generation/ownership checks, and read-only offline behavior. Cover asset, API, storage, and superseded-run failures; distinguish deliberately superseded work from actionable failures.

### Review server error observability separately

- **Where:** `apps/api/src/app.ts` and the server logging/configuration path.
- **Why:** Unexpected API failures are returned as generic internal errors; operators may need a reliable way to diagnose them without exposing implementation details to clients.
- **Possible direction:** First map existing logging and deployment behavior, then consider structured server-side diagnostics if a genuine gap remains.
- **Guardrails:** This is an investigation, not a request to change error behavior. Never return stack traces, secrets, or internal details to clients; do not weaken security controls.

## Explicitly not planned

- A generic CRUD router factory: route-specific behavior is clearer for this API, and repository guidance says not to introduce this abstraction.
- Splitting modules only to satisfy arbitrary line limits. Prefer cohesive responsibilities and readable tests over file-count targets.
