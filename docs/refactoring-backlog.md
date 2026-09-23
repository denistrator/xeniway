# Refactoring backlog

This is a shortlist of possible future refactors, not approval to change behavior. Re-check the current code before starting an item; keep each change scoped, behavior-preserving, and covered by focused tests. Update or remove entries when the code changes.

## Open

### Split API in-memory test support by domain

- **Where:** `apps/api/src/app-test-support.ts` (currently a 381-line module).
- **Why:** `createDependencies()` builds in-memory implementations for accounts, sessions, applications and their events, password resets, and preferences in one function. The size makes it harder to locate a fixture's state and behavior.
- **Possible direction:** Keep one explicit shared state store for cross-domain invariants, and move domain-specific repository implementations or builders into focused modules. Avoid splitting every small helper into its own file.
- **Guardrails:** Preserve application ownership checks, event history behavior, and the dependency factory used by API tests. Run the API test suite and retain cross-account isolation coverage.

### Reassess database repository test organization if it grows

- **Where:** `apps/api/src/db/repository.test.ts` (currently 334 lines).
- **Why:** It covers row mapping, application-history transactions, password resets, and user preferences in one test file.
- **Possible direction:** Split by independently understandable workflow only if ongoing changes make navigation or ownership difficult. Its current `describe` groups may be sufficient, so this is not urgent.
- **Guardrails:** Keep database setup shared where that improves clarity; do not split solely to meet a line-count target.

### Review server error observability separately

- **Where:** `apps/api/src/app.ts` and the server logging/configuration path.
- **Why:** Unexpected API failures are returned as generic internal errors; operators may need a reliable way to diagnose them without exposing implementation details to clients.
- **Possible direction:** First map existing logging and deployment behavior, then consider structured server-side diagnostics if a genuine gap remains.
- **Guardrails:** This is an investigation, not a request to change error behavior. Never return stack traces, secrets, or internal details to clients; do not weaken security controls.

## Explicitly not planned

- A generic CRUD router factory: route-specific behavior is clearer for this API, and repository guidance says not to introduce this abstraction.
- Splitting modules only to satisfy arbitrary line limits. Prefer cohesive responsibilities and readable tests over file-count targets.
