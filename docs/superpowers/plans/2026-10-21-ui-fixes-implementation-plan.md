# UI interaction fixes implementation plan

> **For agentic workers:** Use `executing-plans` to implement this plan task by task with review checkpoints. Use `subagent-driven-development` only for approved, independent work with disjoint write sets. Steps use checkbox (`- [ ]`) tracking. Do not execute this document merely because it exists.

**Goal:** Resolve all 34 findings in the [UI audit](2026-10-21-ui-interaction-audit.md), prioritizing work preservation and reliable feedback, and validate its five remaining risk candidates.

**Architecture:** Repair shared modal and draft interactions first, then integrate them into the existing feature models. Preserve the React/Vite application, API contracts, query ownership boundaries, InlineEdit, and styling system. Keep proposed product-policy changes behind explicit approval gates.

**Tech stack:** React 19, TypeScript, React Router, Redux Toolkit, TanStack Query, i18next, Tailwind Variants, Radix Select, Atlaskit InlineEdit, Vitest, and Playwright. No new dependency is planned.

**Status:** Execution authorized one fix at a time, with a manual user checkpoint after each. T02's modal repair/refactor is accepted and committed. D1 is approved; T03's compact-warning substep (UI-01) is accepted and its related-record substep (UI-02) is awaiting user testing. Other tasks and policy gates remain pending. No automatic commit or merge. The audit remains the evidence register; this document owns task order and execution tracking.

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
| D4 · Bulk deletion | Keep board-wide deletion semantics and current two-stage/countdown protection initially. Fix scope, labels, pending/error state, and placement first. Removing the countdown or combining dialogs is a separate decision after reviewing the safer flow. | T08 |
| D5 · Preference retry | Apply locally immediately. A failed account save remains local with an explicit retry for the latest user-selected values only. Reconnect never silently uploads browser defaults. | T13 |
| D6 · Offline disclosure | Preserve a non-private, tab-scoped “remote logout not confirmed” notice through reload, show it on login, and clear it only on confirmed remote logout or a defined new-session transition. Do not store account identity or tokens in the notice. | T15 |
| D7 · Mobile hierarchy | Keep navigation and Add job visible. Consolidate the isolated account row; keep theme and language shortcuts in the header as previously requested. Prefer status jump links on the stacked mobile board over replacing the board with a new display mode. | T18 |
| D8 · Search context | Make collection search route-scoped and shareable through `?q=`, with active-board visible statuses in `?statuses=saved,applied`. Keep Redux as the UI projection and avoid two competing authorities. Browser Back/Forward restores those values. Approve this behavior change before implementation; otherwise retain global search with explicit context/reset copy. | T18 |

## Execution gate status

- **T05 reload-resilient cleanup recovery:** partially implemented without new persistence. Its remaining reload-discovery behavior requires an explicit decision before adding durable cleanup metadata.
- **T08:** blocked pending D4. Its destructive-operation wording, scope presentation, and placement are inseparable from the approved bulk-deletion policy.
- **T13:** blocked pending D5. A local-only preference state and retry behavior would change account-persistence semantics.
- **T15:** blocked pending D6. Persisting the remote-logout limitation across reloads requires the approved non-private notice lifetime.
- **T18:** blocked pending D7 and D8. Mobile navigation hierarchy and route-scoped search/status URL state are product behavior changes.
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
- [ ] After confirming service prerequisites and permission to refresh disposable fixtures, run `bun run test:e2e:offline` then `bun run test:e2e`. Classify existing failures, including the known offline-logout disclosure and isolated logout onboarding dependency. Do not change assertions merely to obtain green output.
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

  This is runtime recovery metadata, not authentication or permission to read data. If cleanup must survive a reload, inspect the existing durable owner metadata before proposing a new storage record; ask before expanding persistence.

- [ ] Fail `clearOfflineAccount` once in the runtime harness. Assert read access is revoked immediately, removal failure remains actionable, and Retry cleanup does not enable access.
- [ ] Observe the current disappearing-action failure. Track removal pending/failure separately, retaining its exact owner even after download state becomes absent. A failure must never display successful removal.
- [ ] Expose a narrowly scoped `retryDownloadCleanup(): Promise<void>` through the runtime/provider. Allow it to delete only the recorded former owner's data; block conflicting preparation until the residual-data policy is settled.
- [ ] Verify successful retry, repeated failure, reload recovery discovery, cross-tab removal, sign-out and account switching. Never delete a newly prepared different owner's download with an old retry.
- [ ] Run all offline unit tests and the targeted production removal test. Update device-privacy documentation and UI-05 evidence/status.

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
- [ ] Add browser tests for clean navigation, dirty cancel, explicit discard, failed save, modal/drawer switch, Back/Forward and logout. Logout/security cleanup must never be blocked by a stale editor guard. Preserve per-application remount isolation.

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

- [ ] Add a filtered-board test that verifies confirmation still describes the true whole-board scope and count. The UI count derives from all loaded board records, not the filtered projection; never change the existing deletion endpoint scope.
- [ ] Fail and delay `removeAll` in each board. Observe missing pending/error behavior, then expose it in the active confirmation. Add a synchronous duplicate guard and clear outcome on a new deliberate attempt, not while one is unresolved.
- [ ] Use specific text such as “Delete all active applications” rather than Yes, and explain that current filters do not reduce the scope. The count is contextual, not a server-enforced concurrency guarantee.
- [ ] Move the entry out of the search/filter action cluster into a secondary destructive context. Retain keyboard access and existing confirmation/countdown protection under D4.
- [ ] Test no request on cancel/Escape, one request on confirmed submit, failure retry, empty-board behavior, disabled offline state, and focus return after rows disappear. Never exercise real destructive requests without isolated fixtures.

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

- [ ] Reject an explicit preference PATCH. Assert local state remains changed and feedback distinguishes “Applied on this device” from account persistence. Explicit Retry saves only the latest outstanding user-selected values for the same owner.
- [ ] Preserve abort/ownership handling for logout and rapid account changes. A superseded failure must not replace the status of a newer successful choice. Do not block later clicks behind an entire-preferences hydration gate.
- [ ] Reject a lazy dictionary request during selection. Keep the current locale and direction, announce failure in that locale, and allow an explicit retry.
- [ ] Reject startup loading for a stored non-English locale. Render with bundled English and truthful `lang`/`dir`, while retaining the user's preferred stored language for a later deliberate retry. Do not overwrite it automatically as though the user selected English.
- [ ] Distinguish dictionary-resource failure from local-storage write failure and account-save failure. Keep errors sanitized and scoped to the correct operation; never report a rejected language change as successfully applied.
- [ ] Verify all four dictionaries, initial offline loading, reconnect without automatic uploads, and header/Settings consistency.

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

- [ ] Independently test no record, rejected storage, and valid data arriving after the bounded two-second initial wait. Observe that the latter two currently collapse into absence.
- [ ] Keep the startup bound but pass an explicit restoration outcome to the runtime. Decide whether late completion is consumed or requires retry; recommended: accept it only if its captured generation/owner is still current.
- [ ] Add `retryRestoration(): Promise<void>` to the runtime/provider. It rechecks expiry, durable generation, readiness and current-account constraints; it is not an alias for network authentication Retry.
- [ ] Cancel/supersede restoration when removal, sign-out, replacement or account change occurs. An old result must never re-enable private access.
- [ ] Test storage recovery and retry in Settings with readable fallback content. Do not expose private data merely to prove a download exists.

**Exit:** Slow/unreadable storage has an accurate recovery path, while absent or invalid data never grants access.

## T15 · Put offline-logout limitations on the logout destination

**Covers:** UI-20. **Dependencies:** T05, T10, D6.

**Modify:** `apps/web/src/features/offline/offline-access-runtime.ts`, `.model.ts`, machine state where needed; `components/site-header.model.ts`; `features/auth/login/login-page.model.ts`, `.view.tsx`; four dictionaries. Use one small shared notice helper only if needed across these boundaries.

**Tests:** Offline runtime/controls, login tests, and `tests/e2e/offline.spec.ts`'s existing logout-disclosure workflow.

- [ ] Reproduce local logout → login → reload. Assert private data is unavailable throughout and the truthful remote-session notice remains visible on the destination.
- [ ] Store only the D6 non-private tab-scoped notice. Storage failure cannot block local private-data cleanup; explain a persistence failure without pretending the notice survived reload.
- [ ] Define a deliberate Finish sign out action using the existing logout/CSRF route. Verify its response before clearing the remote-limit notice; merely observing `navigator.onLine` is insufficient.
- [ ] Clear/replace notices on the approved confirmed logout/new-session transitions and test another account signing in. Do not carry a misleading previous-session notice forever.
- [ ] Update the known backlog item and offline browser assertion to the approved destination/lifetime. Do not remove the disclosure expectation to make the suite pass.

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
- [ ] Under D8, implement this URL policy: `q` is the route-local search text, encoded with `URLSearchParams`; omit it when empty. On the active board, absent `statuses` means all six, `statuses=` means none, and a comma-separated value selects unique recognized statuses in canonical order. Ignore unknown entries when recognized values remain; an entirely unrecognized nonempty value falls back to all six. Preserve unrelated parameters and the hash. Typing replaces the current entry rather than pushing per keystroke; deliberate status changes push an entry. Archive/blacklist do not apply the active board's status projection. One route adapter projects URL state into Redux and avoids feedback loops.
- [ ] Test searching on one board then visiting another, clearing search/status filters, Back/Forward, reload and copied URLs. If D8 is not approved, keep this subtask blocked; do not invent a different persistence policy during implementation.
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
