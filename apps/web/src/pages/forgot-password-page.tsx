import { Mail } from "lucide-react";
import { type FormEvent, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { AuthCard } from "../components/auth-card";
import { Button } from "../components/ui/button";
import { FloatingLabel } from "../components/ui/floating-label";
import { Input } from "../components/ui/input";
import { useCsrfToken, usePasswordResetMutations } from "../lib/queries";

export function ForgotPasswordPage() {
  const csrf = useCsrfToken();
  const { request } = usePasswordResetMutations();
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const errorRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    if (request.error) errorRef.current?.focus();
  }, [request.error]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await request.mutateAsync({ email });
    setSubmitted(true);
  }

  return (
    <AuthCard title="Forgot your password?" description="We’ll help you get back to your application tracker.">
      {submitted ? (
        <div className="space-y-4" role="status" aria-live="polite">
          <p className="text-sm leading-6 text-muted">
            If an account exists for that email, we’ll send password reset instructions.
          </p>
          <Link className="font-semibold text-ink underline-offset-4 hover:underline" to="/login">
            Return to sign in
          </Link>
        </div>
      ) : (
        <form className="space-y-4" onSubmit={handleSubmit}>
          <FloatingLabel htmlFor="forgot-password-email" label="Email" icon={Mail}>
            <Input
              id="forgot-password-email"
              className="peer"
              name="email"
              type="email"
              autoComplete="email"
              spellCheck={false}
              placeholder=" "
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </FloatingLabel>
          {request.error && (
            <p
              ref={errorRef}
              role="alert"
              aria-live="assertive"
              tabIndex={-1}
              className="text-sm leading-6 text-rose-600 dark:text-rose-400"
            >
              {request.error.message}
            </p>
          )}
          <Button className="w-full" type="submit" disabled={csrf.isPending || request.isPending}>
            {request.isPending ? "Sending instructions…" : "Send instructions"}
          </Button>
          <p className="text-center text-sm leading-6 text-muted">
            Remembered your password?{" "}
            <Link className="font-semibold text-ink underline-offset-4 hover:underline" to="/login">
              Sign in
            </Link>
          </p>
        </form>
      )}
    </AuthCard>
  );
}
