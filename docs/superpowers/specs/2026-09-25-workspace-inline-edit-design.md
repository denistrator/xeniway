# Application Workspace Inline Editing Design

## Goal and scope

Unify application editing in the application workspace by replacing the edit-only application drawer/modal with field-level inline editors. Each field can be edited where it is displayed, using an interaction suited to its size. Keep new application creation and its current fields, validation, and presentation behavior intact; shared create-form code may be refactored as needed.

This change does not alter application APIs, persistence contracts, ownership rules, activity history, or the separate contact, follow-up, and preparation editing workflows except where existing preparation-field behavior is reused for the five large fields.

## Field groups and presentation

### Large text fields

The large fields are **About**, **Application notes**, **Company research**, **Talking points**, and **Questions for the interviewer**. Their read views show a visible Edit affordance; Atlaskit supplies explicit confirm/cancel controls with localized accessible labels. The editor supports multiline content. Blur alone does not save or cancel. Multiple large-field editors may be open at once.

About and Application notes appear as separately titled sections with the same visual treatment. The About title is “About”; Application notes keeps its existing title. Empty fields display a localized “Not provided” value and remain editable.

### Compact fields

The compact fields are **Company**, **Position**, **Location**, **Salary**, **Job URL**, **Status**, and **Applied date**. Company and Position remain in the workspace heading; the other compact fields remain in the details area. Each has a compact icon-only edit affordance with an accessible localized name. Its editor uses the existing application form's appropriate control, floating label, and validation for that field.

Only one compact editor may be active at a time; compact editing can coexist with any number of open large-field editors. Its Save/Cancel actions are displayed in an overlay near the active field and remain visible while that editor has focus. Empty fields show “Not provided” with the edit affordance. Job URL may be cleared by emptying the input and saving; do not add a separate clear action.

Status uses a dropdown styled consistently with the existing “Filter statuses” control. Selecting a status is itself the save action and does not show Save/Cancel controls.

## Editing and persistence behavior

- Opening an editor initializes its draft from the latest saved value.
- Cancel discards the draft without confirmation and restores the last saved value.
- Save validates with the same field constraints used by the new-application form and persists only the changed application field through the existing owner-scoped application update API. Do not send unrelated form defaults or overwrite other fields.
- On successful save, update/invalidate the relevant application detail and board queries, announce success, and return focus to that field's edit control.
- On validation or network failure, keep the editor and draft open, announce the error, and expose invalid field information accessibly.
- For a compact editor with a changed draft, leaving the field or requesting another compact editor opens a warning dialog with Save and Cancel actions. Save persists the draft; Cancel or closing the dialog discards it. Clicking the inline overlay's Save/Cancel controls acts directly and must not first trigger the blur-warning dialog.
- A compact editor with no changed value closes without a warning when it loses focus.
- Selecting a Status option saves immediately. Failures retain the prior visible value, announce an error, and allow retry.

## Removing edit-only modal behavior

Remove the application edit action from the workspace sidebar and remove edit mode from the application drawer/modal manager. Delete components and state used exclusively to edit an existing application. Retain and, where useful, simplify all components, schemas, translations, hooks, and dependencies still used by creating a new application. The create action and its modal/drawer presentation preference must continue to work unchanged.

## Architecture approach

Use `@atlaskit/inline-edit` for read/edit transitions and confirm/cancel controls in compact and large fields. Small field components supply application-specific read views and native inputs; the preparation fields use the same library directly. Field hooks retain validation and persistence through one-field partial updates and existing query invalidation. Status selection remains a direct-save specialization. Keep only the coordination needed for one active compact editor and the dirty-field warning; do not recreate a generic custom inline editor.

## Accessibility and localization

Preserve semantic form controls, visible labels, icon-only accessible names, keyboard operation, visible focus, dialog focus handling/return, live save and error announcements, reduced motion, and RTL layout. Add or update equivalent strings in English, Russian, Ukrainian, and Hebrew. Keep the locale dictionaries structurally aligned. All content remains plain text; Job URL rendering continues to use the existing safe URL handling.

## Testing and verification

- Add focused component tests for every editable field group: open/cancel/save, partial payloads, empty values, validation, network errors retaining drafts, successful focus return, and localized accessible labels.
- Test compact blur warnings only for changed drafts, save/cancel/close semantics, switching to another compact editor, inline action clicks not triggering the warning first, and coexistence with multiple large editors.
- Test immediate Status persistence and error behavior, URL clearing, and date/status validation parity with application creation.
- Retain and extend application creation tests to prove its form, validation, and selected modal/drawer presentation are unchanged.
- Update workspace page tests to assert that the edit-only sidebar action is absent and field-level controls are present.
- Add or update E2E coverage for editing representative heading, compact, status, and large fields, reload persistence, keyboard interactions, and responsive layout. Run locale alignment and accessibility checks for changed surfaces.
- Run focused web tests, then the repository's relevant lint, typecheck, build, full tests, and E2E checks as infrastructure allows.

## Explicitly out of scope

- New application fields, API endpoints, database changes, or new preference contracts.
- Changes to application creation semantics or its current validation.
- Changes to editing contacts, follow-ups, activity events, or application lifecycle actions.
- Autosave-on-blur for large fields, multi-compact editing, or automatic save when switching away from a dirty compact editor without confirmation.
