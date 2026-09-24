# Follow-up Notification Center Design

## Summary

Add an authenticated, in-app Notification Center for follow-up reminders. The center is linked from the site header, stores notification read state on the server, and surfaces newly created reminders with a responsive summary toast. Version one supports only follow-up-due notifications, while keeping the notification type boundary extensible for future types.

This is an in-app feature only. It does not use browser push, email, a notification provider, a service worker, or a background delivery worker. A reminder is materialized when an authenticated user opens or returns to the app. Nothing is delivered while the app is closed; on the next visit, due and overdue reminders are reconciled.

## Goals

- Give the candidate a single place to review all current in-app notifications.
- Surface due and overdue follow-up tasks across active, archived, and blacklisted applications.
- Keep notification read/unread state persistent across reloads and devices.
- Avoid duplicate reminders when reconciliation is retried or multiple app events overlap.
- Keep follow-up task completion and rescheduling reflected in its reminder state.
- Preserve owner scoping, CSRF protection, accessibility, localization, RTL, and reduced-motion behavior.
- Avoid introducing push-delivery infrastructure or an always-running notification scheduler.

## Non-goals

- Browser push, OS notifications, email, SMS, calendar sync, or other external delivery.
- Notifications for events other than follow-up due dates in version one.
- A configurable reminder time, advance reminders, daily repeat reminders, or snooze.
- Deleting old read notifications as part of this feature. A separate backend cleanup task is recorded in `docs/backlog.md` to delete read notifications older than 10 days while retaining unread notifications.

## User experience

### Header entry point

- Add a navigation link to `/notifications`, shown only to an authenticated user.
- Render it as an icon-only control with an inbox-style icon, positioned between CSV export and the theme switcher.
- Provide a localized accessible name such as “Notifications, 3 unread”. The visible count badge is hidden from assistive technology so it is not announced twice.
- The unread count includes unresolved notifications with no `readAt` value. Resolved notifications are automatically marked read and do not contribute to the badge.

### Notification Center page

- Provide **All** and **Unread** filters and a **Mark all as read** action.
- Sort notifications newest first. Use server pagination so the page does not need to load an unbounded number of retained unread records.
- Each follow-up reminder shows the task title, company and position, due date, overdue state, and the application's current board context. Archived and blacklisted applications remain eligible and are identified as such in the UI.
- Opening a notification marks it read and navigates to `/applications/:id`. A read, unresolved notification can be marked unread again from the center.
- Read notifications remain in **All** for history until the separately planned retention cleanup removes read rows older than 10 days. Unread notifications are not automatically deleted.
- Provide translated loading, empty, error, and retry states.

### Summary toast

- After reconciliation creates one or more notifications, show one localized summary toast for that batch, rather than one toast per task.
- Place the toast stack at the bottom-right on desktop and top-center on mobile.
- Include an action to open the Notification Center. Dismissing a toast hides it for the current UI session but does not mark notifications read.
- Only newly created notifications trigger a toast. Existing unread notifications remain visible in the header and center without generating repeated toasts on every route change.
- Use an appropriate polite live region, keyboard-operable actions, visible focus, and reduced-motion-aware transitions.

## Due-date and reconciliation behavior

Follow-ups currently use an ISO calendar date without a time. The due date is treated as the beginning of the user's local calendar day; no hour-of-day is configured.

The authenticated web app reconciles reminders:

1. After the authenticated application shell becomes available.
2. When the document becomes visible or the window regains focus.
3. When the user's local calendar day changes while the app remains open.

The client sends its IANA time-zone identifier to the authenticated reconciliation endpoint. The API validates the identifier and calculates the current local calendar date; it does not trust an arbitrary client-supplied date and does not persist the time zone as a preference.

Reconciliation creates a reminder for each incomplete follow-up whose due date is today or earlier. It includes applications on all boards; archive and blacklist state do not suppress a reminder. One notification represents one follow-up/due-date occurrence, so an overdue task does not create another notification every day. If the app was closed when a task became due, the reminder is created and surfaced on the next app visit.

Reconciliation is idempotent. A database uniqueness constraint on the task and source due date prevents duplicate records under retries or concurrent requests. If a task's due date changes, its prior reminder is resolved; when the new due date becomes due, reconciliation creates the corresponding occurrence. If that same task/date pair already has a resolved notification, reconciliation reopens that occurrence by clearing its read/resolved state and refreshing its creation time instead of creating a duplicate. If a task is completed, its active reminder is resolved. Resolution sets `resolvedAt` and marks an unread notification read so it leaves the unread count. Deleting a follow-up task or application cascades to associated notification records.

## Architecture and data flow

```text
Authenticated app startup / focus / local-day change
             │
             ├── POST /api/notifications/reconcile (timeZone)
             │       └── owner-scoped query of incomplete follow-ups
             │           + idempotent notification inserts
             │
             ├── GET /api/notifications?filter=all|unread
             │       └── notification rows joined to task and application
             │
             └── GET /api/notifications/unread-count
                     └── unresolved unread count for header badge

Notification actions ── CSRF-protected read/unread and read-all mutations
Task completion/reschedule ── resolve reminder with the task mutation
```

### Database

Add a schema-only SQL migration and Drizzle table for notifications. The initial type is `follow_up_due`. The record contains:

- `id` primary key;
- `user_id` with a cascading reference to the owning user;
- `type` constrained to the supported notification type;
- `follow_up_task_id` with a cascading reference to the follow-up task;
- `source_due_date`, identifying the due-date occurrence;
- `created_at`, `read_at`, and `resolved_at` timestamps;
- a unique constraint on `(follow_up_task_id, source_due_date)` and indexes for owner-scoped unread and newest-first queries.

Notification queries must scope by authenticated `userId` and join the referenced follow-up and application under that same owner. Store task/application identifiers rather than duplicate user-entered task or company text in the notification row; response text is read from the owner-scoped joined records. The SQL migration contains no seed or other data insertion.

### API and shared contracts

Add an explicit notifications router registered through `apps/api/src/routes/index.ts`, a typed notification repository, and shared Zod schemas/response types in `packages/shared`.

- `POST /api/notifications/reconcile`: authenticated and CSRF-protected; accepts a validated `timeZone`; idempotently creates due reminders and returns the records newly created in this reconciliation for toast presentation.
- `GET /api/notifications?filter=all|unread&cursor=...`: authenticated; returns a bounded, newest-first page with task/application display data and a continuation cursor.
- `GET /api/notifications/unread-count`: authenticated; returns the current unresolved unread count.
- `PATCH /api/notifications/:id`: authenticated and CSRF-protected; changes the notification's read state, owner-scoped.
- `POST /api/notifications/read-all`: authenticated and CSRF-protected; marks the user's unresolved notifications read.

Every list, count, reconciliation, and mutation operation derives ownership from the authenticated session. No user ID is accepted from the request. Marking a notification read or unread never changes the follow-up task. Task completion and due-date updates resolve related reminder occurrences within the same database transaction as the task mutation where practical.

### Frontend

- Add a `notifications` feature containing the Notification Center page, notification rows, summary toast, and data hooks.
- Add the authenticated `/notifications` route and an icon-only header navigation link between `CsvExportButton` and `ThemeSelector`.
- Keep notification server state in TanStack Query. Add query keys for the notification list and unread count; reconcile invalidates/updates these queries and returns newly created rows for the toast.
- Reconcile only while an authenticated user is active. On unauthenticated transitions, do not fetch or display account notifications.
- Mark-as-read, mark-as-unread, and mark-all actions use the shared API client and CSRF behavior. Update server state through query invalidation or narrowly scoped optimistic updates with rollback on failure.
- Add translation keys to English, Russian, Ukrainian, and Hebrew dictionaries, preserving structural parity and Hebrew RTL behavior.

## Error handling and security

- Existing generic API error envelopes remain unchanged. Invalid time zones and invalid filters/cursors receive validation errors; missing or non-owned notification IDs return `NOT_FOUND`.
- If reconciliation fails, do not emit a success toast. Preserve any already-fetched center data, expose a retryable status, and leave the unread count visibly stale only with an announced fetch error.
- If a read-state mutation fails, restore optimistic state or refetch the authoritative notification state and announce the failure.
- Apply authenticated-session and CSRF guards to the corresponding routes. Do not expose notification IDs or content across owners; do not trust client-supplied user IDs or local dates.
- Do not add a service worker, VAPID keys, browser permission prompts, push endpoints, external providers, or an always-running worker.

## Testing and acceptance criteria

### API, shared, and repository tests

- Contract tests validate notification types, query filters, time zones, pagination cursors, and read-state inputs.
- Repository tests cover idempotent reconciliation, uniqueness under repeated calls, due-date and local-day boundaries, all-board inclusion, sorted pagination, unread counts, read-all, and read/unread transitions.
- Lifecycle tests verify task completion resolves an unread notification, rescheduling resolves the old occurrence and allows the new occurrence when due, and task/application deletion cascades notification records.
- API tests verify authentication, CSRF requirements, validation envelopes, and cross-account isolation for reconciliation, list, count, and every mutation.
- Use fixed clocks and explicit IANA time zones in date-boundary tests; include DST-adjacent local dates to ensure date-only semantics remain stable.

### Web and browser tests

- Component tests cover All/Unread filters, read/unread actions, mark-all-read, opening a reminder, summary toast behavior, toast dismissal without read-state mutation, and failure/retry behavior.
- Header tests cover authenticated visibility, placement among export/theme controls, icon-only accessible name including unread count, and correct zero/unread badge behavior.
- Browser workflow covers an overdue follow-up, reconciliation on login/focus, summary toast placement behavior, Notification Center navigation, persistent read state after reload, task completion/rescheduling resolution, and inclusion of an archived or blacklisted application's follow-up.
- Run existing keyboard, responsive, Axe/accessibility, language-switching, RTL, and reload-persistence checks as applicable to the changed UI.
- Verify `bun run lint`, `bun run typecheck`, `bun run test`, `bun run build`, database migration/seed invariants, and `bun run test:e2e`.

## Deferred work

- Backend retention cleanup for read notifications older than 10 days is tracked separately in `docs/backlog.md`; unread notifications must not be removed by that cleanup.
- Other notification types, push delivery, configurable reminder schedules, snooze, and external integrations are not part of version one.
