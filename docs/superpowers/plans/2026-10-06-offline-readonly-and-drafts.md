# Offline Read-Only Access and Local Drafts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let an opted-in candidate reopen downloaded application data without a connection, retain local create/preparation drafts across reloads, and explicitly submit those drafts after verifying the same account online.

**Architecture:** A service worker caches only the public application shell and build assets after explicit preparation. An account-partitioned IndexedDB store holds allowlisted application query snapshots and local drafts; TanStack Query continues to own server data and Redux continues to own presentation state. Offline access is a separate, unverified local-device state, never a successful `/api/auth/me` response or a mutation queue.

**Tech Stack:** Existing React/Vite/TypeScript, TanStack Query v5, Redux Toolkit, shared Zod schemas, i18next, Atlaskit InlineEdit, Vitest, and Playwright. Proposed additions: `vite-plugin-pwa` with custom `injectManifest` worker, the required Workbox modules, and `idb` for IndexedDB transactions; `fake-indexeddb` is test-only. Verify compatibility with the repository's installed Vite/TypeScript before selecting and locking dependency versions.

**Status:** Phase 1 read-only offline access is implemented following the user's approval to proceed, with subsequent native PWA metadata and explicit full-workspace preload/refresh support. Phase 2 (durable create/preparation drafts) remains pending and is not implemented. The seven-day retention, explicit opt-in, downloaded-only reads (all workspaces are included during preparation), and one-offline-account policies apply to Phase 1. This plan does not authorize commits or later draft/synchronization work by itself. Current implemented guidance lives in `docs/architecture.md`, `docs/operations.md`, and `docs/testing.md`; the remaining tasks below retain the future draft design.

## Global Constraints

- Preserve the six statuses `saved`, `applied`, `interview`, `offer`, `rejected`, and `withdrawn`; archive and blacklist remain independent states.
- Server-side ownership, session cookies, CSRF, rate limiting, and authentication remain unchanged. No API endpoint, shared request contract, or database migration is required by this scope.
- Preserve existing online workflows, one-field workspace updates, the dirty compact-field warning, immediate online status selection, and Atlaskit InlineEdit confirm/cancel/focus behavior.
- Supported locales remain `en`, `ru`, `uk`, and `he`, with English fallback and Hebrew RTL. New copy goes into all four dictionaries.
- Keep the existing flat `userPreferences` local-storage contract and immediate preference application. Do not add preference hydration gates or automatically upload browser preferences after reconnect.
- No cached API HTTP responses in Cache Storage; no passwords, session IDs, CSRF values, reset URLs/tokens, or auth-query snapshots in IndexedDB.
- No automatic submission, persisted mutations, Background Sync, offline archive/blacklist/status/reorder/delete actions, offline contacts/follow-ups/activity mutations, or new general-purpose notes page.
- Full-sync idempotency and atomic conflict detection are a separate future project requiring explicit approval.
- All implementation edits use repository conventions and `apply_patch`; run formatting, lint, focused tests, and proportionate full verification before committing.

## Proposed Product and Privacy Decisions

1. **Off by default.** Add an authenticated, accessible “Make available offline on this device” action within the existing layout. Its confirmation explains that anyone with access to this browser profile may read stored private data; IndexedDB is not encryption or a device lock.
2. **One active offline account per browser profile.** Bind every private record to the verified account ID. Switching accounts removes the previous account's local private records before exposing the new account. Notify the user about unsent drafts before a deliberate account switch/logout; do not expose the previous account to the next account.
3. **Seven-day retention.** Set `OFFLINE_RETENTION_MS = 7 * 24 * 60 * 60 * 1000`. Expiry is checked on every restore/access, not just on a timer. Snapshot freshness and draft retention are tracked independently; draft edits must not extend the last server-verification time. Explain the retention window before opt-in. No promise of permanent storage or backups.
4. **Downloaded records only.** Enabling offline mode downloads active/archive/blacklist list snapshots and the public asset bundle, but does not fetch every detail record automatically. Successful workspace reads subsequently persist their complete detail response. Lists and details show their own last-download timestamps. An uncached workspace shows “This application hasn't been downloaded for offline use.”
5. **Drafts only for existing inputs.** Phase 2 retains one create-application draft per account and separate drafts for `companyResearch`, `talkingPoints`, and `interviewerQuestions` per application. This is not a new activity-note feature or an offline version of all workspace editors.
6. **Explicit online submission.** Reconnecting never submits anything. The candidate reviews a local draft, verifies the same account, and explicitly submits through existing validation/API hooks with a current CSRF token. A locally saved draft is never labeled as saved to the server.
7. **Logout and invalid sessions.** Confirm removal of local records when the user signs out or disables offline mode. Clear them even if logout cannot reach the server; disclose that local sign-out cannot revoke the remote cookie/session offline. On a server 401, deny local private browsing and remove snapshots; retain unsent drafts locked for same-account reauthentication within their retention window. A confirmed different account removes those drafts.
8. **Cold/offline identity limitation.** After opt-in, an offline reload may show the selected device's downloaded account data without revalidating its remote session. State this explicitly in the consent and banner. Remote revocation cannot be detected until reconnect. A browser with no eligible offline profile cannot sign in offline.

Approval checklist: opt-in private-device storage; seven-day retention; one offline account; downloaded-only detail coverage; create/preparation-only drafts; explicit submission; local cleanup and locked-draft policy.

## Pre-implementation Code Evidence

- `apps/web/src/main.tsx`: in-memory QueryClient, no persistence/bootstrap for private snapshots.
- `apps/web/vite.config.ts`: no service worker or offline build integration.
- `apps/web/src/lib/api.ts`: application keys omit user ID; preferences keys already include it. The client emits `xeniway:auth-expired` on application 401 responses.
- `apps/web/src/lib/queries.ts`: mutations capture CSRF in component hooks and mostly invalidate queries after success; current-user responses are fresh for one minute and failed queries do not retry on mount.
- `apps/web/src/route-guards.tsx`: guards rely on `useCurrentUser`; no cached-device access state.
- `apps/web/src/features/applications/form/use-job-form.ts`: form values are component state. Closing the modal/drawer unmounts form content even though the lazy host stays mounted after first use.
- `apps/web/src/features/applications/application-workspace/preparation/use-preparation-field.ts`: confirming currently submits immediately through the existing preparation mutation.
- `apps/web/src/app-routes.tsx`, `apps/web/src/i18n/i18n.ts`, and `create-application-loader.tsx`: routes, non-English dictionaries, and the create host load lazily.
- `playwright.config.ts`: normal E2E uses development servers. Offline asset/update checks require a separate production-preview configuration.

## File and Interface Boundaries

Keep reusable offline infrastructure in `apps/web/src/features/offline/`, not in Redux or the API server. Draft adapters remain with the form/preparation features. These are proposed new interfaces, not claims about existing exports:

```ts
type OfflineAccess =
  | { kind: "unavailable" }
  | { kind: "restoring" }
  | { kind: "cached"; userId: number; email: string; verifiedAt: number }
  | { kind: "locked"; reason: "expired" | "unauthorized" | "storage-error" };

type OfflineAccountRecord = {
  version: 1;
  userId: number;
  email: string;
  verifiedAt: number;
  expiresAt: number;
};

type OfflineDraft =
  | {
      kind: "create";
      userId: number;
      revision: string;
      savedAt: number;
      expiresAt: number;
      form: ApplicationFormState;
    }
  | {
      kind: "preparation";
      userId: number;
      applicationId: number;
      field: PreparationField;
      revision: string;
      savedAt: number;
      expiresAt: number;
      baseValue: string | null;
      value: string;
    };

// applicationKeys.all remains ["applications"] for complete cleanup.
applicationKeys.account(userId: number): readonly ["applications", number];
applicationKeys.list(userId: number, list: ApplicationList): readonly ["applications", number, "list", ApplicationList];
applicationKeys.detail(userId: number, id: number): readonly ["applications", number, "detail", number];

// offline-store.ts: account checks and validation precede hydration.
createDraftKey(): "create";
preparationDraftKey(applicationId: number, field: PreparationField): string;
enableOfflineAccount(record: OfflineAccountRecord): Promise<void>;
restoreOfflineAccount(now: number): Promise<OfflineAccountRecord | null>;
saveOfflineSnapshot(userId: number, snapshot: DehydratedState): Promise<void>;
loadOfflineSnapshot(userId: number, now: number): Promise<DehydratedState | null>;
putOfflineDraft(draft: OfflineDraft): Promise<void>;
getOfflineDraft(userId: number, key: string, now: number): Promise<OfflineDraft | null>;
deleteOfflineDraft(userId: number, key: string, expectedRevision: string): Promise<void>;
clearOfflineAccount(userId: number): Promise<void>;

// offline-access.tsx: exposes local access separately from current-user auth.
useOfflineAccess(): OfflineAccess;
useReadAccountId(): number | null;
useCanMutate(): boolean;

// prepare-offline.ts: resolves only after assets and list snapshots persist.
prepareOfflineAccount(userId: number): Promise<void>;
```

`ApplicationFormState` comes from `form/application-form.ts`; `PreparationField` comes from `preparation/use-preparation-field.ts`; `ApplicationList` comes from `lib/api.ts`; `DehydratedState` comes from TanStack Query. `createDraftKey()` returns `"create"`; `preparationDraftKey(id, field)` returns `preparation:${id}:${field}`, always combined with the account ID by the store. Runtime draft schemas allow incomplete create-form input but enforce field types, canonical statuses, sizes, IDs, and retention. Shared submission schemas remain authoritative at submission. Validate snapshot envelopes and every allowed response shape before hydration; browser storage is not trusted input.

## Phase 1 — Read-Only Offline Access (Implemented)

The completed task-by-task implementation instructions have been superseded by the current architecture, operations, testing, and bundle-cost documents. Phase 1 adds account-scoped query keys and allowlisted IndexedDB snapshots, separate cached-device access, explicit consent and public-asset preparation, disabled offline writes, safe worker updates, localized read-only surfaces, and a production offline browser gate. No API/schema changes or durable drafts were added.

Verification on October 6, 2026: formatting/lint, root typecheck, unit tests, public-repository checks, production build, and development seeding passed. All nine production offline browser tests passed. The 22 ordinary online browser workflows excluding the pre-existing CSV-label mismatch passed; the unchanged CSV test expects “Export CSV” while the current UI says “Export package,” as recorded in the backlog. Review-driven regressions cover pending restoration invalidation, cold public CSRF bootstrap, invocation ownership, exact public-asset revisions, cache cleanup, download timestamps, and stable keyboard focus during lazy route loading.

No commit is included in this execution. Phase 2 below remains an approved-design reference for pending work, not a claim of implementation or new authorization.

**Phase 1 acceptance:** An opted-in user can reopen downloaded lists/details without a network; no server writes occur offline or automatically on reconnect; private account isolation/cleanup work; ordinary online startup and click-only loading remain intact.

## Phase 2 — Durable Local Drafts

### Task 5: Create-application draft lifecycle

**Files:** Create `apps/web/src/features/applications/form/use-application-draft.ts` and `use-application-draft.test.tsx`. Modify `use-job-form.ts`, `job-form.tsx`, `job-form-actions.tsx`, `job-manager-host.tsx`, `job-manager.tsx`, `job-modal.tsx`, `job-drawer.tsx`, `create-application-loader.tsx`, and locale dictionaries. Extend `tests/e2e/offline.spec.ts` and layout/form tests.

**Interfaces:** Consumes revisioned `OfflineDraft` store operations. The draft adapter operates on raw `ApplicationFormState`; existing `normalizeApplicationForm` plus `createApplicationInputSchema` validate only explicit server submission. Extend form callbacks to report confirmed submission success rather than deleting drafts when submit begins.

- [ ] Add failing tests for incomplete drafts, reload/close/reopen/presentation-switch restore, write failure, discard confirmation, expiry, offline confirm making zero API calls, account isolation, and editing during pending online submission.
- [ ] Run `bun run --cwd apps/web test src/features/applications/form/use-application-draft.test.tsx src/components/layout.test.tsx`; verify missing durability fails.
- [ ] Persist changes with a short debounce, flush on explicit local save and dialog close, and show “Saving draft…”/“Draft saved on this device” only after the transaction resolves. Never depend on an asynchronous unload handler as the sole durability mechanism. Warn on failed local saves and provide explicit discard. Incomplete fields remain valid drafts; drafts never enter application lists/counts/history.
- [ ] Permit the existing account-keyed lazy host for cached-device draft access, not via a fake authenticated user. Offline confirm saves locally, with localized accessible labels; online submission still requires confirmed identity/current CSRF and existing server validation. Keep modal/drawer focus, live status, and click-only import behavior. No automatic submission after restoration or reconnect.
- [ ] On success delete only the revision actually submitted. Keep any newer revision and preserve drafts on error/ambiguous transport failure. Do not automatically retry a create whose result is unknown; show a warning to inspect the refreshed board before another explicit submission, since server idempotency is outside this scope.
- [ ] Run focused tests, offline browser draft tests, format/lint/typecheck; review and commit with `feat(web): retain local create application drafts`.

### Task 6: Preparation drafts with explicit online confirmation

**Files:** Create `apps/web/src/features/applications/application-workspace/preparation/use-preparation-draft.ts` and `use-preparation-draft.test.tsx`. Modify `use-preparation-field.ts`, `preparation-section.tsx`, `preparation-section.test.tsx`, `apps/web/src/features/applications/application-workspace/shared/workspace-text-field.tsx`, locale dictionaries, and `tests/e2e/offline.spec.ts`.

**Interfaces:** Consumes field-level draft records containing `baseValue`, `value`, and `revision`. Keep `PreparationFieldController.savedValue` as server data; expose local-draft feedback separately. Do not redefine “saved” to mean both local and server persistence.

- [ ] Add failing tests for independent drafts across all three fields, offline confirmation, reload restoration, cancel versus explicit discard, unchanged/changed server base on reconnect, missing/foreign/deleted application, storage failure, and focus return under InlineEdit.
- [ ] Run `bun run --cwd apps/web test src/features/applications/application-workspace/preparation`; verify local-draft behavior fails before implementation.
- [ ] Keep Atlaskit InlineEdit read/edit/confirm/cancel controls. Offline confirmation persists a local draft and announces it without changing the authoritative server read value. On begin-edit, offer/restore the local draft with an explicit label. Cancel closes the current edit without silently deleting a previously confirmed local draft; explicit discard removes it.
- [ ] Before explicit online submission, verify identity and refresh the application detail. If the current field differs from `baseValue`, display current server and local draft values as plain text and require another deliberate overwrite confirmation; if the application is missing or inaccessible, do not submit. Send exactly one preparation field through the existing shared schema/mutation and current CSRF token.
- [ ] Document the limit: comparing the refreshed base catches known divergence but is not atomic concurrency protection. Do not claim guaranteed conflict-free synchronization; a race after review requires a future server-side version contract. Preserve other independent drafts and delete only the successfully submitted revision.
- [ ] Run focused/full web tests, offline E2E, formatting/lint/typecheck; review and commit with `feat(web): retain local preparation drafts`.

### Task 7: Release verification, operational guidance, and handoff

**Files:** Update `README.md`, `docs/architecture.md`, `docs/operations.md`, `docs/testing.md`, and `docs/frontend-bundle-cost.md`. Update `docs/backlog.md` for deferred full sync only if not already tracked. Extend `tests/e2e/offline.spec.ts` with production update/multi-tab/draft regression cases.

- [ ] Add and run failing coverage for a worker/build update with an open unsaved editor, unsent drafts surviving a compatible update, failed asset preparation retaining the previous ready build, and stale-tab cleanup after another tab logs out. Do not force a reload or delete unsent compatible drafts just because public assets changed.
- [ ] Verify the final UX clearly distinguishes downloaded server data, local drafts, unreachable server, expired offline profile, and verified online identity. Keep all four dictionaries structurally aligned and keyboard/focus/RTL/reduced-motion behavior covered.
- [ ] Re-measure ordinary cold routes, first Add job, and explicit offline preparation separately. Report preparation bytes as extra user-requested downloads, not an initial-bundle saving. Confirm Cache Storage contains public assets only and IndexedDB contains only the allowlisted active-account records.
- [ ] Run `bun run format`, `bun run lint`, `bun run check:public`, `bun run typecheck`, `bun run test`, `bun run build`, `bun run db:seed`, `bun run test:e2e`, and `bun run test:e2e:offline`. Read complete results before claiming success. The known existing export-label E2E mismatch must be reported separately if still present; do not change unrelated tests or permanently skip that workflow to make this feature green.
- [ ] Document HTTPS/localhost requirements, production service-worker scope and update caching headers, explicit opt-in, download/retention/storage-eviction limits, offline privacy and logout limitations, missing-record behavior, draft submission/unknown-create-result behavior, clear-offline-data recovery, production test commands, and absence of background sync/API changes.
- [ ] Add the deferred full-sync backlog record: require server idempotency, atomic versions/conflicts, temporary ID dependencies, ordered/recoverable queues, and authentication/ownership regression tests. Backlog is not authorization to implement it.
- [ ] Review the complete branch and commit documentation/test completion. After implementation, move durable guidance into current docs and remove this completed plan; retain it while work is pending. Do not push or merge without a separate request.

## Delivery and Review Gates

- **Before implementation:** user accepts the proposed privacy/retention/draft scope and chooses whether to execute Phase 1 alone or both phases.
- **After Task 4:** independently usable read-only release; review/test before adding draft behavior.
- **After Task 6:** independently usable local-drafts release; reconnect never writes automatically.
- **Final:** production offline tests and ordinary online regressions pass, any unrelated failures are explicitly disclosed, and documentation describes only shipped behavior.

Estimate: approximately 3–6 working days for Phase 1 and 1–2 weeks total with Phase 2, assuming dependency compatibility and no new backend requirements. Storage/privacy/update edge cases can extend this estimate; it is not a delivery commitment.

## Source References

- [TanStack Query persistence](https://tanstack.com/query/latest/docs/framework/react/plugins/persistQueryClient): dehydration/restoration, allowlisting, retention, and cache versioning. This plan does not persist or resume mutations.
- [Vite PWA custom workers](https://vite-pwa-org.netlify.app/guide/inject-manifest.html): build-time manifest injection for an explicit custom service worker.
- [Vite PWA precaching](https://vite-pwa-org.netlify.app/guide/service-worker-precache): asset download behavior; avoid eager full precaching before consent.
- [web.dev offline data](https://web.dev/learn/pwa/offline-data): IndexedDB for application data versus Cache Storage for network resources.
