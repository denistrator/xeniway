# API Reference

Most JSON responses use one of these envelopes:

- Success: `{ "data": { ... } }`
- Error: `{ "error": { "code": "...", "message": "...", "fields": { ... } } }`

The `GET /api/health` endpoint is the exception: it returns a direct health object so infrastructure checks can read it without unwrapping `data`.

The API uses camelCase JSON. Session authentication is carried by the `session_id` HttpOnly cookie. Mutating requests also send `x-csrf-token`.

## Health and authentication

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| `GET` | `/api/health` | No | Returns database and Redis health; `503` when either is unavailable |
| `GET` | `/api/auth/csrf` | No | Returns a CSRF token and creates an anonymous session if needed |
| `POST` | `/api/auth/register` | CSRF | Creates a user and authenticated session; returns `201` |
| `POST` | `/api/auth/login` | CSRF | Authenticates credentials and returns a session |
| `POST` | `/api/auth/logout` | CSRF | Deletes the current session and clears the cookie |
| `GET` | `/api/auth/me` | Session | Returns the current user |
| `POST` | `/api/auth/password-reset/request` | CSRF | Sends a reset link when the email belongs to an account; always returns the same message |
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

Password reset request body is `{ "email": "candidate@example.com" }`. A valid request returns the same generic message for known and unknown emails. Confirmation accepts a URL-safe token, a new 8–128 character password, and matching `passwordConfirmation`. Reset tokens are single-use, expire after one hour, and are stored only as SHA-256 hashes. A successful confirmation invalidates all existing sessions. Invalid, expired, and reused tokens return `PASSWORD_RESET_INVALID` with status `400`.

## Applications

| Method | Path | Auth/CSRF | Purpose |
| --- | --- | --- | --- |
| `GET` | `/api/applications` | Session | Lists active applications; optional `?status=` filter |
| `GET` | `/api/applications/archive` | Session | Lists the current user's archived applications |
| `GET` | `/api/applications/blacklist` | Session | Lists the current user's blacklisted applications |
| `GET` | `/api/applications/:id` | Session | Reads one active application |
| `POST` | `/api/applications` | Session + CSRF | Creates an active application; returns `201` |
| `PUT` | `/api/applications/:id` | Session + CSRF | Updates an active application |
| `POST` | `/api/applications/:id/archive` | Session + CSRF | Archives an active application |
| `POST` | `/api/applications/:id/blacklist` | Session + CSRF | Blacklists an active application with an optional reason |
| `POST` | `/api/applications/:id/restore` | Session + CSRF | Restores an archived application |
| `POST` | `/api/applications/:id/unblacklist` | Session + CSRF | Restores a blacklisted application to the active list |
| `DELETE` | `/api/applications/:id` | Session + CSRF | Permanently deletes an archived application |

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

`company` and `position` are required. `status` is one of `saved`, `applied`, `interview`, `offer`, `rejected`, or `withdrawn`, and defaults to `saved`. Optional text fields may be null. `appliedAt` is an ISO calendar date. Archive and blacklist are independent lifecycle states, not additional status values. Blacklisting preserves the application's status and data; removing it from the blacklist returns it to the active list. Permanent deletion is accepted only for an archived application.

Blacklisting accepts an optional body such as `{ "reason": "Duplicate employer" }`. The reason is trimmed and limited to 1,000 characters. Blacklist and unblacklist transitions return the standard message success envelope and require the session CSRF token.

## User preferences

| Method | Path | Auth/CSRF | Purpose |
| --- | --- | --- | --- |
| `GET` | `/api/user/preferences` | Session | Reads the current user's preferences; an absent row is treated as the default state |
| `POST` | `/api/user/preferences/introduced` | Session + CSRF | Marks the current user's introduction as complete |

The current preference response contains `wasIntroduced`, `createdAt`, and `updatedAt`. New accounts begin with `wasIntroduced: false`. The frontend checks this value only after successful login or registration; restoring an existing session on page reload does not open the welcome popup. Preference reads and writes are scoped by authenticated user ID, and ownership is never accepted from request input.

## Error behavior

The healthy response from `/api/health` is `{ "status": "ok", "database": "up", "redis": "up" }`. Common codes include `UNAUTHENTICATED` (`401`), `CSRF_ERROR` (`403`), `VALIDATION_ERROR` (`422`), `EMAIL_TAKEN` (`409`), `ACTIVE_APPLICATION` (`409`), `PASSWORD_RESET_INVALID` (`400`), `RATE_LIMITED` (`429`), `RATE_LIMIT_UNAVAILABLE` (`503`), `NOT_FOUND` (`404`), and `INVALID_ID` (`400`). Validation errors include a `fields` map. Ownership failures and invalid blacklist transitions are intentionally reported as not found rather than revealing another user's records. Repeated login, registration, and password-reset attempts for the same normalized email use a five-attempt, fifteen-minute Redis-backed fixed window; rejected requests include `Retry-After`. If Redis is unavailable, these flows fail closed with `RATE_LIMIT_UNAVAILABLE` rather than bypassing the limit.
