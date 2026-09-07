# Form Input Icons Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add subtle semantic Lucide icons to every user-facing form input so each control communicates its meaning without replacing labels or adding visual noise.

**Architecture:** Extend the shared `FloatingLabel` wrapper with an optional decorative Lucide icon slot. The wrapper owns icon positioning and reserves leading space in the wrapped control; callers provide meaning-specific icons. Preserve the existing `peer`/floating-label relationship, `Input` component, form IDs, labels, validation, and data flow.

**Tech Stack:** React, TypeScript, Tailwind CSS, `lucide-react`, Vitest, Playwright, axe-core.

## Global Constraints

- Use the existing `lucide-react` dependency; add no icon package.
- Icons reinforce meaning and never replace visible labels.
- Render icons with `aria-hidden="true"` and `focusable="false"`; labels remain accessible names.
- Preserve `.floating-label` as the root, direct control child with `className="peer"`, and floating label sibling relationship.
- Keep `placeholder=" "`, field names, IDs, autocomplete, validation, keyboard behavior, dark mode, and responsive behavior unchanged.
- Do not add icons to unrelated navigation or icon-only actions.
- Commit each completed task with the specified short message.

## Semantic Icon Map

| Field | Lucide icon | Meaning |
| --- | --- | --- |
| Email | `Mail` | Email address |
| Password/confirmation | `LockKeyhole` | Credential |
| First/last name | `User` | Person identity |
| Application search | `Search` | Search |
| Company | `Building2` | Employer |
| Position | `BriefcaseBusiness` | Job role |
| Location | `MapPin` | Work location |
| Salary | `Banknote` | Compensation |
| Job URL | `Link` | External listing |
| Status | `CircleDot` | Workflow state |
| Applied date | `CalendarDays` | Application date |
| Description | `FileText` | Job details |
| Notes | `StickyNote` | Candidate notes |

## File Map

- Modify `apps/web/src/components/ui/floating-label.tsx`: optional icon API and decorative rendering.
- Modify `apps/web/src/components/ui/floating-label.css`: icon placement and control padding.
- Modify `apps/web/src/pages/login-page.tsx`, `register-page.tsx`, and `home-page.tsx`: auth and search icons.
- Modify `apps/web/src/components/job/job-form.tsx`: add/edit job field icons.
- Modify `apps/web/src/components/ui/floating-label.test.tsx` and `tests/e2e/job-tracker.spec.ts`: semantic and workflow coverage.

---

### Task 1: Extend the floating-label primitive

**Files:**
- Modify: `apps/web/src/components/ui/floating-label.tsx`
- Modify: `apps/web/src/components/ui/floating-label.css`
- Test: `apps/web/src/components/ui/floating-label.test.tsx`

- [ ] **Step 1: Add the failing primitive test**

Render `FloatingLabel` with a Lucide icon and assert the labeled control remains discoverable, the SVG exists, and it has `aria-hidden="true"` and `focusable="false"`. Keep existing wrapper, label association, and custom-class assertions.

- [ ] **Step 2: Run the focused test**

Run `bun run --cwd apps/web test -- src/components/ui/floating-label.test.tsx`. Expected: FAIL because the icon prop is not implemented.

- [ ] **Step 3: Implement the icon API and styles**

Add `icon?: LucideIcon` to `FloatingLabelProps`. When supplied, render the icon as a non-interactive decorative sibling and add a wrapper modifier such as `floating-label-with-icon`. Keep the control as a direct child for peer selectors. CSS must align the icon, reserve leading control padding only for icon-bearing wrappers, keep the floating label readable, use existing color tokens, show the accent state on focus, and set `pointer-events: none`.

- [ ] **Step 4: Verify and commit**

Run `bun run --cwd apps/web test -- src/components/ui/floating-label.test.tsx`, `bun run --cwd apps/web typecheck`, and Biome on the changed files. Commit with `feat: support icons in floating labels`.

### Task 2: Add icons to authentication and search

**Files:**
- Modify: `apps/web/src/pages/login-page.tsx`
- Modify: `apps/web/src/pages/register-page.tsx`
- Modify: `apps/web/src/pages/home-page.tsx`
- Modify: `tests/e2e/job-tracker.spec.ts`

- [ ] **Step 1: Add the mapped icons without changing behavior**

Use `Mail` and `LockKeyhole` on login; `User`, `Mail`, and `LockKeyhole` on registration; and `Search` on application search. Pass icons through existing `FloatingLabel` calls. Do not change IDs, names, autocomplete, state handlers, validation, or submit behavior.

- [ ] **Step 2: Extend semantic coverage**

Assert each existing field remains findable by its visible label and icons are hidden from the accessibility tree. Avoid snapshots and generated SVG path assertions.

- [ ] **Step 3: Verify and commit**

Run `bun run --cwd apps/web test`, `bun run typecheck`, and the relevant auth/search Playwright tests. Commit with `feat: add auth and search input icons`.

### Task 3: Add icons to the add/edit job form

**Files:**
- Modify: `apps/web/src/components/job/job-form.tsx`
- Modify: `tests/e2e/job-tracker.spec.ts`

- [ ] **Step 1: Add the mapped job icons**

Import and apply `Building2`, `BriefcaseBusiness`, `MapPin`, `Banknote`, `Link`, `CircleDot`, `CalendarDays`, `FileText`, and `StickyNote` to company, position, location, salary, job URL, status, applied date, description, and notes respectively. Change only wrapper icon props; both add and edit modes use the same form.

- [ ] **Step 2: Add focused workflow assertions**

Open the job form and verify every control remains findable by its existing label and the expected decorative SVGs exist inside the form. Cover both drawer/modal modes when practical, without asserting SVG path markup or pixel coordinates.

- [ ] **Step 3: Verify and commit**

Run relevant form E2E tests, `bun run typecheck`, `bun run --cwd apps/web test`, and `bun run lint`. Commit with `feat: add job form input icons`.

### Task 4: Complete regression and visual/accessibility review

**Files:**
- No planned source changes.

- [ ] **Step 1: Run `bun run typecheck`, `bun run test`, `bun run build`, `bun run lint`, and `bun run test:e2e`.**
- [ ] **Step 2: Manually review light/dark themes, login, registration, search, add/edit drawer and modal, select/date/textarea controls, keyboard focus, mobile widths, and reduced-motion behavior. Confirm icons never cover text or intercept pointer events.**
- [ ] **Step 3: Run `git diff --check`, `git status --short`, and `git log --oneline -5`; expect a clean tree and passing checks.**
