# Application Workspace Content Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `ApplicationWorkspaceContent` easier to read and cheaper to render without changing its behavior or decomposing its single-file, single-component implementation.

**Architecture:** Keep every existing workspace hook, handler, and JSX branch in `application-workspace-content.tsx`. Improve the component in place by applying domain-specific names, grouping declarations by responsibility, memoizing only expensive derived collections and locale formatters, and stabilizing the status-menu document listeners.

**Tech Stack:** React 19.3, TypeScript, i18next/react-i18next, TanStack Query, Atlaskit Inline Edit, Tailwind CSS, Biome, Vite.

## Global Constraints

- Keep one source bundle and one exported `ApplicationWorkspaceContent` React component.
- Do not add child components, render helpers, reducers, custom hooks, or source files.
- Do not move logic out of `ApplicationWorkspaceContent` or split logic into internal component functions.
- Preserve all current UI behavior, API writes, navigation, validation, focus restoration, accessibility names, live regions, and destructive-action confirmations.
- Continue sanitizing external profile and job links to HTTP or HTTPS URLs only.
- Continue rendering user-entered content as React text; do not introduce raw HTML rendering.
- Do not add, modify, or run tests for this refactor.
- Verification is limited to formatting, linting, type checking, building, and diff validation.

---

### Task 1: Clarify component vocabulary and declaration flow

**Files:**
- Modify: `apps/web/src/features/applications/application-workspace/page/application-workspace-content.tsx:698-1013`

**Interfaces:**
- Consumes: `ApplicationDetailResponse["data"]`, the existing workspace hooks, and the current direct JSX tree.
- Produces: the same `ApplicationWorkspaceContent({ data })` public component with clearer internal names and unchanged behavior.

- [x] **Step 1: Rename broad or ambiguous component-owned values by domain**

Apply these exact naming rules throughout the component without changing the underlying values:

```tsx
const applicationFields = useApplicationWorkspaceFields(application);
const lifecycleActions = useWorkspaceActions(application);
const workspaceHeadingRef = useRef<HTMLHeadingElement>(null);

const statusMenuRef = useRef<HTMLDivElement>(null);
const statusMenuTriggerRef = useRef<HTMLButtonElement>(null);
const selectedStatusOptionRef = useRef<HTMLInputElement>(null);
const wasStatusMenuOpenRef = useRef(false);
const isStatusMenuOpen = applicationFields.compact.activeField === "status";

const contactSection = useContactsSection(application.id);
const followUpSection = useFollowUpsSection(application.id);

const activityEditorTriggerRef = useRef<HTMLElement | null>(null);
const [activityEditor, setActivityEditor] = useState<ApplicationEvent | "new" | null>(null);
const [activityEventPendingDeletion, setActivityEventPendingDeletion] = useState<ApplicationEvent | null>(null);

const [pendingLifecycleAction, setPendingLifecycleAction] = useState<WorkspaceAction | null>(null);
const [lifecycleActionErrorKey, setLifecycleActionErrorKey] = useState<string | null>(null);
const [restoreErrorKey, setRestoreErrorKey] = useState<string | null>(null);
const safeJobUrl = safeProfileUrl(application.jobUrl);
```

Rename the associated setters, handler references, JSX conditions, and mutations consistently. Keep `companyResearch`, `talkingPoints`, and `interviewerQuestions` because those names already match their persisted domain fields.

- [x] **Step 2: Rename handlers so the action and outcome are explicit**

Use these signatures and update every call site:

```tsx
async function restoreApplicationToBoard() {
  setRestoreErrorKey(null);
  try {
    await lifecycleActions.run("restore");
  } catch (cause) {
    setRestoreErrorKey(getApiErrorKey(cause instanceof ApiRequestError ? cause.code : "REQUEST_FAILED"));
  }
}

async function executeConfirmedLifecycleAction() {
  if (!pendingLifecycleAction) return;
  setLifecycleActionErrorKey(null);
  try {
    await lifecycleActions.run(pendingLifecycleAction);
    setPendingLifecycleAction(null);
  } catch (cause) {
    setLifecycleActionErrorKey(getApiErrorKey(cause instanceof ApiRequestError ? cause.code : "REQUEST_FAILED"));
  }
}

function closeActivityEditor() {
  setActivityEditor(null);
  activityEditorTriggerRef.current?.focus();
  activityEditorTriggerRef.current = null;
}

async function saveActivityEvent(input: ApplicationEventInput) {
  if (activityEditor && activityEditor !== "new") {
    await activityMutations.update.mutateAsync({ eventId: activityEditor.id, input });
  } else {
    await activityMutations.create.mutateAsync(input);
  }
  closeActivityEditor();
}

function cancelActivityEventDeletion() {
  setActivityEventPendingDeletion(null);
  activityAddButton.current?.focus();
}

async function deleteActivityEvent() {
  if (!activityEventPendingDeletion) return;
  try {
    await activityMutations.remove.mutateAsync(activityEventPendingDeletion.id);
    cancelActivityEventDeletion();
    setActivityDeleteError(false);
  } catch {
    cancelActivityEventDeletion();
    setActivityDeleteError(true);
  }
}
```

Keep write error mapping through `getApiErrorKey` and `ApiRequestError`; do not expose raw server or exception messages.

- [x] **Step 3: Make editor-presence conditions explicit and reuse them**

Add booleans beside each domain state and use them in focus-return hooks and JSX branches:

```tsx
const isContactEditorOpen = contactSection.editing !== null;
const isContactDeleteConfirmationOpen = contactSection.deleting !== null;
const isFollowUpEditorOpen = followUpSection.editing !== null;
const isFollowUpDeleteConfirmationOpen = followUpSection.deleting !== null;
const isActivityEditorOpen = activityEditor !== null;
```

Do not memoize trivial booleans, translated labels, or JSX configuration arrays.

- [x] **Step 4: Format the source and inspect the rename diff**

Run:

```bash
bun run format
git diff -- apps/web/src/features/applications/application-workspace/page/application-workspace-content.tsx
```

Expected: Biome completes successfully; the diff contains only naming, declaration-order, and equivalent-condition changes.

- [x] **Step 5: Commit the readability pass**

```bash
git add apps/web/src/features/applications/application-workspace/page/application-workspace-content.tsx
git commit -m "refactor(web): clarify application workspace state"
```

---

### Task 2: Remove repeated sorting and formatter allocation

**Files:**
- Modify: `apps/web/src/features/applications/application-workspace/page/application-workspace-content.tsx:23,760-800,1835-2110`

**Interfaces:**
- Consumes: `data.followUpTasks`, `data.events`, and `i18n.resolvedLanguage`.
- Produces: `sortedFollowUpTasks`, `sortedActivityEvents`, `followUpMonthFormatter`, `followUpFullDateFormatter`, and `activityDateTimeFormatter`, all private derived values inside the existing component.

- [x] **Step 1: Import React's built-in memoization and effect-event hooks**

Replace the React import with:

```tsx
import {
  type FocusEvent,
  type FormEvent,
  type RefObject,
  useEffect,
  useEffectEvent,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
```

- [x] **Step 2: Cache collection ordering and locale-sensitive formatters**

Place these declarations after the corresponding section state and before the effects:

```tsx
const locale = i18n.resolvedLanguage ?? "en";
const sortedFollowUpTasks = useMemo(() => sortFollowUps(data.followUpTasks), [data.followUpTasks]);
const sortedActivityEvents = useMemo(
  () =>
    [...data.events].sort(
      (left, right) => right.occurredAt.localeCompare(left.occurredAt) || right.id - left.id,
    ),
  [data.events],
);
const followUpMonthFormatter = useMemo(
  () => new Intl.DateTimeFormat(locale, { month: "short", timeZone: "UTC" }),
  [locale],
);
const followUpFullDateFormatter = useMemo(
  () => new Intl.DateTimeFormat(locale, { dateStyle: "long", timeZone: "UTC" }),
  [locale],
);
const activityDateTimeFormatter = useMemo(
  () => new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }),
  [locale],
);
```

Use `locale` for the existing applied-date formatting as well.

- [x] **Step 3: Reuse derived values inside the direct JSX**

Replace the inline collection and formatter work without extracting JSX:

```tsx
{sortedFollowUpTasks.map((task) => {
  const dueDate = new Date(`${task.dueDate}T00:00:00Z`);
  const abbreviatedMonth = followUpMonthFormatter.format(dueDate);
  const accessibleDueDate = followUpFullDateFormatter.format(dueDate);
})}
```

The snippet replaces only the current `completed`, `date`, `month`, and `fullDate` local declarations. Keep the existing `<li>` body directly inside this callback and update its references to the new names.

Use `dueDate`, `abbreviatedMonth`, and `accessibleDueDate` in the existing `<time>` element. Replace the activity expression with `sortedActivityEvents.map(...)` and render event dates with:

```tsx
{activityDateTimeFormatter.format(new Date(event.occurredAt))}
```

- [x] **Step 4: Stabilize the status-menu document callbacks**

Create one effect event before the menu effects:

```tsx
const closeStatusMenu = useEffectEvent(() => {
  applicationFields.compact.blur("status");
});
```

Use it in the existing outside-click and Escape handlers and change the listener effect dependency list to `[isStatusMenuOpen]`. Keep the listener types, containment check, Escape behavior, and focus restoration unchanged.

- [x] **Step 5: Run static checks for the optimization pass**

Run:

```bash
bun run format
bun run lint
bun run typecheck
```

Expected: all commands exit successfully with no new diagnostics.

- [x] **Step 6: Commit the rendering-cost pass**

```bash
git add apps/web/src/features/applications/application-workspace/page/application-workspace-content.tsx
git commit -m "refactor(web): reduce workspace render work"
```

---

### Task 3: Simplify direct JSX and complete the correctness review

**Files:**
- Modify: `apps/web/src/features/applications/application-workspace/page/application-workspace-content.tsx:1015-2177`

**Interfaces:**
- Consumes: the renamed state and memoized derived values from Tasks 1 and 2.
- Produces: unchanged workspace markup and behavior with consistent conditions, names, and security boundaries.

- [x] **Step 1: Normalize repeated direct-JSX conditions without extracting render helpers**

Use the named editor and confirmation booleans for their corresponding branches. Prefer positive domain names and early local values inside existing `.map()` callbacks, for example:

```tsx
const isCompleted = task.completedAt !== null;
const safeContactProfileUrl = safeProfileUrl(contact.profileUrl);
```

Keep every card, form, modal, and field directly in `ApplicationWorkspaceContent`; do not move any JSX into another function or component.

- [x] **Step 2: Audit inline editing and destructive actions for behavioral equivalence**

Verify in the source that:

```tsx
// Compact writes still submit one field through the existing validated hook.
applicationFields.compact.confirm(field);

// Lifecycle actions still require their existing confirmation before running.
await lifecycleActions.run(pendingLifecycleAction);

// Manual activity events alone retain edit and delete controls.
!event.isSystem
```

Do not change Zod parsing, mutation inputs, modal conditions, route destinations, or focus-return targets.

- [x] **Step 3: Audit user content and outbound links**

Confirm all descriptions, notes, contact values, follow-up values, and event text remain interpolated as React children. Confirm job and contact links use sanitized variables and preserve:

```tsx
target="_blank"
rel="noopener noreferrer"
```

Do not add `dangerouslySetInnerHTML`, unchecked URL schemes, raw API error output, or new persisted browser state.

- [x] **Step 4: Run the final non-test verification**

Run:

```bash
bun run format
bun run lint
bun run typecheck
bun run build
git diff --check
```

Expected: formatting, lint, type checking, build, and whitespace validation succeed. The known Vite main-bundle size warning may remain; no test command is run.

- [x] **Step 5: Review the final diff for scope**

Run:

```bash
git status --short
git diff --stat
git diff -- apps/web/src/features/applications/application-workspace/page/application-workspace-content.tsx
```

Expected: implementation changes are confined to the single workspace content file; no tests or unrelated source files changed.

- [x] **Step 6: Commit the completed refactor**

```bash
git add apps/web/src/features/applications/application-workspace/page/application-workspace-content.tsx
git commit -m "refactor(web): polish application workspace content"
```
