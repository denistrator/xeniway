import { type FormEvent, useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { AuthCard } from "../components/auth-card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { useAuthMutations, useCsrfToken } from "../lib/queries";

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const csrf = useCsrfToken();
  const { login } = useAuthMutations();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const errorRef = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    if (login.error) errorRef.current?.focus();
  }, [login.error]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await login.mutateAsync({ email, password });
    const destination = new URLSearchParams(location.search).get("redirect") ?? "/";
    navigate(destination, { replace: true });
  }

  return (
    <AuthCard title="Welcome back" description="Sign in to continue tracking your applications.">
      <form className="space-y-4" onSubmit={handleSubmit}>
        <label className="block space-y-1 text-sm font-medium">
          Email
          <Input
            name="email"
            autoComplete="email"
            spellCheck={false}
            required
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </label>
        <label className="block space-y-1 text-sm font-medium">
          Password
          <Input
            name="password"
            autoComplete="current-password"
            required
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </label>
        {login.error && (
          <p
            ref={errorRef}
            role="alert"
            aria-live="assertive"
            tabIndex={-1}
            className="text-sm text-rose-600 dark:text-rose-400"
          >
            {login.error.message}
          </p>
        )}
        <Button className="w-full" type="submit" disabled={csrf.isPending || login.isPending}>
          {login.isPending ? "Signing in…" : "Sign in"}
        </Button>
      </form>
      <p className="mt-5 text-center text-sm text-muted">
        New here?{" "}
        <Link className="font-semibold text-ink" to="/register">
          Create an account
        </Link>
      </p>
    </AuthCard>
  );
}
