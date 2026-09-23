# Testing and CI

## Test layers

- `packages/shared/src/index.test.ts` verifies shared schemas and public contract assumptions.
- `apps/api/src/*.test.ts` covers authentication, expiration, CSRF, password-reset token lifecycle, mailer/service behavior, row mapping, seed invariants, validation, CRUD, status filtering, archive and blacklist transitions, error status codes, and ownership isolation using focused in-memory dependencies.
- `apps/web/src/lib/api.test.ts` covers client error parsing, query-key separation, and CSRF headers on password-reset mutations.
- `apps/web/src/features/welcome/welcome-modal.test.tsx` covers localized welcome content, completion actions, backdrop/Escape behavior, and the language control.
- `apps/web/src/i18n/i18n.test.ts`, `apps/web/src/i18n/format.test.ts`, and `apps/web/src/features/preferences/language-selector.test.tsx` cover locale resolution, lazy resource selection, browser persistence, date formatting, compact labels, and accessible language names.
- `apps/web/src/features/applications/job-status.test.ts` protects the shared six-status display order and translated labels used by the board, filters, and form.
- `apps/web/src/features/applications/activity/*.test.tsx` covers localized timeline rendering, immutable system history, and manual activity form submission.
- `apps/web/src/features/applications/application-workspace/*.test.tsx` covers workspace navigation, lifecycle routing, forms, validation, persistence updates, and focus behavior for workspace sections.
- `apps/web/src/features/auth/password-reset/password-reset-page.test.tsx` verifies a user-visible validation message after switching locale.
- `tests/e2e/xeniway.spec.ts` covers language switching and reload persistence, public password recovery navigation and validation, welcome behavior after login and registration, immediate local preference updates, server persistence after reload, theme/language/form-presentation selectors, server-authoritative account values, and account isolation. It exercises the board, six statuses, search, create, activity history, and the application workspace: preparation edits, contact creation, dated follow-up completion and persistence after reload, navigation from active/archive/blacklist, board-specific lifecycle actions, and cross-account workspace read/write isolation. It also covers native drag-and-drop and permanent deletion.

The application drawer and modal use the shared translated “Close dialog” label for their backdrop controls. Browser coverage checks both accessible names alongside focus management and Escape handling.

The activity browser workflow checks both form presentations, focus entry and return, safe rendering and Axe for the activity view, immutable system events, archive/blacklist history, manual event persistence, and legacy creation-marker behavior through the API test fixture.

The application-workspace browser workflow checks heading focus on navigation, accessible preparation editing, contact and follow-up creation, follow-up completion, server persistence after reload, and lifecycle transitions while retaining the same workspace data.

## Commands

```bash
bun run check:public
bun run lint
bun run typecheck
bun run test
bun run build
bun run up
bun run db:migrate
bun run db:seed
bun run test:e2e
git diff --check
```

`check:public`, lint, typecheck, unit tests, build, and `git diff --check` do not require local services. The root `test` command runs the repository-check tests and all three Vitest workspaces. Database migration and seed commands require running PostgreSQL. E2E requires running PostgreSQL and Redis, an applied and seeded schema, and Playwright Chromium because it uses the real API and database; Playwright starts and stops its own API and web servers. Mailpit is not required by the automated browser suite, though it is used for manual local email inspection.

The checked-in `.github/workflows/ci.yml` workflow uses PostgreSQL and Redis service containers, applies migrations, seeds development fixtures, runs typecheck, unit tests, and build, installs Chromium, and runs Playwright. The welcome-flow and preference E2E coverage verifies the four browser values under `userPreferences` (`language`, `theme`, `formPresentation`, and `wasIntroduced`) against server `selectedLanguage`, `selectedTheme`, `selectedFormPresentation`, and `wasIntroduced`: login and registration apply server values, session restoration does not reopen the welcome dialog, explicit actions update locally first and synchronize in the background, and account values remain isolated. Logout preserves the complete browser preference object, including after reloading the login page.

## Test design rules

Add focused tests when changing a shared schema, API route, repository rule, authentication behavior, ownership boundary, archive transition, visible workflow, or accessibility behavior. Keep schema changes data-empty and test seed idempotency separately. Use stable accessible labels and roles in browser tests. For UI changes, verify keyboard access, focus behavior, live announcements, mobile layout, theme behavior, and reduced-motion behavior as applicable. The unified `userPreferences` key is the only current client storage contract; do not infer or add compatibility behavior for deleted storage keys.

The suite has no coverage threshold. Quality is enforced through type safety, focused behavior tests, a real database-backed browser flow, and the complete CI command sequence.
