# Job Status Decoration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace job status badges with status-colored leading borders shared with the board column palette.

**Architecture:** A typed `statusStyles` map owns paired column and card Tailwind classes. `JobBoard` consumes the column class and `JobCard` consumes the card class; the card's existing accessible name continues to expose its status.

**Tech Stack:** React, TypeScript, Tailwind CSS v4, Vitest.

## Global Constraints

- Preserve status colors and dark-theme variants.
- Preserve all interaction, keyboard, drag-and-drop, and data-flow behavior.
- Do not add dynamic Tailwind class construction.
- Remove the visible `Badge` from `JobCard`.

### Task 1: Update the shared status style contract

**Files:** `apps/web/src/components/job-status.ts`, `apps/web/src/components/job-status.test.ts`.

- Add a typed `statusStyles` map with `column` classes using `border-t-*` and `card` classes using `border-s-*`.
- Update the test to assert representative paired classes and preserve all six statuses.
- Run the focused status test to verify the new contract.

### Task 2: Apply card decoration and remove badges

**Files:** `apps/web/src/components/job-board.tsx`, `apps/web/src/components/job-card.tsx`.

- Replace board imports/usages of the old map with `statusStyles[status].column`.
- Replace the badge import/render with `border-s-4` plus `statusStyles[job.status].card` on the existing card button.
- Preserve the existing accessible `aria-label`, layout, and event handlers.
- Run typecheck, tests, build, lint, and diff checks; review the diff and commit.
