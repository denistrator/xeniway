# Forgot Password Design

## Goal

Allow a candidate who cannot remember their password to request a one-time reset link, choose a new password, and return to the existing authenticated job-tracking workflow.

## Approved behavior

- `POST /api/auth/password-reset/request` accepts a normalized email address and always returns the same success response, whether or not the account exists.
- A known account receives a reset email containing a URL for the public `/reset-password` page.
- Reset tokens are generated with cryptographically secure random bytes, encoded for URLs, stored only as a SHA-256 hash, expire after one hour, and can be consumed once.
- Creating a new reset request invalidates older outstanding reset tokens for the same user.
- `POST /api/auth/password-reset/confirm` accepts the token, a new password, and its confirmation. A valid request updates the Argon2id password hash, consumes the token atomically, and invalidates every existing session for that user.
- Invalid, expired, already-consumed, or malformed tokens produce one stable non-enumerating error response.
- Both endpoints follow the existing CSRF policy and require the session CSRF token. The request endpoint uses the anonymous session created by the existing CSRF flow.
- Reset requests use the existing Redis-backed, fail-closed rate-limit mechanism under a distinct password-reset operation key.

## Mail delivery

The API will depend on a small `PasswordResetMailer` interface. The production adapter will use SMTP configuration (`SMTP_URL`, `MAIL_FROM`, and `APP_ORIGIN`). Development without SMTP configuration will use a console mailer that prints the reset URL; the HTTP response remains generic in both modes. The message will include a plain-text subject and body, the one-hour expiry, and a link built from the configured application origin.

## User interface

- Add a `Forgot password?` link to the login page.
- Add a public `/forgot-password` page with an email form and the generic completion message: `If an account exists for that email, we’ll send password reset instructions.`
- Add a public `/reset-password` page that reads the URL token, accepts a new password and confirmation, and provides a link back to login after success.
- Keep the reset pages available to authenticated and unauthenticated visitors; they should not be redirected by the guest-only login/register guard.
- Use the existing form primitives, floating-label structure, theme system, semantic labels, autocomplete metadata, validation, loading, error, and live-region patterns.

## Security boundaries

The API must not reveal whether an email is registered, must never persist or log the raw token, must not accept a token twice, and must invalidate active sessions after a successful reset. Password rules remain the existing 8–128 character rule. No email changes, MFA, social authentication, password history, SMS delivery, background queue, or account-recovery support are included.

