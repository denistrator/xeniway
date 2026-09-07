# Blacklist Page and Workflow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

Goal: Let candidates remove an existing job from the active workflow with an optional reason, review blacklisted jobs on a dedicated page, and restore a blacklisted job when needed.

Architecture: Add blacklist state independently from the six job statuses and archive state. A blacklisted application keeps its status and data but is excluded from active and archive lists. A dedicated authenticated API list and page render blacklisted records. The existing edit form uses a two-step action: Blacklist reveals a hidden reason field, then the user confirms or cancels.

Tech stack: Bun, Elysia, Drizzle, PostgreSQL, Zod, React, React Router, TanStack Query, Redux UI state, Tailwind CSS, Vitest, and Playwright.

## Product decisions and constraints

- Blacklist is not a seventh status; all six existing statuses remain unchanged.
- Blacklist is separate from archive. Blacklisted jobs are excluded from both active and archived lists.
- Blacklisting preserves status, fields, and ordering data.
- The reason is optional, trimmed, and limited to 1,000 characters.
- The action is available from the existing edit form for active jobs.
- The blacklist page provides Remove from blacklist and returns the job to the active board in its preserved status.
- Blacklist and restore require authentication and CSRF validation.
- Every repository query and mutation remains scoped by authenticated user ID.
- Existing archive, delete, reorder, ownership, and six-status behavior must remain unchanged.
- Do not add a separate blacklist table or a new status enum value.
- Commit each completed task with the specified short message.

## API and data contract

Add nullable blacklistedAt and blacklistReason fields to the shared JobApplication response.

Add authenticated endpoints:

- GET /api/applications/blacklist — list the current user’s blacklisted jobs.
- POST /api/applications/:id/blacklist — blacklist an active job with optional reason.
- POST /api/applications/:id/unblacklist — restore a blacklisted job to the active board.

Use the existing data/error envelopes, CSRF rules, ownership isolation, and stable errors for invalid IDs, missing records, and invalid state transitions.

## File map

- Modify apps/api/src/db/schema.ts and add a Drizzle migration for blacklist columns and an index.
- Modify apps/api/src/db/repository.ts and repository tests for filtering and transitions.
- Modify packages/shared/src/index.ts for input and response contracts.
- Create apps/api/src/routes/applications-blacklist.ts, application-blacklist.ts, and application-unblacklist.ts.
- Modify apps/api/src/app.ts, route types, API tests, and API documentation.
- Modify apps/web/src/lib/api.ts and queries.ts for keys, list calls, mutations, and invalidation.
- Create apps/web/src/pages/blacklist-page.tsx and add the authenticated route.
- Modify apps/web/src/components/site-header.tsx for Blacklist navigation.
- Modify apps/web/src/components/job/job-form.tsx and job-form-content.tsx for the revealable reason flow.
- Modify tests/e2e/job-tracker.spec.ts for list, reason, restore, ownership, keyboard, and responsive workflows.
- Update README.md, docs/architecture.md, docs/api.md, docs/database.md, and docs/testing.md.

---

### Task 1: Add database blacklist state

Files:
- Modify apps/api/src/db/schema.ts.
- Create the next migration under apps/api/drizzle/.
- Modify docs/database.md.
- Extend repository mapping/migration tests.

- [ ] Add nullable blacklistedAt timestamp and blacklistReason text columns to job_applications.
- [ ] Add an index covering user_id and blacklisted_at.
- [ ] Map the fields to ISO strings or null.
- [ ] Make active lists require archivedAt null and blacklistedAt null.
- [ ] Make archive lists require archivedAt non-null and blacklistedAt null.
- [ ] Add a blacklist list requiring blacklistedAt non-null.
- [ ] Run bun run db:migrate, focused repository tests, typecheck, and lint.
- [ ] Commit: feat: add blacklist database state.

### Task 2: Add shared contracts and repository transitions

Files:
- Modify packages/shared/src/index.ts.
- Modify apps/api/src/db/repository.ts.
- Extend repository tests.

- [ ] Add blacklistInputSchema with an optional nullable trimmed reason capped at 1,000 characters.
- [ ] Add blacklist fields to JobApplication and the list response contract.
- [ ] Extend ApplicationRepository with listBlacklisted, blacklist, and unblacklist methods.
- [ ] Blacklist only active records, preserving status and sort order.
- [ ] Unblacklist only blacklisted records, clearing both blacklist fields.
- [ ] Test null and trimmed reasons, repeated transitions, ownership isolation, and list separation.
- [ ] Run shared/repository tests, typecheck, and lint.
- [ ] Commit: feat: add blacklist contracts and repository.

### Task 3: Add blacklist API routes

Files:
- Create apps/api/src/routes/applications-blacklist.ts.
- Create apps/api/src/routes/application-blacklist.ts.
- Create apps/api/src/routes/application-unblacklist.ts.
- Modify apps/api/src/app.ts, route types, app tests, and docs/api.md.

- [ ] Add failing route tests for authenticated list, CSRF-protected blacklist, optional reason, unblacklist, invalid input, missing/foreign IDs, duplicate transitions, and list exclusion.
- [ ] Implement GET /api/applications/blacklist with authenticated ownership filtering.
- [ ] Implement POST /api/applications/:id/blacklist with auth, CSRF, ID parsing, schema validation, and stable errors.
- [ ] Implement POST /api/applications/:id/unblacklist with the same security checks.
- [ ] Register all routes and document request/response behavior.
- [ ] Run API/shared tests, typecheck, and lint.
- [ ] Commit: feat: add blacklist api.

### Task 4: Connect the React API and query layers

Files:
- Modify apps/web/src/lib/api.ts.
- Modify apps/web/src/lib/queries.ts.
- Extend API client and query tests.

- [ ] Add blacklist to application list query keys.
- [ ] Add list, blacklist, and unblacklist API functions using existing credentials and CSRF handling.
- [ ] Add useBlacklistedApplications and blacklist/unblacklist mutations.
- [ ] Invalidate active, archive, and blacklist queries after transitions.
- [ ] Test paths, methods, payloads, CSRF headers, and cache invalidation.
- [ ] Commit: feat: connect blacklist api to react.

### Task 5: Build the blacklist page and navigation

Files:
- Create apps/web/src/pages/blacklist-page.tsx.
- Modify apps/web/src/App.tsx and apps/web/src/components/site-header.tsx.
- Extend tests/e2e/job-tracker.spec.ts.

- [ ] Add /blacklist under RequireAuth and add an authenticated Blacklist NavLink beside Applications and Archive.
- [ ] Render PageIntro, loading/error live regions, an empty state, and responsive cards.
- [ ] Show company, position, status label, optional reason, blacklisted date, and Remove from blacklist.
- [ ] Keep guests redirected by the normal auth guard and hidden from restricted navigation.
- [ ] Test navigation, empty/list states, reason display, restore, keyboard access, accessibility, and mobile layout.
- [ ] Commit: feat: add blacklist page.

### Task 6: Add the edit-form blacklist workflow

Files:
- Modify apps/web/src/components/job/job-form.tsx.
- Modify apps/web/src/components/job/job-form-content.tsx and manager plumbing only if required.
- Extend tests/e2e/job-tracker.spec.ts.

- [ ] For existing active jobs, show a secondary Blacklist action in edit mode.
- [ ] On first click, reveal a hidden Reason textarea and show Confirm blacklist plus Cancel.
- [ ] Make the reason optional; Cancel hides the field without mutation.
- [ ] Submit the trimmed reason through the mutation, invalidate lists, close the drawer/modal on success, and focus an inline error on failure.
- [ ] Do not show the action for new jobs or change normal Save, Cancel, archive, or presentation-mode behavior.
- [ ] Test reveal/hide, optional reason, persistence, board removal, blacklist appearance, restore, drawer/modal modes, keyboard focus, and errors.
- [ ] Commit: feat: add job blacklist workflow.

### Task 7: Document and verify the complete feature

Files:
- Modify README.md, docs/architecture.md, docs/api.md, docs/database.md, and docs/testing.md.

- [ ] Document independent blacklist lifecycle, endpoints, optional reason, list separation, restoration, ownership, CSRF, and tests.
- [ ] Run bun run typecheck, bun run test, bun run build, bun run lint, bun run db:migrate, and bun run test:e2e.
- [ ] Run git diff --check, git status --short, and git log --oneline -10.
- [ ] Commit documentation last: docs: document blacklist workflow.
