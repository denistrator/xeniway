# Documentation Alignment Design

## Goal

Make the repository documentation an accurate, newcomer-friendly guide to Xenia Way: a candidate-facing application tracker for recording employer conversations and application progress.

## Scope

- Rewrite `README.md` as the primary project overview and local-development guide.
- Align `docs/api.md`, `docs/architecture.md`, `docs/database.md`, `docs/operations.md`, `docs/testing.md`, and `docs/migration.md` with the current implementation.
- Update `AGENTS.md` so future code changes preserve the documented product identity, security boundaries, workflow semantics, and development commands.
- Inspect `docs/superpowers/` for harmful current-state contradictions, but preserve completed plans and specifications as historical implementation records.

## Content requirements

The README will explain:

- the product goal and candidate-focused nature of the application;
- the six canonical statuses and the separate archive and blacklist concepts;
- the main user-facing capabilities;
- the technology stack and workspace structure;
- prerequisites, environment setup, local services, ports, seeded accounts, and Mailpit;
- the normal development, migration, seed, test, build, and E2E commands;
- links to the deeper API, architecture, database, operations, testing, and migration documentation.

Technical documentation will retain implementation-level detail while correcting inconsistencies such as the actual health response, Redis's password-reset rate-limit role, supported environment variables, and the checked-in GitHub Actions CI workflow.

## Verification

After editing, search the Markdown files for stale setup and CI claims, inspect the diff, run Markdown-oriented consistency checks available from the repository, and run the relevant repository validation commands before claiming completion.
