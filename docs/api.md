# API Reference

All JSON responses use one of these envelopes:

- Success: `{ "data": { ... } }`
- Error: `{ "error": { "code": "...", "message": "...", "fields": { ... } } }`

The API uses camelCase JSON. Session authentication is carried by the `session_id` HttpOnly cookie. Mutating requests also send `x-csrf-token`.

## Health and authentication

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| `GET` | `/api/health` | No | Returns database health; `503` when unavailable |
| `GET` | `/api/auth/csrf` | No | Returns a CSRF token and creates an anonymous session if needed |
| `POST` | `/api/auth/register` | CSRF | Creates a user and authenticated session; returns `201` |
| `POST` | `/api/auth/login` | CSRF | Authenticates credentials and returns a session |
| `POST` | `/api/auth/logout` | CSRF | Deletes the current session and clears the cookie |
| `GET` | `/api/auth/me` | Session | Returns the current user |

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

## Applications

| Method | Path | Auth/CSRF | Purpose |
| --- | --- | --- | --- |
| `GET` | `/api/applications` | Session | Lists active applications; optional `?status=` filter |
| `GET` | `/api/applications/archive` | Session | Lists the current user's archived applications |
| `GET` | `/api/applications/:id` | Session | Reads one active application |
| `POST` | `/api/applications` | Session + CSRF | Creates an active application; returns `201` |
| `PUT` | `/api/applications/:id` | Session + CSRF | Updates an active application |
| `POST` | `/api/applications/:id/archive` | Session + CSRF | Archives an active application |
| `POST` | `/api/applications/:id/restore` | Session + CSRF | Restores an archived application |
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

`company` and `position` are required. `status` is one of `saved`, `applied`, `interview`, `offer`, `rejected`, or `withdrawn`, and defaults to `saved`. Optional text fields may be null. `appliedAt` is an ISO calendar date.

## Error behavior

Common codes include `UNAUTHENTICATED` (`401`), `CSRF_ERROR` (`403`), `VALIDATION_ERROR` (`422`), `EMAIL_TAKEN` (`409`), `ACTIVE_APPLICATION` (`409`), `RATE_LIMITED` (`429`), `NOT_FOUND` (`404`), and `INVALID_ID` (`400`). Validation errors include a `fields` map. Ownership failures are intentionally reported as not found rather than revealing another user's records. Repeated login and registration attempts for the same normalized email are limited in the API process; rejected requests include `Retry-After`.
