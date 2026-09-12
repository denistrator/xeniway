# Server-Synced User Preferences Implementation Plan

> **Superseded:** This plan describes the former hydration/browser-wins-once architecture. Use [the local-first preference plan](2026-09-12-local-first-user-preferences.md) instead.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Store each user's selected language and theme on the server, synchronize them with the browser on authentication and change, and keep the existing welcome-introduction flag account-scoped and server-authoritative.

**Architecture:** Extend the existing one-to-one `user_preferences` row and repository with nullable `selected_language` and `selected_theme` columns. Add an authenticated, CSRF-protected partial-update endpoint and shared Zod contracts. Centralize browser persistence under the single `userPreferences` key, hydrate authenticated state through one TanStack Query, and let selectors reuse one mutation path while applying changes immediately in the UI.

**Tech Stack:** Bun, Elysia, Drizzle ORM, PostgreSQL, Zod, React, Redux Toolkit, TanStack Query, i18next/react-i18next, Vitest, Playwright, Biome.

## Global Constraints

- Supported locales remain exactly `en`, `ru`, and `uk`.
- Supported themes remain exactly `light`, `dark`, and `system`.
- The browser wins once only when a server preference is `null`; an existing server value wins thereafter.
- `wasIntroduced` is always read from the authenticated server response; local storage is only a cache.
- All preference reads and writes are scoped by authenticated user ID; writes require the session CSRF token.
- Use one browser storage key, exactly `userPreferences`, with flat fields `theme`, `language`, and `wasIntroduced`.
- Preserve the existing authentication, six-status workflow, ownership, archive, and welcome-popup behavior.
- Do not add dependencies or change authentication response shapes unless tests demonstrate a concrete need.
- Follow repository formatting: two spaces, double quotes, semicolons, trailing commas, and camelCase API JSON.

---

### Task 1: Extend shared preference contracts and the database model

**Files:**
- Create: `apps/api/drizzle/0006_user_preference_values.sql`
- Modify: `apps/api/src/db/schema.ts`
- Modify: `apps/api/src/db/repository.ts`
- Modify: `packages/shared/src/index.ts`
- Test: `apps/api/src/db/repository.test.ts`
- Test: `packages/shared/src/index.test.ts`

**Interfaces:**
- Shared `UserPreferences` exposes `selectedLanguage: SupportedLocale | null` and `selectedTheme: ThemePreference | null`.
- Shared `updateUserPreferencesInputSchema` accepts at least one of `selectedLanguage` or `selectedTheme`, each optionally nullable.
- `UserPreferencesRepository.update(userId, input)` returns the complete updated row and never accepts an account ID from request data.

- [ ] **Step 1: Write failing shared-schema tests**

Add cases proving that `en`, `ru`, and `uk` are valid languages; `light`, `dark`, and `system` are valid themes; unknown values fail; and an empty patch fails while a one-field or two-field patch succeeds.

```ts
expect(updateUserPreferencesInputSchema.parse({ selectedLanguage: "uk" })).toEqual({
  selectedLanguage: "uk",
});
expect(() => updateUserPreferencesInputSchema.parse({})).toThrow();
expect(() => updateUserPreferencesInputSchema.parse({ selectedTheme: "blue" })).toThrow();
```

- [ ] **Step 2: Run the focused shared tests and verify failure**

Run `bun test packages/shared/src/index.test.ts`.

Expected: FAIL because the new schemas and nullable response fields do not exist.

- [ ] **Step 3: Add shared enums, schemas, and response fields**

Define one locale schema and one theme schema in `packages/shared/src/index.ts` and derive their types. Use the same schemas in the update input and in the public response type so the API and browser cannot drift.

```ts
export const supportedLocaleSchema = z.enum(["en", "ru", "uk"]);
export type SupportedLocale = z.infer<typeof supportedLocaleSchema>;

export const themePreferenceSchema = z.enum(["light", "dark", "system"]);
export type ThemePreference = z.infer<typeof themePreferenceSchema>;

export const updateUserPreferencesInputSchema = z
  .object({
    selectedLanguage: supportedLocaleSchema.nullable().optional(),
    selectedTheme: themePreferenceSchema.nullable().optional(),
  })
  .refine((value) => value.selectedLanguage !== undefined || value.selectedTheme !== undefined);
```

Keep the existing `wasIntroduced` field unchanged and add the two nullable fields to the response type.

- [ ] **Step 4: Add the forward-only SQL migration**

Create `0006_user_preference_values.sql` with two nullable columns and database checks matching the shared allowed values. Do not rewrite migration `0005`.

```sql
ALTER TABLE user_preferences
  ADD COLUMN selected_language VARCHAR(2),
  ADD COLUMN selected_theme VARCHAR(10);

ALTER TABLE user_preferences
  ADD CONSTRAINT user_preferences_selected_language_check
    CHECK (selected_language IS NULL OR selected_language IN ('en', 'ru', 'uk')),
  ADD CONSTRAINT user_preferences_selected_theme_check
    CHECK (selected_theme IS NULL OR selected_theme IN ('light', 'dark', 'system'));
```

Add `0006_user_preference_values` to the migration runner's ordered list in `apps/api/src/db/migrate.ts`.

- [ ] **Step 5: Map and update nullable columns in the repository**

Add the Drizzle columns, extend `UserPreferencesRow`, map both nullable values in `toUserPreferences`, and implement an atomic update that creates the one-to-one row if it does not exist and preserves fields omitted from the patch.

```ts
type UserPreferencesUpdate = {
  selectedLanguage?: SupportedLocale | null;
  selectedTheme?: ThemePreference | null;
};

update(userId: number, input: UserPreferencesUpdate): Promise<UserPreferencesRow>;
```

Use the existing repository's `onConflictDoUpdate`/upsert pattern or an equivalent transaction-safe implementation. `markIntroduced` must continue to update only `wasIntroduced`.

- [ ] **Step 6: Run repository and shared tests**

Run `bun test apps/api/src/db/repository.test.ts packages/shared/src/index.test.ts`.

Expected: PASS, including null mapping, partial update preservation, and creation of a missing preferences row.

- [ ] **Step 7: Commit the data-contract slice**

Run `git add apps/api/drizzle/0006_user_preference_values.sql apps/api/src/db/migrate.ts apps/api/src/db/schema.ts apps/api/src/db/repository.ts apps/api/src/db/repository.test.ts packages/shared/src/index.ts packages/shared/src/index.test.ts && git commit -m "feat: add stored language and theme preferences"`.

---

### Task 2: Add the authenticated preference update API

**Files:**
- Modify: `apps/api/src/routes/user-preferences.ts`
- Modify: `apps/api/src/app.test.ts`
- Modify: `apps/web/src/lib/api.ts`
- Modify: `apps/web/src/lib/api.test.ts`
- Modify: `apps/api/src/db/seed.ts`
- Modify: `docs/api.md`

**Interfaces:**
- `GET /api/user/preferences` returns `{ data: UserPreferences }` with nullable selected values.
- `POST /api/user/preferences/introduced` remains the welcome completion endpoint.
- `PATCH /api/user/preferences` accepts `UpdateUserPreferencesInput` and returns the complete `{ data: UserPreferences }`.
- The PATCH route derives the user ID from the authenticated session and uses the existing CSRF middleware.

- [ ] **Step 1: Add failing API route tests**

Cover: authenticated GET returns null selected values; PATCH stores both fields; a one-field PATCH preserves the other; invalid language/theme returns the documented validation error; missing auth returns unauthorized; missing/invalid CSRF returns forbidden; and one account cannot observe another account's values.

```ts
const response = await request("/api/user/preferences", {
  method: "PATCH",
  body: { selectedLanguage: "uk", selectedTheme: "dark" },
  csrfToken,
});

expect(response.status).toBe(200);
expect(response.body.data).toMatchObject({
  selectedLanguage: "uk",
  selectedTheme: "dark",
});
```

- [ ] **Step 2: Run the focused API tests and verify failure**

Run `bun test apps/api/src/app.test.ts`.

Expected: FAIL because PATCH is not registered and the in-memory test repository lacks `update`.

- [ ] **Step 3: Extend test dependencies and implement PATCH**

Update the in-memory repository in `apps/api/src/app.test.ts` to implement the same `update` contract as production. In `apps/api/src/routes/user-preferences.ts`, parse `updateUserPreferencesInputSchema`, authenticate, require CSRF, call `preferences.update(auth.user.id, input)`, and return the complete row.

Keep GET and introduction completion behavior compatible with the welcome feature. Never accept `userId` in the PATCH body.

- [ ] **Step 4: Add the browser API client method**

In `apps/web/src/lib/api.ts`, add a single patch function using the existing request helper and CSRF handling:

```ts
export async function updateUserPreferences(
  input: UpdateUserPreferencesInput,
): Promise<UserPreferences> {
  return request<UserPreferences>("/api/user/preferences", {
    method: "PATCH",
    body: input,
    csrf: true,
  });
}
```

Keep the existing query key so all consumers share the same cache entry. Add client tests for method, body, response envelope, and CSRF behavior.

- [ ] **Step 5: Preserve deterministic development fixtures and document the endpoint**

Keep seeded users' selected values nullable and `wasIntroduced` reset to `false`. Document request fields, nullable semantics, response shape, authentication, and CSRF requirements in `docs/api.md`.

- [ ] **Step 6: Run API/client tests and commit**

Run `bun test apps/api/src/app.test.ts apps/web/src/lib/api.test.ts`.

Expected: PASS.

Then run `git add apps/api/src/routes/user-preferences.ts apps/api/src/app.test.ts apps/web/src/lib/api.ts apps/web/src/lib/api.test.ts apps/api/src/db/seed.ts docs/api.md && git commit -m "feat: expose user preference updates"`.

---

### Task 3: Centralize the browser preference cache and startup initialization

**Files:**
- Create: `apps/web/src/lib/user-preferences.ts`
- Create: `apps/web/src/lib/user-preferences.test.ts`
- Modify: `apps/web/src/store.ts`
- Modify: `apps/web/src/i18n/i18n.ts`
- Modify: `apps/web/src/components/theme-sync.tsx`

**Interfaces:**
- Export `userPreferencesStorageKey = "userPreferences"`.
- Export `readLocalUserPreferences(): LocalUserPreferences` and `writeLocalUserPreferences(partial): LocalUserPreferences`.
- The local type is a validated flat cache with `theme`, `language`, and `wasIntroduced`; it contains no account ID and is never an authority for welcome completion.

- [ ] **Step 1: Write failing utility tests**

Test malformed JSON fallback, invalid field fallback, preservation of valid values, and safe behavior when `localStorage` is unavailable.

```ts
localStorage.setItem("userPreferences", JSON.stringify({ theme: "dark", language: "uk", wasIntroduced: false }));

expect(readLocalUserPreferences()).toMatchObject({ theme: "dark", language: "uk" });
expect(localStorage.getItem("userPreferences")).toContain('"theme":"dark"');
```

- [ ] **Step 2: Run the utility tests and verify failure**

Run `bun test apps/web/src/lib/user-preferences.test.ts`.

Expected: FAIL because the centralized utility does not exist.

- [ ] **Step 3: Implement validated single-key storage**

Implement parsing with the existing supported locale/theme values, defaults matching current behavior, and a guarded browser-storage access helper. Read and write only the flat `userPreferences` object. Keep `wasIntroduced` in the cache as a value returned by the server; never use it to authorize welcome behavior.

```ts
export type LocalUserPreferences = {
  theme: ThemePreference;
  language: SupportedLocale;
  wasIntroduced: boolean;
};

export const userPreferencesStorageKey = "userPreferences";
```

- [ ] **Step 4: Switch startup readers and theme persistence to the utility**

Make `store.ts` initialize its theme from `readLocalUserPreferences()`, make `i18n.ts` initialize its locale from the same utility, and make `theme-sync.tsx` update only `userPreferences`.

- [ ] **Step 5: Run focused web tests and inspect the diff**

Run `bun test apps/web/src/lib/user-preferences.test.ts apps/web/src/lib/api.test.ts` and `bunx biome check apps/web/src/lib/user-preferences.ts apps/web/src/lib/user-preferences.test.ts apps/web/src/store.ts apps/web/src/i18n/i18n.ts apps/web/src/components/theme-sync.tsx`.

Expected: PASS with no new diagnostics.

- [ ] **Step 6: Commit the browser-cache slice**

Run `git add apps/web/src/lib/user-preferences.ts apps/web/src/lib/user-preferences.test.ts apps/web/src/store.ts apps/web/src/i18n/i18n.ts apps/web/src/components/theme-sync.tsx && git commit -m "refactor: centralize browser preference storage"`.

---

### Task 4: Hydrate and persist preferences through the React UI

**Files:**
- Create: `apps/web/src/components/user-preferences-sync.tsx`
- Modify: `apps/web/src/lib/queries.ts`
- Modify: `apps/web/src/components/layout.tsx`
- Modify: `apps/web/src/components/theme-selector.tsx`
- Modify: `apps/web/src/components/language-selector.tsx`
- Modify: `apps/web/src/store.ts`
- Test: `apps/web/src/components/user-preferences-sync.test.tsx`
- Test: `apps/web/src/components/theme-selector.test.tsx`
- Test: `apps/web/src/components/language-selector.test.tsx`

**Interfaces:**
- `useUpdateUserPreferences()` wraps the PATCH client and updates the shared `userPreferencesKeys.current()` cache with the returned complete object.
- `UserPreferencesSync` runs only when an authenticated user exists and the preferences query has loaded.
- Selector changes apply locally first, then call one shared mutation with `{ selectedTheme }` or `{ selectedLanguage }`.

- [ ] **Step 1: Add failing hydration tests**

Test server-wins hydration when values exist, browser-wins-once upload when either server field is null, complete response cache updates, no PATCH loop after hydration, and account transitions that do not reuse another user's `wasIntroduced` state.

```ts
expect(updateUserPreferences).toHaveBeenCalledWith({
  selectedLanguage: "uk",
  selectedTheme: "dark",
});
expect(dispatch).toHaveBeenCalledWith(setTheme("light"));
```

- [ ] **Step 2: Run the focused UI tests and verify failure**

Run `bun test apps/web/src/components/user-preferences-sync.test.tsx apps/web/src/components/theme-selector.test.tsx apps/web/src/components/language-selector.test.tsx`.

Expected: FAIL because the synchronization component and mutation are not implemented.

- [ ] **Step 3: Add the TanStack Query mutation**

In `apps/web/src/lib/queries.ts`, use the existing query key and `queryClient.setQueryData` in `onSuccess`. Preserve immediate local UI state on error. Track the last synchronization error in the existing UI store or a focused local status component, with a retry callback that retries the last patch payload.

- [ ] **Step 4: Implement one hydration effect**

Add `UserPreferencesSync` to the authenticated layout. For the current authenticated user, read the shared query once. Apply non-null server language/theme values to i18next and Redux. For each null server field, read the current browser value from the centralized cache and issue one combined PATCH containing all null fields. Store the returned complete values locally and mark hydration complete for that user/query result before allowing selector changes to sync.

Do not use local `wasIntroduced` to open or suppress the welcome dialog. Keep the existing auth-success trigger and `WelcomeHost` server check unchanged except for consuming the extended response shape.

- [ ] **Step 5: Connect selectors to the shared persistence path**

Keep current controls and accessible names. On a theme selection, dispatch the local theme action, write the local cache, and invoke the shared mutation with `selectedTheme`. On a language selection, change i18next, write the local cache, and invoke the same mutation with `selectedLanguage`. Avoid selector-specific storage keys or duplicate API request implementations.

- [ ] **Step 6: Add accessible synchronization failure feedback**

Render a small translated `role="status"`/live-region message from the layout when a PATCH fails, include a keyboard-accessible retry action, and clear it after a successful retry. The UI choice must remain active while the request is retried. Add `welcome`/common dictionary strings to all three locale files if needed, keeping dictionaries structurally aligned.

- [ ] **Step 7: Run focused tests and changed-file formatting**

Run `bun test apps/web/src/components/user-preferences-sync.test.tsx apps/web/src/components/theme-selector.test.tsx apps/web/src/components/language-selector.test.tsx apps/web/src/lib/queries.test.ts` and `bunx biome check apps/web/src/components/user-preferences-sync.tsx apps/web/src/components/layout.tsx apps/web/src/components/theme-selector.tsx apps/web/src/components/language-selector.tsx apps/web/src/lib/queries.ts apps/web/src/store.ts`.

Expected: PASS with no new diagnostics.

- [ ] **Step 8: Commit the synchronization slice**

Run `git add apps/web/src/components/user-preferences-sync.tsx apps/web/src/components/user-preferences-sync.test.tsx apps/web/src/components/layout.tsx apps/web/src/components/theme-selector.tsx apps/web/src/components/theme-selector.test.tsx apps/web/src/components/language-selector.tsx apps/web/src/components/language-selector.test.tsx apps/web/src/lib/queries.ts apps/web/src/lib/queries.test.ts apps/web/src/store.ts apps/web/src/i18n/locales/en.ts apps/web/src/i18n/locales/ru.ts apps/web/src/i18n/locales/uk.ts && git commit -m "feat: sync user preferences with the account"`.

---

### Task 5: Cover authenticated browser workflows and update documentation

**Files:**
- Modify: `tests/e2e/xeniway.spec.ts`
- Modify: `docs/architecture.md`
- Modify: `docs/database.md`
- Modify: `docs/testing.md`
- Modify: `README.md`

**Interfaces:**
- E2E tests use the existing auth fixtures and verify behavior through the UI and persisted account state, not database internals.
- Documentation describes the nullable server fields, the `userPreferences` browser key, browser-wins-once/server-wins synchronization, and PATCH security requirements.

- [ ] **Step 1: Add Playwright coverage for the full workflow**

Add tests that: register/login with browser `uk`/`dark` and verify those values initialize a new account; change to another language/theme and reload to verify server persistence; log out and into a second account to verify account-specific values and welcome state; and verify a pre-populated server value overrides the browser cache. Keep the existing first-login welcome test and assert that its language selector participates in the same preference path.

- [ ] **Step 2: Run the E2E suite against migrated, seeded infrastructure**

Run `bun run db:up`, `bun run db:migrate`, `bun run db:seed`, then `bun run test:e2e`.

Expected: PASS. If Chromium is missing, run `bunx playwright install chromium` and repeat the suite.

- [ ] **Step 3: Document the final behavior**

Update the README setup section only where needed, and update architecture/database/testing docs with the actual endpoint names, fields, migration number, local key, ownership/CSRF rules, and test commands. State clearly that selected values are nullable so a new account can be initialized from the browser once.

- [ ] **Step 4: Run the complete verification set**

Run:

```bash
bun run format
bun run lint
bun run typecheck
bun run test
bun run build
bun run db:seed
bun run test:e2e
git diff --check
git status --short
```

Expected: all feature-related checks pass, the build succeeds, the migration/seed path remains repeatable, and the final status contains only intentional committed changes. Record any pre-existing lint diagnostics separately instead of weakening lint rules.

- [ ] **Step 5: Commit documentation and workflow coverage**

Run `git add tests/e2e/xeniway.spec.ts docs/architecture.md docs/database.md docs/testing.md README.md && git commit -m "test: cover persisted user preferences"`.

---

## Self-review checklist

- [x] Spec coverage: database fields/migration, shared validation, GET/POST/PATCH API, CSRF/auth/ownership, one-key local storage, browser-wins-once initialization, server-wins hydration, immediate change persistence, retryable failures, logout/account isolation, tests, docs, and non-goals are all assigned above.
- [x] Placeholder scan: no step depends on an unspecified future decision, generic TODO, or unnamed file/function.
- [x] Type consistency: `SupportedLocale`, `ThemePreference`, `UserPreferencesUpdate`, `updateUserPreferencesInputSchema`, `userPreferencesStorageKey`, `readLocalUserPreferences`, `writeLocalUserPreferences`, `useUpdateUserPreferences`, and `UserPreferencesSync` are named consistently across tasks.
- [x] Security review: request identity comes from the authenticated session, mutations retain CSRF protection, values are validated both at the API boundary and database boundary, and local storage is never used as account identity or welcome authority.
- [x] Maintainability review: parsing and storage are centralized, server state uses one query key, partial updates preserve omitted fields, and selectors do not duplicate persistence logic.
