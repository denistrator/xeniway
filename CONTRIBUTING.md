# Contributing to Xenia Way

Thank you for helping improve Xenia Way. Contributions should keep the project candidate-focused and safe for each authenticated candidate's private application data. PostgreSQL remains the source of truth; offline downloads are read-only.

## Before you start

Please check existing issues and pull requests before opening a new one. For a larger change, open an issue first so the scope and approach can be agreed on. Keep changes focused and do not add product features, external integrations, deployment systems, or data migrations without explicit maintainer approval.

## Runtime requirements and local setup

Follow the [README setup sequence](README.md#install-and-run-locally) and [runtime requirements](README.md#requirements). Use [Operations](docs/operations.md) for configuration and troubleshooting.

The seed accounts and Mailpit inbox are for local development only. Never use the seed credentials against a hosted or production system, and never commit `.env`, credentials, session IDs, personal data, or generated test artifacts.

## Checks

Run the checks relevant to your change before opening a pull request. The canonical [verification sequence and CI behavior](docs/testing.md#commands) include the public-content gate, static checks, and sequential browser suites. State any checks you could not run and why.

## Tests and migrations

Follow [AGENTS.md](AGENTS.md) for coding conventions, [test design rules](docs/testing.md#test-design-rules) for test placement and coverage, and the [database change policy](docs/database.md#migrations) for schema-only migrations and seed verification. Every application repository operation must remain scoped to the authenticated user.

## Pull requests

Use the pull request template and describe the user or maintainer need, the exact scope, and any behavior that intentionally remains unchanged. Each pull request must state:

- what tests and checks were run;
- whether a database migration is included and why;
- whether documentation was added or updated;
- whether there is any security or privacy impact; and
- whether authentication, CSRF, ownership, rate limiting, password recovery, or personal-data boundaries were affected.

Keep API JSON camelCase and preserve the documented `data`/`error` envelopes. Preserve the six application statuses (`saved`, `applied`, `interview`, `offer`, `rejected`, and `withdrawn`), with archive and blacklist remaining separate concepts.

## Security and conduct

Do not disclose vulnerabilities, secrets, session IDs, or personal data in public issues or pull requests. Follow [SECURITY.md](SECURITY.md) for private vulnerability reporting and [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) for community expectations.
