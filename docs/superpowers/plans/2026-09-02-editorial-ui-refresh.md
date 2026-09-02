# Editorial UI Refresh Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refresh every Job Tracker screen into the approved “quiet ledger” editorial workspace style for light and dark themes without changing behavior or data flow.

**Architecture:** Keep React components, Redux state, TanStack Query, routes, and API contracts unchanged. Introduce shared visual tokens in `apps/web/src/index.css`, then apply those tokens through existing page/components and primitives. Keep layout responsive in CSS and preserve existing focus, keyboard, DnD, modal, and reduced-motion behavior.

**Tech Stack:** React, TypeScript, Vite, Tailwind CSS v4, Redux Toolkit, TanStack Query, Lucide React, Vitest, Playwright.

## Global Constraints

- Preserve routes, API contracts, server state, Redux state responsibilities, and current product behavior.
- Use the “quiet ledger” visual language: warm paper, ink surfaces, restrained teal/terracotta accents, hairline structure, and stronger typographic hierarchy.
- Apply the visual language to public About, authentication, authenticated workspace, archive, drawer, and modal surfaces.
- Preserve semantic controls, labels/autocomplete, accessible names, visible `:focus-visible` states, managed dialog focus, Escape handling, live announcements, touch targets, keyboard DnD alternatives, and overscroll containment.
- Limit motion to purposeful opacity/transform transitions and disable nonessential motion under `prefers-reduced-motion`.
- Prefer existing primitives and shared CSS/Tailwind tokens; add no dependency, route, data field, or product feature.
- Keep responsive behavior explicit in CSS; do not use JavaScript for layout measurement or style manipulation.
- Run lint, typecheck, unit tests, build, and E2E where the local environment permits.

---

### Task 1: Establish editorial design tokens

**Files:**
- Modify: `apps/web/src/index.css`
- Test: `apps/web/src/components/job-status.test.ts` remains the focused frontend regression test; no visual snapshot dependency is added

**Interfaces:**
- Produces CSS custom properties for light/dark background, surface, text, muted text, structural line, teal accent, and terracotta accent.
- Produces reusable typography and reduced-motion rules consumed by all existing components.

- [ ] **Step 1: Record the current baseline**

Run:

```bash
bun run --cwd apps/web typecheck
bun run --cwd apps/web test
```

Expected: typecheck succeeds and the existing web tests pass before visual changes.

- [ ] **Step 2: Add the token system**

Define light tokens on `:root`, dark equivalents on `[data-theme="dark"]`, and retain `color-scheme`, focus-visible, touch-action, scroll, and reduced-motion behavior. Use these values:

```css
:root {
  --color-canvas: #f5f3ee;
  --color-surface: #fffdf8;
  --color-ink: #172033;
  --color-muted: #667085;
  --color-line: #d8d4cb;
  --color-accent: #1f6d67;
  --color-accent-warm: #a45f3d;
}

html[data-theme="dark"] {
  --color-canvas: #020618;
  --color-surface: #182335;
  --color-ink: #f7f4eb;
  --color-muted: #aeb8c9;
  --color-line: #3c4659;
  --color-accent: #84c5b8;
  --color-accent-warm: #e19a73;
}
```

Add an editorial heading stack using `Iowan Old Style`, `Palatino Linotype`, `Book Antiqua`, and `Georgia`, while retaining the existing sans stack for body and controls.

- [ ] **Step 3: Verify token compilation**

Run:

```bash
bun run --cwd apps/web typecheck
bun run --cwd apps/web build
```

Expected: both commands pass and the generated CSS contains the tokenized theme rules.

- [ ] **Step 4: Review the diff and commit**

```bash
git diff --check
git add apps/web/src/index.css
git commit -m "style: add editorial design tokens"
```

### Task 2: Refresh app shell and public/auth screens

**Files:**
- Modify: `apps/web/src/components/layout.tsx`
- Modify: `apps/web/src/pages/about-page.tsx`
- Modify: `apps/web/src/pages/login-page.tsx`
- Modify: `apps/web/src/pages/register-page.tsx`
- Modify: `apps/web/src/components/ui/button.tsx`
- Modify: `apps/web/src/components/ui/input.tsx`
- Modify: `apps/web/src/components/ui/card.tsx`

**Interfaces:**
- Consumes the CSS tokens and typography rules from Task 1.
- Preserves all existing props, route links, form submission handlers, focus refs, and auth behavior.

- [ ] **Step 1: Run the existing frontend regression test**

Run `bun run --cwd apps/web test src/components/job-status.test.ts`. The test must continue to assert the six statuses and remain independent of presentation classes; do not add a browser-rendering dependency for styling.

- [ ] **Step 2: Refresh the shell**

Replace scattered slate/white shell classes with the shared canvas/surface/ink/muted/line/accent values. Keep the header’s navigation links, Add job action, theme selector, logout action, and `main#main-content` unchanged semantically. Use the serif stack only for the wordmark and page-level headings.

- [ ] **Step 3: Refresh public and auth surfaces**

Apply the same paper/ink treatment to About, Login, and Register. Keep labels, autocomplete metadata, error live regions, links, and accessible names intact. Ensure the primary action has a clear accent/ink contrast in both themes.

- [ ] **Step 4: Refresh shared primitives**

Update Button, Input, and Card base classes to consume the visual system. Preserve existing variants, sizes, `asChild`, ref forwarding, hover states, focus-visible rings, disabled behavior, and dark-mode behavior.

- [ ] **Step 5: Verify and commit**

Run:

```bash
bun run lint
bun run typecheck
bun run --cwd apps/web test
bun run build
git diff --check
git add apps/web/src/components/layout.tsx apps/web/src/pages/about-page.tsx apps/web/src/pages/login-page.tsx apps/web/src/pages/register-page.tsx apps/web/src/components/ui/button.tsx apps/web/src/components/ui/input.tsx apps/web/src/components/ui/card.tsx
git commit -m "style: refresh app shell"
```

Expected: all checks pass with no route or form behavior changes.

### Task 3: Refresh board, filters, and archive

**Files:**
- Modify: `apps/web/src/components/job-board.tsx`
- Modify: `apps/web/src/components/job-card.tsx`
- Modify: `apps/web/src/components/status-filter.tsx`
- Modify: `apps/web/src/pages/home-page.tsx`
- Modify: `apps/web/src/pages/archive-page.tsx`
- Modify: `apps/web/src/components/job-status.ts`

**Interfaces:**
- Consumes the existing `JobApplication`, `JobStatus`, Redux UI state, mutation callbacks, and token system.
- Produces the same board/filter/archive behavior with refreshed presentation only.

- [ ] **Step 1: Run the preserved board contract test**

Run `bun run --cwd apps/web test src/components/job-status.test.ts`. Keep the status order and label assertions independent of presentation classes; do not test Tailwind strings as a substitute for interaction tests.

- [ ] **Step 2: Refresh board structure**

Use editorial column rules, compact uppercase status labels, quieter counts, flatter job cards, and tokenized surfaces. Preserve desktop horizontal scrolling, equal populated-column sizing, empty-column minimum width, mobile stacking, scroll-fade behavior, native DnD, keyboard reorder/status movement, and the no-results live region.

- [ ] **Step 3: Refresh filters and archive**

Apply the same toolbar, checkbox dropdown, empty state, archive card, restore, and destructive-delete treatments. Preserve the custom status dropdown’s keyboard Escape behavior and checkbox semantics.

- [ ] **Step 4: Verify board behavior**

Run:

```bash
bun run --cwd apps/web test
bun run typecheck
bun run build
```

Expected: all existing tests pass; no API or Redux contract changes appear in the diff.

- [ ] **Step 5: Commit**

```bash
git diff --check
git add apps/web/src/components/job-board.tsx apps/web/src/components/job-card.tsx apps/web/src/components/status-filter.tsx apps/web/src/pages/home-page.tsx apps/web/src/pages/archive-page.tsx apps/web/src/components/job-status.ts
git commit -m "style: refresh application workspace"
```

### Task 4: Refresh forms and overlays

**Files:**
- Modify: `apps/web/src/components/job-form.tsx`
- Modify: `apps/web/src/components/job-form-content.tsx`
- Modify: `apps/web/src/components/job-manager.tsx`
- Modify: `apps/web/src/components/job-drawer.tsx`
- Modify: `apps/web/src/components/job-modal.tsx`
- Modify: `apps/web/src/components/theme-selector.tsx`
- Modify: `apps/web/src/components/theme-sync.tsx`

**Interfaces:**
- Preserves the `JobForm`, `JobFormContent`, `JobManager`, `JobDrawer`, and `JobModal` prop contracts and shared-form data flow.
- Preserves persisted drawer/modal mode, focus trapping, opener restoration, Escape close, archive action, and theme persistence.

- [ ] **Step 1: Run the focused form/overlay regression coverage**

Run `bun run --cwd apps/web test src/components/job-status.test.ts`. Keep any presentation helper pure and deterministic; do not introduce a full component-testing framework for styling alone.

- [ ] **Step 2: Refresh form hierarchy**

Apply serif only to the form heading, tokenized field surfaces and borders, clear section spacing, status control styling, and consistent primary/secondary actions. Preserve all labels, names, autocomplete metadata, validation, live error behavior, and submit state.

- [ ] **Step 3: Refresh drawer/modal surfaces**

Use the paper/ink surfaces, structural lines, editorial heading, mode-switch icon treatment, and existing responsive dimensions. Preserve `role="dialog"`, `aria-modal`, labelled title, focus trap, `overscroll-contain`, backdrop close, and mobile full-screen behavior.

- [ ] **Step 4: Verify themes and overlays**

Run:

```bash
bun run lint
bun run typecheck
bun run test
bun run build
```

Expected: both themes compile and all existing unit/API tests pass.

- [ ] **Step 5: Commit**

```bash
git diff --check
git add apps/web/src/components/job-form.tsx apps/web/src/components/job-form-content.tsx apps/web/src/components/job-manager.tsx apps/web/src/components/job-drawer.tsx apps/web/src/components/job-modal.tsx apps/web/src/components/theme-selector.tsx apps/web/src/components/theme-sync.tsx
git commit -m "style: refresh forms and overlays"
```

### Task 5: Final visual/accessibility verification

**Files:**
- Modify: only files required to fix verified regressions from Tasks 1–4
- Test: `apps/web/src/components/job-status.test.ts`, `apps/web/src/lib/api.test.ts`, `tests/e2e/job-tracker.spec.ts` only if a regression test is required

**Interfaces:**
- Consumes the completed visual refresh.
- Produces a verified responsive, accessible, dual-theme UI with no behavior regression.

- [ ] **Step 1: Run the full verification suite**

```bash
bun run lint
bun run typecheck
bun run test
bun run build
bun run test:e2e
```

Expected: the first four commands pass. E2E must pass when PostgreSQL and required ports are available; if the environment blocks startup, record the exact startup error rather than changing application behavior to bypass it.

- [ ] **Step 2: Perform the final guideline review**

Review all `apps/web/src` and `apps/web/index.html` against the current Web Interface Guidelines. Confirm: semantic controls, labels, accessible names, visible focus, live regions, reduced motion, no broad transition anti-patterns, responsive overflow, dark-mode color scheme, and explicit date formatting.

- [ ] **Step 3: Review the complete diff**

```bash
git diff HEAD~4..HEAD --check
git status --short
git log --oneline -5
```

Confirm there are no unrelated files, no stale slate-only visual references where tokens should be used, no API/state changes, and no generated artifacts.

- [ ] **Step 4: Commit verified regression fixes**

```bash
git add apps/web/src apps/web/index.html
git commit -m "test: verify editorial UI refresh"
```

Create this commit only when Task 5 found and fixed a verified source or test regression; otherwise leave the task commits as-is.
