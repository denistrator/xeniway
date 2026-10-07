# API Reference

Most JSON responses use one of these envelopes:

- Success: `{ "data": { ... } }`
- Error: `{ "error": { "code": "...", "message": "...", "fields": { ... } } }`

The `GET /api/health` endpoint is the exception: it returns a direct health object so infrastructure checks can read it without unwrapping `data`.

The API uses camelCase JSON. Session authentication is carried by the `session_id` HttpOnly, SameSite=Lax cookie; production also marks it `Secure`. Mutating requests send the server-issued token for that session in `x-csrf-token`.

Xenia Way records employer conversations and application progress for one authenticated candidate at a time. Application status is always one of `saved`, `applied`, `interview`, `offer`, `rejected`, or `withdrawn`; archive and blacklist are independent lifecycle states outside that status set.

## Health and authentication

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| `GET` | `/api/health` | No | Returns database and Redis health; `503` when either is unavailable |
| `GET` | `/api/auth/csrf` | No | Returns a CSRF token and creates an anonymous session if needed |
| `POST` | `/api/auth/register` | CSRF | Creates a user and authenticated session; returns `201` |
| `POST` | `/api/auth/login` | CSRF | Authenticates credentials and returns a session |
| `POST` | `/api/auth/logout` | CSRF | Deletes the current session and clears the cookie |
| `GET` | `/api/auth/me` | Session | Returns the current user |
| `POST` | `/api/auth/password-reset/request` | CSRF | Returns generic success for an unknown account or after successful known-account reset delivery |
| `POST` | `/api/auth/password-reset/confirm` | CSRF | Consumes a valid reset token and changes the password |

Reads require the session cookie but not the CSRF header. Requests that address an application are scoped to the authenticated user; ownership failures are reported as `NOT_FOUND`.

Register body:

```json
{
  "email": "candidate@example.com",
  "password": "password123",
  "firstName": "Job",
  "lastName": "Candidate"
}
```

Login body is `{ "email": "...", "password": "..." }`. Emails are trimmed and normalized to lowercase. Passwords are 8–128 characters for registration.

Password reset request body is `{ "email": "candidate@example.com" }`. An unknown account and a known account whose token is stored and reset message is delivered receive the same generic success response. A token-storage or mail-delivery failure for a known account returns `PASSWORD_RESET_ERROR` with status `500`; because an unknown account still returns success, the current failure behavior is not unconditionally enumeration-safe. Confirmation accepts a URL-safe token, a new 8–128 character password, and matching `passwordConfirmation`. Reset tokens are single-use, expire after one hour, and are stored only as SHA-256 hashes. A successful confirmation invalidates all existing sessions. Invalid, expired, and reused tokens return `PASSWORD_RESET_INVALID` with status `400`.

## Applications

| Method | Path | Auth/CSRF | Purpose |
| --- | --- | --- | --- |
| `GET` | `/api/applications/export.csv` | Session | Downloads application and preparation fields as CSV |
| `GET` | `/api/applications/export.zip` | Session | Downloads application, contact, and follow-up CSV files in a ZIP package |
| `GET` | `/api/applications` | Session | Lists active applications; optional `?status=` filter |
| `GET` | `/api/applications/archive` | Session | Lists the current user's archived applications |
| `GET` | `/api/applications/blacklist` | Session | Lists the current user's blacklisted applications |
| `GET` | `/api/applications/:id` | Session | Reads one owned application in any board, with activity, interview preparation, contacts, and follow-ups |
| `POST` | `/api/applications` | Session + CSRF | Creates an active application; returns `201` |
| `POST` | `/api/applications/reorder` | Session + CSRF | Reorders active applications within one status |
| `POST` | `/api/applications/remove-all` | Session + CSRF | Permanently deletes all owned applications in the selected board |
| `PUT` | `/api/applications/:id` | Session + CSRF | Updates an active application |
| `POST` | `/api/applications/:id/archive` | Session + CSRF | Archives an active application |
| `POST` | `/api/applications/:id/blacklist` | Session + CSRF | Blacklists an active application with an optional reason |
| `POST` | `/api/applications/:id/restore` | Session + CSRF | Restores an archived application |
| `POST` | `/api/applications/:id/unblacklist` | Session + CSRF | Restores a blacklisted application to the active list |
| `DELETE` | `/api/applications/:id` | Session + CSRF | Permanently deletes an application owned by the current user |
| `POST` | `/api/applications/:id/events` | Session + CSRF | Creates a manual activity event; returns `201` |
| `PATCH` | `/api/applications/:id/events/:eventId` | Session + CSRF | Updates an owned manual event |
| `DELETE` | `/api/applications/:id/events/:eventId` | Session + CSRF | Deletes an owned manual event |
| `PUT` | `/api/applications/:id/preparation` | Session + CSRF | Saves company research, talking points, and interviewer questions |
| `POST` | `/api/applications/:id/contacts` | Session + CSRF | Adds a contact; returns `201` |
| `PATCH` | `/api/applications/:id/contacts/:contactId` | Session + CSRF | Updates an owned contact |
| `DELETE` | `/api/applications/:id/contacts/:contactId` | Session + CSRF | Removes an owned contact |
| `POST` | `/api/applications/:id/follow-ups` | Session + CSRF | Adds a dated follow-up task; returns `201` |
| `PATCH` | `/api/applications/:id/follow-ups/:taskId` | Session + CSRF | Updates an owned follow-up task |
| `POST` | `/api/applications/:id/follow-ups/:taskId/complete` | Session + CSRF | Marks an owned follow-up complete; takes no body |
| `DELETE` | `/api/applications/:id/follow-ups/:taskId` | Session + CSRF | Deletes an owned follow-up task |

Application create/update fields:

```json
{
  "company": "Acme",
  "position": "Software Engineer",
  "location": "Remote",
  "salary": "$100,000",
  "jobUrl": "https://example.com/jobs/123",
  "description": "Role details",
  "status": "saved",
  "appliedAt": "2026-09-01",
  "notes": "Follow up Friday"
}
```

`company` and `position` are required on creation; PUT accepts a partial object and preserves omitted fields. Creation defaults `status` to `saved`; the six accepted values are listed above. Optional text fields may be null, and `appliedAt` is an ISO calendar date. Blacklisting preserves status and data; removing it returns the application to the active list. Permanent deletion is available to the owner for any application, with UI actions in archive and blacklist views.

Reorder accepts `{ "status": "saved", "applicationIds": [1, 2] }` with 1–100 positive IDs; repository validation checks ownership and ordering validity. Remove-all accepts `{ "board": "active" }`, with `active`, `archive`, or `blacklist` as the explicit deletion scope.

## Data export

The UI uses `GET /api/applications/export.zip`, which downloads `applications.csv`, `contacts.csv`, and `follow-ups.csv`. The separate `export.csv` endpoint returns the same application CSV without the related files. Both include applications across active, archive, and blacklist boards, are owner-scoped, and use private no-store caching.

Each CSV uses UTF-8 with a byte-order mark. The ordered application columns are `Company`, `Position`, `Status`, `Board`, `Location`, `Job URL`, `Description`, `Applied at`, `Notes`, `Company research`, `Talking points`, `Interviewer questions`, `Created at`, and `Updated at`. Preparation columns are blank when no workspace record exists. Salary and activity are not exported.

Contacts export `Application ID`, `Name`, `Role`, `Email`, `Phone`, `Profile URL`, and `Notes`; follow-ups export `Application ID`, `Title`, `Due date`, `Notes`, and `Completed at`. The application CSV currently omits the ID, so related rows cannot be reliably joined back to an application row from the package alone. This limitation is tracked in [the backlog](backlog.md#make-exported-related-records-joinable).

All columns are allowlisted in `apps/api/src/routes/applications/export-csv.ts`. Formula-like cells receive an apostrophe prefix and CSV quotes are escaped. Credentials, sessions, CSRF tokens, user IDs, and contact/task IDs are excluded; the related files explicitly expose their parent application IDs.

## Blacklist transitions

Blacklisting accepts an optional body such as `{ "reason": "Duplicate employer" }`. The reason is trimmed and limited to 1,000 characters. Blacklist and unblacklist transitions return the standard message success envelope and require the session CSRF token.

## Application activity

The detail response is `{ "data": { "application": { ... }, "events": [ ... ], "preparation": { ... }, "contacts": [ ... ], "followUpTasks": [ ... ] } }`. Events are sorted by `occurredAt` descending, with ID descending for ties. An event has `id`, `applicationId`, `type`, `title`, nullable `description`, ISO `occurredAt`, `createdAt`, `updatedAt`, nullable `metadata`, and `isSystem`. `userId` is never exposed. For `status_changed`, metadata records the canonical `{ "from": "saved", "to": "applied" }` status values.

Preparation contains nullable `companyResearch`, `talkingPoints`, and `interviewerQuestions` fields. Contacts contain `id`, `applicationId`, `name`, `role`, nullable `email`, `phone`, `profileUrl`, and `notes`, plus timestamps. Follow-up tasks contain `id`, `applicationId`, `title`, ISO calendar `dueDate`, nullable `notes`, nullable completion timestamp, and timestamps. The detail endpoint returns empty/default values when no workspace data has been saved yet. Mutations are owner-scoped and return the changed resource under `data`; request validation runs before the owner-scoped repository operation, and validation failures use the standard field-error envelope. Contact and follow-up creation return `201`. Preparation text and notes are limited to 10,000 characters; contact names and roles are required, and profile URLs must use HTTP or HTTPS. Follow-up title and due date are required; completion is an idempotent state change.

Mutation bodies are JSON. Preparation uses a nonempty partial object and accepts explicit `null` to clear a field:

```json
{ "companyResearch": "Recent product launches", "talkingPoints": null }
```

Contact creation requires `name` and `role`; the remaining fields are optional and may be omitted or null:

```json
{ "name": "Jordan Lee", "role": "Recruiter", "email": "jordan@example.com", "phone": null, "profileUrl": "https://example.com/jordan", "notes": null }
```

Contact PATCH accepts a nonempty subset of those fields. Follow-up creation requires an ISO calendar `dueDate` and a nonempty `title`; `notes` is optional:

```json
{ "title": "Send a thank-you note", "dueDate": "2026-10-02", "notes": "Mention the platform discussion" }
```

Follow-up PATCH accepts a nonempty subset of `title`, `dueDate`, and `notes`. Completion takes no body and sets `completedAt` server-side; ordinary create/update inputs cannot set completion state. Contacts are returned by creation time then ID ascending. Follow-ups are returned with incomplete tasks first, ordered by due date then ID, followed by completed tasks ordered by completion time then ID. Workspace preparation, contact, and follow-up mutations do not create activity events; the existing timeline remains for application lifecycle events and candidate-recorded interactions.

Creation, meaningful field edits, status changes, archive/restore, and blacklist/unblacklist transitions append immutable system events in the same database transaction as the application change. Reordering is not an activity event. Deleting an application permanently cascades to its events.

For an application created before this feature, the detail response derives a read-only `application_created` marker from the application's existing `createdAt` timestamp when no persisted creation event exists. This marker has a stable negative ID and is not stored or accepted by event mutation routes. Earlier edits and state transitions cannot be reconstructed; the persisted history begins when the feature is deployed. Archived and blacklisted applications can be read through the same detail route and their cards expose the Activity section.

Manual event `type` is one of `note`, `email_sent`, `email_received`, `phone_call`, `interview_scheduled`, `interview_completed`, `offer_received`, `rejection_received`, `follow_up`, or `custom`. POST requires a trimmed 1–255 character `title` and an ISO datetime with timezone offset in `occurredAt`; nullable `description` is optional and limited to 10,000 characters. PATCH accepts a nonempty subset of `type`, `title`, `description`, and `occurredAt`. Event IDs and parent IDs must be positive integers. The server refuses updates or deletion of system events and reports missing or non-owned records as `NOT_FOUND`. User text is rendered as plain text.

## User preferences

| Method | Path | Auth/CSRF | Purpose |
| --- | --- | --- | --- |
| `GET` | `/api/user/preferences` | Session | Reads the current user's preferences; an absent row is treated as the default state |
| `PATCH` | `/api/user/preferences` | Session + CSRF | Updates one or more selected preferences and returns the complete preference record |
| `POST` | `/api/user/preferences/introduced` | Session + CSRF | Marks the current user's introduction as complete |

The preference response is shaped as `{ "data": { "preferences": { ... } } }`:

```json
{
  "data": {
    "preferences": {
      "wasIntroduced": false,
      "selectedLanguage": null,
      "selectedTheme": null,
      "selectedFormPresentation": null,
      "createdAt": "2026-09-01T10:00:00.000Z",
      "updatedAt": "2026-09-01T10:00:00.000Z"
    }
  }
}
```

`selectedLanguage` is nullable and accepts `en`, `ru`, `uk`, or `he`. `selectedTheme` is nullable and accepts `light`, `dark`, or `system`. A PATCH body must include at least one of these fields; omitted fields are preserved and explicit `null` clears a selected value. For example:

```json
{ "selectedLanguage": "uk", "selectedTheme": "dark" }
```

`selectedFormPresentation` is nullable and accepts `drawer` or `modal`. It follows the same partial-update rules and controls whether the job form opens as a side drawer or a centered modal.

Preference reads and writes require the authenticated session and are scoped by its user ID; `userId` is never accepted from request input. PATCH and introduction completion requests also require the current session's `x-csrf-token`. New accounts begin with all selected values null and `wasIntroduced: false`. The frontend checks the introduction flag only after successful login or registration; restoring an existing session on page reload does not open the welcome popup.

The browser stores the flat object `{ "theme", "language", "formPresentation", "wasIntroduced" }` under the single local-storage key `userPreferences` and applies it immediately at startup. After successful login or registration, server `selectedTheme`, `selectedLanguage`, and `selectedFormPresentation` values replace the corresponding browser values when they are non-null, while server `wasIntroduced` always replaces the cached flag. Authentication never uploads browser values or fills null server selections. Explicit theme, language, form-presentation, and welcome actions update the UI and browser cache first, then send the corresponding authenticated, CSRF-protected write in the background. The browser cache contains no user ID and cannot authorize access, complete onboarding, or bypass authentication and CSRF checks.

## Error behavior

The healthy response from `/api/health` is `{ "status": "ok", "database": "up", "redis": "up" }`. Common codes include `UNAUTHENTICATED` (`401`), `CSRF_ERROR` (`403`), `VALIDATION_ERROR` (`422`), `EMAIL_TAKEN` (`409`), `ACTIVE_APPLICATION` (`409`), `PASSWORD_RESET_INVALID` (`400`), `RATE_LIMITED` (`429`), `RATE_LIMIT_UNAVAILABLE` (`503`), `NOT_FOUND` (`404`), and `INVALID_ID` (`400`). Validation errors include a `fields` map. Ownership failures and invalid blacklist transitions are intentionally reported as not found rather than revealing another user's records. Repeated login, registration, and password-reset attempts for the same normalized email use a five-attempt, fifteen-minute Redis-backed fixed window with SHA-256-digested identifiers; rejected requests include `Retry-After`. If Redis is unavailable, these flows fail closed with `RATE_LIMIT_UNAVAILABLE` rather than bypassing the limit.

Passwords use Argon2id. Reset-token behavior is defined under [authentication](#health-and-authentication); mail delivery and production configuration are described in [Operations](operations.md#password-recovery).
