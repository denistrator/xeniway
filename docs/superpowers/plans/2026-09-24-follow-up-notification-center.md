# Follow-up Notification Center Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `subagent-driven-development` or `executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a persistent, in-app Notification Center that surfaces due and overdue follow-ups for applications on every board, with responsive summary toasts and account-scoped read state.

**Architecture:** Add shared notification contracts, a schema-only PostgreSQL notification table, a typed repository, and authenticated notification APIs. Reconcile due reminders idempotently when an authenticated app opens, regains focus, or reaches a new local day; store read/resolved state in PostgreSQL. Add a header inbox link, Notification Center route, and batch summary toast. Do not add push delivery, a service worker, external provider, or an always-running notification worker.

**Tech Stack:** Bun workspaces, TypeScript, React, React Router, TanStack Query, Elysia, Zod, Drizzle ORM, PostgreSQL, Vitest, Playwright, i18next, Tailwind CSS.

## Global Constraints

- Version one supports only `follow_up_due` notifications; do not add browser push, OS notifications, email, SMS, calendar sync, configurable reminder time, advance reminder, daily repeat, or snooze.
- Follow-up due dates are calendar dates without a time; treat them as due at the start of the user's local day, and calculate that date from a validated IANA time zone.
- Include follow-ups for active, archived, and blacklisted applications; archive and blacklist state do not suppress a reminder.
- Reconciliation must be idempotent. Create at most one reminder per task and source due date; a task overdue across several days must not generate a daily duplicate.
- Keep notification reads, counts, reconciliation, and mutations scoped to authenticated `userId`; require CSRF for every mutation and accept no client-supplied user ID or local date.
- Resolve the active reminder when its task is completed or rescheduled; cascade notification deletion when its task/application is permanently deleted.
- Persist read/unread state across sessions. Opening a notification marks it read; users can mark an unresolved notification unread again; resolving an unread notification marks it read.
- Show one summary toast per reconciliation batch, bottom-right on desktop and top-center on mobile. Dismissing a toast does not mark notifications read.
- Keep old-read-notification cleanup (>10 days) deferred in `docs/backlog.md`; unread notifications must not be removed by that task.
- Preserve the API's `data`/`error` envelopes, authenticated ownership boundary, semantic accessibility, keyboard behavior, visible focus, live announcements, RTL, reduced motion, and locales `en`, `ru`, `uk`, and `he`.
- Keep the SQL migration data-empty and forward-only. Update API, architecture, database, testing, README, and `AGENTS.md` documentation with implemented behavior.

---

## File Structure

- `packages/shared/src/index.ts` and `index.test.ts` — notification request schemas, public types, and contract tests.
- `apps/api/src/db/schema.ts` — Drizzle notification table.
- `apps/api/drizzle/0011_notifications.sql` and `apps/api/src/db/migrate.ts` — schema-only migration and registration after `0010_application_workspace`.
- `apps/api/src/db/repositories/types.ts` — repository contracts and row/result types.
- `apps/api/src/db/repositories/notifications.ts` — owner-scoped notification reconciliation, query, count, and read-state persistence.
- `apps/api/src/db/repositories/applications.ts` — transactional notification resolution when follow-ups are completed or rescheduled.
- `apps/api/src/db/repositories/mappers.ts` and `repository.ts` — public notification mapping and exports.
- `apps/api/src/db/repository.test.ts` — database-backed idempotency, lifecycle, query, and ownership cases.
- `apps/api/src/services/notifications.ts` — IANA time-zone validation, local-calendar-date calculation, and notification orchestration.
- `apps/api/src/routes/notifications.ts`, `routes/index.ts`, `routes/types.ts`, and `app.ts` — authenticated notification routes and dependency wiring.
- `apps/api/src/server.ts` — construct the production Drizzle notification repository.
- `apps/api/src/app-test-support.ts` and `apps/api/src/notifications.test.ts` — in-memory behavior and HTTP route tests.
- `apps/web/src/lib/api.ts`, `lib/queries.ts`, and `lib/queries.test.tsx` — typed calls, query keys, and TanStack Query mutations/invalidations.
- `apps/web/src/features/notifications/notification-center-page.tsx` — authenticated Notification Center screen.
- `apps/web/src/features/notifications/notification-list.tsx` — list/filter and row actions.
- `apps/web/src/features/notifications/notification-bell.tsx` — icon-only header link, accessible count, and badge.
- `apps/web/src/features/notifications/notification-sync.tsx` — authenticated reconciliation triggers and summary-toast state.
- `apps/web/src/features/notifications/notification-summary-toast.tsx` — responsive accessible toast presentation.
- `apps/web/src/app-routes.tsx`, `components/layout.tsx`, and `components/site-header.tsx` — authenticated route, sync host, and header placement.
- `apps/web/src/i18n/locales/{en,ru,uk,he}.ts` — aligned Notification Center labels, statuses, actions, errors, and toast copy.
- `tests/e2e/xeniway.spec.ts` — end-to-end reminder, center, lifecycle, accessibility, and responsive coverage.
- `docs/api.md`, `docs/architecture.md`, `docs/database.md`, `docs/testing.md`, `README.md`, and `AGENTS.md` — implemented contracts, system behavior, local setup implications, tests, and feature structure.
- `docs/backlog.md` already tracks read-notification cleanup as a distinct deferred backend task; retain it unchanged during this implementation.

## Task 1: Define Shared Notification Contracts

**Files:** `packages/shared/src/index.ts`, `packages/shared/src/index.test.ts`

**Interfaces:**
- Produces `notificationTypeSchema` with the sole v1 value `follow_up_due` and `NotificationType`.
- Produces `notificationFilterSchema` with `all | unread` and `NotificationFilter`.
- Produces `reconcileNotificationsInputSchema` accepting exactly `{ timeZone: string }` with a trimmed, nonempty value capped at 100 characters; validate whether it is an IANA zone in the API service, not via an incomplete shared list.
- Produces `updateNotificationReadInputSchema` accepting exactly `{ read: boolean }`.
- Produces `ApplicationNotification` with `id`, `type`, `followUpTaskId`, `applicationId`, `sourceDueDate`, `createdAt`, nullable `readAt`/`resolvedAt`, `followUpTitle`, `company`, `position`, `status`, and `board: ApplicationBoard`.
- Produces response types for paginated list `{ notifications, nextCursor }`, unread count `{ unreadCount }`, reconciliation `{ created }`, a changed notification `{ notification }`, and read-all `{ updatedCount }`.

- [ ] Add tests for supported type/filter values, trimmed nonempty time-zone input, empty/overlong time-zone rejection, exact `read: boolean` input, and rejection of extra fields such as `userId`, `createdAt`, or `readAt`. IANA zone validity is tested in the API service.
- [ ] Add contract tests for the complete public notification shape, including archived/blacklisted `board` values and nullable timestamps.
- [ ] Run `bun run --cwd packages/shared test`; expect the new schema imports to fail before implementation.
- [ ] Add schemas/types and the corresponding response types. Do not accept ownership, timestamps, source due date, or read state from clients except the explicit `{ read }` mutation.
- [ ] Run `bun run --cwd packages/shared test` and `bun run --cwd packages/shared typecheck`; expect all shared tests to pass.
- [ ] Commit as `feat(shared): define notification contracts`.

## Task 2: Add Notification Schema and Repository Lifecycle

**Files:** `apps/api/src/db/schema.ts`, `apps/api/drizzle/0011_notifications.sql`, `apps/api/src/db/migrate.ts`, `apps/api/src/db/repositories/types.ts`, `apps/api/src/db/repositories/notifications.ts`, `apps/api/src/db/repositories/applications.ts`, `apps/api/src/db/repositories/mappers.ts`, `apps/api/src/db/repository.ts`, `apps/api/src/db/repository.test.ts`

**Interfaces:**
- `NotificationFilter` and `ApplicationNotification` come from `@xeniway/shared`.
- Add `NotificationCursor = { createdAt: string; id: number }` and `NotificationPage = { notifications: ApplicationNotification[]; nextCursor: NotificationCursor | null }` in repository types.
- Add `NotificationRepository` methods:

```ts
interface NotificationRepository {
  reconcileDueFollowUps(userId: number, dueThrough: string, now: Date): Promise<ApplicationNotification[]>;
  list(
    userId: number,
    filter: NotificationFilter,
    cursor: NotificationCursor | null,
    limit: number,
  ): Promise<NotificationPage>;
  unreadCount(userId: number): Promise<number>;
  setRead(userId: number, notificationId: number, read: boolean, now: Date): Promise<ApplicationNotification | null>;
  markAllRead(userId: number, now: Date): Promise<number>;
}
```

- [ ] Write repository tests proving a due or overdue incomplete task on each board creates one notification, repeated reconciliation creates none, and an incomplete task with a future date creates none.
- [ ] Write tests for the resolved same-task/same-date case: reconciliation reopens that row by resetting `readAt`/`resolvedAt` and updating `createdAt`, rather than inserting a duplicate.
- [ ] Write tests for list ordering/cursor boundaries, `all` versus unresolved `unread`, owner-scoped count, mark-read/unread, mark-all-read, and cross-owner invisibility.
- [ ] Write lifecycle tests: due-date changes resolve old occurrences; completion resolves the current occurrence and clears unread state; deleting a task or application cascades notification rows; archived and blacklisted applications remain included.
- [ ] Run the focused database test: `bun run --cwd apps/api test src/db/repository.test.ts`; expect the new repository/table imports to fail before implementation.
- [ ] Add `notifications` with user and follow-up cascading foreign keys, `source_due_date`, `created_at`, `read_at`, and `resolved_at`; add uniqueness on `(follow_up_task_id, source_due_date)` and indexes supporting `(user_id, read_at, resolved_at, created_at DESC, id DESC)` queries.
- [ ] Register migration ID `0011_notifications` after `0010_application_workspace`. Keep it schema-only with no backfill or fixture inserts.
- [ ] Implement joined list/count queries that constrain both notification `user_id` and the referenced task/application `user_id` to the authenticated owner; map board state from application archive/blacklist fields.
- [ ] Implement reconciliation with an insert-on-conflict path that reopens the matching resolved task/date occurrence; do not filter out archived or blacklisted parent applications.
- [ ] Wrap follow-up due-date update/completion and related notification resolution in a transaction. Resolve only occurrences whose source due date is no longer current, and set `read_at` when resolving an unread occurrence. Rely on the database cascade for permanent deletion.
- [ ] Run `bun run db:migrate`, rerun it to verify `0011_notifications` is skipped, then run the focused repository tests and API typecheck. Confirm the new table/constraints/indexes in PostgreSQL and that the migration inserts no rows.
- [ ] Commit as `feat(api): persist follow-up notifications`.

## Task 3: Implement Notification Service and Authenticated API

**Files:** `apps/api/src/services/notifications.ts`, `apps/api/src/routes/notifications.ts`, `apps/api/src/routes/index.ts`, `apps/api/src/routes/types.ts`, `apps/api/src/app.ts`, `apps/api/src/server.ts`, `apps/api/src/db/repository.ts`, `apps/api/src/app-test-support.ts`, `apps/api/src/notifications.test.ts`

**Interfaces:**
- `NotificationService(repository: NotificationRepository, clock: () => Date = () => new Date())` validates `timeZone`, calculates local `YYYY-MM-DD` with `Intl.DateTimeFormat(...).formatToParts()`, then calls `reconcileDueFollowUps(userId, dueThrough, now)`.
- Register `notificationsRoute({ auth, notifications })` in `apiRoutes`.
- Expose these routes: `POST /api/notifications/reconcile`, `GET /api/notifications?filter=all|unread&cursor=...`, `GET /api/notifications/unread-count`, `PATCH /api/notifications/:id` with `{ read }`, and `POST /api/notifications/read-all`.
- Cursor serialization is opaque to the web client; route validation decodes it into `{ createdAt, id }` and rejects malformed, oversized, or invalid values with the existing validation envelope.

- [ ] Add API tests first for unauthenticated reads, unauthenticated writes, missing CSRF, invalid time zones, malformed filters/cursors/IDs, unknown/non-owned notifications, and response envelopes.
- [ ] Add API behavior tests for reconciliation response contents, all-board inclusion, idempotent repeated calls, read/unread changes, count changes, and mark-all-read.
- [ ] Run `bun run --cwd apps/api test src/notifications.test.ts`; expect the new routes and service to be absent.
- [ ] Implement a pure local-date helper with injected `now`. Reject unsupported IANA zone identifiers; never accept a client-provided current date.
- [ ] Add `notifications` to `AppDependencies` and `RouteDependencies`; construct `NotificationService` in `createApp` and `DrizzleNotificationRepository` in `server.ts`; extend `createDependencies()` with an in-memory notification repository and due-task reconciliation behavior.
- [ ] Implement route handlers using `requireAuthenticatedUser` on reads and `requireAuthenticatedMutation` on writes. Register `/unread-count` before `/:id`; validate all IDs, query params, cursors, and bodies before repository calls.
- [ ] Preserve `{ data: ... }` and `{ error: ... }` envelopes, return `NOT_FOUND` for missing or non-owned IDs, and return only session-derived owner data.
- [ ] Run `bun run --cwd apps/api test src/notifications.test.ts`, `bun run --cwd apps/api test`, and `bun run --cwd apps/api typecheck`; expect notification route tests and existing API suites to pass.
- [ ] Commit as `feat(api): add notification center endpoints`.

## Task 4: Add Web API, Query State, and Reconciliation Triggers

**Files:** `apps/web/src/lib/api.ts`, `apps/web/src/lib/queries.ts`, `apps/web/src/lib/queries.test.tsx`, `apps/web/src/features/notifications/notification-sync.tsx`, `apps/web/src/components/layout.tsx`

**Interfaces:**
- Add `notificationKeys.all`, `.list(filter)`, and `.unreadCount()` under `apps/web/src/lib/api.ts`.
- Add typed API functions `reconcileNotifications(input, csrfToken)`, `listNotifications(filter, cursor?)`, `getUnreadNotificationCount()`, `setNotificationReadState(id, read, csrfToken)`, and `markAllNotificationsRead(csrfToken)`.
- Add query/mutation hooks `useNotifications(filter)`, `useUnreadNotificationCount()`, `useNotificationMutations()`, and `useNotificationReconciliation()` in `apps/web/src/lib/queries.ts`.

- [ ] Add client tests for each request method/path/body, CSRF header on each write, cursor encoding, response typing, and query invalidation of notification list/count keys.
- [ ] Run `bun run --cwd apps/web test src/lib/queries.test.tsx`; verify the new API functions and hooks are not found.
- [ ] Implement list/count query keys and typed calls using `requestJson`; all writes use the current CSRF token.
- [ ] Reconcile with `Intl.DateTimeFormat().resolvedOptions().timeZone`; if the browser returns an empty value, use `UTC` as the request zone.
- [ ] Implement one authenticated synchronization host that reconciles on initial authenticated mount, focus/visibility return, and local-day rollover. Clean up event listeners and timers on unmount; do not run for guest state.
- [ ] On reconciliation success, invalidate the list and count queries and pass only returned `created` records to the toast host. Failed reconciliation must not create a success toast; expose a retryable error state without clearing existing cached notifications.
- [ ] On logout or account change, remove notification query state so one account's badge or items cannot flash for another account.
- [ ] Add query tests for invalidation, account changes, CSRF failures, and preserving server state after a failed optimistic update.
- [ ] Run focused web tests and `bun run --cwd apps/web typecheck`; expect all notification client tests to pass.
- [ ] Commit as `feat(web): sync notification center data`.

## Task 5: Build the Notification Center and Header Entry

**Files:** `apps/web/src/features/notifications/notification-center-page.tsx`, `notification-list.tsx`, `notification-bell.tsx`, `notification-center-page.test.tsx`, `notification-list.test.tsx`, `notification-bell.test.tsx`, `apps/web/src/app-routes.tsx`, `apps/web/src/components/site-header.tsx`, `apps/web/src/i18n/locales/en.ts`, `ru.ts`, `uk.ts`, and `he.ts`.

**Interfaces:**
- `NotificationCenterPage` consumes `useNotifications(filter)` and `useNotificationMutations()`; it does not fetch notification data with raw `fetch`.
- `NotificationBell` consumes `useUnreadNotificationCount()` and navigates to `/notifications` through React Router.
- `NotificationList` receives `notifications`, pending/error state, and explicit callbacks for open, mark-read, and mark-unread.

- [ ] Add failing component tests for All/Unread filters, page ordering, empty/loading/error states, mark-all-read, row read state, click-to-open, and accessible task/application context.
- [ ] Add a header test for authenticated-only visibility, icon-only inbox name, localized unread count in the accessible label, and badge hidden from duplicate screen-reader announcement.
- [ ] Run `bun run --cwd apps/web test src/features/notifications/notification-center-page.test.tsx src/features/notifications/notification-list.test.tsx src/features/notifications/notification-bell.test.tsx` and confirm they fail because the feature components/routes are absent.
- [ ] Build the center page with **All**/**Unread** filters, mark-all-read, bounded cursor pagination, and read notification history. Display task title, company/position, due date, overdue state, and active/archive/blacklist context.
- [ ] Opening a notification marks it read, then opens `/applications/:id`; on a read mutation failure, keep the item unread in cache, announce the failure, and do not pretend the server accepted the change. Permit marking an unresolved item unread again.
- [ ] Add the authenticated lazy route `/notifications` inside the existing `RequireAuth` route group.
- [ ] Add an `Inbox`-style icon-only header link between `<CsvExportButton />` and `<ThemeSelector />`. Use a localized accessible name (“Notifications” or “Notifications, {{count}} unread”), and make the visual badge `aria-hidden`.
- [ ] Add equivalent translation keys in `en`, `ru`, `uk`, and `he`; ensure unread count uses i18next pluralization and Hebrew remains RTL.
- [ ] Verify responsive layout, keyboard activation, visible focus, focus entry to the page heading, and no regressions to export/theme controls. Run locale dictionary alignment tests and focused component tests.
- [ ] Run `bun run --cwd apps/web typecheck`; expect the authenticated route, page, and header to compile.
- [ ] Commit as `feat(web): add notification center page`.

## Task 6: Add Responsive Summary Toasts and End-to-End Coverage

**Files:** `apps/web/src/features/notifications/notification-sync.tsx`, `notification-summary-toast.tsx`, `notification-sync.test.tsx`, `notification-summary-toast.test.tsx`, `tests/e2e/xeniway.spec.ts`

**Interfaces:**
- `NotificationSummaryToast` accepts `{ count: number; onOpen: () => void; onDismiss: () => void }` and owns no server state.
- `NotificationSync` holds only transient toast presentation state; dismissing a toast never invokes read-state mutations.

- [ ] Add component tests proving one summary is shown for a batch, none is shown when reconciliation returns no new records, dismiss does not mark records read, and “View notifications” navigates to the center.
- [ ] Test toast container placement at bottom-right on desktop and top-center on mobile; assert the live-region message and keyboard behavior, including reduced-motion mode.
- [ ] Run `bun run --cwd apps/web test src/features/notifications/notification-sync.test.tsx src/features/notifications/notification-summary-toast.test.tsx` and verify they fail before implementing the component behavior.
- [ ] Implement one translated summary toast with the approved responsive positions. Render it in the authenticated app shell, keep new notifications in the center until an explicit state change, and avoid replaying old unread items as new toasts after route changes/reloads.
- [ ] Add Playwright coverage using an overdue date such as `2000-01-01`: create a task, reconcile, verify toast and unread badge, open the center, mark read, reload, and verify persistent state.
- [ ] Extend the browser scenario to include archived and blacklisted applications, proving reminders are retained on all boards; complete or reschedule a task and verify its old notification is resolved and leaves unread count.
- [ ] Include cross-account isolation, desktop/mobile placement, link order/name, and an Axe check for the page and toast.
- [ ] Run `bun run test:e2e` with PostgreSQL/Redis up, migrations applied, development data seeded, and Playwright Chromium installed; expect the notification workflow to pass with existing workflows.
- [ ] Commit as `feat(web): show follow-up reminder toasts`.

## Task 7: Document Contracts and Complete Verification

**Files:** `docs/api.md`, `docs/architecture.md`, `docs/database.md`, `docs/testing.md`, `README.md`, `AGENTS.md`, `apps/api/src/db/seed.test.ts` only if schema invariants require it.

- [ ] Update `docs/api.md` with notification routes, filters, cursor shape, response records, local-time-zone reconciliation, auth/CSRF, and task lifecycle behavior.
- [ ] Update `docs/database.md` with `notifications`, cascade relationships, indexes, uniqueness, resolved/read state, and schema-only migration policy; do not document the deferred cleanup as implemented.
- [ ] Update `docs/architecture.md` and `docs/testing.md` with client reconciliation triggers, no-push/no-worker boundary, toast behavior, and focused tests.
- [ ] Update README's “What you can do” and browser-test coverage with the Notification Center, only after behavior exists. Update `AGENTS.md` structure/testing guidance to mention `apps/web/src/features/notifications` and the notification API/repository boundary.
- [ ] Confirm `docs/backlog.md` still contains the separate cleanup entry: delete read notifications older than 10 days, never unread. Do not implement cleanup in this feature.
- [ ] Run `bun run format`, `bun run lint`, `bun run typecheck`, `bun run test`, `bun run build`, `bun run db:migrate`, `bun run db:seed`, and `bun run test:e2e`; also run `git diff --check`.
- [ ] Review the final diff for owner predicates on every notification query, CSRF on every notification mutation, migrations with no data inserts, consistent four-locale keys, and no push/worker dependencies. Fix any issue and rerun its focused test plus the full relevant suite.
- [ ] Commit docs as `docs: document follow-up notification center`.

## Self-Review

- Spec goals map to Tasks 1–7: contracts (1), schema/repository and lifecycle (2), service/API/auth (3), web data and reconciliation triggers (4), header/center/locales (5), responsive toast and browser workflow (6), and current documentation/full verification (7).
- All-board inclusion appears in the SQL/repository tests and E2E task; cleanup remains deferred and is explicitly not implemented.
- Public client types and repository methods are consistent throughout: `ApplicationNotification`, `NotificationFilter`, `NotificationCursor`, `NotificationPage`, `NotificationRepository`, and `NotificationService`.
- Routes are consistent throughout: `/api/notifications/reconcile`, `/api/notifications`, `/api/notifications/unread-count`, `/api/notifications/:id`, and `/api/notifications/read-all`.
- No task adds push infrastructure, scheduled delivery, a saved timezone preference, or unrelated notification types.
