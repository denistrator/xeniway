import { registerInputSchema } from "@job-tracker/shared";
import { LockKeyhole, Mail, User } from "lucide-react";
import { type FormEvent, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AuthCard } from "../components/auth-card";
import { Button } from "../components/ui/button";
import { FloatingLabel } from "../components/ui/floating-label";
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
          <FloatingLabel htmlFor="register-first-name" label="First name" icon={User}>
            <Input
              id="register-first-name"
              className="peer"
              name="firstName"
              autoComplete="given-name"
              placeholder=" "
              value={form.firstName}
              onChange={(event) => update("firstName", event.target.value)}
            />
          </FloatingLabel>
          <FloatingLabel htmlFor="register-last-name" label="Last name" icon={User}>
            <Input
              id="register-last-name"
              className="peer"
              name="lastName"
              autoComplete="family-name"
              placeholder=" "
              value={form.lastName}
              onChange={(event) => update("lastName", event.target.value)}
            />
          </FloatingLabel>
        </div>
        <FloatingLabel htmlFor="register-email" label="Email" icon={Mail}>
          <Input
            id="register-email"
            className="peer"
            name="email"
            autoComplete="email"
            spellCheck={false}
            placeholder=" "
            required
            type="email"
            value={form.email}
            onChange={(event) => update("email", event.target.value)}
          />
        </FloatingLabel>
        <FloatingLabel htmlFor="register-password" label="Password" icon={LockKeyhole}>
          <Input
            id="register-password"
            className="peer"
            name="password"
            autoComplete="new-password"
            placeholder=" "
            required
            type="password"
            value={form.password}
            onChange={(event) => update("password", event.target.value)}
          />
        </FloatingLabel>
        <FloatingLabel htmlFor="register-confirm-password" label="Confirm password" icon={LockKeyhole}>
          <Input
            id="register-confirm-password"
            className="peer"
            name="confirmPassword"
            autoComplete="new-password"
            placeholder=" "
            required
            type="password"
            value={form.confirmPassword}
            onChange={(event) => update("confirmPassword", event.target.value)}
          />
        </FloatingLabel>
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
