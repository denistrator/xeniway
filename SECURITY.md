# Security Policy

## Reporting a vulnerability

Please do not report security vulnerabilities in public issues, discussions, or pull requests. Use GitHub's private vulnerability reporting channel for this repository at https://github.com/denistrator/xeniway/security/advisories/new, or open the repository's **Security** tab and choose **Report a vulnerability**.

Before this repository is published, the maintainer must enable **Private vulnerability reporting** in the repository's GitHub settings under **Settings → Code security and analysis**. This policy documents the required configuration; it does not claim that the setting is currently enabled or verified.

Include enough detail to reproduce and assess the issue, such as the affected component or route, steps to reproduce, impact, and a suggested mitigation. Redact secrets, credentials, session IDs, and personal data from all reports. If a public issue was opened accidentally, remove sensitive details as soon as possible and contact the maintainers through the private GitHub security channel.

The maintainers will acknowledge a private report when practical, investigate it, and coordinate disclosure and a fix with the reporter. Please allow time for validation before sharing details publicly.

## Security boundaries

Xenia Way is a candidate-facing workspace. Authenticated application data must remain scoped to its owning user. Do not weaken session, CSRF, password hashing, password-reset token, rate-limiting, or cookie protections while developing or testing.

The seed accounts, Mailpit inbox, Docker Compose services, and local SMTP configuration are development-only. The repository intentionally contains no production deployment configuration. Never use development credentials or local fixtures with real candidate data.
