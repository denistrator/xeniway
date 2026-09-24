# Application Workspace Content Refactor Design

## Goal

Improve the readability, consistency, and runtime efficiency of `ApplicationWorkspaceContent` without changing its product behavior or decomposing its implementation.

## Structural constraint

The workspace remains one bundle and one React component. The refactor must not introduce child components, render helpers, reducers, additional custom hooks, or new source files. Existing JSX and component-owned logic stay directly inside `ApplicationWorkspaceContent`. Existing module-level logic already consolidated into the same file may be cleaned up, but the component must not be decomposed further.

## In-scope changes

- Rename unclear state, derived values, handlers, and refs so their domain and purpose are immediately visible.
- Reorder related declarations to make the component readable from data dependencies through state, derived values, effects, handlers, and JSX.
- Simplify nested conditions and repeated boolean expressions where this can be done in place.
- Memoize genuinely repeated derived work, including sorted collections and locale-sensitive date formatters, without adding abstraction layers.
- Stop effects from resubscribing because of unstable object dependencies when a stable event mechanism can preserve current behavior.
- Reuse existing validated and sanitized values consistently instead of recalculating them inside collection rendering.
- Remove dead, redundant, or misleading state and exports discovered during the review.
- Keep accessibility names, focus restoration, live announcements, modal behavior, and keyboard behavior unchanged.

## Security and correctness

- Continue accepting only HTTP and HTTPS contact profile URLs.
- Continue rendering user-entered text as React text rather than HTML.
- Preserve shared Zod validation before every write.
- Preserve authenticated, CSRF-protected TanStack Query mutations and owner-scoped API behavior.
- Do not weaken confirmation requirements for destructive actions.
- Do not change API contracts, persisted values, routes, or navigation outcomes.

## Performance approach

Optimization is limited to work visible inside the existing component. The refactor may cache expensive sorting and `Intl.DateTimeFormat` construction and may stabilize document event handlers. It must avoid speculative memoization of trivial strings, arrays, or JSX where the bookkeeping would cost more than the calculation.

## Verification

Per the requested scope, tests will not be added, changed, or run. Verification is limited to:

- `bun run format`
- `bun run lint`
- `bun run typecheck`
- `bun run build`
- `git diff --check`

The existing Vite large-main-bundle warning is expected and is not part of this refactor.
