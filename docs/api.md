# API Reference

Most JSON responses use one of these envelopes:

- Success: `{ "data": { ... } }`
- Error: `{ "error": { "code": "...", "message": "...", "fields": { ... } } }`

The `GET /api/health` endpoint is the exception: it returns a direct health object so infrastructure checks can read it without unwrapping `data`.

The API uses camelCase JSON. Session authentication is carried by the `session_id` HttpOnly, SameSite=Lax cookie; production also marks it `Secure`. Mutating requests send the server-issued token for that session in `x-csrf-token`.

Routes are composed through `apps/api/src/routes/index.ts`: health, auth, preferences, and applications are separate domain routers. Application handlers are grouped into collection, item, event, and board operations. Shared authentication/CSRF guards live under `apps/api/src/routes/support/`; endpoint handlers retain their own schemas, repository calls, and route-specific response behavior.

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

All mutating authenticated requests require the current session's CSRF token in `x-csrf-token`. Reads require the session cookie but not the CSRF header. Requests that address an application are always scoped to the authenticated user; ownership failures are reported as `NOT_FOUND`.

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
| `GET` | `/api/applications/export.csv` | Session | Downloads the current user's applications and activity history as CSV |
| `GET` | `/api/applications` | Session | Lists active applications; optional `?status=` filter |
| `GET` | `/api/applications/archive` | Session | Lists the current user's archived applications |
| `GET` | `/api/applications/blacklist` | Session | Lists the current user's blacklisted applications |
| `GET` | `/api/applications/:id` | Session | Reads one owned application in any board, with newest-first activity events |
| `POST` | `/api/applications` | Session + CSRF | Creates an active application; returns `201` |
| `PUT` | `/api/applications/:id` | Session + CSRF | Updates an active application |
| `POST` | `/api/applications/:id/archive` | Session + CSRF | Archives an active application |
| `POST` | `/api/applications/:id/blacklist` | Session + CSRF | Blacklists an active application with an optional reason |
| `POST` | `/api/applications/:id/restore` | Session + CSRF | Restores an archived application |
| `POST` | `/api/applications/:id/unblacklist` | Session + CSRF | Restores a blacklisted application to the active list |
| `DELETE` | `/api/applications/:id` | Session + CSRF | Permanently deletes an application owned by the current user |
| `POST` | `/api/applications/:id/events` | Session + CSRF | Creates a manual activity event; returns `201` |
| `PATCH` | `/api/applications/:id/events/:eventId` | Session + CSRF | Updates an owned manual event |
| `DELETE` | `/api/applications/:id/events/:eventId` | Session + CSRF | Deletes an owned manual event |

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

`company` and `position` are required. `status` is one of `saved`, `applied`, `interview`, `offer`, `rejected`, or `withdrawn`, and defaults to `saved`. Optional text fields may be null. `appliedAt` is an ISO calendar date. Archive and blacklist are independent lifecycle states, not additional status values. Blacklisting preserves the application's status and data; removing it from the blacklist returns it to the active list. Permanent deletion is available to the owner for any application; the UI exposes it from archive and blacklist views.

The CSV export is a UTF-8 file with a byte-order mark for spreadsheet compatibility. It includes one row per application across the active, archive, and blacklist boards, with all candidate-entered application fields and board timestamps. `activity` is a JSON-encoded cell containing event type, title, description, occurrence time, status metadata, and whether the event is system-generated; it omits internal event and application IDs. Legacy applications receive the same derived creation marker as the application detail response. Cells that could be interpreted as spreadsheet formulas are prefixed with an apostrophe. The endpoint is authenticated, owner-scoped, and returned with private no-store caching; it never includes credentials, sessions, or CSRF tokens.

Blacklisting accepts an optional body such as `{ "reason": "Duplicate employer" }`. The reason is trimmed and limited to 1,000 characters. Blacklist and unblacklist transitions return the standard message success envelope and require the session CSRF token.

## Application activity

The detail response is `{ "data": { "application": { ... }, "events": [ ... ] } }`. Events are sorted by `occurredAt` descending, with ID descending for ties. An event has `id`, `applicationId`, `type`, `title`, nullable `description`, ISO `occurredAt`, `createdAt`, `updatedAt`, nullable `metadata`, and `isSystem`. `userId` is never exposed. For `status_changed`, metadata records the canonical `{ "from": "saved", "to": "applied" }` status values.

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

Passwords are hashed with Argon2id. Raw reset tokens are generated from 32 random bytes and stored only as SHA-256 hashes. With SMTP configured, the raw token is sent only in the delivered reset link. In local development without `SMTP_URL` and `MAIL_FROM`, the intentional console fallback logs the full reset URL, including its raw token, and those logs must be treated as sensitive. Production requires SMTP and sender configuration and cannot select the console fallback. Tokens expire after one hour, are single-use, and a successful reset invalidates every session owned by that user. Production startup also requires an explicit HTTPS app origin; the CORS origin defaults to the app origin and must also be HTTPS, keeping reset links and credentialed browser requests on the intended origins.
