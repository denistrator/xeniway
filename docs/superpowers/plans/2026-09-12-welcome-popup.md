# Welcome Popup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show a localized, accessible welcome popup after successful login or registration and persist its completion per user in PostgreSQL.

**Architecture:** Add a minimal one-to-one `user_preferences` table and typed repository/API boundary for `was_introduced`. Authentication success creates an explicit frontend onboarding trigger; the application shell fetches preferences only for that trigger, so session restoration does not open the popup. A dedicated modal owns completion actions and navigation while existing i18n, query, routing, and accessibility patterns remain in use.

**Tech Stack:** Bun, Elysia, Drizzle ORM, PostgreSQL, Zod, React, React Router, TanStack Query, Redux Toolkit, i18next/react-i18next, Tailwind CSS, Vitest, and Playwright.

## Global Constraints

- `user_preferences.user_id` is both the primary key and a cascading foreign key to `users.id`.
- `was_introduced` is a non-null boolean defaulting to `false`; do not add language or theme columns in this feature.
- All preference reads and writes are scoped by authenticated user ID.
- Mutating preference requests require the existing session CSRF token.
- Show the popup only after successful login or registration, never from session restoration alone.
- Close button, backdrop click, and Escape mark the user introduced and close the popup.
- `Go to board` marks introduced, closes, and navigates to `/`; `About Xenia Way` marks introduced, closes, and navigates to `/about`.
- Language switching inside the popup does not mark the user introduced and continues using the existing browser preference.
- If completion persistence fails, keep the modal open, do not navigate, and announce the error.
- Preserve the six application statuses, authenticated ownership boundary, API envelopes, and existing modal focus conventions.

---

### Task 1: Add the user-preferences persistence boundary

**Files:**
- Create: `apps/api/drizzle/0005_user_preferences.sql`
- Modify: `apps/api/src/db/schema.ts`
- Modify: `apps/api/src/db/repository.ts`
- Modify: `apps/api/src/db/repository.test.ts`

**Interfaces:**
- Produces `userPreferences` Drizzle table and `UserPreferencesRepository` with `findByUserId(userId: number)` and `markIntroduced(userId: number): Promise<boolean>`.

- [ ] **Step 1: Add repository tests for defaults, idempotency, and ownership**

Cover a missing preference row resolving to `wasIntroduced: false`, marking a user introduced, repeating the mark safely, and never returning or updating another user's row. Use the existing repository test database/in-memory conventions.

- [ ] **Step 2: Add the migration**

Create `user_preferences` with a `user_id` primary key, cascading foreign key, `was_introduced boolean NOT NULL DEFAULT false`, and timezone-aware `created_at`/`updated_at` timestamps. Add no language or theme columns.

- [ ] **Step 3: Add the Drizzle schema**

Define the typed table in `schema.ts`, import it in the repository module, and use an upsert in `markIntroduced` so a user without a row is initialized and marked in one operation.

- [ ] **Step 4: Implement and run focused persistence tests**

Run `bun run --cwd apps/api test -- src/db/repository.test.ts`. Expect the preference mapping and ownership tests to pass.

### Task 2: Add shared contracts and authenticated preference routes

**Files:**
- Modify: `packages/shared/src/index.ts`
- Modify: `apps/api/src/routes/types.ts`
- Modify: `apps/api/src/app.ts`
- Create: `apps/api/src/routes/user-preferences.ts`
- Modify: `apps/api/src/app.test.ts`

**Interfaces:**
- Consumes `UserPreferencesRepository` from Task 1.
- Produces `UserPreferences`, `UserPreferencesResponse`, and authenticated `GET /api/user/preferences` plus `POST /api/user/preferences/introduced` endpoints.

- [ ] **Step 1: Define the public preference response type**

Add a shared `UserPreferences` type with `wasIntroduced: boolean`, `createdAt`, and `updatedAt`, plus `UserPreferencesResponse = ApiSuccess<{ preferences: UserPreferences }>`.

- [ ] **Step 2: Extend dependency wiring**

Add `preferences: UserPreferencesRepository` to `AppDependencies` and `RouteDependencies`, then pass the production Drizzle repository through `server.ts` and `createApp`.

- [ ] **Step 3: Write route tests before implementation**

Test unauthenticated reads and writes, CSRF rejection on the mutation, successful reads for the current user, successful completion, and an ownership harness proving the route only passes the authenticated user ID to the repository.

- [ ] **Step 4: Implement the routes**

Use the existing session reader and error-envelope helpers. `GET` returns the current user's preferences, creating the default logical value when no row exists. `POST /introduced` requires CSRF and returns the updated preferences after setting `wasIntroduced` to true.

- [ ] **Step 5: Run API and shared verification**

Run `bun run --cwd packages/shared typecheck`, `bun run --cwd apps/api typecheck`, and the focused API tests. Expect all to pass.

### Task 3: Add the frontend preference query and authentication trigger

**Files:**
- Modify: `apps/web/src/lib/api.ts`
- Modify: `apps/web/src/lib/queries.ts`
- Modify: `apps/web/src/store.ts`
- Modify: `apps/web/src/components/layout.tsx`
- Modify: `apps/web/src/lib/api.test.ts`

**Interfaces:**
- Consumes the preference endpoints from Task 2.
- Produces `useUserPreferences`, `useCompleteIntroduction`, and a local `welcomeAuthTrigger` state opened by successful login or registration and cleared on logout/completion.

- [ ] **Step 1: Add API client functions and query keys**

Add isolated preference query keys, a typed `getUserPreferences()` request, and a typed `markUserIntroduced(csrfToken)` mutation using the existing credentials and CSRF conventions. Test URL, method, envelope parsing, and CSRF header behavior.

- [ ] **Step 2: Add the explicit auth-success trigger**

Extend `finishAuth` in `useAuthMutations` to dispatch an onboarding trigger for both login and registration. Clear the trigger and preference query on logout. Do not derive the trigger from `useCurrentUser()` so page reload/session restoration cannot open the popup.

- [ ] **Step 3: Connect the shell to preference loading**

Make the layout-level welcome host observe the explicit trigger, fetch preferences only while the trigger is active, and render the popup only after a successful preference response with `wasIntroduced === false`. Keep the trigger inactive during ordinary authenticated navigation and reload.

- [ ] **Step 4: Run focused frontend tests**

Run the API client and query tests. Expect preference key isolation, CSRF behavior, and auth-trigger tests to pass.

### Task 4: Build the accessible localized welcome modal

**Files:**
- Create: `apps/web/src/components/welcome-modal.tsx`
- Modify: `apps/web/src/components/layout.tsx`
- Modify: `apps/web/src/i18n/locales/en.ts`
- Modify: `apps/web/src/i18n/locales/ru.ts`
- Modify: `apps/web/src/i18n/locales/uk.ts`
- Create: `apps/web/src/components/welcome-modal.test.tsx`

**Interfaces:**
- Consumes `markIntroduced`, `onNavigate`, and the existing `LanguageSelector`.
- Produces a modal with accessible title, localized content, completion action handlers, and retryable error state.

- [ ] **Step 1: Add aligned translation keys**

Add English source keys and matching Russian/Ukrainian keys for the welcome title, app introduction, feature descriptions, close label, board/About actions, and preference-update error. Preserve dictionary structure tests.

- [ ] **Step 2: Write component tests**

Cover rendered title/content/actions, opposite header placement for language and close controls, close/backdrop/Escape completion callbacks, board/About navigation callbacks, language switching without completion, and an update failure that leaves the dialog open with a live error.

- [ ] **Step 3: Implement modal structure and focus behavior**

Follow the existing dialog conventions: `role="dialog"`, `aria-modal="true"`, labelled heading, focus entering the dialog, Escape and backdrop completion, focus restoration after close, visible focus styles, semantic buttons, and reduced-motion-safe transitions. Place `LanguageSelector` and the close button on opposite sides of the modal header.

- [ ] **Step 4: Implement completion sequencing**

Await `markIntroduced` before closing or navigating. On success, close and perform the requested navigation; on failure, retain the modal and announce the translated error. The plain close action remains on the current route.

- [ ] **Step 5: Run focused component and i18n tests**

Run `bun run --cwd apps/web test -- src/components/welcome-modal.test.tsx src/i18n/i18n.test.ts`. Expect all tests to pass.

### Task 5: Add end-to-end coverage and complete verification

**Files:**
- Modify: `tests/e2e/xeniway.spec.ts`
- Modify: `docs/api.md`
- Modify: `docs/architecture.md`
- Modify: `docs/database.md`
- Modify: `docs/testing.md`

- [ ] **Step 1: Add login and registration welcome-flow coverage**

Verify the popup appears after successful seeded login and successful registration, does not appear after reload/session restoration once completed, and is shown independently for another account whose preference remains false.

- [ ] **Step 2: Verify every completion action in the browser**

Cover close button, backdrop, Escape, board navigation, and About navigation. Assert the API-backed completion persists after reload and that the language selector changes visible popup copy without completing it.

- [ ] **Step 3: Document the new API and persistence behavior**

Update the API, architecture, database, and testing docs with the preference endpoints, ownership/CSRF rules, migration, auth-triggered display rule, and test setup.

- [ ] **Step 4: Run the complete verification sequence**

Run:

```bash
bun run lint
bun run typecheck
bun run test
bun run build
bun run db:migrate
bun run db:seed
bun run test:e2e
```

Expected result: typecheck, tests, build, migration, seed, and E2E pass. Existing unrelated lint findings must be reported separately rather than fixed as part of this feature.

- [ ] **Step 5: Review the final diff**

Run `git diff --check`, inspect all changed files, confirm no language/theme columns were added, and verify all three locale dictionaries remain structurally aligned.
