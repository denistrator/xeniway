# FloatingLabel Component Design

## Objective

Replace repeated floating-label markup with one typed React wrapper while preserving the current direct-sibling CSS behavior and all existing form behavior.

## Component contract

`FloatingLabel` accepts `children`, `htmlFor`, `label`, `className`, and `labelClassName`. It renders one root `<div>` with the singular `floating-label` class, renders the supplied control unchanged, and renders a `<label>` after it with the supplied `htmlFor`, label content, and singular `floating-label-label` class.

The control remains the caller's responsibility. Inputs keep the `peer` state hook and `placeholder=" "`; selects and textareas remain supported without introducing JavaScript state or a Slot abstraction.

## Naming migration

Rename the stylesheet and all selectors, imports, consumers, and test selectors from `floating-labels` to `floating-label`. The migration must not change tokens, transition behavior, form state, accessibility attributes, or layout classes beyond moving wrapper/label classes into the component.

## Verification

Add a focused test covering class composition, label association, child-before-label ordering, and custom wrapper/label classes. Run the focused test, typecheck, web tests, build, lint, and diff checks before committing.
