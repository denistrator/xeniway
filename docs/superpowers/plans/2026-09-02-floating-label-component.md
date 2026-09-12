# FloatingLabel Component Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Replace repeated floating-label markup with a typed `FloatingLabel` wrapper and rename the styling hooks from plural to singular.

**Architecture:** `FloatingLabel` is a presentational React wrapper that renders its `children` directly before one associated label. Existing controls retain their `peer` class and field attributes; the CSS file remains the single owner of floating-label visuals.

**Tech Stack:** React, TypeScript, Tailwind CSS v4, Vitest, Biome.

## Global Constraints

- Preserve the current CSS values and transition behavior.
- Use `floating-label`, `floating-label-label`, and `floating-label.css` everywhere after migration.
- Do not add a Slot abstraction, JavaScript field-state tracking, or form data-flow changes.
- Preserve `placeholder=" "` on floating text inputs and textareas.
- Keep controls as direct children of the wrapper, before the label.

### Task 1: Add the typed wrapper contract

**Files:**
- Create: `apps/web/src/components/ui/floating-label.test.tsx`
- Create: `apps/web/src/components/ui/floating-label.tsx`

**Interfaces:**
- `FloatingLabelProps` accepts `children: React.ReactNode`, `htmlFor: string`, `label: React.ReactNode`, optional `className`, and optional `labelClassName`.
- `FloatingLabel` returns a root `div` with `floating-label` plus `className`, the supplied children, and a `label` with `htmlFor` and `floating-label-label` plus `labelClassName`.

- [ ] Write a failing Vitest test using server-rendered markup to assert child-before-label order, associated `htmlFor`, default singular classes, and custom classes.
- [ ] Run `bun run --cwd apps/web test -- floating-label.test.tsx`; it must fail because the component does not exist.
- [ ] Implement `FloatingLabel` with `PropsWithChildren`, `ReactNode`, and `cn`.
- [ ] Run the focused test again; it must pass.
- [ ] Commit with `git commit -m "feat: add floating label wrapper"`.

### Task 2: Rename styling hooks and migrate consumers

**Files:**
- Rename: `apps/web/src/components/ui/floating-labels.css` → `apps/web/src/components/ui/floating-label.css`
- Modify: `apps/web/src/index.css`
- Modify: `apps/web/src/pages/login-page.tsx`
- Modify: `apps/web/src/pages/register-page.tsx`
- Modify: `apps/web/src/pages/home-page.tsx`
- Modify: `apps/web/src/components/job-form.tsx`
- Modify: `tests/e2e/xeniway.spec.ts`

**Interfaces:**
- Each migrated consumer imports `FloatingLabel` and supplies its existing control as `children`.
- CSS selectors become `.floating-label`, `.floating-label > ...`, and `.floating-label-label`; peer selectors retain `.peer`.

- [ ] Replace all plural class strings and selectors with singular names, including E2E selectors and the stylesheet import.
- [ ] Wrap each existing field as `<FloatingLabel htmlFor="..." label="...">control</FloatingLabel>`, preserving control props and any non-visual layout classes through `className` and `labelClassName` only where needed.
- [ ] Confirm no `floating-labels` references remain with `rg -n "floating-labels" apps tests`.
- [ ] Run `bun run typecheck`, `bun run --cwd apps/web test`, `bun run build`, `bun run lint`, and `git diff --check`.
- [ ] Review the diff for unchanged form behavior and commit with `git commit -m "refactor: standardize floating label usage"`.

### Task 3: Final verification

**Files:**
- No source changes expected.

- [ ] Run `bun run typecheck`, `bun run test`, `bun run build`, and `bun run lint` fresh.
- [ ] Attempt the focused E2E test and report any environment-level server startup blocker separately from code verification.
- [ ] Confirm `git status --short` is clean and inspect the final commit list.
