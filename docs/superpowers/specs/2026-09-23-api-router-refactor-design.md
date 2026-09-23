# API Router Refactor Design

## Goal

Reduce duplication and make the API routing layer easier to navigate by grouping endpoints by domain and extracting only request mechanics that are genuinely shared, while preserving the existing HTTP contract and security behavior.

## Current state

The API has 24 route modules wired individually in `apps/api/src/app.ts`. Most application mutations repeat authentication, CSRF validation, positive-integer ID parsing, Zod validation, and standard error construction. Auth and preferences routes repeat some of those checks too, but also have meaningful route-specific behavior. Health and CSRF bootstrap routes are public infrastructure endpoints. `routes/support.ts` already contains cookie/session, auth, CSRF, parsing, validation, and response helpers.

## Design

Organize route modules by domain:

```text
routes/
  health.ts
  auth/
    index.ts
    csrf.ts
    session.ts
    password-reset.ts
  preferences.ts
  applications/
    index.ts
    collection.ts
    item.ts
    events.ts
    boards.ts
  support/
    auth-guard.ts
    request-validation.ts
    responses.ts
```

The exact split should follow actual responsibilities discovered during implementation; do not create thin wrapper files just to match this sketch. The domain entry modules should compose endpoint handlers and be the only routers registered by `app.ts`.

Use small, typed shared abstractions for repeated mechanics. Authenticated route groups should establish the authenticated context once where Elysia's scoped lifecycle and types allow it. Mutating authenticated groups should additionally enforce CSRF. Per-endpoint handlers should retain explicit schemas, repository calls, status codes, and response construction. Reuse existing helpers when they already express one clear responsibility; split `support.ts` by concern if it becomes more coherent than a catch-all module.

Do not introduce generic CRUD/action route factories. Avoid abstractions that hide security boundaries, endpoint-specific errors, or transaction/business behavior. Public health and CSRF bootstrap behavior must remain outside authenticated groups. Login and registration retain their distinct rate-limit, session replacement, cookies, and response statuses; password-reset request and confirmation retain their separate service errors and rate-limit behavior.

## Compatibility and security invariants

- Keep all existing HTTP methods, paths, JSON envelopes, field names, status codes, and error codes unchanged unless a current test demonstrates an accidental inconsistency and the change is separately justified.
- Every application repository access remains scoped to the authenticated user ID.
- Every authenticated mutation remains CSRF-protected.
- Preserve public routes and the unauthenticated CSRF-session bootstrap flow.
- Preserve validation behavior, including malformed JSON handling where currently defined.
- Preserve event ownership checks and the distinction between mutable manual events and immutable system events.
- Preserve route-specific not-found semantics, including cases such as already archived or inactive applications.
- Do not change repository, database schema, shared API contracts, or product behavior as part of this router-only refactor.

## Testing and rollout

Use existing API integration tests in `apps/api/src/app.test.ts` as contract coverage. Before moving behavior, add focused regression cases for any repeated guard or parser behavior not already asserted. Refactor in domain-sized increments, keeping tests green after each. Test unauthenticated access, missing/invalid CSRF on mutations, invalid IDs and bodies, ownership isolation, route-specific error/status behavior, auth/session/rate-limit flows, password-reset failures, and public health/CSRF routes. Finish with API tests, then repository-wide lint, typecheck, tests, and build.

## Documentation

Update `AGENTS.md` if the router structure or guidance for adding routes changes. Update architecture/API documentation only where current descriptions point to the old organization or omit the new route boundaries. Keep this design and its implementation plan under `docs/superpowers/`.
