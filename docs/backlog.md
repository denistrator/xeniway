# Project backlog

This document tracks worthwhile future tasks across product features, bugs, documentation, security, operations, and refactoring. Entries are ideas, not approval to implement them. Re-check the current code and requirements before starting an item; keep implementation scoped and covered by focused tests. Update or remove entries when the code or project direction changes.

## Open tasks

### UI interaction safety, hierarchy, and recovery

- **Plan:** [2026-10-21 UI audit and remediation plan](superpowers/plans/2026-10-21-ui-interaction-audit.md).
- **Implementation:** [UI fixes task plan](superpowers/plans/2026-10-21-ui-fixes-implementation-plan.md) maps every finding to a testable task and records policy decisions that require approval before execution.
- **Current checkpoint:** All currently authorized automated UI-plan tasks are implemented and verified on `codex/confirmation-dialog-focus`, including full offline and ordinary Chromium suites. Broader device/screen-reader review is not recorded.
- **Current checkpoint:** D1 and D3 are complete. The remaining work is intentionally blocked by the policy gates and physical/manual validation recorded in the implementation plan; do not treat this backlog entry as authorization to bypass them.
- **Evidence:** Source review and targeted browser inspection identified draft-loss paths, incomplete confirmation focus behavior, errors outside active dialogs, weak bulk-action hierarchy, and inconsistent offline/account recovery feedback. The plan records evidence, priorities, acceptance checks, and unverified device/layout candidates separately.
- **Direction:** Prioritize work preservation and truthful feedback, then navigation and responsive hierarchy. Borrow HIG interaction principles without copying Apple-native UI. The plan is not authorization to implement fixes.
- **Guardrails:** Preserve owner scoping, CSRF, six statuses, archive/blacklist distinctions, InlineEdit, local-first preferences, and read-only offline behavior. Reuse the existing offline-disclosure, diagnostics, export-association, and measured-bundle entries referenced in the plan instead of duplicating them. Ask before addressing new blockers or broadening scope. No automated style/layout/snapshot tests.

### Make the logout browser workflow independently runnable

- **Where:** `tests/e2e/xeniway.spec.ts`, "logs out and returns to login".
- **Evidence:** Running this test alone after seeding times out before logout: the welcome introduction backdrop intercepts the theme-button click. The test does not complete or dismiss onboarding before interacting with header controls.
- **Possible direction:** Establish the test's own onboarding state or explicitly complete the welcome dialog rather than relying on earlier workflows updating the shared account.
- **Guardrails:** Preserve coverage for theme persistence, private-data cleanup, and real logout; do not bypass the dialog with forced clicks or weaken production onboarding.

### Disambiguate the create-dialog loading announcement browser check

- **Where:** `tests/e2e/xeniway.spec.ts`, "manages focus and escape behavior for the job form dialog", loading assertion after Add job.
- **Evidence:** During the confirmation-focus checkpoint, the run alongside the welcome workflow failed because `getByRole("status")` matched both the board's "Loading applications…" and the lazy form host's "Loading…". The test stopped before exercising create-dialog focus; welcome and the dedicated confirmation workflow passed.
- **Possible direction:** Identify the intended lazy-host announcement semantically while allowing concurrent board loading. Inspect the host's accessible structure before changing the selector.
- **Guardrails:** Preserve the controlled import delay, no-import-before-click check, keyboard containment, Escape behavior and opener restoration. Do not add sleeps, suppress the board announcement, or weaken the loading assertion. Await approval before implementing.

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
- **Why:** Contacts, interview preparation, dated follow-ups, and activity are implemented. Attachments and external integrations remain outside the current workspace.
- **Possible direction:** Consider attaching files and links, integrating calendar or email workflows, and sending scheduled reminders for due follow-up tasks.
- **Guardrails:** Reassess user needs and privacy/security implications before implementation. Keep integrations opt-in, owner-scoped, and separately approved; do not imply attachments, external sync, or automatic reminders exist until implemented.

### Complete data portability with import and JSON

- **Area:** User data portability.
- **Why:** CSV and a ZIP package of application/contact/follow-up CSVs are implemented; import and structured JSON backup/restore are not.
- **Possible direction:** Add JSON as the structured backup/restore format alongside CSV for spreadsheet use, then provide a consistent format choice for import and export.
- **Guardrails:** Keep all imports and exports scoped to the authenticated user. Define validation, duplicate handling, and failure behavior before implementing import. Never include credentials, sessions, or CSRF tokens in exported data.

### Clean up old read notifications

- **Area:** Backend notification retention.
- **Why:** The pending notification-center plan would introduce persistent records; no notification center or retention job exists in current source.
- **Possible direction:** Add a backend cleanup task that deletes notifications read more than 10 days ago.
- **Guardrails:** Never delete unread notifications; test the exact age cutoff and ensure cleanup is safe to run repeatedly. Keep retention cleanup independent from the user-facing notification center workflow.

## Open refactoring tasks

### Investigate intermittent company-research save browser failure

- **Area:** Workspace preparation inline editing and the complete browser workflow.
- **Why:** During the global control-flow refactor, the serial browser suite once failed to display the company-research text after Save. The unchanged workflow passed immediately in isolation. Preparation editing code was unchanged; the surrounding focus and route-handler changes were verified as braces-only AST-equivalent edits. The underlying cause is not established.
- **Possible direction:** Capture the input value, preparation request/response, editor transitions, and focus around Save in repeated full-suite runs to distinguish a timing-sensitive test from a persistence defect.
- **Guardrails:** Preserve one-field preparation patches, owner-scoped writes, CSRF, confirm/cancel behavior, and keyboard focus. Do not weaken assertions or add arbitrary delays.

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

### Investigate measured frontend bundle costs

- **Where:** The shared web entry chunk and `apps/web/src/features/applications/application-workspace` workspace chunk.
- **Why:** Historical October 6–7 analysis attributed roughly 113 KB of a 332 KB emitted workspace chunk to feature-gate/Statsig code and found eager Zod in shared entry downloads. These figures predate the frontend extraction and need remeasurement; they are leads, not current totals or proven removable bytes. The detailed report remains in Git history. Smaller or differently named chunks alone do not establish a net saving.
- **Possible direction:** Investigate a supported upstream way to reduce the feature-gate dependency graph while preserving the existing false-flag resolver and InlineEdit behavior. Inspect shared-contract/preference import boundaries for unnecessary eager schema construction without duplicating validators or removing validation. Profile representative devices and deployment compression/cache behavior before approving further optimization; compare complete route sets and edit responsiveness. On-demand create-form loading is complete and should not be reintroduced as a global eager import.
- **Guardrails:** Preserve accessible read/edit controls, keyboard focus, status selection, validation, and the compact-field unsaved-change warning. Treat a different editor library or return to custom controls as a separate product/architecture decision.

### Reassess CSV export memory use for larger boards

- **Where:** `apps/api/src/db/repositories/applications.ts` (`listForExport`) and `apps/api/src/routes/applications/export-csv.ts` (`serializeApplicationsCsv`).
- **Why:** Export loads application/preparation, contact, and follow-up records in memory, serializes CSV strings, and uses synchronous ZIP compression for the package. Memory and CPU cost scale with account size; activity is not currently serialized.
- **Possible direction:** Measure realistic account sizes before considering batched reads or streamed CSV/ZIP output.
- **Guardrails:** Preserve owner scoping, stable column/order semantics, CSV quoting and formula-injection protection. Do not add exported fields or return misleading partial packages.

### Make exported related records joinable

- **Where:** `apps/api/src/routes/applications/export-csv.ts` and `export.ts`.
- **Evidence:** Contact/follow-up CSVs include `Application ID`, but `applications.csv` has no matching ID column. The ZIP alone cannot reliably associate related rows with applications.
- **Direction:** Agree an explicit export-local association key or approved identifier contract across all three files before changing output.
- **Guardrails:** Keep the package owner-scoped and spreadsheet-safe; update API documentation and CSV/ZIP tests together. This entry does not authorize changing identifier exposure.

### Split API in-memory test support by domain

- **Where:** `apps/api/src/app-test-support.ts`.
- **Why:** `createDependencies()` builds in-memory implementations for accounts, sessions, applications and their events, password resets, and preferences in one function. The size makes it harder to locate a fixture's state and behavior.
- **Possible direction:** Keep one explicit shared state store for cross-domain invariants, and move application/workspace repository behavior and other cohesive domains into focused modules. Avoid splitting every small helper into its own file.
- **Guardrails:** Preserve application ownership checks, event history behavior, and the dependency factory used by API tests. Run the API test suite and retain cross-account isolation coverage.

### Reassess database repository test organization if it grows

- **Where:** `apps/api/src/db/repository.test.ts`.
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
