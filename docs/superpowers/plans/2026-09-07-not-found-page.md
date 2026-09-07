# 404 Not Found Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the SPA wildcard redirect with an accessible public 404 page that helps users recover without changing authentication or job-tracking workflows.

**Architecture:** Add `NotFoundPage` under `apps/web/src/pages`. Render it inside the existing `Layout` route so the shared header, footer, theme selector, skip link, and responsive shell remain available. Replace the wildcard redirect in `App.tsx`; do not change server status-code handling or hosting fallback configuration.

**Tech Stack:** React, TypeScript, React Router, Tailwind CSS, Vitest, Playwright, axe-core.

## Global Constraints

- Keep the page public; it must not invoke `RequireAuth` or `GuestOnly`.
- Preserve the existing header, footer, theme selector, skip link, and responsive layout.
- Do not change authentication, API behavior, application routes, or server behavior.
- Use semantic HTML, one clear `h1`, named keyboard-focusable links, visible focus states, and responsive touch targets.
- Use existing design tokens and button/link styles; do not add dependencies or a new global abstraction.
- Commit each completed task with the specified message.

## File Map

- Create: `apps/web/src/pages/not-found-page.tsx` — public 404 content and recovery links.
- Modify: `apps/web/src/App.tsx` — import the page and replace the wildcard redirect.
- Modify: `tests/e2e/job-tracker.spec.ts` — cover unknown-path behavior.
- No API, database, or shared-contract changes.

---

### Task 1: Add the public 404 page component

**Files:**
- Create: `apps/web/src/pages/not-found-page.tsx`

- [ ] **Step 1: Implement `NotFoundPage`**

Export a no-props React component. Use `Link` from `react-router-dom` with destinations `/` and `/about`. Render a centered responsive section using the existing surface, text, border, accent, and button/link classes. Include:

- an eyebrow containing `404`;
- one `h1` with the exact accessible name `Page not found`;
- concise explanatory copy;
- a labeled `nav` named `404 recovery`;
- a primary link named `Go to applications`;
- a secondary link named `About Job Tracker`.

Guests may follow `/` and then be handled by the existing auth guard; the 404 page itself remains public.

- [ ] **Step 2: Verify accessibility structure**

Confirm there is exactly one visible `h1`, both recovery links have visible text and keyboard focus styles, the navigation has an accessible name, and the page is usable at mobile widths without horizontal overflow.

- [ ] **Step 3: Run focused checks**

```bash
bun run --cwd apps/web typecheck
bun run --cwd apps/web test
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/pages/not-found-page.tsx
git commit -m "feat: add not found page"
```

### Task 2: Route unknown paths to the 404 page

**Files:**
- Modify: `apps/web/src/App.tsx`
- Modify: `tests/e2e/job-tracker.spec.ts`

- [ ] **Step 1: Add the failing E2E test**

Add a serial-safe test that visits `/does-not-exist`, asserts the URL is unchanged, finds the `Page not found` heading, verifies both recovery links, and verifies the existing theme selector is visible. Inspect `apps/web/src/components/theme-selector.tsx` for its current accessible name instead of changing that component.

Run:

```bash
bun run test:e2e --grep "public not found page"
```

Expected: FAIL because the current wildcard route redirects to `/`.

- [ ] **Step 2: Replace the wildcard redirect**

Import `NotFoundPage` and put the wildcard route inside the existing `<Route element={<Layout />}>` block:

```tsx
<Route path="*" element={<NotFoundPage />} />
```

Keep it outside `RequireAuth` and `GuestOnly`. Retain `Navigate` because both auth guards still use it.

- [ ] **Step 3: Run focused verification**

```bash
bun run test:e2e --grep "public not found page"
bun run typecheck
bun run --cwd apps/web test
bun run lint
```

Expected: all commands pass; the unknown URL remains unchanged and shared chrome is rendered.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/App.tsx tests/e2e/job-tracker.spec.ts
git commit -m "feat: route unknown paths to 404"
```

### Task 3: Run the complete regression suite

**Files:**
- No planned source changes.

- [ ] **Step 1: Run all checks**

```bash
bun run typecheck
bun run test
bun run build
bun run lint
bun run test:e2e
```

- [ ] **Step 2: Review the final tree**

```bash
git diff --check
git status --short
git log --oneline -3
```

Expected: no unstaged changes, no formatting errors, and the new 404 test passes with existing workflows.

- [ ] **Step 3: Handle environment-only blockers**

If E2E cannot start because PostgreSQL, Redis, or Chromium is unavailable, record the exact command and startup error. Do not weaken application behavior to bypass the blocker.

## Self-review checklist

- Unknown paths render a real page instead of silently redirecting.
- The 404 page is public for guests and authenticated users.
- Header, footer, theme selector, skip link, and responsive layout remain available.
- Recovery links use React Router navigation.
- No API, database, session, or job workflow behavior changes.
