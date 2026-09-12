# Local-First User Preferences Design

## Goal

Persist a candidate's selected language, theme, and welcome-introduction state per account while keeping preference changes immediate and the frontend architecture small.

Preferences are low-sensitivity presentation and onboarding data. Temporary divergence between the browser and server is acceptable; the UI must not wait for the server before responding to a user action.

## Preference model

Keep the existing one-to-one `user_preferences` row with:

- `was_introduced` — non-null boolean, default `false`;
- `selected_language` — nullable value from `en`, `ru`, or `uk`;
- `selected_theme` — nullable value from `light`, `dark`, or `system`;
- `created_at`; and
- `updated_at`.

Use typed shared schemas and public camelCase response types. Nullable language and theme values represent an account that has not explicitly selected those preferences yet.

## API

Keep the authenticated preference endpoints:

```http
GET /api/user/preferences
POST /api/user/preferences/introduced
PATCH /api/user/preferences
```

`GET` returns the current account's complete preference object.

`PATCH` accepts an explicitly changed `selectedLanguage` and/or `selectedTheme`, validates the allowed values, requires the authenticated session CSRF token, and returns the complete preference object.

`POST /introduced` records completion of the welcome flow and requires the authenticated session CSRF token.

All repository operations receive the authenticated user ID. Ownership is never accepted from request input.

## Synchronization behavior

Use one browser storage key, `userPreferences`, with this shape:

```json
{
  "theme": "dark",
  "language": "uk",
  "wasIntroduced": true
}
```

### Browser startup

Read the local object during browser initialization and use its theme and language values to initialize the existing UI systems. This gives the user an immediate, stable browser experience before authentication state is known.

### Successful authentication

After successful login or registration, fetch the authenticated account's preferences. A successful server response is authoritative for that account:

- apply non-null server language and theme values;
- replace the corresponding local values in `userPreferences`;
- use the server `wasIntroduced` value to decide whether the welcome popup is shown.

Authentication never uploads local values to the server. A server preference is created or changed only by an explicit user action.

If the server has a null language or theme value, keep the current local value until the user explicitly changes that preference. Do not automatically upload it.

### Explicit preference changes

When the user changes language or theme:

1. update `userPreferences` immediately;
2. update the active UI through the existing i18next or Redux flow;
3. send the explicit change to the authenticated preference endpoint in the background.

The UI and local storage do not wait for the API response. A failed request is ignored; there is no blocking state, retry queue, toast, or synchronization error surface.

An `AbortController` may cancel an obsolete in-flight browser request when a newer change supersedes it. Cancellation is an optimization only and must not be treated as a server-side rollback. Old responses must not overwrite newer local state.

### Welcome completion

After successful login or registration, show the welcome popup only when the server reports `wasIntroduced === false`.

The following actions are explicitly equivalent completion actions:

- close the popup;
- go to the main board;
- go to the About page.

Each action updates `wasIntroduced` locally and then sends the explicit completion request in the background. Navigation or closing must happen immediately and must not wait for the request.

## Architecture and maintainability

Keep two small responsibilities:

- a local preference utility that validates, reads, and writes the unified `userPreferences` object;
- an authenticated synchronization path that fetches account preferences after authentication and sends explicit user changes.

Do not introduce a preference hydration phase. In particular, do not add preference-specific Redux state, readiness gates, disabled controls, browser-wins-once initialization, automatic local-to-server upload, migration handling, or a durable client-side sync queue.

The existing i18next, Redux, and TanStack Query responsibilities remain unchanged:

- i18next owns the active language;
- Redux owns the active theme where it already does so;
- TanStack Query may cache the successful authenticated server response;
- the local utility owns browser persistence.

Do not change authentication response contracts solely to avoid the preference fetch. Keep preference synchronization separate from authentication unless later measurements demonstrate a meaningful benefit.

## Security

Preference routes are authenticated, user-scoped, and CSRF-protected for writes. Validate locale and theme values at the API boundary. Local storage is a cache only and never establishes account identity or authorizes welcome completion.

## Testing

Cover:

- local preference parsing and serialization under the single `userPreferences` key;
- server preference schema, nullable values, and partial updates;
- authentication and CSRF requirements;
- ownership isolation;
- server values replacing local language/theme values after login or registration;
- null server values not being uploaded automatically;
- immediate local/UI updates for explicit theme, language, and welcome actions;
- background sync requests for those explicit actions;
- stale or aborted responses not overwriting newer local state;
- no preference hydration gate or control blocking;
- welcome visibility after successful login/registration and all three completion actions;
- account transitions and reload behavior.

Playwright coverage should use at least two accounts to verify account-specific server values and should avoid requiring successful background preference requests to make the immediate UI interaction pass.

## Non-goals

- New preference fields beyond language, theme, and the existing introduction flag.
- Cross-device conflict resolution based on timestamps or version numbers.
- Offline synchronization guarantees, durable retries, or user-visible sync status.
- Changes to application statuses, authentication semantics, or welcome-popup completion rules.
