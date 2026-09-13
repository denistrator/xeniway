import { type FormEvent, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation } from "react-router-dom";
import { AuthCard } from "../../../components/auth-card";
import { useCsrfToken, usePasswordResetMutations } from "../../../lib/queries";
import { PasswordResetForm } from "./password-reset-form";
import { PasswordResetState } from "./password-reset-state";

export function getResetToken(search: string): string | null {
  return new URLSearchParams(search).get("token");
}

export function PasswordResetPage() {
  const { t } = useTranslation();
  const token = getResetToken(useLocation().search);
  const csrf = useCsrfToken();
  const { confirm } = usePasswordResetMutations();
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
      setValidationError(t("auth.resetPassword.passwordTooShort"));
      return;
    }
    if (password !== passwordConfirmation) {
      setValidationError(t("auth.register.passwordsMustMatch"));
      return;
    }
    setValidationError(null);
    await confirm.mutateAsync({ token, password, passwordConfirmation });
    setSubmitted(true);
  }
  if (!token || submitted) return <PasswordResetState submitted={submitted} />;
  const error = validationError ?? (confirm.error instanceof Error ? confirm.error : null);
  return (
    <AuthCard title={t("auth.resetPassword.title")} description={t("auth.resetPassword.description")}>
      <PasswordResetForm
        password={password}
        confirmation={passwordConfirmation}
        error={error}
        pending={csrf.isPending || confirm.isPending}
        errorRef={errorRef}
        onPasswordChange={setPassword}
        onConfirmationChange={setPasswordConfirmation}
        onSubmit={handleSubmit}
      />
    </AuthCard>
  );
}
