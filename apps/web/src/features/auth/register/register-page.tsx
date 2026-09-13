import { registerInputSchema } from "@xeniway/shared";
import { type FormEvent, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router-dom";
import { AuthCard } from "../../../components/auth-card";
import { useAuthMutations, useCsrfToken } from "../../../lib/queries";
import { RegisterForm, type RegisterFormState, registerError } from "./register-form";

export function RegisterPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const csrf = useCsrfToken();
  const { register } = useAuthMutations();
  const [form, setForm] = useState<RegisterFormState>({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [validationError, setValidationError] = useState<string | null>(null);
  const errorRef = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    if (validationError || register.error) errorRef.current?.focus();
  }, [register.error, validationError]);

  function update(field: keyof RegisterFormState, value: string) {
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
      setValidationError(t("auth.register.checkDetails"));
      return;
    }
    if (form.password !== form.confirmPassword) {
      setValidationError(t("auth.register.passwordsMustMatch"));
      return;
    }
    setValidationError(null);
    await register.mutateAsync(parsed.data);
    navigate("/", { replace: true });
  }
  const error = validationError ?? (register.error ? registerError(register.error, t) : null);
  return (
    <AuthCard title={t("auth.register.title")} description={t("auth.register.description")}>
      <RegisterForm
        form={form}
        error={error}
        pending={csrf.isPending || register.isPending}
        errorRef={errorRef}
        onChange={update}
        onSubmit={handleSubmit}
      />
      <p className="mt-5 text-center text-sm leading-6 text-muted">
        {t("auth.register.alreadyRegistered")}{" "}
        <Link className="font-semibold text-ink" to="/login">
          {t("auth.login.submit")}
        </Link>
      </p>
    </AuthCard>
  );
}
