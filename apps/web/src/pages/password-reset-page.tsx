import { LockKeyhole } from "lucide-react";
import { type FormEvent, useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { AuthCard } from "../components/auth-card";
import { Button } from "../components/ui/button";
import { FloatingLabel } from "../components/ui/floating-label";
import { Input } from "../components/ui/input";
import { useCsrfToken, usePasswordResetMutations } from "../lib/queries";

export function getResetToken(search: string): string | null {
  return new URLSearchParams(search).get("token");
}

export function PasswordResetPage() {
  const location = useLocation();
  const csrf = useCsrfToken();
  const { confirm } = usePasswordResetMutations();
  const token = getResetToken(location.search);
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const errorRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    if (validationError || confirm.error) errorRef.current?.focus();
  }, [confirm.error, validationError]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) return;
    if (password.length < 8) {
      setValidationError("Password must be at least 8 characters");
      return;
    }
    if (password !== passwordConfirmation) {
      setValidationError("Passwords must match");
      return;
    }
    setValidationError(null);
    await confirm.mutateAsync({ token, password, passwordConfirmation });
    setSubmitted(true);
  }

  if (!token) {
    return (
      <AuthCard title="Reset link unavailable" description="This password reset link is missing or invalid.">
        <Link className="font-semibold text-ink underline-offset-4 hover:underline" to="/forgot-password">
          Request a new link
        </Link>
      </AuthCard>
    );
  }

  if (submitted) {
    return (
      <AuthCard title="Password updated" description="Your password has been reset successfully.">
        <Link className="font-semibold text-ink underline-offset-4 hover:underline" to="/login">
          Return to sign in
        </Link>
      </AuthCard>
    );
  }

  return (
    <AuthCard title="Choose a new password" description="Use at least 8 characters for your new password.">
      <form className="space-y-4" onSubmit={handleSubmit}>
        <FloatingLabel htmlFor="reset-password" label="New password" icon={LockKeyhole}>
          <Input
            id="reset-password"
            className="peer"
            name="password"
            type="password"
            autoComplete="new-password"
            placeholder=" "
            required
            minLength={8}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </FloatingLabel>
        <FloatingLabel htmlFor="reset-password-confirmation" label="Confirm password" icon={LockKeyhole}>
          <Input
            id="reset-password-confirmation"
            className="peer"
            name="passwordConfirmation"
            type="password"
            autoComplete="new-password"
            placeholder=" "
            required
            minLength={8}
            value={passwordConfirmation}
            onChange={(event) => setPasswordConfirmation(event.target.value)}
          />
        </FloatingLabel>
        {(validationError || confirm.error) && (
          <p
            ref={errorRef}
            role="alert"
            aria-live="assertive"
            tabIndex={-1}
            className="text-sm leading-6 text-rose-600 dark:text-rose-400"
          >
            {validationError ?? confirm.error?.message}
          </p>
        )}
        <Button className="w-full" type="submit" disabled={csrf.isPending || confirm.isPending}>
          {confirm.isPending ? "Updating password…" : "Update password"}
        </Button>
      </form>
    </AuthCard>
  );
}
