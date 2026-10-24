# UI interaction and hierarchy audit and remediation plan

**Date:** 2026-10-21

**Status:** D4/UI-11, delegated T05/UI-05 and approved D5/T13 are implemented with regression evidence and independent review. Fresh verification passed all 762 frontend unit tests, 19 production offline browser cases and 41 ordinary browser cases. Historical unit timing failures remain an investigation item. See checkpoints 12–14 for earlier limits and the approved service/fixture refresh. Other recorded policy/manual gates remain open; T14 is next. T09 and V-01–V-05 remain manual or physical-environment validation work, not confirmed defects. The [implementation plan](2026-10-21-ui-fixes-implementation-plan.md) records the exact gates, checks, and commits.

**Goal:** Make Xenia Way predictable, useful, accessible, and forgiving, using Apple's interaction principles without copying native Apple UI.

**Architecture:** Retain the React/Vite SPA, shared contracts, TanStack Query server state, Redux presentation state, existing theme tokens, Tailwind Variants, and view/model/styles separation. Repair shared interaction behavior before adjusting individual screens. Preserve Atlaskit InlineEdit and existing lazy-loading boundaries.

This is an issue register and staged remediation plan, not a claim of HIG/WCAG certification or a ready-to-apply patch. Each task requires its own focused reproduction and verification before implementation. A request to audit does not authorize fixing the issues.

Use the [fix implementation plan](2026-10-21-ui-fixes-implementation-plan.md) for concrete tasks, dependencies, approval gates, and execution tracking. This audit remains the evidence register.

## Review basis

- [Apple design principles](https://developer.apple.com/design/human-interface-guidelines/design-principles/): prioritize the task, preserve agency, provide feedback, and establish hierarchy.
- [Apple alerts](https://developer.apple.com/design/human-interface-guidelines/alerts): reserve interruptions for meaningful decisions and make consequences clear.
- [Apple accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility): support different inputs and communicate through more than one channel.
- [Web Interface Guidelines](https://github.com/vercel-labs/web-interface-guidelines/blob/main/command.md): secondary web-specific review checklist, not an instruction to override repository conventions.
- [Repository rules](../../../AGENTS.md), [architecture](../../architecture.md), [API](../../api.md), [operations](../../operations.md), [testing](../../testing.md), and [backlog](../../backlog.md).

Recommendations below are this audit's application of those principles. They are not quotations or Apple requirements for a web application. Keep browser conventions and semantic HTML. Do not introduce Liquid Glass, native-looking Apple controls, SF Symbols, new fonts, or a platform imitation as part of this work.

## Evidence and coverage

The audit combines source review of all route families and shared controls, review of existing behavior tests, and targeted browser inspection. Full source paths are repository-relative. Short paths refer to `apps/web/src` or the feature directory named in that finding: `application-workspace`, `board`, `collection`, `form`, and `filters` are under `apps/web/src/features/applications`; `preferences`, `offline`, `welcome`, and `auth` are under `apps/web/src/features`. Line numbers refer to the audited checkout and will change after edits.

| Surface | Coverage |
| --- | --- |
| Shared shell, navigation, primitives | Source; live desktop and 360 px authenticated header; live confirmation focus/return; theme/RTL foundation review |
| Applications board, search, status filters | Source; live populated desktop/mobile board; keyboard implementation review; no real reorder/status writes |
| Create modal/drawer | Source; live dirty Escape/reopen and intercepted failed POST; no application created |
| Archive and blacklist | Source and live populated pages; confirmations reviewed without performing deletion/restoration |
| Application workspace | Source and live populated workspace; detailed controller, InlineEdit, lifecycle, contact, follow-up, activity and test review |
| Authentication, recovery, welcome | Source and existing tests; real login; welcome nested-layer behavior source-reviewed, not fully exercised |
| Settings, preferences, export | Source and live Settings; export contract/test review; no export download or preference-write experiment |
| Offline states | State machine/runtime, copy, controls and existing tests reviewed; production storage failures, expiry and reconnect NOT reproduced in this audit |
| About, fallback, footer | Source and live About, including Hebrew/dark/360 px; public-page keyboard/reload smoke tests |
| Locales | Four dictionaries reviewed for structure/content; live English and Hebrew; Russian/Ukrainian geometry not visually certified |

**Browser setup repaired first:** Playwright 1.63.0 lacked browser revision 1243. Installed its normal Chromium, headless shell, and FFmpeg. Default Chromium 153.0.8010.12 then launched and loaded the real login page. Two existing public About/Hebrew reload tests passed through the normal runner. No browser-channel override, dependency update, test relaxation, or repository configuration change was needed. The runner refreshes disposable seed fixtures through its existing global setup.

**Directly reproduced observations:** confirmation Tab leaves the alertdialog; Escape returns focus to `BODY` rather than the opener; a typed create draft is empty after Escape/reopen; an intercepted create HTTP 500 produces an error outside the open dialog; the 360 px authenticated header creates a mostly empty Logout row. The mobile board inspected did not show document-wide horizontal overflow. Intended desktop board scrolling is not itself a defect.

**Limits:** No VoiceOver/NVDA session, physical iOS/Android keyboard, Safari/Firefox session, 200–400% zoom audit, real storage-failure injection, contrast certification, or large-dataset performance measurement was completed. Do not turn the validation candidates below into confirmed bugs without reproducing them. Screenshots were inspected manually as temporary local diagnostics, not committed or added as visual tests. No application records were created, edited, deleted, archived, or restored by the audit script; its create failure used an intercepted response.

## Priority and evidence labels

- **P1:** Protect unsaved work or restore trustworthy privacy cleanup. Address before decorative changes.
- **P2:** Meaningful interaction, accessibility, feedback, or recovery problem.
- **P3:** Orientation, consistency, or discoverability improvement with lower immediate risk.
- **Runtime:** Directly reproduced in this audit.
- **Source:** Implementation evidence supports the finding; detailed runtime consequences still need focused verification.
- **Decision:** Current behavior is deliberate or covered by tests; changing it requires approval, not a silent bug fix.
- **Validation:** Plausible risk only. Not included as a confirmed defect.

## Findings

### UI-01 · P1 · Dismissing the dirty-field warning discards the draft

**Status:** Complete. Escape/backdrop/Keep editing preserve the draft and return to the current input without saving. Explicit discard alone clears the draft and completes a requested field switch; save retains the one-field mutation contract. Failed save and offline dismissal are covered.

**Baseline evidence — Source, before repair:** `apps/web/src/features/applications/application-workspace/overview/application-unsaved-warning.view.tsx`, `overview/use-application-fields.ts`, and `apps/web/src/components/ui/confirmation-modal.model.ts`. The warning's negative action called `cancelWarning`, which reset the draft. Escape and backdrop used that same action. The regression reproduced the missing Location editor after Escape before implementation.

**Impact:** A familiar “dismiss this warning” gesture destroys the work the warning is supposed to protect. The explicit button copy can describe discard; Escape is still an ambiguous destructive choice.

**Plan:** Separate keep-editing/dismiss from explicit discard and save. Dismissal must not implicitly choose discard.

**Acceptance:** Escape/backdrop preserve the exact draft, return focus to its editor, and send no write. Explicit discard alone resets it. Saving still sends a one-field patch.

### UI-02 · P1 · Switching related-record actions can replace an unrelated dirty editor

**Evidence — Source:** `application-workspace/contacts/use-contacts-controller.ts:167–180`, `follow-ups/use-follow-ups-controller.ts:155`, and `apps/web/src/features/applications/activity/application-activity-section.view.tsx:31`. Opening another target reinitializes its draft; requesting deletion closes the current contact/follow-up editor before the decision is confirmed.

**Impact:** Editing A, requesting deletion of B, and answering No can still lose A's draft. Switching activity/contact/follow-up targets has similar risks.

**Status:** Complete. Contact, follow-up, and activity editors retain their draft while a switch warning is open. Escape/backdrop/Keep editing restore the focused draft input, Discard changes opens the requested editor, and Save changes submits before continuing. Deletion confirmation no longer closes an active contact/follow-up editor before confirmation; confirming deletion closes only an editor for the record that was deleted.

**Acceptance:** Canceling deletion preserves the previous target and draft. Selecting another target offers an explicit keep/discard decision. Confirmed switches still isolate records correctly.

### UI-03 · P1 · Pending saves can close over newer edits

**Status:** Complete. Submitted editors lock synchronously until their request settles, prevent duplicate saves, retain a failed draft for retry, and keep unrelated editors available. Query-backed focused tests cover late responses, independent fields, and completed follow-up ordering.

**Evidence — Source; delayed-response reproduction required:** `application-workspace/shared/workspace-text-field.view.tsx:52`, `workspace-text-field.model.ts:67`, `preparation/use-preparation-field.ts:54`, and `contacts/use-contacts-controller.ts:130–150`. Editors remain writable while asynchronous saves run, and success closes editing without checking draft revision. Audit the analogous follow-up flow together.

**Impact:** Save A, type B while waiting, receive success for A: B can disappear. Repeated confirms also need a handler-level pending guard, not only disabled visuals.

**Plan:** Choose one policy: lock only the submitted editor until resolution, or retain newer revisions and close only the submitted revision. Do not freeze unrelated fields.

**Acceptance:** Delay responses, type again, and repeat confirm. No newer draft is lost; one intended submission produces one request; failure preserves the draft. Verify via real query-backed content, not only fixed props.

### UI-04 · P1 · Leaving or changing an editor silently abandons work

**Status:** Complete. Create and workspace editors register with the supported React Router departure coordinator; dirty links, previous/next, browser Back/Forward, and close actions require Keep editing, Save changes, or Discard changes. Focused browser coverage verifies drawer/modal preservation, failed and successful save, Back/Forward, and logout bypass for security cleanup.

**Evidence — Runtime + Source + Decision:** Typed create-company text was empty after Escape/reopen. `form/job-manager.view.tsx:7–10` unmounts the form on close and switches component type between modal and drawer. `form/use-job-form.ts:8–11` owns the draft inside that form. Workspace previous/next navigates directly in `application-workspace/overview/application-workspace-navigation.model.ts:26`; `page/application-workspace-page.view.tsx:34` keys destination content. `page/application-workspace-page.test.tsx:119` deliberately expects editor reset.

**Impact:** Escape, closing a create form, switching its presentation, following navigation, or using previous/next can discard work without a recovery choice.

**Plan:** Agree a dirty-departure policy for create forms and workspace editors. Protect drafts before navigation/presentation replacement. Preserve immediate clean navigation and destination isolation; do not introduce autosave or durable offline drafts implicitly.

**Acceptance:** Dirty close, presentation switch, header navigation, previous/next, and browser Back have explicit outcomes. Cancel departure preserves values and focus. Confirm departure resets only the departing editor. Define reload/unload behavior separately.

### UI-05 · P1 · A failed device-data removal loses its cleanup retry

**Status:** Complete under the delegated T05 policy decision. Reload-resilient cleanup uses owner/generation recovery metadata, blocked conflicting preparation, scoped retry and no access restoration. All 322 focused offline unit tests passed, including recovery after metadata becomes readable and retaining known targets during metadata failures. Independent review is clear. The subsequent full 19-case production offline suite passed, including failed removal → offline reload → cleanup without a session. See checkpoints 13–14.

**Evidence — Source:** `apps/web/src/features/offline/offline-access-runtime.ts:172–183` removes the account from runtime state before storage deletion succeeds; failure only sets storage error. `offline-controls.view.tsx:68` gates Remove on a download, and `offline-controls.model.ts:127` suppresses the rejection.

**Impact:** Access is revoked, which is good, but private records may remain with no visible way to retry their removal. This is not evidence of a demonstrated cross-account disclosure.

**Plan:** Separate read-access revocation from cleanup completion. Keep an owner-safe cleanup-failed state/action until deletion is confirmed.

**Acceptance:** Fail deletion once. Access stays revoked; the UI accurately says cleanup is incomplete; retry removes the records without restoring read access. Check reload and account changes before approval.

### UI-06 · P2 · Shared confirmations are not complete modal interactions

**Status:** Implemented in the first repair checkpoint; the user accepted the repair and simplification. Broader device/screen-reader review is not recorded. Shared confirmations now contain focus, isolate background controls, handle Escape only at the top confirmation layer, use unique accessible-name IDs, and restore a connected opener or meaningful fallback. Activity supplies its existing Add activity/disabled-section destination explicitly. Confirmation actions and dirty-dismissal policy are unchanged.

**Baseline evidence — Runtime + Source, before repair:** `components/ui/confirmation-modal.view.tsx` declared `aria-modal`; `confirmation-modal.model.ts` only focused No and handled Escape. Tab left the open alertdialog, and dismissing it left focus on `BODY`. Contrast `form/use-job-dialog.ts`, which already contained Tab focus for the create form.

**Impact:** Users can tab into obscured actions, lose orientation, or lose the original trigger after canceling.

**Plan:** Give the shared confirmation consistent focus containment, background isolation, layer-aware Escape handling, and opener/fallback restoration. Reuse cohesive existing helpers where appropriate; do not create a generic dialog factory.

**Acceptance:** Tab/Shift+Tab wrap even with a disabled confirmation action; background controls are unavailable; cancel/Escape restore a connected meaningful target. Verify nested dirty-field and lifecycle confirmations too.

### UI-07 · P2 · Create failures are outside the open form

**Status:** Complete. Create failures now render and announce inside the open form dialog, retain entered values, and allow deliberate retry without duplicate submission.

**Evidence — Runtime + Source:** `form/job-manager-host.view.tsx:23–24` renders the mutation error as a sibling of the manager. An intercepted HTTP 500 left the drawer open with no error inside its dialog; the message was behind/outside the interaction layer.

**Impact:** Save appears ineffective and the actionable explanation is not in the place the user can inspect.

**Plan:** Pass mutation feedback into the active form; show a translated, associated alert near its submit action. Keep values, prevent duplicate requests, and handle rejected promises deliberately.

**Acceptance:** Delayed failure keeps the draft and provides an in-dialog announcement plus retry. A successful retry creates only one application and closes normally. No raw server internals appear.

### UI-08 · P2 · Immediate status saves do not expose failure

**Status:** Complete. Status controls expose their active pending/error outcome and retain a truthful saved value until server confirmation.

**Evidence — Source:** `application-workspace/overview/use-application-field.ts:93`, `use-application-fields.ts:116`, and `application-status-control.view.tsx:9`. The save hook records an error, but the status control does not render it or announce pending state.

**Plan:** Expose the existing save state beside the status control, without adding an extra Save step.

**Acceptance:** Reject selection: saved status remains truthful, translated feedback is visible/announced, retry is possible, and focus remains predictable. Success returns focus to the trigger.

### UI-09 · P2 · Warning/lifecycle failure feedback sits outside the active confirmation

**Status:** Complete. Active warnings and lifecycle confirmations expose their own pending and translated error feedback while retaining the underlying draft or record.

**Evidence — Source:** `overview/use-application-fields.ts:88`, `application-compact-field.view.tsx:82`, and `lifecycle/application-lifecycle-actions.view.tsx:41`. Failed warning-save leaves the warning open while field feedback is underneath; lifecycle errors are also outside the modal subtree.

**Plan:** Give the active confirmation its own pending/error feedback, linked to its action. A visual z-index alone does not resolve modal accessibility.

**Acceptance:** Reject warning-save, archive, blacklist, restore, and delete requests. Each open confirmation explains failure and permits safe retry/cancel. Drafts and underlying records remain intact.

### UI-10 · P2 · Board mutations lack contextual pending/error feedback

**Status:** Complete. Board mutation outcomes are contextual and announced; board read failures retain valid cached content where possible and offer an explicit retry.

**Evidence — Source:** `pages/home-page.model.ts:25–30` awaits status/reorder mutations, but `home-page.view.tsx:31–37` renders only list-query loading/error state. `board/use-job-board.ts` calls reorder/status callbacks without an announcement or failure channel. Read-query errors also lack an alert role or explicit retry on Home.

**Plan:** Expose the outcome of board changes near the affected board/card and announce it accessibly. Offer recovery without requiring a page reload. Preserve owner-bound request handling.

**Acceptance:** Fail a reorder and a status move. Show the saved state and a useful error; allow retry and continued navigation. Successful keyboard movement has an understandable result, without repeating verbose announcements per card.

### UI-11 · P2 · Bulk deletion has weak hierarchy and incomplete safety feedback

**Status:** D4 approved and implemented. Board actions now appear after results in a native disclosure with board-specific labels, unfiltered loaded count, explicit filter/scope consequences, guarded pending/error/retry behavior and stable completion focus. Existing confirmation stages are preserved for each board. Focused component/browser checks and independent review passed; checkpoint 12 records the broader verification limitations and pending mobile/physical review.

**Evidence — Runtime + Source + Decision:** `pages/home-page.view.tsx:19–29` places Remove all between Search and Filter statuses; `collection/application-collection.view.tsx:27–31` repeats it. `home-page.model.ts:17–23,48–50` adds two confirmations and a five-second wait, but does not gate the final action on deletion pending state or expose deletion errors. Archive/blacklist models likewise omit `removeAll` errors and pending state from `busy`. `i18n/locales/en.ts:67–69` uses generic Yes/No and inconsistent board-wide/every-application wording.

**Impact:** A rare destructive action competes with routine controls; active search does not narrow its real board-wide scope. Countdown friction does not prevent repeat submits or explain failures.

**Plan:** Keep the existing bulk operation, but move it into a clearly secondary destructive context. Name the board and affected scope/count, including the fact that filters do not limit it. Replace generic Yes with a specific deletion label. Agree whether two prompts/countdown are necessary after this is clear; do not simply remove safeguards.

**Acceptance:** Filtered and unfiltered cases state the same true deletion scope. No requests occur before confirmation. Pending blocks duplicate submissions; failure remains inside the dialog; cancel is safe; success reports its result. Never change the API's board scope silently.

### UI-12 · P2 · Validation identifies the form, not the correction

**Status:** Complete in automated coverage. Registration and create-form schema issues are mapped to associated translated field errors, invalid controls are announced/focused, and entered values are retained. Native password-manager and paste checks remain manual validation work.

**Evidence — Source:** `features/auth/register/register-page.model.ts:38` and `register-fields.view.tsx:58` do not explain the shared 8–128 character password limit. `form/use-job-form.ts:24–29` replaces schema issues with one “Check the application details” message. Shared rules live in `packages/shared/src/index.ts:163` and the application schemas.

**Plan:** Explain existing constraints before they matter and map schema issues to specific controls. Preserve native required/email/URL validation and never duplicate or relax the shared rules.

**Acceptance:** Matching seven-character passwords, over-limit names/passwords, and invalid application values identify the field and correction. Use associated errors/invalid state, preserve values, and make repeated invalid submissions discoverable.

### UI-13 · P2 · Authentication loses a requested protected destination

**Status:** Complete. Approved internal return targets preserve path, search, and hash through login/registration; external and malformed values fall back safely.

**Evidence — Source:** `route-guards.view.tsx:13` redirects to plain `/login`; `features/auth/login/login-page.model.ts:24` supports a redirect parameter but receives none from that guard.

**Plan:** Preserve a validated internal return destination through login and registration. Do not accept arbitrary external return URLs or bypass ownership checks.

**Acceptance:** Opening an owned workspace while signed out returns there after sign-in; archive/blacklist behave likewise. Ordinary login defaults to the board, unauthorized destinations remain protected, and login/register switching retains intent.

### UI-14 · P2 · Invalid reset links have no direct replacement-link action

**Status:** Complete. Invalid, expired, or used reset tokens provide the existing request-a-new-password path, while temporary failures preserve retry.

**Evidence — Source:** `features/auth/password-reset/password-reset-page.model.ts:44` switches to its unavailable state only for an absent token, not `PASSWORD_RESET_INVALID`; replacement-link navigation exists only in `password-reset-state.view.tsx:17`.

**Plan:** Offer the existing `/forgot-password` recovery route when a nonempty token is rejected. Keep temporary network/server errors retryable without falsely declaring expiration.

**Acceptance:** Used/expired/invalid links expose a keyboard-accessible replacement action. Transient failures retain the form and retry. Preserve the generic recovery-request response contract.

### UI-15 · P2 · Password-reset completion lacks explicit accessible orientation

**Status:** Complete. Successful reset announces its result, receives deliberate focus, and provides a clear sign-in exit without exposing tokens.

**Evidence — Source:** `password-reset-page.model.ts:40`, `password-reset-page.view.tsx:22`, and `password-reset-state.view.tsx:10` replace the form on success without a status region or deliberate focus transfer. Recovery-request success does have a status region.

**Plan:** Announce completion once and orient focus to a result heading/container with the sign-in action next.

**Acceptance:** A successful confirmation exposes the result without leaving focus on a removed form control. Keyboard and screen-reader users can continue to sign-in. Verify actual assistive-technology behavior manually.

### UI-16 · P3 · Route changes provide inconsistent page orientation

**Status:** Complete. Auth routes have localized document titles and page h1s, with one route-orientation owner that does not steal focus from active workspace or dialog interactions.

**Evidence — Source:** `components/layout.view.tsx:18–21` keeps a stable main but does not orient focus on general route changes. `apps/web/index.html:29` sets a generic document title with no route-specific updater found. `components/auth-card.view.tsx:12` uses CardTitle, whose `components/ui/card.view.tsx:14` is an h2 rather than a page h1. Workspace entry already has a more deliberate focus policy.

**Plan:** Define localized document titles and one route-entry focus policy, accounting for Back/Forward and workspace-specific handling. Give auth pages page-level headings without forcing a visual redesign.

**Acceptance:** Each route has an intelligible page name and keyboard entry point. Navigation, language changes and ordinary field edits do not cause unrelated focus jumps. Avoid duplicate announcements.

### UI-17 · P2 · Language-menu semantics and nested Escape behavior disagree

**Status:** Complete. The language menu follows its declared keyboard pattern, tracks the current item, and lets the innermost interaction layer consume Escape before welcome onboarding reacts.

**Evidence — Source:** `features/preferences/language-selector.view.tsx:9–19` advertises menu/menuitem semantics; `language-selector.model.ts:37–52` provides only click/outside-click behavior. `features/welcome/welcome-modal.model.ts:24` completes onboarding for Escape; the nested menu does not consume it.

**Impact:** Tab/Enter still work, but the declared menu lacks arrow navigation, focus entry/return, and Escape dismissal. Escape intended for language choice can instead complete onboarding.

**Plan:** Adopt a complete accessible selection pattern or implement the declared menu fully. The innermost open layer must handle Escape first. Do not persist completion merely because a nested layer closes.

**Acceptance:** Test keyboard open, movement, selection, current-language indication, Escape, and return focus in English/Hebrew. Within welcome, first Escape closes only the language layer; a subsequent Escape follows the approved onboarding-close policy.

### UI-18 · P2 · Preference changes conceal account-save failures

**Status:** Complete under approved D5. Immediate local changes have distinct account-save feedback and explicit owner-scoped retry; hydration/reconnect never uploads browser values. Persistence, supersession, account-transition, announcement and dismissal regressions pass, independent review is clear, and the full unit/browser baseline passed. See checkpoint 14.

**Evidence — Source:** `preferences/theme-selector.model.ts:27`, `language-selector.model.ts:22`, and `lib/queries.ts:176` apply local choices and discard persistence feedback.

**Plan:** Preserve immediate local application. Distinguish a locally applied preference from a failed account save and offer explicit retry. Never upload browser defaults or offline changes automatically.

**Acceptance:** Reject account persistence: the chosen theme/language remains usable, a concise accessible notice explains its scope, and explicit retry works. Offline choices remain local until an explicit action requests saving.

### UI-19 · P2 · Dictionary-load failures can be silent or prevent startup

**Status:** Complete under approved D5 and the subsequent JSON-packaging decision. Startup falls back truthfully to English while retaining the stored preference; failed selection preserves the current locale/direction. Real Chromium network-failure/retry regressions pass for development and production, and prepared assets reload offline in all four locales. Callback-turn activation keeps document attributes synchronized. The full unit/browser baseline passed; see checkpoint 14 for verification boundaries.

**Evidence — Source; network-failure reproduction required:** `language-selector.model.ts:22` catches load failure without user feedback; `settings-preferences.model.ts:17` ignores its false result. `i18n/i18n.ts:57` awaits a lazy dictionary before `main.model.ts:24` can render.

**Plan:** Explain failed selection in the current language and offer retry. On startup, recover to bundled English if the preferred dictionary cannot load, with truthful language/direction.

**Acceptance:** Reject a dictionary fetch. A selection preserves the current locale and announces failure. A cold startup still renders a usable application. Retry succeeds without a hydration gate or duplicated dictionaries.

### UI-20 · P2 · Offline logout hides the remote-session limitation

**Status:** Resolved under approved D6/T15. Login retains a non-private tab-scoped notice through reload and offers explicit Finish sign out. Confirmed logout or explicit local/cross-tab sign-in supersedes the previous notice and pending Finish operation. Storage failures cannot prevent private cleanup. Controlled race regressions and the production offline destination/reload workflow pass.

**Evidence — Source, already tracked:** `components/site-header.model.ts:35–38` navigates to login. `offline/offline-controls.view.tsx:48` contains the disclosure only in Settings; the Settings link disappears after logout. `offline-access-machine.ts:69` resets the flag on reload.

**Resolution:** The previous backlog entry is retired. Current [Operations](../../operations.md#offline-browsing-and-deployment) documents the login notice, tab lifetime, storage limitations and explicit recovery action. No identity or tokens are persisted in the notice.

**Acceptance:** Private local data is cleared, login explains that remote revocation could not be confirmed, and reconnect offers an approved way to finish logout. Never imply server revocation succeeded offline.

### UI-21 · P2 · Offline preparation errors recommend the wrong kind of repair

**Status:** Blocked pending T05, T14, and T15 because remediation depends on the approved cleanup/restoration/logout state model.

**Evidence — Source, already tracked:** `offline/prepare-offline.ts:150` covers resources, API, and persistence; `offline-access-runtime.ts:239` discards failure detail; `i18n/locales/en.ts:40` always recommends storage permissions/space.

**Plan:** Extend [offline preparation diagnostics](../../backlog.md#make-offline-preparation-failures-diagnosable-without-exposing-private-data) with a user-facing, sanitized stage category and matching recovery action. Keep deliberately superseded operations separate.

**Acceptance:** Session/network, resource, and storage failures each explain a relevant next step. No partial download is ready, and no private payload, token, or raw internal error is exposed.

### UI-22 · P2 · “Data last downloaded” overstates its timestamp

**Status:** Blocked with UI-21 pending the offline state-model work; no unsupported download-wide timestamp has been introduced.

**Evidence — Source:** `offline-controls.model.ts:19–21,41–43,77` uses the active-board query's `dataUpdatedAt` on Settings. This is not a complete all-workspaces persistence timestamp; persistence can fail later in `offline-access-runtime.ts:246`. Operations documentation already describes the limited measurement.

**Plan:** Name what is actually measured, or introduce an explicitly defined successful-download timestamp after separate design approval. Do not infer complete freshness from one query.

**Acceptance:** Fetching only the active list does not claim that all workspaces were downloaded. A persistence failure cannot appear as a freshly saved complete device copy.

### UI-23 · P2 · Retry does not explain checking or another failure

**Status:** Blocked with UI-21 pending the offline state-model work.

**Evidence — Source:** `offline-access-runtime.ts:148–168` distinguishes verification states; `offline-controls.model.ts:50–61` exposes one unchanged Retry label; `offline-controls.view.tsx:25` does not show a verification-specific pending/result state.

**Plan:** Expose checking and outcome feedback without moving the user or replacing cached access. Keep detailed offline controls in Settings.

**Acceptance:** A delayed retry visibly and accessibly starts; another failure is announced with a useful next step; successful verification communicates restored capability. No duplicate-check race is asserted by this finding.

### UI-24 · P2 · Startup cannot distinguish absent downloads from failed restoration

**Status:** Implemented in T14. Runtime and component regressions, plus the production offline storage-recovery browser case, pass.

**Evidence:** Controlled reads reproduced missing error/timeout states before implementation. Runtime download state now distinguishes absent, restoring, failed restoration and timed-out restoration. Settings offers a separate storage retry; a production offline reload with a denied first IndexedDB read recovers through that action. A late timed-out result is ignored. Fresh reads check readiness, expiry and durable generation; runtime guards reject results after sign-out, removal, preparation, replacement or owner change.

**Plan:** Keep bounded startup, but distinguish absence from a failed/timed-out restore and offer a safe restore retry.

**Acceptance:** Delay or reject restoration. The interface explains the correct state; a retry can recover valid same-owner data. Never restore expired, logged-out, or other-owner records; do not hold the whole application behind an indefinite gate.

### UI-25 · P2 · Export omits a known association limitation from its description

**Status:** Complete. Settings now states that related CSV rows cannot reliably be matched to application rows with the current package; the joinable-export backlog item remains open.

**Evidence — Source, already tracked:** `i18n/locales/en.ts:5` describes related-record files but not their join limitation. `apps/api/src/routes/applications/export-csv.ts:10,65,80` exports Application ID for related rows without a corresponding application identifier.

**Plan:** Link or explain the current limitation beside export. Use the existing [related-record association backlog entry](../../backlog.md#make-exported-related-records-joinable) for a future contract decision. Do not silently add identifiers or expand fields.

**Acceptance:** People can understand exclusions and association limits before downloading. A separately approved association-key change must handle duplicate company/role names and preserve ownership and spreadsheet safety.

### UI-26 · P2 · The mobile header gives low-priority controls too much space

**Status:** Blocked pending D7’s approved mobile hierarchy.

**Evidence — Runtime + Source + Decision:** At 360 px, the signed-in header occupied about 280 px, with Logout alone on a mostly empty row before Add job/Settings/theme/language. `components/site-header.styles.ts:8–16` and `site-header.view.tsx:26–43` explain the account/action grouping. The email is hidden while its separate group remains.

**Impact:** A large portion of the first viewport is spent on secondary chrome; the board starts far below the title and filters.

**Plan:** Rebalance the narrow-width grouping to keep primary navigation and Add job easy to find, with account/preferences secondary. Consider an accessible disclosure only if it improves task access; do not hide everything behind an unlabeled icon or reduce touch/focus support.

**Acceptance:** Manually compare 320/360/390 px, landscape, long translated navigation, and Hebrew. No isolated empty account row; key actions remain discoverable, keyboard reachable, and readable at enlarged text. No automated geometry assertions.

### UI-27 · P2 · Mobile board structure makes later statuses expensive to reach

**Status:** Blocked pending D7’s approved status-navigation design.

**Evidence — Runtime + Source + Decision:** `board/job-board.styles.ts:6` stacks whole columns below the desktop breakpoint. In the populated mobile view, several Saved cards precede Applied; every additional card increases the distance to later statuses. Existing status filtering is available but not a visible jump mechanism.

**Plan:** Agree a lightweight mobile way to reach a status without traversing every preceding card: e.g. status jump links or an explicit column selector using the existing status model. Evaluate against the current stacked view before replacing it. Keep desktop horizontal browsing and semantic card links.

**Acceptance:** On a board with many Saved records, reaching Interview or Offer does not require scanning all earlier records. Keyboard, touch, empty columns and RTL work; the six-status workflow stays unchanged. This is a design improvement, not a claim that vertical stacking is universally wrong.

### UI-28 · P2 · Keyboard status movement can disagree with the displayed order

**Status:** Complete. Displayed columns and keyboard adjacency now derive from the same canonical visible-status sequence, including RTL direction behavior.

**Evidence — Source:** `store.ts:42–45` appends a re-enabled status to `visibleStatuses`; `board/job-board.model.ts:22–24` displays columns in canonical order; `board/use-job-board.ts:39–45` chooses neighboring statuses from the array's toggle order. `job-card.model.ts:49–55` maps physical left/right without document direction.

**Plan:** Derive visual and keyboard adjacency from one canonical visible-status sequence. Define leading/trailing movement in RTL and update the keyboard instructions to match. Preserve all-application workspace navigation as a separate, intentional strategy.

**Acceptance:** Disable then re-enable Saved and verify adjacent movement follows the displayed columns. Test multiple hidden columns, boundaries, and Hebrew. Ordinary links/modifier clicks still navigate normally.

### UI-29 · P2 · Card accessible names contain English and advertise unavailable actions

**Status:** Complete. Positional information is localized, shared help is associated once, and read-only cards omit unavailable mutation instructions while preserving native links.

**Evidence — Source:** `board/job-card.model.ts:79` hardcodes “Position … of …” and always appends keyboard mutation instructions; `job-card.view.tsx:32` removes `aria-keyshortcuts` when read-only, but not those spoken instructions.

**Plan:** Translate positional information and include only available actions. Prefer a concise name plus associated shared instructions over repeating long help on every link.

**Acceptance:** English/Russian/Ukrainian/Hebrew labels contain no unintended English fragments; read-only cards do not instruct users to mutate data. Position, status, role, and native link behavior remain discoverable.

### UI-30 · P2 · Status-filter popup semantics do not match its structure

**Status:** Complete. The filter is a named nonmodal checkbox disclosure with predictable focus entry/exit and distinct recovery for zero visible statuses versus no search matches.

**Evidence — Source:** `filters/status-filter.view.tsx:18` advertises a dialog, while `status-filter-options.view.tsx:26` renders a fieldset. `use-status-filter.ts:27–47` handles outside click/Escape but has no focus-entry policy. Zero visible statuses are allowed and lead to the same generic no-match outcome as text search.

**Plan:** Choose consistent nonmodal disclosure/group semantics or a complete dialog pattern; retain native labeled checkboxes. Distinguish hidden-all columns from a no-match search and offer the relevant reset.

**Acceptance:** Opening communicates the actual control group and reaches it predictably; Escape returns to the trigger. Zero selected statuses produces an understandable way to show columns again. No forced modal focus trap for a deliberately nonmodal filter.

### UI-31 · P3 · Board search/filter context is hidden across routes and lost on reload

**Status:** Blocked pending D8’s route-scoped URL-state policy.

**Evidence — Source + Decision:** `components/application-search.model.ts:8–16` uses the single Redux search value on all three collections. `store.ts:18–28` initializes search/status visibility without URL state. Archive/blacklist filter the same search even after navigation.

**Impact:** A newly opened collection can look unexpectedly empty; a copied URL or reload does not reproduce the user's board view.

**Plan:** Agree whether search is global or collection-specific, expose active context clearly, and consider URL state for shareable search/status filters. This is a product decision; URL-sync every transient UI state is not a requirement.

**Acceptance:** Route changes, Back/Forward, clear-search, reload and copied URLs follow a documented policy. If existing in-memory persistence is retained, contextual copy/reset still prevents confusing empty states.

### UI-32 · P2 · Completing a follow-up removes the focused action without a destination

**Status:** Complete. Completion restores focus to a stable connected target after the query-backed update and announces success once.

**Evidence — Source; runtime focus result unverified:** `lib/queries.ts:330` updates the detail cache; `follow-ups/follow-ups-section.view.tsx:84` removes Complete for finished tasks, and `use-follow-ups-controller.ts:166` does not choose a focus target. Sorting also moves completed tasks.

**Plan:** Preserve terminal completion semantics while orienting focus to the completed task or a sensible next action.

**Acceptance:** Complete using the keyboard through a real query-backed render. Focus remains on a connected useful target and success is announced once. Failure leaves the task available; no new reopen feature is implied.

### UI-33 · P3 · Global pointer styling weakens text-entry affordance

**Status:** Blocked pending D7/D8’s mobile and input-affordance review; no speculative CSS change is authorized.

**Evidence — Source:** `apps/web/src/index.css:109–111` applies `cursor: pointer` to inputs and textareas as well as buttons/selects. The effect is an action cursor on ordinary editable text.

**Plan:** Narrow pointer styling to action controls and appropriate compound triggers; keep ordinary text-entry affordances and deliberate disabled states. Review focus and hover as a coherent primitive system, without treating every control as identical.

**Acceptance:** Manually inspect mouse/text selection and keyboard focus in create/auth/workspace fields. Native selection, paste, autocomplete and disabled semantics remain unchanged. Do not add CSS-property tests.

### UI-34 · P2 · Read-only controls have limited in-context explanation

**Status:** Blocked pending the offline state-model tasks T05, T14, and T15.

**Evidence — Source + Decision:** `site-header.view.tsx:46–49`, `home-page.view.tsx:21–25`, and workspace/form controls disable mutation based on `canMutate`. Detailed recovery state is intentionally confined to Settings, while the header exposes only a small disconnected notice.

**Impact:** A user encountering a disabled Save/Add action away from Settings may not understand whether the reason is connectivity, session verification, or permission.

**Plan:** Make the current capability reason understandable near the task, potentially with a concise noninteractive explanation and link to Settings. Keep detailed offline controls on Settings; do not introduce blocking dialogs or global retry toolbars without approval.

**Acceptance:** Check offline, API unavailable, verification pending and expired-session states. Disabled controls have a discoverable explanation; readable content stays usable; the recovery path reflects the true state. Native disabled controls need not become focusable solely to show a tooltip.

## Validation candidates, not confirmed findings

| ID | Risk and evidence | Required validation before a change |
| --- | --- | --- |
| V-01 | Long tokens/mixed-direction text may crowd activity/contact actions. `activity/application-activity-event.styles.ts:6`, `workspace/shared/workspace-text-field.styles.ts:6`, `contacts/contacts-section.styles.ts:19`. | Manually inspect 320/390 px, Hebrew, pasted URLs/unbroken strings, realistic maximum content and enlarged text. Preserve user text; do not truncate actionable information blindly. |
| V-02 | Welcome may clip at short heights/large text. `welcome/welcome-modal.styles.ts:5`, `welcome-modal-content.styles.ts:5` lack explicit scrolling/height bounds. | Inspect landscape and 200–400% zoom in four locales; all decisions and exits must remain reachable. |
| V-03 | Small text inputs may trigger iOS zoom; virtual keyboard may obscure submit controls. `components/ui/input.styles.ts:5`, `form/job-modal.styles.ts:10`, `job-drawer.styles.ts:10`. | Use physical Safari/iOS and Android, keyboard open, large text, landscape and installed mode. Do not disable user zoom to conceal a problem. |
| V-04 | Focus visibility, contrast, error/status color and target accuracy across all states are not certified by screenshots or source. | Review light/dark, Windows classic scrollbars, touch, forced colors, reduced motion, VoiceOver/NVDA and Hebrew. Preserve text/status labels; do not rely on color alone. The existing scrollbar-gutter/Radix accommodation already exists in `index.css:31`; do not reopen it as an unfixed finding without reproduction. |
| V-05 | Rendering/search/drag performance may degrade for large boards; no current timing measurements support a defect claim. | Measure real route downloads, typing and drag/edit responsiveness on representative low-end devices and larger datasets. Use the existing bundle-cost backlog entry; do not force chunk splits or add virtualization without evidence. |

## Strengths to preserve

- Real card links retain modifier-click/open-in-new-tab behavior; drag-and-drop has keyboard alternatives.
- Six canonical statuses remain distinct from archive/blacklist. User-entered text is not translated.
- Existing focus-visible treatment, skip link, labeled controls, reduced-motion handling, and workspace heading focus are valuable foundations.
- Atlaskit field editing, one-field patches, server ownership checks, CSRF, and shared validation are deliberate boundaries.
- Settings uses Radix Select with direction support; local preference application is immediate. Keep it usable without waiting for server hydration.
- Offline downloads require explicit consent and disclose browser-profile privacy limits. Read-only access and no automatic write synchronization are intentional.
- Export has a pending guard, accessible failure feedback, and spreadsheet-injection protection; do not regress these while improving its explanation.
- The revised About page is product-first, uses semantic sections, and keeps its technical disclosure secondary. No evidence supports another About redesign just to look more like Apple.
- Rounded corners, typography, status decoration, a cycling theme shortcut, Settings section order, and desktop board scrolling are not defects merely because they differ from native Apple controls.

## Staged implementation plan

Work one independently verifiable task at a time. Reproduce before changing code. Ask the user about new blockers or scope changes; do not substitute tools, weaken checks, or silently implement an unrelated fix. Decisions below require review, not default consent from this plan.

| Stage | Findings | Deliverable and gate |
| --- | --- | --- |
| 1. Interaction safety | UI-01–06 | Approve dismissal/dirty/pending policies. Add focused behavioral regressions, repair shared modal behavior, preserve drafts and cleanup retry. No visual redesign yet. |
| 2. Truthful action feedback | UI-07–12, UI-32 | Bring failures into the active task, expose status/reorder outcomes, correct bulk safety/labels and validation. Verify real asynchronous/query-backed transitions. |
| 3. Navigation and keyboard consistency | UI-13–17, UI-28–31 | Preserve authentication destination, repair recovery, route orientation and language layers, unify visual/keyboard order. Approve URL/global-search policy separately. |
| 4. Offline and account confidence | UI-18–25, UI-34 | Define local/account save feedback, dictionary recovery, offline restoration/removal/disclosure/freshness semantics, and precise export copy. Reuse existing backlog tasks. |
| 5. Responsive hierarchy and primitive polish | UI-26–27, UI-33, V-01–05 | Compare narrow layouts and task access; implement only validated changes. Retain current identity and shared recipes; no native Apple imitation. |

### Task cycle and tests

1. Choose a finding and confirm its current source/runtime behavior. Revise the plan if the source has changed.
2. Obtain approval for any policy or contract decision. Keep new product functionality out of a bug-fix patch.
3. Add the smallest failing regression: behavior, semantics, accessibility, persistence or ownership. Use actual delayed/failing network responses where timing matters.
4. Make the narrow change in the matching model/view/styles files. Retain native elements, stable focus targets and translated copy in all four dictionaries.
5. Run targeted tests, formatting and lint, typecheck, then appropriate broader suites. Each task must report unavailable checks or failures honestly.
6. Inspect presentation manually. Add no class-name, recipe, CSS-value, layout-geometry or visual-snapshot assertions.
7. Update this register and current architecture/testing/operations documentation when behavior changes. Commit only when requested.

**Regression starting points:** `components/layout.test.tsx`, `pages/about-page.test.tsx`, `features/preferences/*test.tsx`, `features/auth/**/**test.tsx`, `features/applications/application-workspace/**/**test.tsx`, `features/applications/activity/*test.tsx`, `features/offline/*test.ts*`, and `tests/e2e/xeniway.spec.ts`, `export.spec.ts`, `offline.spec.ts`. Add a focused `components/ui/confirmation-modal.test.tsx` for shared modal behavior; do not rely solely on feature tests.

For completed implementation stages, use the [repository verification sequence](../../testing.md#commands). Browser suites run sequentially because they share disposable fixtures and Redis database 15. Existing offline-logout and isolated-logout test issues remain documented; do not bypass them or claim full-suite success based on smoke tests. The two passing smoke tests during this audit establish browser readiness and their specific public-page behavior only.

## Completion criteria

- P1 findings have verified resolutions or explicit, documented decisions with remaining risk.
- P2/P3 findings are tracked as completed, deferred with rationale, or disproved by a recorded reproduction.
- No silent loss of drafts, falsely reported persistence/cleanup, or unexplained failed primary action remains in the repaired flows.
- All changed interactions work with keyboard and touch, preserve context, and expose appropriate localized feedback.
- New UI polish earns its place through task clarity and hierarchy, not resemblance to Apple products.
- Source-only risks and device-specific candidates are never reported as verified without the required checks.
