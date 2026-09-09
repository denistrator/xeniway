# Forgot Password Implementation Plan

## Scope

Implement the approved forgot-password flow in the React/Bun/Elysia/PostgreSQL application. The work stays on the `codex-forgot-password` branch and does not migrate existing data or add unrelated account features.

## Task 1: Extend shared contracts

Files:

- `packages/shared/src/index.ts`
- `packages/shared/src/index.test.ts`

Add `passwordResetRequestInputSchema` with the same normalized email rules as login, and `passwordResetConfirmInputSchema` with a non-empty URL-safe token, an 8–128 character password, and a matching `passwordConfirmation`. Add inferred input types and named response/error constants for the generic request response and invalid-token response. Keep the existing `ApiSuccess`, `ApiError`, `CsrfResponse`, and auth response envelopes unchanged.

Tests first: accept normalized valid inputs, reject malformed emails, short/long passwords, blank tokens, and mismatched confirmation. Run shared tests and typecheck. Commit: `feat: add password reset contracts`.

## Task 2: Add reset-token database schema and migration

Files:

- `apps/api/src/db/schema.ts`
- `apps/api/drizzle/0004_password_reset_tokens.sql`
- `apps/api/src/db/migrate.ts` if migration discovery needs adjustment
- `apps/api/src/db/schema.test.ts` if schema tests exist

Add `passwordResetTokens` with a generated numeric ID, user foreign key with cascade delete, unique token hash, `expiresAt`, nullable `usedAt`, and `createdAt`. Add indexes for `(userId, createdAt)` and valid-token lookup. The migration must be data-empty, enforce the foreign key and uniqueness, and match Drizzle’s generated schema. Verify migration execution against PostgreSQL when the local database is available. Commit: `feat: add password reset storage`.

## Task 3: Implement repository operations

Files:

- `apps/api/src/db/repository.ts`
- `apps/api/src/db/repository.test.ts`

Add typed operations to invalidate a user’s outstanding reset tokens, insert a token hash, consume one valid token atomically, update a user password hash, and delete all sessions for a user. The consume operation must only match an unused, unexpired token and must return the owning user ID; concurrent consumption attempts must allow at most one success. Keep all user-facing application ownership rules unchanged.

Tests first: cover token creation, expiry, reuse prevention, replacement of older tokens, password update, session invalidation, and user deletion behavior. Run repository tests. Commit: `feat: persist password reset tokens`.

## Task 4: Add mailer and password-reset service

Files:

- `apps/api/src/services/mailer.ts`
- `apps/api/src/services/mailer.test.ts`
- `apps/api/src/services/password-reset.ts`
- `apps/api/src/services/password-reset.test.ts`
- `apps/api/package.json`
- `bun.lock` if dependency metadata changes

Define `PasswordResetMailer.sendPasswordReset({ to, resetUrl, expiresAt })`. Implement an SMTP adapter using `nodemailer`, plus a development console adapter selected when `SMTP_URL` is absent. Keep the adapter injectable so tests never send external mail. Build reset URLs from `APP_ORIGIN`, never include a raw token in persistence or application logs, and use the existing Argon2id hasher.

The service must return the same result for known and unknown emails, apply the password-reset Redis rate limit before account lookup, create a secure token for known users, invalidate older tokens, and send mail. Confirmation must validate the shared input, atomically consume the token, hash the new password, update the user, invalidate all sessions, and return a stable success message. Define explicit configuration validation for production SMTP settings. Commit: `feat: add password reset service`.

## Task 5: Add API routes and wire dependencies

Files:

- `apps/api/src/routes/auth-password-reset-request.ts`
- `apps/api/src/routes/auth-password-reset-confirm.ts`
- `apps/api/src/routes/types.ts`
- `apps/api/src/app.ts`
- `apps/api/src/server.ts`
- `apps/api/src/app.test.ts`
- `apps/api/src/services/auth.test.ts` or focused route tests
- `.env.example`
- `docs/api.md`
- `docs/operations.md`

Add the two public routes with the existing JSON envelopes, CSRF middleware behavior, validation mapping, and error handling. Request returns the generic message for every valid email input. Confirmation returns success only after the token transaction completes; invalid tokens, expired tokens, and reuse map to one stable client-safe error. Inject the mailer and reset service through the existing app construction seam rather than using module globals.

Add `SMTP_URL`, `MAIL_FROM`, and `APP_ORIGIN` to environment documentation. Tests must cover CSRF rejection, unauthenticated CSRF session flow, generic responses for known/unknown emails, rate-limit behavior, invalid credentials/token, expiry, reuse, session invalidation, and persistence failures. Run API tests and typecheck. Commit: `feat: expose password reset api`.

## Task 6: Add client API and query mutations

Files:

- `apps/web/src/lib/api.ts`
- `apps/web/src/lib/queries.ts`
- focused client/query tests beside those files

Add typed request/confirm API methods using shared contracts. Reuse the current CSRF query and ensure both mutations send `x-csrf-token`. Preserve the existing 401/403 handling and error-envelope mapping. Add query mutations with predictable loading/error states and invalidate the current-user query only where authentication state can change.

Run web tests and typecheck. Commit: `feat: connect password reset client`.

## Task 7: Build public forgot-password and reset-password pages

Files:

- `apps/web/src/pages/forgot-password-page.tsx`
- `apps/web/src/pages/reset-password-page.tsx`
- `apps/web/src/pages/login-page.tsx`
- `apps/web/src/App.tsx`
- shared auth form components only if reuse is clearly beneficial
- focused component tests

Add routes outside the guest-only redirect guard. Implement accessible forms with existing floating-label and input primitives, `name`, `autocomplete="email"`/`"new-password"`, semantic labels, inline validation, disabled submit state, generic request success copy, invalid/expired-token recovery copy, and a login link. Preserve the global header/footer and theme behavior. Do not introduce new application functionality.

Tests first: render and submit both forms, verify generic request messaging, invalid-token messaging, successful reset navigation, keyboard access, and light/dark rendering. Commit: `feat: add password reset pages`.

## Task 8: Add workflow verification

Files:

- `tests/e2e/forgot-password.spec.ts`
- API/service test files from earlier tasks
- `playwright.config.*` only if test setup requires a documented fixture

Use an injected fake mailer in API tests to verify the complete known-user flow without external SMTP. Browser coverage should verify login navigation, public pages, generic request completion, reset form validation, invalid token handling, and that a successful reset invalidates the prior authenticated session. Avoid test-only production endpoints or raw-token logging.

Run:

```bash
bun run typecheck
bun run test
bun run build
bun run test:e2e
```

Fix failures before committing. Commit: `test: cover password reset workflow`.

## Task 9: Documentation pass

Update the relevant human/AI documentation after the source implementation is stable:

- `README.md`
- `AGENTS.md`
- `docs/architecture.md`
- `docs/api.md`
- `docs/database.md`
- `docs/operations.md`
- `docs/testing.md`
- any additional AI instruction files found by inventory

Document the reset flow, token retention/security, SMTP and development mail configuration, rate limiting, CSRF behavior, public routes, test strategy, and deferred account-recovery work. Remove stale or contradictory statements. Verify docs against the final source tree. Commit: `docs: document password reset flow`.

## Final verification

From the feature worktree, rerun:

```bash
bun run typecheck
bun run test
bun run build
bun run test:e2e
git status --short
git log --oneline --decorate -n 12
```

The branch must be clean except for intentionally ignored local artifacts, and every commit must correspond to a verified task.
