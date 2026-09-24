# Application Workspace Decomposition Design

## Status and relationship to earlier work

This design supersedes the structural constraint in `docs/superpowers/specs/2026-09-26-application-workspace-content-refactor-design.md` that kept the workspace in one component and one source file. The behavior, accessibility, security, and correctness constraints from that document remain applicable.

The current `ApplicationWorkspaceContent` is approximately 2,200 lines and contains application-field editing, lifecycle actions, preparation, contacts, follow-ups, activity, validation helpers, mutation orchestration, focus management, formatting, and page layout. This design decomposes those responsibilities without changing the product contract.

## Goal

Split `ApplicationWorkspaceContent` into focused domain components and controller hooks that are easy to locate, understand, test, and change. Reduce repeated UI code and general code complexity while preserving all current behavior, API contracts, accessibility, validation, focus management, security rules, and visual layout.

## Success criteria

- `ApplicationWorkspaceContent` remains the public, already-loaded-data composition boundary and is reduced to roughly 60–100 cohesive lines.
- `ApplicationWorkspacePage` remains the sole owner of the application-detail query and its loading, not-found, error, and retry states.
- Application overview, lifecycle, preparation, contacts, follow-ups, and activity have explicit ownership boundaries.
- Contacts, follow-ups, preparation, and activity own their interaction state and mutations.
- Shared components remove substantial repeated Atlaskit field, section header, mutation status, form action, and validation-message markup.
- Domain-specific validation and persistence remain explicit rather than being hidden behind generic CRUD or form abstractions.
- Heavy collection sections do not rerender during unrelated compact-field keystrokes when their server-data props are unchanged.
- The current test behavior is redistributed into focused domain tests rather than discarded or replaced with snapshots.
- No API, database, shared contract, route, translation key, persisted value, or user-visible workflow changes.

## Chosen architecture

Use domain-oriented vertical slices with a thin page coordinator. Each product area contains its component, controller hook, domain types, and focused tests. A small shared layer contains only behavior or presentation used by at least two workspace domains.

Do not use a workspace-wide context provider. The application-field controller is the only state shared across two visual areas, so `ApplicationWorkspaceContent` owns it and passes it explicitly to the header, details section, and unsaved-warning component. All other state stays inside its owning section.

### Why this architecture

- Domain ownership makes a workflow understandable without traversing technical-layer directories.
- Explicit props reveal dependencies and avoid hidden context coupling.
- Self-contained section state prevents the coordinator from becoming a callback switchboard.
- Shared primitives reduce real duplication without creating a universal workspace framework.
- Components remain coarse enough to avoid recreating the former one-file-per-list-item structure.

## Target file structure

```text
apps/web/src/features/applications/application-workspace/
├── page/
│   ├── application-workspace-page.tsx
│   ├── application-workspace-content.tsx
│   └── application-workspace-page.test.tsx
│
├── overview/
│   ├── application-workspace-header.tsx
│   ├── application-details-section.tsx
│   ├── application-compact-field.tsx
│   ├── application-status-control.tsx
│   ├── application-unsaved-warning.tsx
│   ├── use-application-field.ts
│   ├── use-application-fields.ts
│   └── application-overview.test.tsx
│
├── lifecycle/
│   ├── application-lifecycle-actions.tsx
│   ├── use-application-lifecycle.ts
│   └── application-lifecycle.test.tsx
│
├── preparation/
│   ├── preparation-section.tsx
│   ├── use-preparation-field.ts
│   └── preparation-section.test.tsx
│
├── contacts/
│   ├── contacts-section.tsx
│   ├── contact-form.tsx
│   ├── use-contacts-controller.ts
│   └── contacts-section.test.tsx
│
├── follow-ups/
│   ├── follow-ups-section.tsx
│   ├── follow-up-form.tsx
│   ├── use-follow-ups-controller.ts
│   └── follow-ups-section.test.tsx
│
├── shared/
│   ├── workspace-text-field.tsx
│   ├── workspace-section-ui.tsx
│   ├── run-workspace-mutation.ts
│   ├── use-return-focus.ts
│   ├── sanitize-external-url.ts
│   └── workspace-inline-edit.css
│
└── test-support/
    ├── application-workspace-fixtures.ts
    └── render-application-workspace.tsx
```

The existing `apps/web/src/features/applications/activity` directory remains the owner of application activity. It gains a controlled section component described below; activity is not duplicated under `application-workspace`.

## Component responsibilities

### `ApplicationWorkspacePage`

- Parse and validate the route ID.
- Execute the sole `useApplicationDetail` query.
- Render loading, not-found, error, and retry states.
- Pass the successful detail payload to `ApplicationWorkspaceContent`.
- Do not own editor, section, mutation, or focus state.

### `ApplicationWorkspaceContent`

- Receive `ApplicationDetailResponse["data"]`.
- Create the application-field controller because header and details both consume it.
- Compose the header, details, warning, preparation, contacts, follow-ups, and controlled activity section.
- Own only the outer responsive layout.
- Do not own contact, follow-up, preparation, activity, status-menu, lifecycle, confirmation, formatter, or mutation-error state.

The intended composition is:

```tsx
export function ApplicationWorkspaceContent({ data }: ApplicationWorkspaceContentProps) {
  const applicationFields = useApplicationFields(data.application);

  return (
    <div className="mx-auto w-full max-w-7xl space-y-5 px-4 pb-12 sm:px-6">
      <ApplicationWorkspaceHeader application={data.application} fields={applicationFields} />
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,0.7fr)]">
        <main className="space-y-5">
          <ApplicationDetailsSection application={data.application} fields={applicationFields} />
          <ApplicationUnsavedWarning fields={applicationFields} />
          <PreparationSection applicationId={data.application.id} preparation={data.preparation} />
          <ContactsSection applicationId={data.application.id} contacts={data.contacts} />
          <FollowUpsSection applicationId={data.application.id} tasks={data.followUpTasks} />
        </main>
        <ApplicationActivitySection applicationId={data.application.id} events={data.events} />
      </div>
    </div>
  );
}
```

Exact class placement may stay with the components that semantically own it, but the data and state boundaries must match this design.

### Overview

`ApplicationWorkspaceHeader` owns:

- board-aware back navigation;
- position and company compact field presentation;
- initial company-heading focus;
- status control composition;
- lifecycle action composition.

`ApplicationDetailsSection` owns:

- location, salary, applied date, and job URL compact fields;
- About and Application notes text fields;
- localized applied-date display;
- sanitized external job-link display.

`ApplicationCompactField` owns the repeated Atlaskit compact-field presentation:

- read and edit views;
- floating label and input;
- focus entry and edit-button restoration;
- accessible edit, confirm, cancel, error, and description labels;
- delegating blur, edit, confirm, and cancel to the supplied controller.

It does not validate, mutate, translate server errors, or coordinate transitions between fields.

`ApplicationStatusControl` owns:

- status trigger and absolute-positioned menu;
- selected-option focus;
- outside-click and Escape handling;
- immediate status selection through the supplied compact controller;
- menu focus restoration.

`ApplicationUnsavedWarning` renders the existing save-or-cancel confirmation for a dirty compact field. The coordination state remains in `useApplicationFields` because it spans all compact fields.

### Lifecycle

`ApplicationLifecycleActions` is self-contained and receives only a `JobApplication`. It renders the appropriate active/archive/blacklist actions and owns confirmation and translated error presentation.

`useApplicationLifecycle` owns:

- deriving the current board;
- archive, blacklist, restore, unblacklist, and permanent-delete mutations;
- pending state;
- pending confirmation action;
- translated error keys;
- post-action navigation, including the archived-and-blacklisted restore case.

Lifecycle concerns do not enter the application-field controller or page coordinator.

### Preparation

`PreparationSection` receives `applicationId` and `ApplicationPreparation`, creates three domain-specific field controllers, and renders them through `WorkspaceTextField`.

`usePreparationField` continues validating with `updateApplicationPreparationInputSchema` and persists only its selected preparation field. Multiple preparation or large application text editors may remain open simultaneously.

### Contacts

`ContactsSection` receives `applicationId` and the server-owned contact array. It owns:

- add/edit/remove workflow state;
- mutation status announcements;
- remove confirmation;
- editor and confirmation focus return;
- contact card/list rendering;
- safe `mailto:`, sanitized `tel:`, and sanitized HTTP/HTTPS profile links;
- plain-text notes rendering.

`ContactForm` is separate because it has a meaningful validation and focus lifecycle. It owns form markup but receives its state and commands from `useContactsController`.

Do not recreate separate contact-card, contact-list, or contact-links components unless their behavior independently expands in a future task.

### Follow-ups

`FollowUpsSection` receives `applicationId` and the server-owned task array. It owns:

- add/edit/complete/delete workflow state;
- incomplete-first deterministic sorting;
- one short-month and one full-date formatter per locale;
- list-item and calendar-marker rendering;
- mutation status announcements;
- delete confirmation;
- editor and confirmation focus return.

`FollowUpForm` is separate because it has a meaningful validation and focus lifecycle. It receives state and commands from `useFollowUpsController`.

Do not recreate separate follow-up-card, follow-up-list, or due-date-marker components unless their behavior independently expands.

### Activity

Activity needs two explicit data-ownership variants because it is used in both collection cards and the workspace.

```ts
type ApplicationActivityProps = {
  applicationId: number;
};

type ApplicationActivitySectionProps = {
  applicationId: number;
  events: ApplicationEvent[];
};
```

`ApplicationActivity` remains the query-owning wrapper used by collection cards. It retains loading, error, and retry behavior and renders `ApplicationActivitySection` after loading.

`ApplicationActivitySection` is the controlled workspace-compatible component. It receives events, owns editor/delete state and event mutations, and reuses the existing activity form and timeline. It never calls `useApplicationDetail`.

The timeline constructs one date formatter per locale and supplies formatted dates to event rows. User-created events remain editable and deletable; system events remain immutable.

## Controller contracts

Components depend on explicit exported types rather than `ReturnType<typeof useHook>`.

```ts
export type EditableApplicationField =
  | "company"
  | "position"
  | "location"
  | "salary"
  | "jobUrl"
  | "description"
  | "notes"
  | "status"
  | "appliedAt";

export type ApplicationFieldController = {
  savedValue: string | null;
  draft: string;
  editing: boolean;
  pending: boolean;
  state: "error" | "invalid" | null;
  errorKey: string | null;
  setDraft(value: string): void;
  beginEdit(): void;
  cancel(): void;
  save(value?: string): Promise<boolean>;
};

export type CompactFieldController = {
  activeField: EditableApplicationField | null;
  warningField: EditableApplicationField | null;
  requestEdit(field: EditableApplicationField): void;
  blur(field: EditableApplicationField, requestedField?: EditableApplicationField): void;
  cancel(field: EditableApplicationField): void;
  save(field: EditableApplicationField, value: string): void;
  selectStatus(status: JobStatus): Promise<void>;
};

export type ApplicationFieldsController = {
  fields: {
    company: ApplicationFieldController;
    position: ApplicationFieldController;
    location: ApplicationFieldController;
    salary: ApplicationFieldController;
    jobUrl: ApplicationFieldController;
    description: ApplicationFieldController;
    notes: ApplicationFieldController;
    status: ApplicationFieldController;
    appliedAt: ApplicationFieldController;
  };
  compact: CompactFieldController;
  saveWarning(): Promise<void>;
  cancelWarning(): void;
};
```

`WorkspaceTextField` accepts a structural subset shared by application and preparation controllers. Its save result is intentionally `unknown` because the presentation component awaits or discards completion but does not make workflow decisions from the domain-specific return value:

```ts
export type WorkspaceTextFieldController = Pick<
  ApplicationFieldController,
  "savedValue" | "draft" | "editing" | "pending" | "state" | "setDraft" | "beginEdit" | "cancel"
> & {
  save(value?: string): Promise<unknown>;
};

export type WorkspaceFieldFeedback = {
  kind: "error" | "invalid";
  text: string;
} | null;
```

Contact and follow-up controllers use similarly explicit but domain-specific interfaces. Do not define a generic collection-controller type.

The contact controller groups its public surface into `editor` and `deletion` concerns:

```ts
export type ContactsController = {
  editor: {
    target: ApplicationContact | "new" | null;
    draft: ContactDraft;
    errors: ContactErrors;
    formRef: RefObject<HTMLFormElement | null>;
    firstFieldRef: RefObject<HTMLInputElement | null>;
    setField(field: ContactField, value: string): void;
    submit(event: FormEvent<HTMLFormElement>): Promise<void>;
    openNew(trigger: HTMLElement): void;
    openExisting(contact: ApplicationContact, trigger: HTMLElement): void;
    close(): void;
  };
  deletion: {
    target: ApplicationContact | null;
    request(contact: ApplicationContact, trigger: HTMLElement): void;
    cancel(): void;
    confirm(): Promise<void>;
  };
  pending: boolean;
  status: ContactMutationStatus;
};
```

The follow-up controller mirrors the high-level grouping but defines its own draft, errors, status union, and `complete(taskId)` command.

## Server-state and event flow

```text
ApplicationWorkspacePage
        │
        │ one useApplicationDetail query
        ▼
ApplicationWorkspaceContent
        │
        ├── application ──► overview + lifecycle
        ├── preparation ──► PreparationSection
        ├── contacts ─────► ContactsSection
        ├── followUpTasks ► FollowUpsSection
        └── events ───────► ApplicationActivitySection
```

- TanStack Query owns all server data.
- Section arrays are never copied into local state.
- Mutation hooks continue invalidating `applicationKeys.detail(applicationId)`.
- Refetched query data flows down through props.
- Local draft state synchronizes from refreshed props only where current behavior already does so.
- The workspace has exactly one detail-query subscription.

## Shared primitives

### `WorkspaceTextField`

Owns the repeated About, Notes, Company research, Talking points, and Interviewer questions UI:

- semantic heading and region;
- Atlaskit read/edit views;
- textarea markup;
- edit, confirm, and cancel labels;
- focus entry and restoration;
- pending and error feedback.

It receives a controller and translated feedback. It does not parse, validate, mutate, or know the persisted field name.

### `workspace-section-ui.tsx`

Contains the small visual pieces shared by contacts and follow-ups:

- `WorkspaceSectionHeader`;
- `WorkspaceMutationStatus`;
- `WorkspaceFormActions`;
- `WorkspaceFieldError`.

These components accept presentation data and callbacks only. Keeping them together avoids four trivial files while maintaining one clear responsibility: collection-section UI chrome.

### Shared behavioral helpers

- `runWorkspaceMutation` performs the repeated clear-status, execute, success-status, and failure-status transition without exposing exception text.
- `useReturnFocus` remembers the actual trigger and restores it, falling back to a supplied add button when needed.
- `sanitizeExternalUrl` returns only normalized HTTP or HTTPS URLs.

## Dependency direction

```text
page
  ├── overview
  ├── lifecycle
  ├── preparation
  ├── contacts
  ├── follow-ups
  ├── activity
  └── shared

domain sections
  ├── shared workspace UI
  ├── global UI primitives
  ├── shared contracts
  └── query hooks

shared workspace code
  ├── global UI primitives
  └── shared contracts
```

Constraints:

- Shared workspace code never imports a domain folder.
- Domain sections never import another workspace domain.
- Lifecycle does not import field-editing internals.
- Domain components never import from `page`.
- Avoid barrel files; import the actual owning module.
- Avoid dependency cycles and upward imports.

## Complexity and extraction rules

Extract a component when it owns an independent interaction lifecycle, is reused in at least two places, provides a meaningful semantic boundary, or removes a substantial repeated control pattern.

Do not extract a component solely because a JSX block is long, a list item appears once, or a file crosses an arbitrary line count. Section components may remain 100–250 lines when the content is cohesive. Complex forms may have one dedicated component. List-item rendering remains in its section until it gains independent behavior.

Hooks own workflow state and commands. Components own semantic markup, accessibility, and styles. Hooks do not return translated labels or JSX.

Do not add:

- a workspace-wide context provider;
- a generic section factory;
- a universal CRUD controller;
- a generic form framework;
- a one-file-per-list-item hierarchy;
- boolean-heavy mode APIs;
- broad `utils` modules;
- speculative memoization.

## Performance boundaries

`ApplicationWorkspaceContent` rerenders while application fields are edited because it owns their shared controller. Wrap `PreparationSection`, `ContactsSection`, `FollowUpsSection`, and `ApplicationActivitySection` in `memo`. Their numeric IDs and query-owned objects or arrays remain referentially stable during local field editing, so these boundaries skip unrelated heavy rendering.

Do not add `useCallback` to every section-owned handler. Handlers that do not cross memoized boundaries do not need reference stabilization.

Continue memoizing only meaningful work:

- follow-up sorting;
- locale date formatters;
- activity sorting and locale formatter construction.

## Accessibility and focus

- Preserve semantic regions, headings, lists, forms, labels, names, descriptions, alerts, status messages, and live regions.
- Preserve initial focus on the company heading.
- Preserve compact-field focus entry, focus return, dirty-field warning, and requested-next-field behavior.
- Preserve status-menu selected-option focus, Escape behavior, outside-click behavior, and trigger focus restoration.
- Preserve contact, follow-up, and activity trigger focus after editor or dialog closure.
- Preserve modal focus trapping and restoration.
- Preserve keyboard access and visible focus styles.
- Keep user-visible loading copy with an ellipsis where currently specified.

Each component owns focus only for controls inside its boundary. No section reaches into another section's DOM.

## Security and correctness

- Keep shared Zod schemas as the browser-side validation boundary before every mutation.
- Keep authenticated, CSRF-protected query mutations unchanged.
- Keep server ownership checks unchanged.
- Render user-entered text as React text; never use raw HTML rendering.
- Use the shared sanitizer for job and profile links and permit only HTTP and HTTPS.
- Keep contact email schema validation and phone-link character filtering.
- Render stable translated error keys rather than raw exceptions.
- Keep system activity immutable.
- Keep archive, blacklist, restore, and permanent-delete confirmations and navigation behavior unchanged.
- Preserve separate archive and blacklist semantics.

## Testing design

Replace the broad `application-workspace-sections.test.tsx` with focused tests:

```text
overview/application-overview.test.tsx
lifecycle/application-lifecycle.test.tsx
preparation/preparation-section.test.tsx
contacts/contacts-section.test.tsx
follow-ups/follow-ups-section.test.tsx
activity/application-activity-section.test.tsx
page/application-workspace-page.test.tsx
```

Shared test support lives under `application-workspace/test-support`:

- deterministic detail, preparation, contact, follow-up, and event fixtures;
- Query Client, CSRF cache, router, Redux, and i18n render setup;
- no production behavior hidden in test helpers.

Activity tests keep activity-specific render setup within the existing activity feature; production activity code must not depend on workspace test support.

Coverage ownership:

- Page: invalid IDs, not-found responses, loading/error/retry, and successful composition.
- Overview: one-field payloads, dirty compact warning, nullable values, status selection, simultaneous large-field editing, initial focus, and sanitized job URLs.
- Lifecycle: active/archive/blacklist controls, confirmations, pending states, errors, and navigation.
- Preparation: independent editors, validation, save/cancel, pending/error feedback, and focus.
- Contacts: validation, safe links, plain-text rendering, create/edit/remove, confirmation, announcements, and focus restoration.
- Follow-ups: validation, sorting, localized dates, create/edit/complete/delete, announcements, and focus restoration.
- Activity: controlled events, system-event immutability, create/edit/delete, localized dates, plain-text rendering, errors, and focus restoration.

Use behavior assertions and accessible queries. Do not add snapshots or tests tied to internal hook state.

## Migration sequence

1. Add shared test support and redistribute existing characterization tests without changing production behavior.
2. Extract pure helpers and shared behavioral utilities.
3. Extract application field hooks and explicit controller types.
4. Introduce `ApplicationCompactField` and replace both duplicated compact-field loops.
5. Introduce `WorkspaceTextField` and replace application and preparation text-editor duplication.
6. Extract lifecycle state and UI.
7. Extract header, details, status control, and unsaved warning.
8. Extract the preparation section.
9. Extract contacts into one section, one form, and one controller.
10. Extract follow-ups into one section, one form, and one controller.
11. Add the controlled activity section, preserve the query-owning wrapper, and remove the workspace activity duplicate.
12. Reduce `ApplicationWorkspaceContent` to composition and layout.
13. Remove obsolete monolith exports, update imports and CSS paths, and delete the broad sections test after all cases have owners.
14. Run focused checks after every extraction, then the complete static, unit, build, seed, and E2E verification suite.

Each migration step must be independently reviewable and committed. This refactor does not authorize visible behavior changes. Any discovered product change belongs in `docs/backlog.md` or a separately approved task.

## Documentation impact

Update `AGENTS.md` structure guidance if the final ownership paths differ from its current workspace description. No API, database, product, or setup documentation should change because this is a frontend-only structural refactor.

## Non-goals

- Changing the workspace UI or copy.
- Changing application, preparation, contact, follow-up, activity, archive, or blacklist behavior.
- Replacing Atlaskit Inline Edit.
- Changing TanStack Query cache contracts.
- Changing API endpoints or shared schemas.
- Introducing context, Redux state, or a form library for workspace editing.
- Optimizing the known Atlaskit bundle cost; that remains a separate backlog item.
