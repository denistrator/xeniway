import { registerInputSchema } from "@xeniway/shared";
import { type FormEvent, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useAuthMutations, useCsrfToken } from "../../../lib/queries";
import { type RegisterFormState, registerError } from "./register-form.model";

export function useRegisterPage() {
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
    if (validationError || register.error) {
      errorRef.current?.focus();
    }
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

  const labels = {
    title: t("auth.register.title"),
    description: t("auth.register.description"),
    alreadyRegistered: t("auth.register.alreadyRegistered"),
    signIn: t("auth.login.submit"),
  };

  const pending = csrf.isPending || register.isPending;
  return { labels, errorRef, error, form, update, handleSubmit, pending };
}
