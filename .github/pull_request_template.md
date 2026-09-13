## Summary

Describe the user or maintainer need and the approach taken.

## Scope

- What changed:
- What intentionally did not change:
- Product behavior or API contracts affected:

## Verification

List the checks you ran and their results.

- [ ] `bun run lint`
- [ ] `bun run typecheck`
- [ ] `bun run test`
- [ ] `bun run build`
- [ ] `bun run db:seed` (where schema, seed, or database behavior is affected)
- [ ] `bun run test:e2e` (if applicable)
- [ ] `git diff --check`

## Data, migrations, and documentation

Select exactly one migration option:

- [ ] No database migration is needed.
- [ ] A migration was added to `apps/api/drizzle`; it is data-empty and includes seed/test coverage where needed.
- [ ] Migration impact is unresolved and requires maintainer guidance before merge.

- [ ] Documentation updated, or no documentation change is needed.

## Security and privacy

- Security impact:
- Ownership/authentication/CSRF/rate-limiting/password-recovery impact:
- Personal data or secrets handled: none / explain and redact examples

## Review checklist

- [ ] I preserved the six canonical application statuses and separate archive/blacklist semantics.
- [ ] I preserved authenticated ownership boundaries.
- [ ] I added or updated focused tests for changed behavior where practical.
- [ ] I did not add deployment systems, external authentication, integrations, or background jobs.
- [ ] I have not included secrets, session IDs, personal data, or generated artifacts.
