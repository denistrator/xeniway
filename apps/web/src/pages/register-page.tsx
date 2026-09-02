import { registerInputSchema } from "@job-tracker/shared";
import { type FormEvent, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AuthCard } from "../components/auth-card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { useAuthMutations, useCsrfToken } from "../lib/queries";

export function RegisterPage() {
  const navigate = useNavigate();
  const csrf = useCsrfToken();
  const { register } = useAuthMutations();
  const [form, setForm] = useState({ firstName: "", lastName: "", email: "", password: "", confirmPassword: "" });
  const [validationError, setValidationError] = useState<string | null>(null);
  const errorRef = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    if (validationError || register.error) errorRef.current?.focus();
  }, [register.error, validationError]);

  function update(field: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = registerInputSchema.safeParse({
      ...form,
      firstName: form.firstName || null,
      lastName: form.lastName || null,
    });
    if (!parsed.success) {
      setValidationError(parsed.error.issues[0]?.message ?? "Check your details");
      return;
    }
    if (form.password !== form.confirmPassword) {
      setValidationError("Passwords must match");
      return;
    }
    setValidationError(null);
    await register.mutateAsync(parsed.data);
    navigate("/", { replace: true });
  }

  return (
    <AuthCard title="Create your account" description="Keep your job search organized from first contact to offer.">
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block space-y-1 text-sm font-medium">
            First name
            <Input
              name="firstName"
              autoComplete="given-name"
              value={form.firstName}
              onChange={(event) => update("firstName", event.target.value)}
            />
          </label>
          <label className="block space-y-1 text-sm font-medium">
            Last name
            <Input
              name="lastName"
              autoComplete="family-name"
              value={form.lastName}
              onChange={(event) => update("lastName", event.target.value)}
            />
          </label>
        </div>
        <label className="block space-y-1 text-sm font-medium">
          Email
          <Input
            name="email"
            autoComplete="email"
            spellCheck={false}
            required
            type="email"
            value={form.email}
            onChange={(event) => update("email", event.target.value)}
          />
        </label>
        <label className="block space-y-1 text-sm font-medium">
          Password
          <Input
            name="password"
            autoComplete="new-password"
            required
            type="password"
            value={form.password}
            onChange={(event) => update("password", event.target.value)}
          />
        </label>
        <label className="block space-y-1 text-sm font-medium">
          Confirm password
          <Input
            name="confirmPassword"
            autoComplete="new-password"
            required
            type="password"
            value={form.confirmPassword}
            onChange={(event) => update("confirmPassword", event.target.value)}
          />
        </label>
        {(validationError || register.error) && (
          <p
            ref={errorRef}
            role="alert"
            aria-live="assertive"
            tabIndex={-1}
            className="text-sm text-rose-600 dark:text-rose-400"
          >
            {validationError ?? register.error?.message}
          </p>
        )}
        <Button className="w-full" type="submit" disabled={csrf.isPending || register.isPending}>
          {register.isPending ? "Creating account…" : "Create account"}
        </Button>
      </form>
      <p className="mt-5 text-center text-sm text-muted">
        Already registered?{" "}
        <Link className="font-semibold text-ink" to="/login">
          Sign in
        </Link>
      </p>
    </AuthCard>
  );
}
