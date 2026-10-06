# Testing and CI

## Test layers

- `packages/shared/src/index.test.ts` verifies shared schemas and public contract assumptions.
- `apps/api/src/*.test.ts` covers authentication, expiration, CSRF, password-reset token lifecycle, mailer/service behavior, row mapping, seed invariants, validation, CRUD, status filtering, archive and blacklist transitions, error status codes, and ownership isolation using focused in-memory dependencies.
- `apps/web/src/lib/api.test.ts` covers client error parsing, query-key separation, CSRF headers on password-reset mutations, and authenticated export-package downloads.
- `apps/web/src/components/site-header.test.tsx` covers the resolved signed-out login link and confirms it remains absent while the session is loading or authenticated.
- `apps/web/src/components/layout.test.tsx` exercises the real create-form host under StrictMode with controlled query results and real Query mutation state: no host mount before first use, pending/error retention across close/reopen, and account/logout/loading-auth isolation. `layout-import.test.tsx` independently verifies cold import evaluation; it is isolated because React.lazy caches resolved modules across tests within a file. Both files also pass shuffled test execution.
- `apps/web/src/features/welcome/welcome-modal.test.tsx` covers localized welcome content, completion actions, backdrop/Escape behavior, and the language control.
- `apps/web/src/i18n/i18n.test.ts`, `apps/web/src/i18n/format.test.ts`, and `apps/web/src/features/preferences/language-selector.test.tsx` cover locale resolution, lazy resource selection, browser persistence, date formatting, compact labels, and accessible language names.
- `apps/web/src/features/applications/board/job-status.test.ts` protects the shared six-status display order and translated labels used by the board, filters, and form.
- `apps/web/src/features/applications/activity/*.test.tsx` covers newest-first ordering and deterministic ties, localized plain-text rendering, immutable system history, and manual activity create/edit/delete workflows, confirmation, failure feedback, draft retention, and focus return.
- `apps/web/src/features/applications/application-workspace/page/*.test.tsx` covers workspace loading, navigation, and ownership failures. Focused tests in `overview`, `lifecycle`, `preparation`, `contacts`, and `follow-ups` cover each domain's forms, validation, persistence, and focus behavior. Lifecycle tests include confirmation/cancellation, pending controls, failure recovery, and board-specific navigation; preparation tests include independent simultaneous drafts.
- `apps/web/src/features/auth/password-reset/password-reset-page.test.tsx` verifies a user-visible validation message after switching locale.
- `tests/e2e/xeniway.spec.ts` covers language switching and reload persistence, public password recovery navigation and validation, welcome behavior after login and registration, immediate local preference updates, server persistence after reload, theme/language/form-presentation selectors, server-authoritative account values, and account isolation. It exercises the board, six statuses, search, create, activity history, and the application workspace: preparation edits, contact creation, dated follow-up completion and persistence after reload, navigation from active/archive/blacklist, board-specific lifecycle actions, and cross-account workspace read/write isolation. It also covers native drag-and-drop and permanent deletion.

The application drawer and modal use the shared translated “Close dialog” label for their backdrop controls. Browser coverage checks both accessible names alongside focus management and Escape handling. The dialog workflow observes the Vite development host-module request: no request before Add job, one after keyboard activation, and no additional import on reopen. It delays that first request, checks the loading announcement, tabs to another control before releasing it, and verifies initial dialog focus and Escape return to the original Add job button. It also verifies reopen focus and presentation switching. Production route and first-open download measurements are documented separately in [Frontend bundle cost](frontend-bundle-cost.md); the standard E2E server uses development assets.

The activity browser workflow checks both form presentations, focus entry and return, safe rendering and Axe for the activity view, immutable system events, archive/blacklist history, manual event persistence, and legacy creation-marker behavior through the API test fixture.

The application-workspace browser workflow checks heading focus on navigation, Atlaskit inline editing and focus return, accessible preparation editing, contact and follow-up creation, follow-up completion, server persistence after reload, and lifecycle transitions while retaining the same workspace data. Workspace unit tests cover one-field updates, the dirty compact-field warning, direct confirmation, multiline editing, and immediate status selection.

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

Tailwind Variants migration coverage lives in `apps/web/src/lib/utils.test.ts` and `components/ui/button.test.tsx`: caller overrides must resolve conflicts while preserving independent semantic colors, font sizes, responsive modifiers, native disabled state, forwarded refs, and Radix `asChild` link semantics. Status-decoration tests exercise the shared slot recipe alongside the existing workflow order and translated labels. Existing floating-label, workspace, activity, auth, preference, and browser tests remain the behavioral regression gate. Avoid full class-string snapshots; assert the override contract or user behavior that could regress.

When changing recipes, verify light/dark/system themes, Hebrew RTL, keyboard entry/return for dialogs and InlineEdit, mobile layouts, and reduced motion. Keep the floating-label, board, and workspace CSS hooks intact. Compare production entry/workspace chunks when changing styling dependencies, because merge logic runs in the browser.

When a recipe gains variants, add coverage for the affected override boundaries rather than every possible combination. Test that overrides stay confined to the intended slot, semantic color and font-size classes coexist, focus-visible overrides preserve other focus styles, and responsive overrides leave the base breakpoint intact. `components/ui/card.test.tsx` covers slot isolation and semantic typography; Button coverage includes responsive and focus-visible overrides. For compound variants, cover the matching combination and a nearby nonmatching case when one is introduced. Class assertions verify composition; browser checks verify actual focus indicators and responsive layout.

Add focused tests when changing a shared schema, API route, repository rule, authentication behavior, ownership boundary, archive transition, visible workflow, or accessibility behavior. Keep schema changes data-empty and test seed idempotency separately. Use stable accessible labels and roles in browser tests. For UI changes, verify keyboard access, focus behavior, live announcements, mobile layout, theme behavior, and reduced-motion behavior as applicable. The unified `userPreferences` key is the only current client storage contract; do not infer or add compatibility behavior for deleted storage keys.

The suite has no coverage threshold. Quality is enforced through type safety, focused behavior tests, a real database-backed browser flow, and the complete CI command sequence.

Workspace and activity tests explicitly call `apps/web/src/test/initialize-test-i18n.ts` in their setup to initialize the shared i18n instance and reset its locale to English. Tests may switch locale afterward. This keeps setup consistent without forcing initialization on unrelated tests or hiding it in a render helper.
