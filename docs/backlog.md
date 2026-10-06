# Project backlog

This document tracks worthwhile future tasks across product features, bugs, documentation, security, operations, and refactoring. Entries are ideas, not approval to implement them. Re-check the current code and requirements before starting an item; keep implementation scoped and covered by focused tests. Update or remove entries when the code or project direction changes.

## Open tasks

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

### Align the CSV browser test with the current export label

- **Where:** `tests/e2e/xeniway.spec.ts` CSV download workflow and `apps/web/src/i18n/locales/en.ts`.
- **Why:** The checked-in UI and component test use “Export package”, but the browser workflow expects “Export CSV” twice. This fails the serial suite before the remaining workflows can run.
- **Possible direction:** Align the browser assertions with the intended current copy, or explicitly approve a copy change across dictionaries and tests.
- **Guardrails:** Preserve header action order, authenticated download behavior, CSV filename/content assertions, and all four locales. Do not skip this workflow in the permanent test configuration.

### Investigate measured frontend bundle costs

- **Where:** The shared web entry chunk and `apps/web/src/features/applications/application-workspace` workspace chunk.
- **Why:** The [October 2026 production route baseline](frontend-bundle-cost.md) measured about 186 KB compressed JS/CSS body for login, 196 KB for the board, and 287 KB for a direct workspace load. Board → workspace adds about 101 KB compressed; the shared styling chunk is about 45 KB emitted / 15 KB modeled gzip and is reused during SPA navigation. The smaller entry chunk alone does not establish a net migration saving.
- **Possible direction:** Attribute the large entry/global form dependencies and workspace dependency bytes separately, then measure interaction performance and actual deployment compression/cache behavior before approving optimization. Public routes also request global job-manager/form chunks. Preserve the baseline and compare complete route asset sets, not individual entry sizes.
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

### Review server error observability separately

- **Where:** `apps/api/src/app.ts` and the server logging/configuration path.
- **Why:** Unexpected API failures are returned as generic internal errors; operators may need a reliable way to diagnose them without exposing implementation details to clients.
- **Possible direction:** First map existing logging and deployment behavior, then consider structured server-side diagnostics if a genuine gap remains.
- **Guardrails:** This is an investigation, not a request to change error behavior. Never return stack traces, secrets, or internal details to clients; do not weaken security controls.

## Explicitly not planned

- A generic CRUD router factory: route-specific behavior is clearer for this API, and repository guidance says not to introduce this abstraction.
- Splitting modules only to satisfy arbitrary line limits. Prefer cohesive responsibilities and readable tests over file-count targets.
