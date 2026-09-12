# Local-First User Preferences Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove preference hydration coordination and implement immediate browser-first preference updates with best-effort synchronization to the authenticated account.

**Architecture:** The existing `userPreferences` local-storage object is the immediate browser cache and remains the source of the active theme/language initialization. After successful authentication, one server read applies the current account's saved values; explicit user actions update local storage and the UI first, then send a background API mutation. The server and database contracts remain user-scoped and CSRF-protected, while preference sync no longer blocks controls or owns a readiness state.

**Tech Stack:** React 19, TypeScript, Redux Toolkit, TanStack Query v5, i18next, Vitest, Playwright, Biome.

## Global Constraints

- Use exactly one browser storage key: `userPreferences`.
- Server values are authoritative after successful login or registration.
- Authentication must never upload local preference values automatically.
- Only explicit user actions may change server preferences.
- Local storage and the UI update before any preference API request.
- Failed background preference requests are ignored.
- Do not add a hydration phase, readiness gate, retry queue, sync-error UI, migration handling, or account identity to local storage.
- Preserve authenticated user scoping and CSRF protection for all preference writes.
- Preserve the three equivalent welcome completion actions: close, board, and About.

## File Map

- Modify `apps/web/src/components/user-preferences-sync.tsx` to become a small authenticated server-to-browser applicator; remove hydration, mutation, retry, and error presentation responsibilities.
- Modify `apps/web/src/store.ts` to remove preference synchronization state and actions while retaining theme and welcome UI state.
- Modify `apps/web/src/components/theme-selector.tsx` and `apps/web/src/components/language-selector.tsx` to update local/UI state immediately and send explicit changes without hydration checks.
- Modify `apps/web/src/components/layout.tsx` and `apps/web/src/App.tsx` only where the simplified sync host and account transitions require wiring changes.
- Modify `apps/web/src/lib/queries.ts` and `apps/web/src/lib/user-preferences.ts` only where query/mutation ownership or stale-response handling requires it; retain the existing typed API boundary.
- Modify `apps/web/src/components/user-preferences-sync.test.tsx`, selector tests, query tests, and local-storage tests for the reduced behavior.
- Modify `tests/e2e/xeniway.spec.ts` to assert immediate interaction and server-authoritative account loading without depending on hydration gates or successful background requests.
- Modify `docs/api.md`, `docs/architecture.md`, `docs/testing.md`, `README.md`, and `AGENTS.md` to remove old hydration/browser-wins-once claims and document local-first synchronization.
- Do not modify the existing database migration or authenticated API route unless tests expose a contract defect; this plan is a frontend architecture simplification.

---

### Task 1: Remove hydration and synchronization-error state

**Files:**
- Modify: `apps/web/src/store.ts`
- Modify: `apps/web/src/components/user-preferences-sync.tsx`
- Modify: `apps/web/src/components/layout.tsx`
- Modify: `apps/web/src/App.tsx`
- Test: `apps/web/src/components/user-preferences-sync.test.tsx`

**Interfaces:**
- Consumes: `useCurrentUser()`, `useUserPreferences(userId)`, `readLocalUserPreferences()`, `writeLocalUserPreferences()`, `changeLocale()`, and `setTheme()`.
- Produces: `UserPreferencesSync`, which applies successful authenticated server values and never blocks preference controls.

- [ ] **Step 1: Add failing tests for the simplified sync contract.**

Test that an authenticated server response with non-null language/theme applies those values and writes the complete local cache, that null server values are not uploaded, and that no hydration state or retry/error UI is required.

```tsx
it("applies saved account preferences without uploading local values", async () => {
  render(<UserPreferencesSync />);

  await waitFor(() => expect(changeLocale).toHaveBeenCalledWith("uk"));
  expect(setTheme).toHaveBeenCalledWith("dark");
  expect(updatePreferences).not.toHaveBeenCalled();
});
```

- [ ] **Step 2: Run the focused test and verify it fails against the hydration implementation.**

Run: `bun test apps/web/src/components/user-preferences-sync.test.tsx`

Expected: FAIL because the current component still performs hydration-specific work or exposes the removed retry/error behavior.

- [ ] **Step 3: Remove obsolete Redux state and simplify the sync host.**

Delete `preferenceSync` from `UiState`, remove `setPreferenceSyncError`, `clearPreferenceSyncError`, and `setPreferencesHydrated`, and reduce `UserPreferencesSync` to one effect with these semantics:

```tsx
useEffect(() => {
  if (!user.data || !preferences.data) return;

  const server = preferences.data;
  if (server.selectedLanguage) void changeLocale(server.selectedLanguage);
  if (server.selectedTheme) dispatch(setTheme(server.selectedTheme));

  writeLocalUserPreferences({
    language: server.selectedLanguage ?? readLocalUserPreferences().language,
    theme: server.selectedTheme ?? readLocalUserPreferences().theme,
    wasIntroduced: server.wasIntroduced,
  });
}, [dispatch, preferences.data, user.data]);
```

Guard the effect by authenticated user ID and the loaded query result so the same response is not repeatedly applied. Do not call `useUpdateUserPreferences()` from this component. Remove the rendered retry/error status entirely.

- [ ] **Step 4: Remove wiring that existed only for hydration readiness.**

Remove any layout or app wiring that clears or reads the removed Redux state. Keep account-scoped TanStack Query cleanup on auth termination and keep the welcome host’s server-authoritative visibility check.

- [ ] **Step 5: Run the focused tests and formatting.**

Run: `bun test apps/web/src/components/user-preferences-sync.test.tsx && bunx biome check apps/web/src/store.ts apps/web/src/components/user-preferences-sync.tsx apps/web/src/components/layout.tsx apps/web/src/App.tsx`

Expected: PASS with no hydration-state references in the changed files.

- [ ] **Step 6: Commit the isolated simplification.**

```bash
git add apps/web/src/store.ts apps/web/src/components/user-preferences-sync.tsx apps/web/src/components/layout.tsx apps/web/src/App.tsx apps/web/src/components/user-preferences-sync.test.tsx
git commit -m "refactor: remove preference hydration state"
```

### Task 2: Make explicit theme and language changes local-first

**Files:**
- Modify: `apps/web/src/components/theme-selector.tsx`
- Modify: `apps/web/src/components/language-selector.tsx`
- Modify: `apps/web/src/lib/queries.ts` if mutation behavior needs stale-response protection
- Modify: `apps/web/src/lib/user-preferences.ts` only if a focused helper is needed for complete-cache writes
- Test: `apps/web/src/components/theme-selector.test.tsx`
- Test: `apps/web/src/components/language-selector.test.tsx`
- Test: `apps/web/src/lib/queries.test.ts`

**Interfaces:**
- Consumes: `setTheme`, `changeLocale`, `writeLocalUserPreferences`, and `useUpdateUserPreferences`.
- Produces: selector actions that synchronously update browser/UI state and asynchronously issue only the explicit API change.

- [ ] **Step 1: Add failing selector tests for immediate local-first behavior.**

For theme, assert the Redux action and local-storage write occur before the mutation is resolved. For language, assert the locale changes before the mutation is resolved. Assert authenticated controls are enabled without checking a hydrated user ID.

```tsx
it("updates theme locally before the server mutation resolves", async () => {
  const mutation = deferredMutation();
  render(<ThemeSelector />);

  await user.click(screen.getByRole("button", { name: /change theme/i }));

  expect(readLocalUserPreferences().theme).toBe("dark");
  expect(screen.getByRole("button", { name: /change theme/i })).not.toBeDisabled();
  expect(mutation.wasCalled).toBe(true);
});
```

- [ ] **Step 2: Run selector tests and verify they fail because of hydration gating.**

Run: `bun test apps/web/src/components/theme-selector.test.tsx apps/web/src/components/language-selector.test.tsx`

Expected: FAIL on assertions that currently depend on `hydratedUserId` or disabled controls.

- [ ] **Step 3: Implement synchronous local/UI updates followed by background mutations.**

Theme changes should have this ordering:

```tsx
function changeTheme(nextTheme: ThemePreference) {
  dispatch(setTheme(nextTheme));
  writeLocalUserPreferences({ theme: nextTheme });
  if (user.data) updatePreferences.mutate({ selectedTheme: nextTheme });
}
```

Language changes should await only the local dictionary load needed by `changeLocale`; after the locale is successfully applied, write `language` and call the mutation. Remove `canPersist`, `hydratedUserId`, `allowDuringHydration`, and hydration-specific disabled behavior. Do not await the API mutation from the click handler.

- [ ] **Step 4: Protect newer local changes from obsolete mutation responses.**

Do not replace local/UI state from a mutation response. If the query cache is updated, update it only when the response still represents the latest local change. An `AbortController` may cancel an older request, but cancellation must not be required for correctness and must not add a queue or retry subsystem.

- [ ] **Step 5: Run focused tests and formatting.**

Run: `bun test apps/web/src/components/theme-selector.test.tsx apps/web/src/components/language-selector.test.tsx apps/web/src/lib/queries.test.ts && bunx biome check apps/web/src/components/theme-selector.tsx apps/web/src/components/language-selector.tsx apps/web/src/lib/queries.ts`

Expected: PASS; authenticated selectors remain immediately usable before any preference fetch completes.

- [ ] **Step 6: Commit the local-first controls.**

```bash
git add apps/web/src/components/theme-selector.tsx apps/web/src/components/language-selector.tsx apps/web/src/lib/queries.ts apps/web/src/lib/user-preferences.ts apps/web/src/components/theme-selector.test.tsx apps/web/src/components/language-selector.test.tsx apps/web/src/lib/queries.test.ts
git commit -m "feat: sync explicit preference changes in background"
```

### Task 3: Apply the same local-first rule to welcome completion

**Files:**
- Modify: `apps/web/src/components/layout.tsx`
- Modify: `apps/web/src/lib/queries.ts` only if completion mutation handling needs adjustment
- Test: `apps/web/src/components/welcome-modal.test.tsx`
- Test: `apps/web/src/App.test.tsx`

**Interfaces:**
- Consumes: `closeWelcome`, `writeLocalUserPreferences`, and `useCompleteIntroduction`.
- Produces: immediate completion for close, board, and About actions with background persistence.

- [ ] **Step 1: Add a failing test that navigation/close does not wait for the API.**

Use a deferred completion mutation and assert the modal closes or navigation occurs before resolving the mutation.

```tsx
it("completes the welcome action immediately", async () => {
  const completion = deferredMutation();
  render(<WelcomeHost />);

  await user.click(screen.getByRole("button", { name: /go to board/i }));

  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  expect(navigate).toHaveBeenCalledWith("/", { replace: true });
  expect(completion.wasCalled).toBe(true);
});
```

- [ ] **Step 2: Run the focused welcome test and verify it fails.**

Run: `bun test apps/web/src/components/welcome-modal.test.tsx apps/web/src/App.test.tsx`

Expected: FAIL because `handleComplete` currently awaits `mutateAsync()` before closing or navigating.

- [ ] **Step 3: Update `handleComplete` to write local state and start the request without awaiting it.**

Use this ordering:

```tsx
function handleComplete(action: WelcomeAction) {
  writeLocalUserPreferences({ wasIntroduced: true });
  dispatch(closeWelcome());
  if (action === "board") navigate("/", { replace: true });
  if (action === "about") navigate("/about");
  completeIntroduction.mutate();
}
```

Keep `WelcomeHost` server-authoritative when deciding whether to render. Do not use local `wasIntroduced` to authorize or suppress the popup after authentication.

- [ ] **Step 4: Run welcome tests and formatting.**

Run: `bun test apps/web/src/components/layout.test.tsx apps/web/src/lib/user-preferences.test.ts && bunx biome check apps/web/src/components/layout.tsx`

Expected: PASS with immediate completion for all three actions.

- [ ] **Step 5: Commit the welcome behavior change.**

```bash
git add apps/web/src/components/layout.tsx apps/web/src/lib/queries.ts apps/web/src/components/welcome-modal.test.tsx apps/web/src/App.test.tsx apps/web/src/lib/user-preferences.test.ts
git commit -m "feat: complete welcome locally before syncing"
```

### Task 4: Update browser, account, and end-to-end tests

**Files:**
- Modify: `apps/web/src/components/user-preferences-sync.test.tsx`
- Modify: `apps/web/src/components/theme-selector.test.tsx`
- Modify: `apps/web/src/components/language-selector.test.tsx`
- Modify: `apps/web/src/lib/user-preferences.test.ts`
- Modify: `tests/e2e/xeniway.spec.ts`

**Interfaces:**
- Consumes: the simplified local-first behavior from Tasks 1–3.
- Produces: regression coverage for account authority, immediate actions, and no implicit server writes.

- [ ] **Step 1: Replace hydration tests with explicit behavior tests.**

Remove tests for browser-wins-once upload, hydration readiness, disabled controls, retry UI, and synchronization errors. Add tests for server values overriding local values after authentication, null server values remaining local-only, and no PATCH/POST caused solely by authentication.

- [ ] **Step 2: Add stale-response coverage.**

Start two explicit local changes, resolve their requests out of order, and assert the newer local value remains active and persisted in `userPreferences`.

- [ ] **Step 3: Update Playwright account scenarios.**

Verify that one account’s saved server language/theme values replace the browser cache after login, a second account receives its own values, and controls can be used immediately without waiting for a hydration marker. Keep welcome assertions for login, registration, reload/session restoration, and all three completion actions.

- [ ] **Step 4: Run focused browser tests before the full suite.**

Run: `bun run test:e2e -- --grep "preference|welcome|language|theme"`

Expected: PASS for the focused scenarios. If environment setup or seeded-account rate limits prevent a reliable run, record that as an environment limitation rather than adding product synchronization logic.

- [ ] **Step 5: Commit the regression coverage.**

```bash
git add apps/web/src/components/user-preferences-sync.test.tsx apps/web/src/components/theme-selector.test.tsx apps/web/src/components/language-selector.test.tsx apps/web/src/lib/user-preferences.test.ts tests/e2e/xeniway.spec.ts
git commit -m "test: cover local-first preference behavior"
```

### Task 5: Align documentation and perform proportionate review

**Files:**
- Modify: `README.md`
- Modify: `AGENTS.md`
- Modify: `docs/api.md`
- Modify: `docs/architecture.md`
- Modify: `docs/testing.md`
- Modify: `docs/database.md` only if it still describes browser-wins-once behavior

**Interfaces:**
- Consumes: the final behavior implemented by Tasks 1–4.
- Produces: consistent developer documentation with no obsolete hydration or migration claims.

- [ ] **Step 1: Remove obsolete terminology and describe the final data flow.**

Document:

```text
browser startup: localStorage → active UI
successful auth: server → localStorage → active UI
explicit action: localStorage → active UI → server
```

State that authentication performs no preference write, failed background writes are ignored, and server values win after account loading.

- [ ] **Step 2: Search for contradictions.**

Run: `rg -n "hydration|hydrated|browser-wins|legacy|migrat|preferenceSync|retryable synchronization|automatic.*upload" README.md AGENTS.md docs apps/web/src tests/e2e`

Expected: no stale product-architecture references; database migration references may remain where they describe actual schema migrations.

- [ ] **Step 3: Run the proportionate verification set.**

Run: `bun run format && bun run typecheck && bun run test && bun run build`

Then run `bun run lint` and report only diagnostics that are pre-existing or unrelated to this change. Run database/E2E checks only if the focused tests require infrastructure and the environment is already available.

- [ ] **Step 4: Review the final diff for security and maintainability.**

Confirm that preference writes still require authentication and CSRF, repository operations still receive the authenticated user ID, local storage never carries account identity, and no obsolete response can overwrite newer local state.

- [ ] **Step 5: Commit documentation and final cleanup.**

```bash
git add README.md AGENTS.md docs/api.md docs/architecture.md docs/testing.md docs/database.md
git commit -m "docs: describe local-first preference sync"
```

## Completion Checklist

- [ ] No frontend hydration state or readiness gate remains.
- [ ] Theme, language, and welcome actions update local storage/UI before API work.
- [ ] Authentication only fetches server preferences; it never uploads local values.
- [ ] Server values win after successful authentication.
- [ ] Null server values remain unset and are not automatically uploaded.
- [ ] Failed background writes do not affect the immediate UI.
- [ ] Welcome close, board, and About actions complete immediately.
- [ ] API authentication, CSRF, and ownership behavior remain intact.
- [ ] Focused unit/component tests and the relevant E2E scenarios pass.
- [ ] Documentation contains no stale hydration or browser-wins-once behavior.
