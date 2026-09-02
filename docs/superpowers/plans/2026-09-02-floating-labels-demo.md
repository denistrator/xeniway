# Floating Labels — Approved Rollout Plan

## Goal

Apply the approved floating-label interaction consistently to the app's text inputs, textareas, selects, and date field while preserving the user's latest implementation choices and existing behavior.

## Baseline to preserve

The implementation starts from commits `00df99b` and `f0930d1`.

- Keep `placeholder=" "` on every floating text input and textarea.
- Use the shared `<Input>` component for input elements.
- Keep `:placeholder-shown` as the empty-state mechanism; do not add `data-empty` or JavaScript style/state manipulation.
- Keep `.floating-labels` as the positioned root with the control and label as direct children.
- Do not reintroduce a `.control` wrapper.
- Keep the current user-authored floating-label stylesheet structure and token names unless a required rollout fix is identified.
- Do not add a separate explicit input transition; preserve the current CSS as authored. The label transition remains the existing `transition-[color,top,transform]` behavior.
- Do not overwrite unrelated working-tree changes. Stage only the files belonging to each step.

## Current CSS contract

`apps/web/src/components/ui/floating-labels.css` owns visual styles for direct child `input`, `select`, and `textarea` elements and for `.floating-labels-label`. Templates should provide only semantic hooks and field attributes. The `peer` class is the state hook used by the sibling-label selectors.

The stylesheet uses the project's `border-line`, `bg-surface`, `text-ink`, `text-muted`, and `text-accent` tokens. It must not contain Magento-specific tokens or reference markup.

## Scope

- Convert login and registration fields.
- Convert application search.
- Convert all editable fields in `JobForm`: company, position, location, salary, job URL, status, applied date, description, and notes.
- Remove conflicting nested-label and duplicate visual utility classes from those templates.
- Preserve field names, IDs, autocomplete, validation, controlled state, submit behavior, and accessible label associations.
- Keep the existing checkbox-based status filter, theme selector, buttons, and other non-text controls unchanged.
- Review responsive layout, dark theme, keyboard interaction, autofill, and reduced-motion behavior after the migration.

## Markup contract

Every migrated field follows this structure:

```tsx
<div className="floating-labels">
  <Input
    id="field-id"
    className="peer"
    name="fieldName"
    placeholder=" "
    value={value}
    onChange={handleChange}
  />
  <label htmlFor="field-id" className="floating-labels-label">
    Field label
  </label>
</div>
```

Use a direct raw `textarea` or `select` where no shared primitive exists, with `className="peer"` and the same direct-sibling label structure. Textareas receive `placeholder=" "`. Selects and date controls start in the floated label position because their native controls do not expose the same empty placeholder state.

The search field's visible placeholder copy is replaced by its floating label; it retains `placeholder=" "` and its accessible name through the associated label and existing `aria-label` where needed.

## Execution steps

### 1. Migrate authentication forms

Convert all login and registration fields, preserving the already-migrated login Email field and the latest CSS/markup decisions. Add stable IDs and explicit `htmlFor` associations where absent.

Verify with typecheck and a focused browser/component check if available.

Commit:

```text
refactor: migrate auth fields to floating labels
```

### 2. Migrate application form and search

Convert the home-page search and every `JobForm` field. Remove old nested label styling and duplicate input/textarea/select visual utilities that conflict with `floating-labels.css`. Preserve all form state and validation behavior.

Verify with typecheck and the relevant tests.

Commit:

```text
refactor: migrate job fields to floating labels
```

### 3. Verify and review the rollout

Run the focused checks, then the project checks relevant to the changed surface:

```bash
bun run typecheck
bun run test
bun run build
```

Review the diff and confirm:

- empty, focused, filled, and cleared states work;
- dark and light theme tokens remain correct;
- labels never overlap values or borders;
- keyboard focus and label associations remain accessible;
- mobile layouts remain usable;
- no `.control`, `data-empty`, real placeholder copy, or removed template styles were reintroduced.

Commit:

```text
test: verify floating label rollout
```

## Out of scope

Do not add new fields, autocomplete behavior, accessibility work beyond what is required to preserve the existing controls, data attributes, new JavaScript state, or unrelated UI refactors without approval.
