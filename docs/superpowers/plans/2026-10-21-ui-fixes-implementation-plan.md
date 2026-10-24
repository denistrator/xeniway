# UI interaction fixes implementation plan

> **For agentic workers:** Use `executing-plans` to implement this plan task by task with review checkpoints. Use `subagent-driven-development` only for approved, independent work with disjoint write sets. Steps use checkbox (`- [ ]`) tracking. Do not execute this document merely because it exists.

**Goal:** Resolve all 34 findings in the [UI audit](2026-10-21-ui-interaction-audit.md), prioritizing work preservation and reliable feedback, and validate its five remaining risk candidates.

**Architecture:** Repair shared modal and draft interactions first, then integrate them into the existing feature models. Preserve the React/Vite application, API contracts, query ownership boundaries, InlineEdit, and styling system. Keep proposed product-policy changes behind explicit approval gates.

**Tech stack:** React 19, TypeScript, React Router, Redux Toolkit, TanStack Query, i18next, Tailwind Variants, Radix Select, Atlaskit InlineEdit, Vitest, and Playwright. No new dependency is planned.

**Status:** T01–T15 and T17 implementation is complete, subject to the explicitly retained manual T09 checks. The company-research Save regression is fixed and verified. Approved T18 route-owned filters are committed; header, status jumps and cursor changes are under final verification. All 20 production offline cases pass, including destination logout disclosure; 65 focused logout/runtime cases pass. The latest ordinary suite passed 30 cases, failed Forward dirty protection and drag ordering, and skipped 10 after the serial failure; these are being investigated without weakening expectations. T16 is next. T09/T19 retain manual/device validation. The audit remains the evidence register; this document owns task order and execution tracking.

## Global constraints

- Apply HIG's hierarchy, agency, consistency, and feedback principles; do not copy native Apple visuals or replace the existing visual identity.
- Preserve six statuses, authenticated ownership, archive/blacklist distinctions, CSRF, shared validation, and existing export fields.
- Keep server state in TanStack Query, local UI state in Redux, and language in i18next. Never upload browser preferences automatically.
- Keep offline application access read-only. Do not add autosave, offline write queues, durable drafts, or database migrations.
- Retain `@atlaskit/inline-edit`, one-field application patches, and independent preparation fields. Do not reintroduce custom text editors.
- Use matching `.view.tsx`, `.model.ts`, `.styles.ts`, and behavior `.test.tsx` files with extensionless imports. Shared helpers may retain descriptive `.ts` filenames.
- All new UI copy must be translated into English, Russian, Ukrainian, and Hebrew. Preserve RTL, locale-aware dates, reduced motion, and native link behavior.
- Add behavioral, semantic, accessibility, persistence, and security tests only. Do not add automated class, recipe, CSS-property, geometry, or visual-snapshot assertions.
- Preserve lazy route and click-only create-form boundaries. Do not eager-load all editors to support a guard.
- Stop and ask when a tool fails, a new bug blocks progress, or a task needs broader authority. Do not substitute tools or weaken tests to get past a failure.
- Run browser suites sequentially. Their setup refreshes disposable fixtures and uses Redis database 15; announce that before execution.
- Do not automatically commit or merge. Update the audit, backlog, and current documentation as tasks are verified.

## Policy decisions for approval

The recommendations below make the plan concrete; they are not existing product behavior. Approve them before the dependent task, or revise that task first.

| Gate | Recommended policy | Dependent tasks |
| --- | --- | --- |
| D1 · Dirty dismissal · approved | Escape/backdrop means **Keep editing**, never discard. Offer explicit **Discard changes** and **Save changes** when departure is requested. Switching an unrelated row never discards silently. Approved by the user after checkpoint 1; implement one issue/checkpoint at a time. | T03, T06 |
| D2 · Save pending | Lock only the submitted editor's fields while saving, plus a synchronous duplicate-submit guard. Do not allow edits that a pending response can silently overwrite. Do not freeze unrelated editors. | T04 |
| D3 · Navigation guard | Protect in-app links, previous/next, and Back/Forward with a shared dirty-departure policy. React Router's current `BrowserRouter` setup must first be checked for supported blocking; a migration to its data router requires explicit approval. Never patch `history` or register competing ad-hoc navigation interceptors. Use the browser's own unload prompt for full reload/tab close when dirty. | T06 |
| D4 · Bulk deletion · approved | Keep board-wide deletion semantics and current two-stage/countdown protection initially. Fix scope, labels, pending/error state, and placement first. Removing the countdown or combining dialogs is a separate decision after reviewing the safer flow. Approved by the user for T08; active retains two stages/countdown and Archive/Blacklist retain one confirmation. | T08 |
| D5 · Preference retry · approved | Apply locally immediately. A failed account save remains local with an explicit retry for the latest user-selected values only. Reconnect never silently uploads browser defaults. Approved by the user alongside delegated T05 cleanup-policy decisions. | T13 |
| D6 · Offline disclosure | Preserve a non-private, tab-scoped “remote logout not confirmed” notice through reload, show it on login, and clear it only on confirmed remote logout or a defined new-session transition. Do not store account identity or tokens in the notice. | T15 |
| D7 · Mobile hierarchy | Keep navigation and Add job visible. Consolidate the isolated account row; keep theme and language shortcuts in the header as previously requested. Prefer status jump links on the stacked mobile board over replacing the board with a new display mode. | T18 |
| D8 · Search context | Make collection search route-scoped and shareable through `?q=`, with active-board visible statuses in `?statuses=saved,applied`. Keep Redux as the UI projection and avoid two competing authorities. Browser Back/Forward restores those values. Approve this behavior change before implementation; otherwise retain global search with explicit context/reset copy. | T18 |

## Execution gate status

- **2026-10-24 approvals:** The user approved D6 for T15 and both D7/D8 for T18, and authorized a separate investigation/fix of the company-research Save failure. T16 can proceed after T15 is verified. Older checkpoint gate statements record historical status.

- **T05 reload-resilient cleanup recovery:** the user authorized the implementation decision. A minimal owner/generation removal marker blocks conflicting preparation and recovers an explicit cleanup action across reloads without granting read access. Offline unit checks, independent review and the production reload/removal regression pass; all T05 items are complete.
- **T08:** D4 approved and implemented; focused checks and independent review passed. Checkpoint 12 retains historical verification failures; checkpoint 14 records the subsequent passing full unit/browser baseline.
- **T13:** D5 and lazy JSON packaging were approved by the user. Local-first changes, owner-scoped retry and distinct dictionary/storage/account feedback are implemented and independently reviewed. Real development/production failure/retry checks, all-four-locale offline preparation/reload, and the full authenticated browser suite pass.
- **T15:** D6 approved and implemented. The login destination retains a non-private tab-scoped notice until confirmed logout or an explicit new-session transition. Controlled regressions cover late checks and local/cross-tab session changes; the production offline workflow passes. T16 is unblocked.
- **T18:** D7/D8 approved. Route-owned filters are committed; mobile hierarchy, jump links and cursor changes are being verified in separate patches. The user also approved a separately reproduced 320 px search-field overflow fix.
- **T09:** its automated behavior checks are complete, but native password-manager, paste, autocomplete, and four-locale visual validation require an interactive user/browser session; they are not inferred from the browser suite.
- **T19 V-01/V-02/V-05:** require deliberate visual or performance inspection with representative content, viewport/zoom, and hardware. The automated suite is not a substitute for those observations.
- **T19 V-03/V-04:** require physical devices and assistive-technology environments that are not available to this autonomous checkout.

## Sequence and dependencies

| Phase | Tasks | Review gate |
| --- | --- | --- |
| Baseline | T01 | Tooling and current tests are understood; existing failures are recorded, not bypassed. |
| Work and modal safety | T02 → T03 → T04; T05; T06 after D3 | All P1 findings have a verified repair or an explicitly blocked decision. |
| Action feedback | T07 → T08; T09; T10 after T06's routing decision | Errors belong to the active task; destructive scope and recovery are unambiguous. |
| Keyboard and preferences | T11, T12, T13 | Navigation, localization, focus, and account-save semantics are consistent. |
| Offline and portability | T14 → T15 → T16; T17 | State descriptions reflect real persistence, cleanup, and session outcomes. |
| Responsive hierarchy and validation | T18 → T19 | Approved hierarchy changes pass manual device/accessibility checks; unconfirmed risks remain labeled. |

Shared files must be edited serially: confirmation models (T02/T03/T07/T08), routing/layout (T06/T10/T15), dictionaries (all copy tasks), offline state/runtime (T05/T14/T15/T16), and query/preferences hooks (T07/T13). The order is not permission to parallelize overlapping patches.

## Task conventions

All paths below are repository-relative. `W` is shorthand for `apps/web/src/features/applications/application-workspace` and `F` for `apps/web/src/features/applications/form`; expand those roots before editing. Existing helpers and fixtures must be inspected, not duplicated. Explicitly marked new files do not yet exist.

Each task ends with its own reviewable, independently tested patch. Where a task touches multiple variants of the same workflow, run the focused test cycle for each variant before proceeding. A green fixed-prop component test alone is insufficient when correctness depends on a query refresh or unmount.

---

## T01 · Establish a trustworthy baseline and test harnesses

**Covers:** Verification prerequisite for every finding. **Dependencies:** None.

**Read:** `docs/testing.md`, `playwright.config.ts`, `playwright.offline.config.ts`, `tests/e2e/global-setup.ts`, `W/test-support/render-application-workspace.tsx`.

- [x] Confirm the installed Playwright package can launch its default bundled Chromium. This was repaired during the audit; do not introduce a Chrome-channel override.
- [x] Run `bun run format:check`, `bun run lint`, `bun run typecheck`, `bun run test`, and `bun run build`. Record each outcome. The audit previously found unrelated header indentation; ask before fixing a remaining unrelated failure. The current branch passes all five checks.
- [x] After confirming service prerequisites and permission to refresh disposable fixtures, run `bun run test:e2e:offline` then `bun run test:e2e`. Classify existing failures, including the known offline-logout disclosure and isolated logout onboarding dependency. Do not change assertions merely to obtain green output.
- [x] Extend `W/test-support/render-application-workspace.tsx` only where needed to support a query-backed page using `createMemoryRouter` after the routing decision, and real detail-query invalidation. Keep its existing fixed-content helper for tests that do not need query updates.
- [x] Use manually controlled promises for pending/failure tests, not hard sleeps. Capture request counts and submitted payloads; never log cookies, CSRF tokens, reset links, or private records.

**Deliverable:** Baseline outcomes in the execution log, and only the smallest reusable test-support change required by the next task. Existing failures are not an automatic authorization to expand scope.

## T02 · Make confirmations real modal interactions

**Covers:** UI-06. **Dependencies:** T01.

**Modify:** `apps/web/src/components/ui/confirmation-modal.model.ts`, `.view.tsx`, `.styles.ts`; `apps/web/src/lib/trap-tab-focus.ts` only if its current behavior needs extension.

**Create test:** `apps/web/src/components/ui/confirmation-modal.test.tsx`.

**Interface:** Preserve `title`, `text`, `yesLabel`, `noLabel`, `onYes`, `onNo`, and `yesDisabled`. T02 adds optional `returnFocusRef` for an existing caller-specific focus destination. T03 adds optional `dismissAction: { label, onDismiss }`, pairing the safe-dismiss label and callback; callers without it still dismiss through `onNo`. Defer `pending?: boolean`/`error?: string` to T07, together with their behavioral changes and tests.

- [x] Add a regression using the existing component API, before implementing containment:

```tsx
const user = userEvent.setup();
render(<ConfirmationModal title="Delete application?" yesLabel="Delete application" noLabel="Cancel" onYes={vi.fn()} onNo={vi.fn()} />);
await user.click(screen.getByRole("button", { name: "Delete application" }));
await user.tab();
expect(screen.getByRole("button", { name: "Cancel" })).toHaveFocus();
```

  This test's mock callback must not unmount the dialog; add a separate parent-controlled dismissal test for opener restoration.
- [x] Run `bun run --cwd apps/web test src/components/ui/confirmation-modal.test.tsx`; confirm the regression fails for the missing behavior.
- [x] Add a dialog ref; wrap Tab/Shift+Tab using the existing helper; identify the top interaction layer for Escape. Isolate the background without making the modal's own ancestor inert. Store/restore the opener, with a connected fallback if its record was removed. Use stable effect lifetimes so rerenders do not overwrite the opener.
- [x] Add cases for disabled confirmation, stacked instances, parent Escape handling, removed opener, Escape/backdrop, caller focus destinations and replacement dialogs. Avoid stale document listeners after unmount and avoid restoring focus over a newly opened modal. Pending/error behavior and dirty-warning dismissal are deferred to T07/T03.
- [x] Verify create dialogs and welcome still contain focus and do not double-handle Escape. Review the patch before converting other callers.

**Exit:** Keyboard and pointer cannot activate the background; dismissal and success have intentional focus destinations. Error content inside the alertdialog is a T07 acceptance check, not part of this focus-only checkpoint.

## T03 · Protect dirty warnings and row switches

**Covers:** UI-01, UI-02. **Dependencies:** T02, D1.

**Checkpoint split:** UI-01 compact warnings and UI-02 related-record row switching are accepted. Application/owner-transition intent clearing is excluded: navigation cannot proceed while the warning modal is open.

**Modify:** `W/overview/use-application-fields.ts`, `application-unsaved-warning.model.ts`, `.view.tsx`; `W/contacts/use-contacts-controller.ts`; `W/follow-ups/use-follow-ups-controller.ts`; `apps/web/src/features/applications/activity/application-activity-section.model.ts`, `.view.tsx`; matching dictionaries.

**Tests:** `W/overview/application-overview.test.tsx`, `W/contacts/contacts-section.test.tsx`, `W/follow-ups/follow-ups-section.test.tsx`, `apps/web/src/features/applications/activity/application-activity-section.test.tsx`.

- [x] Reproduce dirty-field warning Escape/backdrop. Reproduce edit A → request delete B → cancel, and edit A → edit B, for contacts, follow-ups and activity.
- [x] Add regressions that assert exact draft text and the absence of writes after cancel/dismiss. Run each affected test file and observe failure before fixing that variant.
- [x] Add a distinct `dismissWarning(): void` to the field-group controller that closes the warning without calling `cancel(field)`. Keep explicit `discardWarning(): void` separate. The shared modal uses a paired optional `dismissAction: { label, onDismiss }` rather than independent callback/label props; keep Save changes / Discard changes / Keep editing explicit. Existing two-action callers are unchanged.
- [x] Compare normalized draft and baseline before replacing a row target. Hold a pending target intent instead of immediately reinitializing the form. For unrelated deletion, keep the existing editor mounted until an explicit decision requires closing it.
- [x] Apply the resolved intent only after save/discard is confirmed. On a rejected save, keep the original editor and pending intent available without losing data. Do not add owner/application-transition intent clearing: navigation cannot proceed while the warning modal is open.
- [x] Rerun focused tests, including clean switches, cancel after a failed save, offline transitions and changed account. Record the approved D1 behavior in architecture/testing docs.

**Exit:** No implicit discard through Escape, backdrop, another row's action, or a canceled deletion.

## T04 · Define pending-save behavior and completion focus

**Covers:** UI-03, UI-32. **Dependencies:** T03, D2.

**Modify:** `W/overview/use-application-field.ts`, `W/preparation/use-preparation-field.ts`, `W/shared/workspace-text-field.model.ts`, `.view.tsx`, `W/contacts/use-contacts-controller.ts`, `contact-form.view.tsx`, `W/follow-ups/use-follow-ups-controller.ts`, `follow-up-form.view.tsx`, `follow-ups-section.view.tsx`; `F/job-form.model.ts`, `job-form-basic-fields.model.ts`, `.view.tsx`, `job-form-details-fields.model.ts`, `.view.tsx` to pass the submitted editor's pending state. Verify activity save behavior as part of the same policy.

**Tests:** `W/overview/use-application-field.test.tsx`, `W/preparation/preparation-section.test.tsx`, `W/contacts/contacts-section.test.tsx`, `W/follow-ups/follow-ups-section.test.tsx` with real query-backed completion.

- [x] Add a deferred write test: invoke Save, attempt a second save before rerender, attempt further editing, resolve the first request, and verify no typed revision silently disappears. Record the one-field patch and exact call count.
- [x] Observe failure, then apply a synchronous in-flight guard in the relevant save controller. Release it in `finally`. Lock only that submitted editor's inputs while its request is pending; allow unrelated work. Guard cancellation and row replacement that could misapply a late response.
- [x] Distinguish successful save from invalid/failed save in controller results. Preserve existing public types unless a coordinated change is necessary; application, preparation, contact, and follow-up controllers return `Promise<boolean>`. Activity keeps its local failure state because no caller must advance from its result.
- [x] Add accessible pending feedback in the active editor. Failure unlocks the retained draft and allows retry. No auto retry of an ambiguous create request.
- [x] Before completion of a follow-up removes its button or reorders the row, choose a stable target in that task or the next task. Restore after the actual query-backed update; announce success once.
- [x] Verify timeout/failure, late response after application/account change, unmount, two independent fields, and completed-task sorting. Run the focused files and the workspace browser flow.

**Exit:** One intended save produces one write; pending responses do not overwrite new input or steal focus from another record.

## T05 · Separate access revocation from device cleanup

**Covers:** UI-05. **Dependencies:** T01; can be reviewed independently of the editor work.

**Modify:** `apps/web/src/features/offline/offline-access-machine.ts`, `offline-access-runtime.ts`, `offline-access.model.ts`, `offline-controls.model.ts`, `.view.tsx`, `offline-store.ts` only where cleanup discovery requires it; four dictionaries and operations docs.

**Tests:** `offline-access-machine.test.ts`, `offline-access-runtime.test.ts`, `offline-controls.test.tsx`, `offline-store.test.ts`, and a production case in `tests/e2e/offline.spec.ts`.

**Proposed runtime state:** Separate cleanup from `DeviceDownload` readiness:

```ts
type DownloadCleanup =
  | { status: "idle" }
  | { status: "removing" | "failed"; ownerId: number };
```

  This is recovery metadata, not authentication or permission to read data. The user authorized the implementation decision: retain the existing IndexedDB owner/generation contract and save only a removal marker under `offlineDownloadCleanup` in local storage before deleting data. This independent marker remains available when IndexedDB refuses deletion. Block new downloads until cleanup finishes; never restore access from the marker.

- [x] Fail `clearOfflineAccount` once in the runtime harness. Assert read access is revoked immediately, removal failure remains actionable, and Retry cleanup does not enable access.
- [x] Observe the current disappearing-action failure. Track removal pending/failure separately, retaining its exact owner even after download state becomes absent. A failure must never display successful removal.
- [x] Expose a narrowly scoped `retryDownloadCleanup(): Promise<void>` through the runtime/provider. Allow it to delete only the recorded former owner's data; block conflicting preparation until cleanup finishes.
- [x] Verify successful retry, repeated failure, reload recovery discovery, cross-tab removal, sign-out and account switching. Never delete a newly prepared different owner's download with an old retry.
- [x] Run all offline unit tests and the targeted production removal test. Update device-privacy documentation and UI-05 evidence/status.

**Exit:** Cleanup can be retried truthfully, without restoring private access or leaking records between accounts.

## T06 · Protect departures and preserve create drafts across presentation changes

**Covers:** UI-04. **Dependencies:** T02–T04, D1 and D3.

**Modify:** `F/use-job-form.ts`, `job-form.model.ts`, `job-form-content.model.ts`, `job-manager.model.ts`, `job-manager.view.tsx`; `W/page/application-workspace-content.model.ts`, `overview/application-workspace-navigation.model.ts`; `apps/web/src/main.view.tsx`, `app-routes.view.tsx`, and `components/layout.model.ts` only after the router decision.

**Proposed shared support:** `apps/web/src/lib/dirty-editors.ts` and `apps/web/src/components/dirty-departure.model.ts`/`.view.tsx`/`.styles.ts` if one shared coordinator is needed. Do not create a generic form framework. The registry records a stable ID, dirty/pending predicates, discard callback and focus target; it stores no durable draft data and is cleared when account/page ownership changes.

- [x] First add create tests for draft → modal/drawer switch and draft → Escape/close/backdrop. Observe current loss. Lift draft ownership above the presentation switch but below the authenticated create host, or pass one controlled form state through both presentations. Do not make the host eager.
- [x] Preserve the draft on a presentation switch without a warning. For a dirty close/departure, use the D1 confirmation; cancel retains exact values and focus, explicit discard clears them.
- [x] Check the installed router's supported navigation blocker. The prior `BrowserRouter` root could not support it; approval was obtained for the data-router migration. No history monkey-patch or best-effort Link-only guard was added.
- [x] After approval, migrate route composition while preserving provider order, public/protected/guest routes, lazy imports, redirect intent and offline runtime lifetime. Update test routers to a real memory data router for blocker tests.
- [x] Register dirty workspace/create editors with the coordinator. Route cancellation blocks links, previous/next and Back/Forward. Pending writes cannot be canceled into another record by accident. Successful create/save clears the correct dirty state before its intended navigation.
- [x] Attach `beforeunload` only while unsaved work exists; let the browser supply its own message. Do not claim to preserve drafts after force-close, crash, or ignored unload prompts.
- [x] Add browser tests for clean navigation, dirty cancel, explicit discard, failed save, modal/drawer switch, Back/Forward and logout. Logout/security cleanup must never be blocked by a stale editor guard. Preserve per-application remount isolation.

**Exit:** Work is preserved until an explicit decision, with supported navigation behavior rather than a fragile interception workaround.

## T07 · Put mutation feedback inside the active task

**Covers:** UI-07, UI-08, UI-09, UI-10. **Dependencies:** T02–T04.

**Modify:** `F/job-manager-host.model.ts`, `.view.tsx`, `job-manager.model.ts`, `job-form-content.model.ts`, `job-form.view.tsx`; `W/overview/application-status-control.model.ts`, `.view.tsx`; `application-unsaved-warning.model.ts`, `.view.tsx`; `W/lifecycle/application-lifecycle-actions.model.ts`, `.view.tsx`; `apps/web/src/pages/home-page.model.ts`, `.view.tsx`; existing board models and dictionaries.

**Interfaces:** Extend the existing create prop chain with `submitError?: string`. T02 supplies the shared modal's pending/error slots. Status receives its existing controller error state, not a new mutation. Board presentation receives an explicit operation outcome rather than trying to infer a write failure from the list query.

- [x] Intercept a failed create POST and assert its translated alert is within `getByRole("dialog")`; preserve values and verify retry. Observe failure before plumbing the error down the existing props.
- [x] Repeat for status selection, warning-save and lifecycle changes. Each failure must be in the active control/dialog, not only in an obscured underlying field. Catch event-handler rejections deliberately; do not only suppress them.
- [x] Add delayed/failed status and reorder tests. Show saved state plus actionable failure and announce success without verbose repeated card help. Do not optimistically claim success before server confirmation unless a defined rollback is implemented and tested.
- [x] Give list-read errors an appropriate alert and explicit retry. Keep cached content visible where it remains valid, and distinguish fetch failure from mutation failure.
- [x] Run create/layout, overview, lifecycle, board tests and focused browser flows. Check all four locale keys and no duplicate announcements.

**Exit:** A primary action never appears ignored; pending, failure and successful recovery are understandable in context.

## T08 · Repair bulk-action hierarchy and transaction feedback

**Covers:** UI-11. **Dependencies:** T02, T07, D4.

**Modify:** `apps/web/src/pages/home-page.model.ts`, `.view.tsx`, `.styles.ts`; `apps/web/src/features/applications/collection/application-collection.model.ts`, `.view.tsx`, `.styles.ts`; `archive/archive-page.model.ts`, `.view.tsx`; `blacklist/blacklist-page.model.ts`, `.view.tsx`; dictionaries.

**Tests:** Create `apps/web/src/pages/home-page.test.tsx` and focused archive/blacklist page tests if no existing page tests cover the operation; extend `tests/e2e/xeniway.spec.ts` with disposable test-owned records, not destructive use of a person's board.

- [x] Add a filtered-board test that verifies confirmation still describes the true whole-board scope and count. The UI count derives from all loaded board records, not the filtered projection; never change the existing deletion endpoint scope.
- [x] Fail and delay `removeAll` in each board. Observe missing pending/error behavior, then expose it in the active confirmation. Add a synchronous duplicate guard and clear outcome on a new deliberate attempt, not while one is unresolved.
- [x] Use specific text such as “Delete all active applications” rather than Yes, and explain that current filters do not reduce the scope. The count is contextual, not a server-enforced concurrency guarantee.
- [x] Move the entry out of the search/filter action cluster into a secondary destructive context. Retain keyboard access and existing confirmation/countdown protection under D4.
- [x] Test no request on cancel/Escape, one request on confirmed submit, failure retry, empty-board behavior, disabled offline state, and focus return after rows disappear. Never exercise real destructive requests without isolated fixtures.

**Exit:** Scope, consequence and progress are explicit; the rare destructive operation no longer competes with normal filtering.

## T09 · Make validation actionable without duplicating contracts

**Covers:** UI-12. **Dependencies:** T07.

**Modify:** `apps/web/src/features/auth/register/register-page.model.ts`, `register-fields.model.ts`, `.view.tsx`, `register-form.view.tsx`; `F/use-job-form.ts`, `job-form-basic-fields.view.tsx`, `job-form-details-fields.view.tsx`; corresponding field models/styles and dictionaries. Read `packages/shared/src/index.ts`; do not change its constraints to suit the UI.

**Tests:** Create `apps/web/src/features/auth/register/register-page.test.tsx` and `apps/web/src/features/applications/form/job-form.test.tsx` if absent; retain existing form normalization tests.

- [x] Add cases for matching seven-character registration passwords, over-limit names/passwords, whitespace-only company/position and over-limit application values. Confirm schema-valid native-required/email/URL behavior still works.
- [x] Map actual schema issue paths to field-specific translated errors. Explain the existing password requirements before submit; never invent a rule absent from the shared schema.
- [x] Associate errors with their inputs and set `aria-invalid` only when appropriate. Focus the first invalid control or a summary whose links reach each correction. Preserve all entered values.
- [x] Clear obsolete errors on correction/new validation. Verify repeated invalid submission is discoverable even when the error string is unchanged; do not rely solely on an effect keyed by that string.
- [ ] Run field/component and shared-contract tests. Check labels, native autocomplete, paste, password-manager generation and all four languages manually where needed.

**Exit:** Users can identify and correct the rejected input without guessing or losing the rest of the form.

## T10 · Restore authentication intent and password-recovery exits

**Covers:** UI-13, UI-14, UI-15, UI-16. **Dependencies:** T06 routing decision; can prepare recovery tests earlier.

**Modify:** `apps/web/src/route-guards.model.ts`, `.view.tsx`; `features/auth/login/login-page.model.ts`, `.view.tsx`; `register/register-page.model.ts`, `.view.tsx`; `password-reset/password-reset-page.model.ts`, `.view.tsx`, `password-reset-state.model.ts`, `.view.tsx`; `components/layout.model.ts`, `auth-card.model.ts`, `.view.tsx`; page-title models/dictionaries.

**Create support/test:** `apps/web/src/lib/auth-return-to.ts`, `auth-return-to.test.ts`; create route-guard tests if absent. Extend `password-reset-page.test.tsx`, `app-routes.test.tsx`, and browser recovery tests.

- [x] Test a protected workspace/archive/blacklist URL → login → original destination. Add return-destination validation before using query parameters. Preserve path/search/hash only for approved internal route forms; reject external origins, protocol-relative URLs and malformed values.
- [x] Preserve return intent in login/register links. Ordinary login still goes to the board. A remembered target never bypasses server ownership or auth checks.
- [x] Test `PASSWORD_RESET_INVALID` separately from network/server failure. Invalid/expired/used token presents the existing Request a new link route; temporary errors preserve retry. Do not alter the API's generic recovery-request contract.
- [x] On successful password reset, deliberately announce “Password updated” and move focus to its result without duplicate speech. Keep a clear sign-in link and no raw token in UI/logs.
- [x] Add localized route document titles and a page h1 for auth screens. Keep CardTitle's existing default h2 API; provide an explicit auth-page heading rather than changing every CardTitle globally.
- [x] Use one route-orientation owner. Avoid competing focus with the workspace's company heading, dialog opening or Back/Forward restoration. Language changes can update title without stealing editor focus.
- [x] Run return-target unit tests, router/component tests and existing public recovery/session browser workflows.

**Proposed pure helper contract:**

```ts
export function resolveAuthReturnTo(value: string | null): string;
// Returns an approved internal path/search/hash or "/".
```

**Exit:** Authentication continues the requested task; recovery failures and successes provide useful exits and page orientation.

## T11 · Complete language-menu keyboard and layer behavior

**Covers:** UI-17. **Dependencies:** T02; no change to native appearance required.

**Modify:** `apps/web/src/features/preferences/language-selector.model.ts`, `.view.tsx`, `.styles.ts`; `features/welcome/welcome-modal.model.ts` only for layer-aware Escape; dictionaries if selection/help labels change.

**Tests:** `language-selector.test.tsx`, `welcome/welcome-modal.test.tsx`, browser language switching and nested welcome cases.

- [x] Add keyboard open, first/current-item focus, arrow/Home/End movement, selection, Escape and focus return cases using existing menu semantics. Include the nested welcome menu; first Escape must not complete onboarding.
- [x] Implement the complete declared menu pattern, including a current-language state. Prefer the existing controls with correct behavior; adopting a different primitive requires checking bundle/lazy boundaries and approval if a dependency is needed.
- [x] Let the innermost active layer consume Escape, and make the welcome listener respect handled events. Do not merely add a second global key listener whose order is accidental.
- [x] Preserve outside click and pointer selection. Test RTL without reversing vertical movement or mislabeling the current language. Language selection failures are handled in T13, not silently swallowed here.
- [x] Verify onboarding completion counts: menu dismissal triggers zero completion writes; actual approved dialog completion triggers one.

**Exit:** Advertised menu semantics match its keyboard behavior, and nested dismissal never completes another interaction accidentally.

## T12 · Align board order, accessible labels, and filter semantics

**Covers:** UI-28, UI-29, UI-30. **Dependencies:** T07; keep separate from T18's URL policy.

**Modify:** `apps/web/src/features/applications/board/job-board.model.ts`, `use-job-board.ts`, `job-card.model.ts`, `.view.tsx`; `filters/status-filter.model.ts`, `.view.tsx`, `status-filter-options.view.tsx`, `use-status-filter.ts`; dictionaries. Read `store.ts`; do not rely on toggle insertion order.

**Tests:** Existing `board/job-board-column.test.tsx`; create `board/use-job-board.test.tsx` and `filters/status-filter.test.tsx` if absent; extend browser keyboard/filter workflows.

- [x] Add a regression that hides then re-enables Saved, then moves toward its adjacent displayed status. Test sparse visible sets and boundaries. Use `jobStatuses.filter(status => visibleStatuses.includes(status))` for both column display and adjacency.
- [x] Define left/right from document direction consistently with visual movement. Test English/Hebrew and preserve native link modifier/middle-click behavior. Do not change the separately approved all-applications previous/next strategy.
- [x] Move “Position … of …” into translated interpolation keys. Put shared keyboard help in associated descriptive content and omit mutation help while read-only; keep a concise company/role/status link name.
- [x] Retain the status filter as a nonmodal checkbox disclosure. Remove misleading dialog semantics, give the controlled group a stable accessible name, and define focus entry/Tab/Escape without trapping users inside a nonmodal popover.
- [x] Distinguish zero selected statuses from a no-match text search; offer Show all statuses and Clear search for their respective states. Keep labels and indeterminate Select all correct.
- [x] Run board/filter tests and browser keyboard navigation in both directions. No automated styling assertions.

**Exit:** Keyboard behavior follows what is displayed; labels describe only possible actions; filters cannot leave users in an unexplained blank board.

## T13 · Make preference persistence and dictionary failures visible

**Covers:** UI-18, UI-19. **Dependencies:** T11, D5.

**Modify:** `apps/web/src/features/preferences/theme-selector.model.ts`, `language-selector.model.ts`, `settings-preferences.model.ts`, associated views/styles; `lib/queries.ts`; `i18n/i18n.ts`; `main.model.ts`; dictionaries. Reuse the account-preference mutation instead of adding a second preference API layer.

**Tests:** `theme-selector.test.tsx`, `language-selector.test.tsx`, `settings-preferences.test.tsx`, `user-preferences-sync.test.tsx`, `lib/queries.test.tsx`, `i18n/i18n.test.ts`; add focused bootstrap coverage if absent.

- [x] Reject an explicit preference PATCH. Assert local state remains changed and feedback distinguishes “Applied on this device” from account persistence. Explicit Retry saves only the latest outstanding user-selected values for the same owner.
- [x] Preserve abort/ownership handling for logout and rapid account changes. A superseded failure must not replace the status of a newer successful choice. Do not block later clicks behind an entire-preferences hydration gate.
- [x] Reject a lazy dictionary request during selection. Keep the current locale and direction, announce failure in that locale, and allow an explicit retry.
- [x] Reject startup loading for a stored non-English locale. Render with bundled English and truthful `lang`/`dir`, while retaining the user's preferred stored language for a later deliberate retry. Do not overwrite it automatically as though the user selected English.
- [x] Distinguish dictionary-resource failure from local-storage write failure and account-save failure. Keep errors sanitized and scoped to the correct operation; never report a rejected language change as successfully applied.
- [x] Verify all four dictionaries, initial offline loading, reconnect without automatic uploads, and header/Settings consistency.

**Suggested presentation state, local to preference ownership:**

```ts
type PreferenceSaveStatus = "idle" | "saving" | "saved" | "local-only" | "failed";
```

  Do not persist this status as account identity or merge it into i18next language state.

**Exit:** A visible setting change is not confused with a confirmed account save, and a missing dictionary cannot leave an unusable startup screen.

## T14 · Distinguish absent, failed, and slow offline restoration

**Covers:** UI-24. **Dependencies:** T05; integrate T13's startup fallback without recreating a global gate.

**Modify:** `apps/web/src/main.model.ts`; `features/offline/offline-access-runtime.ts`, `offline-access-machine.ts`, `offline-access.model.ts`, `offline-controls.model.ts`, `.view.tsx`; `offline-types.ts` for shared runtime types only.

**Tests:** `offline-access-runtime.test.ts`, `offline-access-machine.test.ts`, `offline-access.test.tsx`, `offline-controls.test.tsx`; production offline reload.

**Proposed result shape:**

```ts
type RestoreOutcome<T> =
  | { status: "ready"; value: T }
  | { status: "absent" }
  | { status: "failed" | "timed-out" };
```

- [x] Independently test no record, rejected storage, and valid data arriving after the bounded two-second initial wait. Regressions reproduced stuck restoration and the missing failure/timeout state.
- [x] Keep the startup bound and represent the outcomes explicitly in runtime download state. Chosen policy: ignore timed-out completions and require an explicit retry, which rereads the current durable generation.
- [x] Add `retryRestoration(): Promise<void>` to the runtime/provider. It rechecks expiry, durable generation, readiness and current-account constraints; it is not an alias for network authentication Retry.
- [x] Cancel/supersede restoration when removal, sign-out, replacement or account change occurs. An old result must never re-enable private access.
- [x] Test storage recovery and retry in Settings with readable fallback content. Component recovery and the production offline reload/retry case pass without exposing a private record before restoration succeeds.

**Exit:** Slow/unreadable storage has an accurate recovery path, while absent or invalid data never grants access.

## T15 · Put offline-logout limitations on the logout destination

**Covers:** UI-20. **Dependencies:** T05, T10, D6.

**Modify:** `apps/web/src/features/offline/offline-access-runtime.ts`, `.model.ts`, machine state where needed; `components/site-header.model.ts`; `features/auth/login/login-page.model.ts`, `.view.tsx`; four dictionaries. Use one small shared notice helper only if needed across these boundaries.

**Tests:** Offline runtime/controls, login tests, and `tests/e2e/offline.spec.ts`'s existing logout-disclosure workflow.

- [x] Reproduce local logout → login → reload. Assert private data is unavailable throughout and the truthful remote-session notice remains visible on the destination.
- [x] Store only the D6 non-private tab-scoped notice. Storage failure cannot block local private-data cleanup; explain a persistence failure without pretending the notice survived reload.
- [x] Define a deliberate Finish sign out action using the existing logout/CSRF route. Verify its response before clearing the remote-limit notice; merely observing `navigator.onLine` is insufficient.
- [x] Clear/replace notices on the approved confirmed logout/new-session transitions and test another account signing in. Do not carry a misleading previous-session notice forever.
- [x] Update the known backlog item and offline browser assertion to the approved destination/lifetime. Do not remove the disclosure expectation to make the suite pass. The old disclosure backlog entry was already retired; current Operations and regression guidance now describe D6.

**Exit:** The person sees the actual local-versus-remote logout outcome where they arrive, including the documented reload lifetime.

## T16 · Make offline readiness, retry and errors truthful in context

**Covers:** UI-21, UI-22, UI-23, UI-34. **Dependencies:** T05, T14, T15.

**Modify:** `apps/web/src/features/offline/prepare-offline.ts`, `offline-access-runtime.ts`, `offline-access-machine.ts`, `offline-controls.model.ts`, `.view.tsx`; page/form capability presentation models; four dictionaries. Update `docs/operations.md` alongside the state/copy contract.

**Tests:** `prepare-offline.test.ts`, offline machine/runtime/controls tests, `components/layout.test.tsx`, affected form tests, and production preparation/reconnect tests.

- [ ] Add distinct resource, connection/session and storage failure cases. Introduce a small safe category, not raw exceptions or serialized responses. Keep cancellation/supersession out of actionable failure notices.
- [ ] Present the relevant next step for each category. A resource or API failure must not instruct users only to alter storage permissions.
- [ ] Rename the current query timestamp to what it measures: Active board last fetched. Do not claim a complete persisted download timestamp from `dataUpdatedAt`. A new durable download-wide timestamp is out of scope unless separately approved.
- [ ] Expose Checking connection… during verification and a specific success/failure announcement afterward. Avoid duplicating checks; preserve cached access and the current route while verifying.
- [ ] Provide a short read-only reason near the affected task and a link to Settings. Keep detailed preparation/removal/Retry controls only on Settings, as required. Disabled controls need not become focusable for a tooltip.
- [ ] Exercise disconnected browser, unavailable API, pending verification, expired session, failed persistence and successful reconnect. Verify no partial preparation is called ready and no stale status appears as confirmed saved data.

**Exit:** State descriptions and recovery actions reflect actual capability, resource delivery and persistence outcomes.

## T17 · Disclose the export relationship limitation without changing output

**Covers:** UI-25. **Dependencies:** T01; independent copy/behavior task.

**Modify:** `apps/web/src/features/data-export/csv-export-button.model.ts`/`.view.tsx` only if the section needs structured limitation copy; `apps/web/src/i18n/locales/en.ts`, `ru.ts`, `uk.ts`, `he.ts`; `docs/api.md` only to align the existing description.

**Tests:** `features/data-export/csv-export-button.test.tsx`, current API CSV/ZIP tests, and `tests/e2e/export.spec.ts`.

- [x] Add a semantic assertion that the pre-download description explains that related CSV rows cannot reliably be matched to application rows with the current package alone.
- [x] Retain the existing field-exclusion and online-session explanations; do not bury the relationship limitation in an unrelated developer document.
- [x] Run existing allowlist, ZIP/CSV, spreadsheet-safety, private-field and owner-isolation checks unchanged. No association key, internal identifier, extra salary/activity field, or new export format is authorized by this task.
- [x] Keep the existing joinable-export backlog entry open for a separately approved API contract change.

**Exit:** People can judge the package's current limits before downloading, without an unapproved output-contract change.

## T18 · Rebalance mobile hierarchy and search context

**Covers:** UI-26, UI-27, UI-31, UI-33. **Dependencies:** T06, T08, T12; approve D7/D8 first. Perform the four subchanges as separate reviewable patches.

**Modify:** `apps/web/src/components/site-header.model.ts`, `.view.tsx`, `.styles.ts`; `features/applications/board/job-board.model.ts`, `.view.tsx`, `.styles.ts`, `job-board-column.view.tsx`; `components/application-search.model.ts`; board/filter route integration and `store.ts` under D8; `apps/web/src/index.css` for the cursor rule only.

**Tests:** Header semantics in a new `components/site-header.test.tsx` if absent; board/filter/search tests; existing keyboard/locale browser workflows. Inspect layout manually, never with geometry/class assertions.

- [ ] Capture baseline 320/360/390 px views in English, Russian, Ukrainian and Hebrew before changing styles. Keep the authenticated email/account context available while removing the isolated mostly empty Logout row. Theme/language shortcuts remain in the header.
- [ ] Under D7, provide native status jump links for visible mobile columns with stable IDs, named destinations and appropriate focus/scroll behavior. Do not make hidden columns silently visible or change status order. Existing checkboxes remain filters, not a competing status-navigation mode.
- [x] Under approved D8, implement route-local `q` and canonical active-board `statuses` with missing/empty/unknown semantics, unrelated parameter/hash preservation, replace-on-typing and push-on-status selection. A single layout route adapter projects into Redux; Archive/Blacklist use only their search parameter.
- [x] Focused router tests cover canonical/empty/unknown values, search clearing, status history and board navigation. The browser case verifies copied query/filter URLs, reload, route-local search, Back and unrelated parameter/hash preservation. Full-suite integration remains part of the final verification checkpoint.
- [ ] Narrow the global pointer cursor to controls where it denotes an action. Leave ordinary text input and textarea selection natural, preserving all native keyboard/paste/autofill behavior.
- [ ] Manually verify hierarchy, translated wrapping, touch reach, dark theme, RTL and enlarged text. Check meaningful state/navigation behavior automatically, not pixel placement.

**Exit:** Primary tasks stay near the content; later mobile statuses are reachable; search context follows the approved policy; primitive affordances remain familiar web behavior.

## T19 · Validate the five remaining candidates and perform release review

**Covers:** V-01–V-05 and final regression. **Dependencies:** Relevant fixes completed; no speculative CSS/performance repair before reproduction.

**Read/inspect:** `features/applications/activity/application-activity-event.styles.ts`, `W/shared/workspace-text-field.styles.ts`, `W/contacts/contacts-section.styles.ts`, `features/welcome/welcome-modal*.styles.ts`, `components/ui/input.styles.ts`, `F/job-modal.styles.ts`, `F/job-drawer.styles.ts`, theme/focus tokens and current bundle outputs.

- [ ] V-01: Use realistic maximum-length content, long URLs/unbroken identifiers, mixed-direction text and long translated actions. Inspect at 320/390 px and enlarged text. If overflow occurs, record its exact screen/content and ask before the scoped wrapping/layout fix.
- [ ] V-02: Inspect welcome in landscape and 200–400% zoom in four locales. All actions and exits must remain reachable. Confirm a clipping failure before changing height/scroll treatment.
- [ ] V-03: Test physical iOS Safari and Android with the virtual keyboard open, landscape and installed mode. Record unavailable devices explicitly. Do not substitute desktop emulation for a physical keyboard claim, and do not disable zoom.
- [ ] V-04: Inspect keyboard focus, contrast, forced colors, reduced motion, touch and Windows classic scrollbars. Conduct VoiceOver/NVDA checks where available. Record the actual browser/AT combination and gaps, not a general compliance claim.
- [ ] V-05: Measure typing, route downloads, edit/drag responsiveness and large-board rendering on representative devices/data. Preserve baseline measurements. Use the existing bundle-cost backlog; do not add virtualization or force chunk splitting on intuition.
- [ ] Update each candidate as reproduced, disproved within its tested conditions, or not yet validated. New implementation work needs its own approved task and behavioral guardrails.
- [ ] Run the full verification sequence below. Review each UI-ID's acceptance checks and update the audit/backlog, rather than marking the whole plan done because one smoke test passed.

**Exit:** Every finding has a verified resolution, explicit deferral/decision, or evidence-backed rejection; every candidate has a truthful validation status.

## Coverage map

| Audit IDs | Fix task |
| --- | --- |
| UI-01, UI-02 | T03 |
| UI-03, UI-32 | T04 |
| UI-04 | T06 |
| UI-05 | T05 |
| UI-06 | T02 |
| UI-07, UI-08, UI-09, UI-10 | T07 |
| UI-11 | T08 |
| UI-12 | T09 |
| UI-13, UI-14, UI-15, UI-16 | T10 |
| UI-17 | T11 |
| UI-18, UI-19 | T13 |
| UI-20 | T15 |
| UI-21, UI-22, UI-23, UI-34 | T16 |
| UI-24 | T14 |
| UI-25 | T17 |
| UI-26, UI-27, UI-31, UI-33 | T18 |
| UI-28, UI-29, UI-30 | T12 |
| V-01, V-02, V-03, V-04, V-05 | T19 |

No audit finding is silently dropped. A task blocked on a decision remains blocked, not complete.

## Verification and handoff

For each code task, use focused Vitest files first, observe the regression fail, implement the narrow change, and rerun those files. Run `bun run format` after source edits and review its diff so unrelated changes are not swept into the task. Run `bun run lint` before a requested commit.

At each completed phase, run:

```bash
bun run check:public
bun run format:check
bun run lint
bun run typecheck
bun run test
bun run build
git diff --check
```

After checking services and confirming the intended disposable fixture reset, continue sequentially:

```bash
bun run db:migrate
bun run db:seed
bun run test:e2e:offline
bun run test:e2e
```

Read [Testing](../../testing.md#commands) for prerequisites and [Operations](../../operations.md#local-lifecycle) for local service setup. A failed baseline check, missing browser/device, or newly discovered bug must be reported and discussed, not concealed by timeouts, retries, mock-only coverage, skipped assertions, or another browser channel.

The planning change itself requires only document consistency, coverage, local-link and whitespace checks. It does not require running destructive browser workflows or reseeding data.

## Execution record

Start with T01, then T02. For every task record: approved policy gates, reproduction, files changed, checks run and exact outcome, manual checks and limitations, audit IDs resolved, and remaining decisions. Only mark checkboxes complete for work actually done.

### Checkpoint 1 · Confirmation modal interactions (UI-06 / T02)

- **Acceptance:** User accepted the repair/refactor and requested its commit. This does not approve D1 or authorize the next fix. Broader device/screen-reader validation is not recorded; the create-form browser locator failure remains separately tracked.
- **Authority:** User requested one fix at a time, stopping for manual testing, approved a new branch in the existing checkout and the unrelated two-line header indentation repair. Branch: `codex/confirmation-dialog-focus`. No product-policy gate is changed.
- **Reproduction:** The initial ten component regressions failed for missing containment, restoration, stable focus, background isolation and unique names. Integration tests then caught a conflict with Activity's existing focus destination; the explicit `returnFocusRef` preserves that destination after removal. The real two-stage browser check caught body being mistaken for an opener; a failing component regression now covers its page fallback.
- **Scope:** Shared confirmation model/view, component behavior tests, Activity's focus binding, a non-deleting browser regression, approved header indentation, and relevant testing/audit/backlog documentation. No styling, confirmation-action, draft-discard, countdown, or API changes.
- **Requested simplification:** Refactored the confirmation model from 149 to 123 lines. A body-level portal replaces ancestor traversal and the document-wide mutation observer; dialog-bound keyboard handling replaces the document keyboard listener. Focus restoration has one helper instead of a separate target-attempt helper and redundant lifetime/active-element checks. All 16 existing confirmation regressions are retained unchanged; the 602-test frontend suite and focused Chromium confirmation workflow passed again. The separate create-form loading-locator issue remains untouched.
- **Manual checkpoint:** Open Remove all without completing deletion. Tab/Shift+Tab must stay in the dialog. Escape/No/backdrop must close it and restore the opening control. In stage two, the disabled Yes must be skipped; cancel returns focus to main content when the intermediate opener no longer exists. In Activity, canceling deletion retains its Add activity focus destination. Inspect keyboard focus in LTR/RTL and narrow viewports.
- **Limitations:** Full ordinary/offline browser suites and device/screen-reader review remain pending; only focused browser workflows are in scope for this checkpoint. Pending/error props belong to T07; dirty-dismissal policy belongs to T03/D1. Do not start another fix until the user tests this one.
- **Browser outcomes:** The dedicated confirmation workflow passed (one test, bundled Chromium); the welcome workflow passed. The separate create-form browser test failed at its existing unscoped `getByRole("status")` loading assertion because the board and lazy host both announced loading. It did not reach create-dialog focus checks. This is recorded in the backlog, not worked around or changed; further repair requires approval. T02's create/welcome verification checkbox remains incomplete.
- **Final static/unit outcomes:** Public repository check, formatting, lint, complete workspace/E2E typecheck, root test command and production build passed. Root tests: 76 script tests, 24 shared tests, 144 API tests (nine existing skips), and 602 frontend tests, including 16 shared-confirmation cases. The existing PWA bundler deprecation remains nonfatal and already tracked in the backlog. Full browser suites were not run; manual approval remains pending.

### Checkpoint 2 · Compact unsaved-warning dismissal (UI-01 / T03 substep)

- **Authority and scope:** User approved D1. Implement UI-01 only, preserving the one-fix-at-a-time checkpoint. Related-record row switching (UI-02), pending-write races/locking (UI-03/T04), and route departure (UI-04/T06) are not included. No commit requested.
- **Reproduction:** The Escape regression failed because the Location editor disappeared; new action regressions failed because only ambiguous Save/Cancel existed. Tests ran before the implementation. Lint and the initial 49 component tests passed before edits.
- **Implementation:** Separate dismissal from discard in the compact-field controller. Safe dismissal clears the pending field intent but leaves the existing editor/draft intact. Save/discard share the existing field-transition completion path. The warning focuses the current input after safe dismissal, including offline/read-only display. Add paired `dismissAction` to the shared modal so the safe option has initial focus; legacy confirmations retain their defaults. Translate all three choices and explanatory copy into en/ru/uk/he. Allow actions to stack on narrow screens.
- **Review correction:** Review reproduced an offline-discard regression for pending Company/Status switches: opening a disabled editor/menu lost the intended focus destination. Two new failing regressions reproduced it. Field-transition completion now checks current mutation permission before starting another editor, so offline discard returns to the departing field's container without a write.
- **Final verification:** All 616 frontend tests passed, including 19 confirmation cases, 40 overview cases, and four new dictionary cases; the two offline-discard regressions also passed in isolation after the final assertion edit. Formatting, lint, complete workspace/E2E typecheck and production build passed. The root unit command also passed before the final frontend-only offline correction. Both bundled-Chromium confirmation workflows passed again after that correction, including real compact-warning draft/focus/no-write, discard and one-field-save behavior, Hebrew language switching, document direction and reload persistence at a mobile viewport. Full ordinary/offline browser suites were not rerun. The known unrelated create-form loading-locator failure remains unchanged. Manual styling/device/screen-reader review is not claimed.
- **Manual checkpoint:** Edit Location, enter a draft, then select Company. Escape, backdrop and Keep editing must preserve the draft and focus Location. Discard changes must switch to Company without a write. Save changes must save Location and then switch. Repeat after disconnecting (Save disabled) and in Hebrew/narrow layouts. Await user feedback before starting UI-02 or committing.

### Checkpoint 10 · Departure and create-draft browser coverage (UI-04 / T06)

- **Authority and scope:** The user authorized autonomous continuation and a commit for every verified task. This checkpoint adds browser evidence only; it does not change departure behavior, persistence, or product policy.
- **Coverage:** The focused confirmation suite now covers clean navigation, dirty cancellation, explicit discard, successful and failed save-before-departure, drawer-to-modal draft retention, browser Back, browser Forward, compact-editor overlap, and logout. The Forward regression starts from the board with a real forward history entry, types a create-form draft, verifies Keep editing retains the board and exact draft, then verifies Discard changes completes the original workspace navigation.
- **Verification:** `bunx playwright test tests/e2e/confirmation.spec.ts` passed: 8 Chromium tests. `bun run format`, `bun run lint`, `bun run typecheck`, and `git diff --check` passed for the preceding create-presentation assertion; the current checkpoint reruns the same formatting/static checks before commit. Browser fixtures are disposable test data only.
- **Limitations:** The full ordinary and offline browser suites remain an open T01 baseline item. This focused suite does not claim physical-device, assistive-technology, or full-suite verification.

### Checkpoint 11 · Full browser baseline (T01)

- **Authority and scope:** The user authorized autonomous plan completion and disposable fixture refreshes. Both commands use the repository’s configured local services and test-only Redis/database fixtures; no assertion or application behavior was changed to obtain a pass.
- **Verification:** `bun run test:e2e:offline` completed with exit 0 after its production build/type-check preflight. `bun run test:e2e` completed with exit 0 and its configured 36-test Chromium suite. The offline build reports the pre-existing non-fatal `inlineDynamicImports` deprecation warning; it remains tracked separately and did not affect test results.
- **Outcome:** The previously recorded offline-logout disclosure and logout onboarding concerns no longer reproduce in the current full browser baseline. T01’s browser-baseline checkpoint is complete.

### Checkpoint 12 · Board-wide deletion (UI-11 / T08 / approved D4)

- **Authority:** User explicitly approved D4. Earlier authorization permits a separate commit per verified task in this checkout. No other policy gate is approved by this checkpoint.
- **Implementation:** Shared collection view/model/styles move deletion into a native Board actions disclosure after results. Action labels identify the exact board; scope explains permanence, related workspace-data deletion, unfiltered loaded count, filter independence and unaffected other boards. Active retains two stages and a five-second countdown; Archive/Blacklist retain one confirmation. A synchronous in-flight guard prevents duplicate submissions and pending cancellation, sanitized failure stays in the modal, deliberate retry clears stale feedback, and success waits for existing query invalidation before announcing completion and returning focus to the persistent actions region. Empty/read-only controls are disabled. API/CSRF/ownership contracts are unchanged.
- **Regression evidence:** Initial 15 page regressions failed against the former UI. After implementation, the focused deletion/Home/confirmation command passed 41 tests. Tests use the real query-backed pages, controlled promises, payload/count assertions, exact retained scope and real invalidation; no style tests. Four new dictionary cases cover localized labels/count interpolation. Four focused Chromium workflows passed: both active confirmation stages/cancellation plus pending/error/retry and real deletion on all three boards. Each destructive browser workflow creates a fresh account and verifies that another board's record survives. The browser cases subsequently gained a 390 px viewport; their mobile rerun remains blocked by the service outage described below. Independent read-only review found no actionable issues.
- **Static/build checks:** Public repository check, formatting, lint, complete root typecheck and production build passed. The existing PWA `inlineDynamicImports` deprecation remains nonfatal and separately tracked.
- **Full unit outcome:** Root scripts: 76 passed; shared: 25 passed; API: 144 passed and nine existing skips. Frontend: 677 passed and 25 failures across eight unchanged files, mostly five-second timeouts with follow-on incomplete input/focus assertions. All new deletion and dictionary cases passed. A smaller diagnostic run passed 67 of 68 cases, including all deletion, Home, preparation and dictionary cases, but timed out in an unchanged confirmation test. Record this as a separate suite-timing investigation, not a green baseline or a confirmed T08 regression; do not alter assertions/timeouts to hide it.
- **Browser limitation:** Full production-offline verification passed its first four cases, then Redis sockets closed and connections to port 6379 were refused. The cold-login case failed; the following case was interrupted deliberately (exit 130), leaving twelve unrun. Docker status then reported the OrbStack daemon socket missing. The chained ordinary full suite did not start. Restore the local container engine/services before rerunning both browser suites sequentially, including the mobile T08 cases and updated offline disabling locator. No service restart, infrastructure workaround or assertion relaxation was performed.
- **Manual checkpoint:** On each board, expand Board actions after the results. With a search active, confirm that scope/count still refer to the whole board. Cancel safely, inspect pending/failure feedback, and check translated long labels and narrow/RTL presentation. Physical-device and screen-reader approval is not claimed.

### Checkpoint 13 · Durable cleanup recovery (UI-05 / T05)

- **Authority/policy:** The user delegated T05's remaining implementation decision and approved D5/T13 separately. Failed device removal immediately revokes fallback, persists only an owner/generation cleanup marker before attempting deletion, blocks conflicting downloads, and offers explicit scoped retry after reload. Cleanup completion never supplies authentication or restores a download. No database migration or private-record duplication is introduced.
- **Implementation:** Existing runtime cleanup states/actions remain the owner of pending/failure feedback. Local-storage recovery metadata is independent of IndexedDB so a denied database deletion can still be recovered after reload. Store reads/writes/preparation reject a pending marker. Runtime startup and cross-tab storage/broadcast discovery revoke fallback and evict/cancel the affected owner's queries. Unreadable metadata has a distinct blocked state and Settings retry that rereads it without requiring another reload or a session. Device-wide logout attempts private erasure even if metadata reads fail. Scoped retry checks the captured owner and generation; old retries leave a newer owner/generation intact.
- **Regression evidence:** New store/runtime cases failed for missing reload revocation, missing durable metadata and logout marker cleanup before implementation. Review-driven regressions reproduced omitted query eviction, unrecoverable metadata-read failures and loss of an already known cleanup target before their fixes. All 322 tests under `src/features/offline` pass. Browser/Node/worker TypeScript checks, E2E TypeScript and scoped formatting/lint pass. All four cleanup dictionaries and architecture/operations/testing guidance are updated.
- **Review:** Independent read-only re-review confirmed that all reported findings are resolved, with no remaining actionable findings. The cleanup-unavailable policy is a cohesive helper so the central state transition stays within the existing complexity limit.
- **Production closure:** After the user approved restarting local services, all 19 production offline cases passed, including failed IndexedDB removal → offline reload → revoked private access → explicit cleanup in Settings without a session. The final T05 checkbox is complete. If the browser refuses both metadata persistence and deletion, durable recovery cannot be guaranteed; Operations records that storage limitation. Other product-policy gates are unchanged.

### Checkpoint 14 · Preference persistence and resource recovery (UI-18/UI-19 / T13)

- **Authority:** The user approved D5 and subsequently approved lazy JSON dictionary packaging after Chromium reproduced failed-module caching in both development and production. Non-English resources remain lazy; explicit Retry now issues a new data request rather than reusing a rejected module import. English remains bundled.
- **Implementation:** Explicit choices apply locally first. Account feedback and owner-scoped Retry retain only the latest outstanding selected fields; acknowledged values are removed, stale completions are ignored, and reconnect/hydration never uploads browser values. Storage failures retain choices for this visit with a separate device-save retry. Dictionary failures preserve the active locale/direction; startup falls back to English without replacing the stored preference. Public dictionary requests are same-origin, credential-free, redirect-rejecting, MIME/structure-checked and shared only while in flight. Failed requests are not cached as rejected promises.
- **Interaction/review:** Feedback has one active publisher across the header, Settings, welcome and create dialog. Dismissal preserves retry data and returns focus; idle regions and unchanged dismissed notices are not republished. Independent review findings on activation atomicity, duplicate announcements, returning-user welcome intent and notice lifetime were fixed and re-reviewed with no remaining actionable findings. The create-host regression waits for actual dynamic-import completion, not a hard sleep or a longer timeout.
- **Verification so far:** Root formatting, lint, type checks and production build passed. The fresh normal root unit run passed 76 repository checks, 25 shared tests, 144 API tests (9 existing skips), and 762 frontend tests across 75 files. The two public-resource browser regressions passed against both development and built assets. An isolated production browser explicitly prepared public worker assets, then reloaded offline successfully in `en`, `ru`, `uk` and `he`, including Hebrew RTL at 390 px; no private data was prepared in that check. Earlier full-run timing failures remain historical investigation evidence, not a defect claimed fixed by this work.
- **Full browser baseline:** The user approved starting local services and refreshing disposable fixtures. Checks/migrations passed, followed sequentially by all 19 production offline cases and all 41 ordinary cases. This covers complete private downloads, all four lazy locales, T05 cleanup across reload, authenticated preferences, confirmation/departure behavior, export and board deletion. A non-blocking router POP warning during the passing native skip-link test is recorded in the backlog; no warning was suppressed or assertion weakened. Physical-device/assistive-technology candidates and unapproved policy tasks remain open; this is not completion of the entire plan.
- **Repository-hygiene correction:** The staged public-repository check initially classified public translated password labels and password-section objects as configuration credentials. With the user's approval, it now structurally inspects JSON and permits only the reviewed, exact password labels at canonical locale paths. Regression coverage proves a substituted credential in the same location is still rejected; no file is excluded and generic secret scanning remains active. Commit `057b357` was created before the original failed check was handled, so the correction and fresh hygiene evidence will be included before the next task begins.

### Checkpoint 15 · Bounded offline restoration and recovery (UI-24 / T14)

- **Implementation:** The mounted runtime owns the two-second wait and distinct failure/timeout download states. After timeout, only an explicit Settings storage retry starts a new read; late results are ignored. The storage helper checks ready/expiry metadata, reads the snapshot and rechecks owner/generation. Runtime operations, mounted lifetime and access epochs protect cleanup, sign-out, preparation and owner transitions. Pending/failed restoration blocks new preparation. Bootstrap observes early promise rejection while React attaches its runtime subscription.
- **Regression evidence:** Tests first reproduced rejected restoration remaining pending and the missing timeout state. Current focused offline/startup coverage passes 336 cases, including absence, storage rejection, valid late completion, replacement generation and retry revocation. Settings recovers a genuine saved IndexedDB fixture; the production browser case recovers while disconnected after a denied initial read. Copy is translated in all four dictionaries.
- **Verification:** Formatting, lint, type checks and the normal root unit command pass (78 script, 25 shared, 144 API with nine existing skips, 772 frontend). The rebuilt production offline suite passes all 20 cases. Ordinary browsers pass 40 of 41; the existing company-research Save failure repeats in isolation. Its backlog entry records the evidence and a separate fix request. No assertion was weakened. The passing skip-link test still emits its previously tracked router warning.
- **Remaining gates:** D6 for T15, T15 before T16, and D7/D8 for T18 remain pending user answers. T09/T19 retain their interactive/device validation requirements. These checks do not mark the full plan complete.

### Checkpoint 16 · Company-research draft submission repair

- **Authority:** The user approved investigating and fixing the browser failure separately, alongside D6/D7/D8.
- **Cause and change:** A browser request assertion reproduced a successful preparation PUT containing `companyResearch: null` after text entry. The shared multiline adapter submitted Atlaskit's internal form value, which could lag behind the controller draft. Confirmation now delegates to the existing controller's current draft. Validation, one-field updates, saved values and ownership checks remain in their existing hooks.
- **Verification:** The strengthened browser workflow failed on the wrong payload before the fix, then passed once and in three consecutive repetitions after it. All 61 related preparation/overview/page tests pass, along with formatting, lint and complete type checks. The earlier full-suite failure is historical evidence; the separate backlog entry is resolved. No delay or timeout was added.

### Checkpoint 17 · Route-owned collection filters (T18 / approved D8)

- **Implementation:** One layout adapter reads `q` and active-board `statuses`, projects them atomically into Redux and maps existing filter actions to router navigation. Typing replaces history; status changes push it. Recognized statuses retain workflow order, missing/empty/unknown selections have the approved semantics, and unrelated parameters/hash survive. Accepted case/trailing-slash routes use the same matching rules as the router.
- **Review and regression:** Review exposed stale subscription writes during external navigation and lost consecutive changes after the adapter's own navigation. Both reproduced in tests before their fixes. The adapter reads the existing data router's live location/navigation state and tracks its own navigation key; no browser-history patch is used. Nine focused adapter tests cover Back/Forward, consecutive actions and overlapping route changes. The real browser verifies copied URLs, reload, route-local search and Back; the repaired workspace case passes alongside it.
- **Verification:** Formatting, lint and complete types pass. The integrated root run passes 78 script, 25 shared, 144 API (nine existing skips) and 798 frontend tests, including the concurrent T15 work. Browser suites are being rerun sequentially before those tasks are closed. Header/status-jump/pointer subchanges remain separately reviewable patches.

### Checkpoint 18 · Logout destination and session-lifetime guards (T15 / approved D6)

- **Implementation:** Login explains unconfirmed remote logout and offers explicit Finish with fresh public CSRF and validated success. A boolean-only session-storage marker survives reload. Storage failures are separate feedback and do not prevent private cleanup. Ordinary logout establishes this barrier immediately; passive verification cannot silently reopen the old session. Explicit local/cross-tab sign-in supersedes old logout/Finish work, including same-account sign-in in another tab. Both confirmed logout paths cancel session checks started during their pending phase before clearing the marker.
- **Review and regression:** Controlled tests reproduced pending verification bypass, cross-tab Finish revocation, and late session responses after ordinary/Finish confirmation before their corrections. All 65 focused logout/runtime cases pass, along with format, lint and complete type checks. The production offline suite passes all 20 cases including local logout → login → reload → explicit Finish. A final integrated run follows the remaining T16/T18 work.
- **Browser baseline:** The current ordinary full run passed 30, failed Forward dirty protection and drag ordering, then skipped 10 serial cases. Both failures passed three isolated repetitions without assertion changes and remain under investigation. Mobile language switching passed five isolated repetitions and this full run; no speculative fix was applied.
