# Application Activity Timeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a rich, application-specific activity timeline with transactional system history and editable user-created events.

**Architecture:** Extend the existing application detail contract to return events, keep event persistence behind the typed API repository, and create system events in the same database transactions as application mutations. Add focused frontend timeline and event-form components inside the applications feature, using TanStack Query for server state and existing modal/form primitives for presentation and accessibility.

**Tech Stack:** Bun, Elysia, Drizzle ORM, PostgreSQL, Zod, React 19, React Router, TanStack Query, Redux Toolkit, i18next, Tailwind CSS v4, Vitest, Playwright.

## Global Constraints

- Preserve authenticated ownership checks and require CSRF tokens for event mutations.
- Use shared Zod schemas at the browser/API boundary.
- Keep API JSON camelCase and wrapped in the documented `data` or `error` envelope.
- Keep system state in TanStack Query and local presentation state in React or Redux according to existing feature patterns.
- Use two-space indentation, double-quoted strings, semicolons, and Biome formatting.
- Keep system-generated events immutable and user-created events editable/deletable.
- Use plain-text rendering for user-entered event titles and descriptions.
- Keep the UI accessible, keyboard-operable, responsive, localized in `en`, `ru`, `uk`, and `he`, and compatible with drawer and modal form presentations.
- Do not add contacts, shared employers, reminders, notifications, email/calendar integrations, or a general journal in this feature.
- Run `bun run format`, `bun run lint`, and the focused tests after each task; run the full verification suite before completion.

---

### Task 1: Define shared activity event contracts

**Files:**
- Modify: `packages/shared/src/index.ts`
- Test: `packages/shared/src/index.test.ts`

**Interfaces:**
- Produce `applicationEventTypeSchema`, `applicationEventInputSchema`, `updateApplicationEventInputSchema`, `ApplicationEventType`, `ApplicationEvent`, and `ApplicationEventResponse`.
- Produce the event fields `id`, `applicationId`, `type`, `title`, `description`, `occurredAt`, `createdAt`, `updatedAt`, `metadata`, and `isSystem`.

- [ ] **Step 1: Write failing schema tests**

Add tests that assert all supported event types are accepted, title is required and trimmed, description is optional, ISO dates are accepted, invalid types are rejected, and update input permits partial title/description/date changes without permitting `applicationId` or `isSystem` changes.

- [ ] **Step 2: Run the shared tests**

Run: `bun run --cwd packages/shared test`

Expected: the new tests fail because the event schemas and types do not exist.

- [ ] **Step 3: Implement the schemas and public types**

Use the existing schema conventions in `packages/shared/src/index.ts`. Keep `metadata` nullable or an empty object in the public response, and validate only the supported metadata shape needed by system events (`from` and `to` status values for `status_changed`).

- [ ] **Step 4: Run formatting and tests**

Run: `bun run format && bun run --cwd packages/shared test`

Expected: all shared tests pass.

- [ ] **Step 5: Commit**

```bash
git add packages/shared/src/index.ts packages/shared/src/index.test.ts
git commit -m "feat: add activity event contracts"
```

### Task 2: Add the application events database migration and repository

**Files:**
- Modify: `apps/api/src/db/schema.ts`
- Modify: `apps/api/src/db/repository.ts`
- Create: `apps/api/drizzle/0009_application_events.sql`
- Modify: `apps/api/src/db/repository.test.ts`
- Modify: `apps/api/src/db/migrate.ts`

**Interfaces:**
- Produce typed repository methods `listEvents(userId, applicationId)`, `createEvent(userId, applicationId, input)`, `updateEvent(userId, applicationId, eventId, input)`, and `deleteEvent(userId, applicationId, eventId)`.
- Produce a repository helper for system-event insertion that accepts a transaction and cannot bypass the application ownership scope.

- [ ] **Step 1: Write repository and migration-shape tests**

Cover event row mapping, newest-first ordering, user scoping, system/user flags, and update/delete returning `false` for an event belonging to another user or application.

- [ ] **Step 2: Run API repository tests**

Run: `bun run --cwd apps/api test -- repository.test.ts`

Expected: the new tests fail because the table, mapper, and methods are missing.

- [ ] **Step 3: Add the schema and SQL migration**

Create `application_events` with foreign keys to `users` and `job_applications`, `type`, `title`, nullable `description`, timestamptz `occurred_at`, audit timestamps, JSONB `metadata`, and boolean `is_system`. Add indexes on `(application_id, occurred_at DESC)` and `(user_id, occurred_at DESC)`. Use cascade deletion from applications and check constraints for non-empty titles and supported event types where compatible with the current migration style.

- [ ] **Step 4: Add typed repository methods**

Map database rows to the shared camelCase type. Scope every query with both `userId` and `applicationId` where applicable. Return events ordered by `occurredAt DESC, id DESC` so equal timestamps remain deterministic.

- [ ] **Step 5: Register and apply the migration locally**

Run: `bun run db:migrate`

Expected: migration `0009_application_events` is applied without errors.

- [ ] **Step 6: Run API tests and commit**

Run: `bun run --cwd apps/api test -- repository.test.ts && bun run lint && bun run typecheck`

```bash
git add apps/api/src/db/schema.ts apps/api/src/db/repository.ts apps/api/src/db/repository.test.ts apps/api/src/db/migrate.ts apps/api/drizzle/0009_application_events.sql
git commit -m "feat: persist application activity events"
```

### Task 3: Record system events transactionally in application mutations

**Files:**
- Modify: `apps/api/src/db/repository.ts`
- Modify: `apps/api/src/routes/application-create.ts`
- Modify: `apps/api/src/routes/application-update.ts`
- Modify: `apps/api/src/routes/applications-reorder.ts`
- Modify: `apps/api/src/routes/application-archive.ts`
- Modify: `apps/api/src/routes/application-restore.ts`
- Modify: `apps/api/src/routes/application-blacklist.ts`
- Modify: `apps/api/src/routes/application-unblacklist.ts`
- Modify: `apps/api/src/db/repository.test.ts`
- Modify: `apps/api/src/app.test.ts`

**Interfaces:**
- Application mutation methods must update the application and insert the corresponding system event in one transaction.
- Status-change metadata must contain the previous and next canonical status values.

- [ ] **Step 1: Add failing transaction/event assertions**

Test that create, edit, status change, archive, restore, blacklist, and unblacklist produce the expected event type and data. Test that an event insertion failure rolls back the application mutation. Test that permanent deletion cascades to events.

- [ ] **Step 2: Run focused API tests**

Run: `bun run --cwd apps/api test -- app.test.ts repository.test.ts`

Expected: new assertions fail.

- [ ] **Step 3: Implement transaction-safe mutation helpers**

Centralize event creation in repository transaction helpers rather than duplicating raw inserts across routes. Preserve existing route status codes and response envelopes. Do not create noisy events for unrelated reads or failed mutations.

- [ ] **Step 4: Verify rollback and ownership behavior**

Run: `bun run --cwd apps/api test -- app.test.ts repository.test.ts && bun run typecheck`

Expected: all API tests pass and ownership isolation remains intact.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/db/repository.ts apps/api/src/routes apps/api/src/db/repository.test.ts apps/api/src/app.test.ts
git commit -m "feat: record application history transactionally"
```

### Task 4: Return events from application detail and add event API routes

**Files:**
- Modify: `apps/api/src/routes/application-detail.ts`
- Create: `apps/api/src/routes/application-events.ts`
- Modify: `apps/api/src/app.ts`
- Modify: `apps/api/src/routes/types.ts`
- Modify: `apps/api/src/app.test.ts`
- Modify: `apps/web/src/lib/api.ts`
- Modify: `apps/web/src/lib/queries.ts`

**Interfaces:**
- `GET /api/applications/:id` returns `{ data: { application, events } }`.
- Event routes accept and return the shared event contracts.
- Frontend query methods expose `useApplicationDetail`, `useCreateApplicationEvent`, `useUpdateApplicationEvent`, and `useDeleteApplicationEvent` using the existing CSRF/query invalidation patterns.

- [ ] **Step 1: Write failing API route tests**

Cover detail responses with events, authenticated event CRUD, validation errors, CSRF rejection, missing applications, and cross-user access returning the existing not-found behavior.

- [ ] **Step 2: Run focused API tests**

Run: `bun run --cwd apps/api test -- app.test.ts`

Expected: event route tests fail.

- [ ] **Step 3: Implement the routes and app registration**

Use existing `requireAuth`, `verifyRequestCsrf`, `validationError`, and `errorResponseWithStatus` helpers. Keep event IDs and application IDs parsed as positive integers. For update/delete, require both the parent application and event ownership.

- [ ] **Step 4: Extend the frontend API/query layer**

Update application-detail parsing, add event request functions, and invalidate the application-detail query after successful event mutations. Preserve existing list-query invalidation after application mutations.

- [ ] **Step 5: Verify and commit**

Run: `bun run --cwd apps/api test -- app.test.ts && bun run --cwd apps/web test && bun run typecheck`

```bash
git add apps/api/src/routes/application-detail.ts apps/api/src/routes/application-events.ts apps/api/src/app.ts apps/api/src/routes/types.ts apps/api/src/app.test.ts apps/web/src/lib/api.ts apps/web/src/lib/queries.ts
git commit -m "feat: expose application activity api"
```

### Task 5: Build the timeline presentation components

**Files:**
- Create: `apps/web/src/features/applications/activity/application-activity-timeline.tsx`
- Create: `apps/web/src/features/applications/activity/application-activity-event.tsx`
- Create: `apps/web/src/features/applications/activity/application-activity-empty.tsx`
- Create: `apps/web/src/features/applications/activity/application-activity-data.ts`
- Test: `apps/web/src/features/applications/activity/application-activity-timeline.test.tsx`

**Interfaces:**
- `ApplicationActivityTimeline` consumes `ApplicationEvent[]`, loading/error state, and event callbacks.
- `ApplicationActivityEvent` renders one event without owning server state.

- [ ] **Step 1: Write component tests**

Test newest-first ordering, system/user visual distinction, translated event labels, escaped user text, loading/empty/error states, and accessible names for edit/delete actions.

- [ ] **Step 2: Run the focused component tests**

Run: `bun run --cwd apps/web test -- application-activity-timeline.test.tsx`

Expected: tests fail because the components do not exist.

- [ ] **Step 3: Implement presentational components**

Use semantic list markup, translated copy, stable event-type metadata, locale-aware date formatting, and icon-only buttons with accessible labels. Keep the components free of API calls and modal state.

- [ ] **Step 4: Verify responsive and RTL-safe styling**

Run: `bun run format && bun run --cwd apps/web test -- application-activity-timeline.test.tsx && bun run lint`

Expected: focused tests and lint pass.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/features/applications/activity
git commit -m "feat: add application activity timeline"
```

### Task 6: Add the manual activity form and mutation workflow

**Files:**
- Create: `apps/web/src/features/applications/activity/application-activity-form.tsx`
- Create: `apps/web/src/features/applications/activity/use-application-activity-form.ts`
- Modify: `apps/web/src/features/applications/job-drawer.tsx`
- Modify: `apps/web/src/features/applications/job-modal.tsx`
- Modify: `apps/web/src/features/applications/job-form-content.tsx`
- Test: `apps/web/src/features/applications/activity/application-activity-form.test.tsx`

**Interfaces:**
- The form accepts `applicationId`, optional `event`, `onSaved`, and `onCancel`.
- It submits `applicationEventInputSchema` values through the event mutation hooks.

- [ ] **Step 1: Write failing form tests**

Cover required title validation, optional description, event type selection, past date/time, create, edit, delete confirmation, mutation errors, disabled submit state, and keyboard-accessible controls.

- [ ] **Step 2: Run focused form tests**

Run: `bun run --cwd apps/web test -- application-activity-form.test.tsx`

Expected: tests fail because the form and integration do not exist.

- [ ] **Step 3: Implement the form with local state**

Use the existing floating-label and button primitives. Keep event form state local, validate with the shared schema, render text safely, and return to the timeline after success. Do not add activity fields to the main application mutation schema.

- [ ] **Step 4: Integrate timeline and form into both presentation modes**

Load application detail data when the drawer/modal has an existing application ID. Render the Activity section without blocking the core application form while events load. Use the existing confirmation modal for user-event deletion.

- [ ] **Step 5: Verify and commit**

Run: `bun run format && bun run --cwd apps/web test -- application-activity-form.test.tsx application-activity-timeline.test.tsx && bun run typecheck`

```bash
git add apps/web/src/features/applications/activity apps/web/src/features/applications/job-drawer.tsx apps/web/src/features/applications/job-modal.tsx apps/web/src/features/applications/job-form-content.tsx
git commit -m "feat: add manual application activities"
```

### Task 7: Add localization, accessibility, and browser workflow coverage

**Files:**
- Modify: `apps/web/src/i18n/locales/en.ts`
- Modify: `apps/web/src/i18n/locales/ru.ts`
- Modify: `apps/web/src/i18n/locales/uk.ts`
- Modify: `apps/web/src/i18n/locales/he.ts`
- Modify: `apps/web/src/i18n/i18n.test.ts`
- Modify: `tests/e2e/xeniway.spec.ts`
- Modify: `docs/testing.md`

- [ ] **Step 1: Add aligned translation keys and tests**

Add labels for event types, activity headings, form fields, empty/loading/error states, save/edit/delete actions, and system-event templates. Extend dictionary structure tests so all four locales contain the same keys.

- [ ] **Step 2: Add E2E coverage**

Extend the authenticated application workflow to verify create, status-change, archive/restore, blacklist/restore, manual follow-up creation, event editing, event deletion, reload persistence, and the distinction between system and user events.

- [ ] **Step 3: Add accessibility assertions**

Verify accessible names, keyboard operation, focus return after the event form closes, dialog semantics, RTL layout direction, and Axe results for the activity view.

- [ ] **Step 4: Run the browser workflow**

Run: `bun run test:e2e`

Expected: all browser tests pass from the automatic seeded fixture state.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/i18n apps/web/src/i18n/i18n.test.ts tests/e2e/xeniway.spec.ts docs/testing.md
git commit -m "test: cover localized application activity workflows"
```

### Task 8: Update documentation and perform full verification

**Files:**
- Modify: `README.md`
- Modify: `docs/api.md`
- Modify: `docs/architecture.md`
- Modify: `docs/database.md`
- Modify: `docs/migration.md`
- Modify: `docs/testing.md`
- Modify: `AGENTS.md` if repository guidance needs the new event contract

- [ ] **Step 1: Document the feature**

Document the event table, route contracts, system-event transaction behavior, ownership rules, deletion cascade, UI behavior, and supported event types. Keep the README capability list grounded in the shipped implementation.

- [ ] **Step 2: Run the complete verification suite**

Run:

```bash
bun run format:check
bun run lint
bun run typecheck
bun run test
bun run build
bun run db:migrate
bun run db:seed
bun run test:e2e
git diff --check
```

Expected: every command exits successfully; E2E reports 0 failures.

- [ ] **Step 3: Review the final diff**

Run: `git status --short && git diff HEAD~8 --stat`

Confirm only activity-timeline implementation, tests, migration, and documentation are included. Check that no secrets, generated browser artifacts, or local environment files are staged.

- [ ] **Step 4: Commit documentation and final verification**

```bash
git add README.md docs/api.md docs/architecture.md docs/database.md docs/migration.md docs/testing.md AGENTS.md
git commit -m "docs: document application activity timeline"
```
