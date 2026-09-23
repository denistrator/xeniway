# Application Workspace Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give each application a dedicated, editable workspace reachable from Applications, Archive, and Blacklist, combining its existing details and activity with contacts, interview preparation, and dated follow-up tasks.

**Architecture:** Add a dedicated authenticated `/applications/:id` page. Extend the owner-scoped application detail response to include interview-preparation content, contacts, and follow-up tasks; keep contacts and tasks in their own relational tables and interview notes in a one-to-one workspace table. Give each editable section focused API operations and query mutations, reuse the existing activity timeline, and show only lifecycle actions valid for the application's current board.

**Tech Stack:** Bun workspaces, TypeScript, React, React Router, TanStack Query, Elysia, Zod, Drizzle ORM, PostgreSQL, Vitest, Playwright, i18next.

## Global Constraints

- Preserve the six canonical statuses and treat archive/blacklist as independent lifecycle states.
- Scope every application, workspace, contact, task, and event operation to the authenticated `userId`; return `NOT_FOUND` for missing or non-owned nested resources.
- Require the session CSRF token for every mutation; validate all request bodies with schemas from `packages/shared`.
- Keep user-authored notes as plain text; permit only `http:` and `https:` links for contact profile URLs.
- Keep the page usable by keyboard and screen readers, responsive, RTL-compatible, and translated in `en`, `ru`, `uk`, and `he`.
- Follow the repository's current migration registry, repository boundary, route response envelopes, and query invalidation patterns.
- Do not include attachments, calendar/email integrations, or automatic reminders in this implementation; record them in `docs/backlog.md`.
- Preserve any unrelated user changes; run `bun run format` after edits and relevant checks before reporting completion.

## Agreed Product Design

The application workspace is a dedicated route, not an overlay, and is available regardless of whether the application is active, archived, or blacklisted. It combines the existing application fields and activity timeline with:

- **Contacts:** zero or more employer contacts with required name and role, optional email, phone, profile URL, and plain-text notes.
- **Interview preparation:** editable company research, talking points, and questions for the interviewer. Empty sections remain optional.
- **Follow-up tasks:** one or more tasks with a required title and due date, optional notes, and a completion timestamp. Incomplete tasks appear before completed tasks; tasks remain visible after completion.
- **Lifecycle actions:** active applications can be edited, archived, or blacklisted; archived applications can be restored or permanently deleted; blacklisted applications can be restored or permanently deleted.

Files and links as attachments, integrations, notifications, and reminder scheduling are explicitly deferred to the backlog.

Preparation fields are independently editable and may be explicitly cleared with `null`; omitted fields are unchanged. Completing a follow-up is idempotent and terminal in v1 (no reopen action); deleting remains available. These workspace record changes do not create additional activity events: follow-up completion state is shown in the follow-up section, while the existing timeline remains the record of application lifecycle and candidate-entered interaction events.

## File Map

- `packages/shared/src/index.ts` — Zod inputs and public types for workspace, contacts, follow-up tasks, and detail response.
- `apps/api/src/db/schema.ts` — Drizzle definitions for `application_workspaces`, `application_contacts`, and `application_follow_up_tasks`.
- `apps/api/drizzle/0010_application_workspace.sql` — schema-only migration, foreign keys, indexes, and cascade behavior.
- `apps/api/src/db/migrate.ts` — ordered migration registration.
- `apps/api/src/db/repositories/types.ts` — repository contracts and row types.
- `apps/api/src/db/repositories/mappers.ts` — date-safe mapping from database rows to public contracts.
- `apps/api/src/db/repositories/applications.ts` — owner-scoped reads/writes and transactions for workspace data.
- `apps/api/src/db/repository.test.ts` — relational persistence, ownership, ordering, and cascade coverage.
- `apps/api/src/app-test-support.ts` — in-memory repository implementation used by route tests.
- `apps/api/src/routes/applications/item.ts` — detail response expanded with workspace data.
- `apps/api/src/routes/applications/workspace.ts` — preparation, contact, and follow-up endpoints.
- `apps/api/src/routes/applications/index.ts` — register workspace routes.
- `apps/api/src/applications.test.ts` — validation, authentication, CSRF, lifecycle, and owner-isolation tests.
- `apps/web/src/lib/api.ts` — detail and workspace HTTP calls plus query keys.
- `apps/web/src/lib/queries.ts` — detail query and focused mutation hooks with cache invalidation.
- `apps/web/src/app-routes.tsx` — lazy authenticated workspace route.
- `apps/web/src/features/applications/application-workspace/` — page, sections, and focused section forms/hooks.
- `apps/web/src/features/applications/job-card.tsx` — make active card navigation explicit while preserving keyboard and drag-and-drop behavior.
- `apps/web/src/features/applications/application-collection-card.tsx` — add a details link without removing existing archive/blacklist controls or activity access.
- `apps/web/src/i18n/locales/{en,ru,uk,he}.ts` — aligned workspace labels, help text, validation, and error messages.
- `tests/e2e/xeniway.spec.ts` — browser workflows for navigation and workspace editing across all three boards.
- `docs/api.md`, `docs/database.md`, `docs/testing.md` — document contracts, schema, and verification coverage.
- `docs/backlog.md` — track explicitly deferred workspace extensions.

## Task 1: Define Workspace Contracts

**Files:** `packages/shared/src/index.ts`, `packages/shared/src/index.test.ts`

- [ ] Add Zod schemas and exported types for workspace updates, contact create/update, and follow-up create/update.
- [ ] Keep update schemas nonempty and partial; trim text; cap user text at 10,000 characters; bound names/roles/titles to 255 characters, phone to 100, email to 255, and profile URLs to 500.
- [ ] Require profile links to use `http:` or `https:`. Require follow-up `dueDate` to be an ISO calendar date. Do not accept `userId`, `applicationId`, timestamps, or completion state from create input.
- [ ] Define response types with stable shapes:

```ts
export type ApplicationPreparation = {
  companyResearch: string | null;
  talkingPoints: string | null;
  interviewerQuestions: string | null;
  updatedAt: string | null;
};

export type ApplicationContact = {
  id: number;
  applicationId: number;
  name: string;
  role: string;
  email: string | null;
  phone: string | null;
  profileUrl: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ApplicationFollowUpTask = {
  id: number;
  applicationId: number;
  title: string;
  dueDate: string;
  notes: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
};
```

- [ ] Extend `ApplicationDetailResponse` to return `application`, `events`, `preparation`, `contacts`, and `followUpTasks`.
- [ ] Add schema tests for valid data, trimming, upper bounds, invalid dates, unsafe URL schemes, empty updates, null-clearing behavior, and rejected ownership/completion fields.
- [ ] Run `bun run --cwd packages/shared test` and `bun run --cwd packages/shared typecheck`; expect all shared checks to pass.

## Task 2: Add Relational Schema and Migration

**Files:** `apps/api/src/db/schema.ts`, `apps/api/drizzle/0010_application_workspace.sql`, `apps/api/src/db/migrate.ts`

- [ ] Add one-to-one `application_workspaces` keyed by `application_id`, containing nullable company research, talking points, interviewer questions, and timestamps.
- [ ] Add `application_contacts` with generated ID, `user_id`, `application_id`, validated fields, timestamps, and an index ordered for stable contact listing.
- [ ] Add `application_follow_up_tasks` with generated ID, `user_id`, `application_id`, required `due_date`, nullable `completed_at`, notes, timestamps, and an index on `(application_id, completed_at, due_date, id)`.
- [ ] Add cascading foreign keys to users and applications. Keep explicit `user_id` columns so ownership is checked in every query; add indexes for owner-scoped operations.
- [ ] Make migration rerunnable using the project's migration runner convention and register ID `0010_application_workspace` after `0009_application_events`.
- [ ] Do not add a backfill: all new sections are optional and existing applications should read as empty preparation, contacts, and tasks.
- [ ] Run `bun run db:migrate` against local PostgreSQL, then inspect generated tables and indexes; rerun migration and confirm it skips the applied ID.

## Task 3: Implement Repository Persistence and Mapping

**Files:** `apps/api/src/db/repositories/types.ts`, `apps/api/src/db/repositories/mappers.ts`, `apps/api/src/db/repositories/applications.ts`, `apps/api/src/db/repository.test.ts`

- [ ] Add an `ApplicationWorkspaceRepository` contract (or cohesive methods on `ApplicationRepository`) for loading and updating preparation, listing/creating/updating/deleting contacts, and listing/creating/updating/deleting follow-up tasks.
- [ ] Use inputs from shared types. Return `null`/`false` for missing, non-owned, or wrong-parent resources instead of leaking ownership.
- [ ] Implement detail loading so the workspace, contacts, and tasks are fetched in a bounded number of queries. Sort contacts by creation time then ID; sort tasks with incomplete first, then due date ascending and ID ascending, then completed tasks by completion time and ID.
- [ ] Upsert preparation by application ID in a transaction and only after confirming the application is owned, including archived and blacklisted records.
- [ ] On contact/task mutation, require both `user_id` and `application_id` in predicates. Use database cascade deletion with parent application deletion.
- [ ] Map dates to ISO calendar date strings and timestamps to ISO datetimes. Return empty preparation fields and empty arrays when no related rows exist.
- [ ] Add repository tests for empty state, sorting, owner isolation, wrong-application child IDs, update/delete behavior, and cascade deletion.
- [ ] Run `bun run --cwd apps/api test -- src/db/repository.test.ts`; expect persistence tests to pass with the configured test database.

## Task 4: Expose Owner-Scoped Workspace API

**Files:** `apps/api/src/routes/applications/item.ts`, `apps/api/src/routes/applications/workspace.ts`, `apps/api/src/routes/applications/index.ts`, `apps/api/src/applications.test.ts`, `apps/api/src/app-test-support.ts`

- [ ] Extend `GET /api/applications/:id` to return the five-part detail response. Preserve `anyState: true` behavior so all three boards use the same endpoint.
- [ ] Add `PUT /api/applications/:id/preparation` for partial nonempty preparation updates.
- [ ] Add `POST /api/applications/:id/contacts`, `PATCH /api/applications/:id/contacts/:contactId`, and `DELETE /api/applications/:id/contacts/:contactId`.
- [ ] Add `POST /api/applications/:id/follow-ups`, `PATCH /api/applications/:id/follow-ups/:taskId`, `POST /api/applications/:id/follow-ups/:taskId/complete`, and `DELETE /api/applications/:id/follow-ups/:taskId`.
- [ ] Return standard envelopes: preparation/contact/task mutation responses contain the saved resource; deletes return `{ data: { message } }`; create returns `201`.
- [ ] Require authenticated session on reads and authenticated session plus CSRF on all writes. Parse both IDs and validate request bodies before repository calls. Use consistent `INVALID_ID`, `VALIDATION_ERROR`, and `NOT_FOUND` errors.
- [ ] Completion endpoint sets `completedAt` on the server; clients cannot set or clear it through ordinary task update. Make completion idempotent and do not add a reopen endpoint in v1.
- [ ] Update in-memory repository support so route tests model ownership, parent/child relationships, ordering, and timestamps consistently.
- [ ] Add route tests for valid CRUD, archived/blacklisted access, missing CSRF, malformed fields/IDs, cross-user access, wrong-parent child IDs, and completion transitions.
- [ ] Run `bun run --cwd apps/api test`; expect all API and repository tests to pass.

## Task 5: Add Web Data Access and Cache Behavior

**Files:** `apps/web/src/lib/api.ts`, `apps/web/src/lib/queries.ts`, `apps/web/src/lib/queries.test.tsx`

- [ ] Add typed API functions for preparation, contacts, and follow-ups using shared request/response types and CSRF for writes.
- [ ] Expand the detail query selection to expose all workspace sections.
- [ ] Add focused mutation hooks. After successful mutation, invalidate `applicationKeys.detail(applicationId)`; also invalidate `applicationKeys.all` when a lifecycle/application update can change board listings.
- [ ] Keep server-owned workspace data in TanStack Query; avoid duplicating it in Redux or local storage.
- [ ] Test request method/path/body/CSRF behavior and query invalidation for each mutation class.
- [ ] Run `bun run --cwd apps/web test -- src/lib/queries.test.tsx` and `bun run --cwd apps/web typecheck`.

## Task 6: Build Workspace Sections and Forms

**Files:** create focused modules under `apps/web/src/features/applications/application-workspace/`, including `application-workspace-sections.test.tsx`; use existing `components/ui/input.tsx`, `components/ui/card.tsx`, activity components, and confirmation modal.

- [ ] Build a preparation section with three independently editable plain-text fields. Save a section through the preparation endpoint; show pending, saved, and error states with live announcements.
- [ ] Build a contacts section with an add/edit form and contact cards. Show email/phone as actionable links only when present; render profile links with safe external-link attributes and validated HTTP(S) URLs.
- [ ] Build a follow-up section with title, required date, optional notes, completion and delete actions. Keep incomplete tasks visually distinct and before completed tasks; make status clear without color alone.
- [ ] Keep forms labeled, keyboard operable, responsive, RTL-safe, and focused on validation errors. Avoid a mixed logic/template TSX file over 80 lines by separating state/validation hooks and focused templates when necessary.
- [ ] Add translated accessible labels, validation errors, success/error messages, and confirmations to all four dictionaries in the same structural shape.
- [ ] Add component tests for validation, save/cancel, task completion/deletion, pending/error display, links, and empty states.
- [ ] Run `bun run --cwd apps/web test -- src/features/applications/application-workspace/application-workspace-sections.test.tsx` and `bun run --cwd apps/web typecheck`.

## Task 7: Add the Dedicated Route and Board Navigation

**Files:** `apps/web/src/app-routes.tsx`, create `apps/web/src/features/applications/application-workspace/application-workspace-page.tsx` and `apps/web/src/features/applications/application-workspace/application-workspace-page.test.tsx`, `apps/web/src/features/applications/job-card.tsx`, `apps/web/src/features/applications/application-collection-card.tsx`, related tests.

- [x] Add lazy authenticated route `/applications/:id`; parse only positive integer IDs and show a not-found state for invalid IDs or API `NOT_FOUND`.
- [x] Render application header (company, role, status, location, salary, job URL, applied date), preparation, contacts, follow-ups, and existing `ApplicationActivity` in distinct labeled sections.
- [x] Add a back link that follows the application's current board state (`/`, `/archive`, or `/blacklist`), not a user-supplied return URL.
- [x] Keep edit/archive/blacklist/restore/permanent-delete actions appropriate to the current board, reusing existing confirmation behavior and mutations.
- [x] Add an explicit details link/action on active, archived, and blacklisted cards. For active cards, preserve keyboard reordering and DnD; change the card's primary navigation in a way that does not break drag gestures or Arrow/Home/End shortcuts. Move editing to the workspace action.
- [x] Ensure screen-reader title, page heading hierarchy, loading/error states, skip-link behavior, focus-visible indicators, and mobile single-column layout.
- [x] Add component/router tests for route state, board-specific action sets, invalid IDs, loading/errors, and navigation from all three boards.
- [x] Run `bun run --cwd apps/web test -- src/features/applications/application-workspace/application-workspace-page.test.tsx` and `bun run --cwd apps/web typecheck`.

## Task 8: End-to-End Coverage and Documentation

**Files:** `tests/e2e/xeniway.spec.ts`, `docs/api.md`, `docs/database.md`, `docs/testing.md`, `docs/backlog.md`, README links only if required.

- [x] Add Playwright workflows that create/open an application, edit preparation, add/edit/delete contacts, create/complete/delete follow-ups, verify activity remains available, and navigate back to the correct board.
- [x] Cover opening workspace from active, archived, and blacklisted boards and verify each board exposes only valid lifecycle actions. Verify another account cannot read or mutate nested workspace data.
- [x] Document the new tables and migration, detail-response additions, endpoint methods/bodies/responses, completion behavior, sorting, validation, and ownership/CSRF rules.
- [x] Add backlog entries for attachments/file upload, calendar/email integration, and scheduled/automatic reminders, each clearly marked as a future idea rather than committed behavior.
- [x] Format changed TypeScript with Biome and run typecheck, unit tests, build, migration, seed, and E2E verification. The full `bun run lint` command was checked and reports a pre-existing formatting issue in `apps/web/src/components/site-header.tsx`; that unrelated file was left untouched.
- [x] Review `git diff` for security issues, scope creep, unused translations, and accidental changes to existing user work; report any checks that cannot run due to unavailable services.

## Self-Review

- **Coverage:** The design's route, all three boards, all structured data sections, activity reuse, server persistence, owner/CSRF protections, translations, accessibility, tests, docs, and deferred work are assigned above.
- **Placeholder scan:** No TODO/TBD implementation steps are used. API shapes, null-clearing, sorting, task completion semantics, and timeline behavior are defined.
- **Type consistency:** Public field names are consistent across schemas and response types (`preparation`, `contacts`, `followUpTasks`; `dueDate`, `completedAt`). Repository and API tasks use application-scoped nested resources, while client cache keys use the established `applicationKeys.detail(id)` convention.
- **Scope:** Attachments, external integrations, and automatic reminders are deferred. Contact and follow-up CRUD plus a detail workspace form one cohesive feature, though implementation should preserve task boundaries and commit each independently testable deliverable.
