# Welcome Popup Design

## Goal

Introduce new candidates to Xenia Way immediately after successful authentication, while recording completion server-side per user so the welcome experience is shown only until the user takes an explicit completion action.

## User experience

The welcome popup appears after a successful login or registration when the authenticated user's `was_introduced` preference is `false`. It does not appear merely because an existing session is restored on page reload.

The accessible modal contains:

- a close button on one side of the header;
- the existing language switcher on the opposite side;
- a localized welcome title;
- localized introductory copy describing Xenia Way and its main features;
- a `Go to board` action; and
- an `About Xenia Way` action.

The close button, clicking the backdrop, and pressing Escape are equivalent completion actions. Each marks the user as introduced and closes the modal. `Go to board` marks the user as introduced, closes the modal, and navigates to `/`. `About Xenia Way` marks the user as introduced, closes the modal, and navigates to `/about`. Changing the language alone does not complete the introduction.

## Persistence and API

Add a minimal one-to-one `user_preferences` table with:

- `user_id` as both primary key and cascading foreign key to `users.id`;
- `was_introduced` as a non-null boolean defaulting to `false`;
- `created_at`; and
- `updated_at`.

Do not add language or theme columns in this feature. They can be introduced later through a separate migration when server-side synchronization is required.

Add a typed, user-scoped preferences repository and authenticated API operations to read the current user's preferences and mark the introduction complete. All reads and writes must be scoped by the authenticated user ID and mutating requests must require the existing session CSRF token. The exact route shape should follow the repository's current API naming conventions without changing shared application contracts.

After login or registration succeeds, the frontend fetches the current user's preferences and evaluates `was_introduced`. Session restoration on reload must not independently trigger the popup. Logout must clear preference query state so another account is evaluated independently.

## Failure behavior

If the preference read fails after authentication, do not show a partially initialized popup; expose the existing authenticated request error behavior. If marking the preference complete fails, keep the popup open, do not navigate, and announce an accessible error so the user can retry.

## Accessibility and localization

Use the existing modal conventions for `role="dialog"`, `aria-modal`, labelled title, focus placement, Escape handling, focus restoration, and backdrop interaction. Keep the language switcher usable inside the modal and preserve the existing browser language preference behavior.

Add aligned translation keys to the English, Russian, and Ukrainian dictionaries for the title, introduction copy, feature descriptions, action labels, close label, and preference-update error. Do not change canonical API values or user-entered content.

## Testing

Add focused tests for the preferences schema/repository and ownership isolation, API authentication and CSRF behavior, login and registration completion flow, no popup on session restoration, all completion actions, navigation, failed completion updates, focus/Escape/backdrop behavior, and translation dictionary alignment. Extend Playwright coverage to verify the popup after seeded login and registration, completion persistence, and account isolation.

## Non-goals

- Server-side language or theme synchronization.
- Showing the popup on every authenticated page load when the flag remains false.
- A seventh application status or changes to application workflow semantics.
- New authentication, deployment, or external integration behavior.
