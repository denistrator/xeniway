import { type FormEvent, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation } from "react-router-dom";
import { ApiRequestError } from "../../../lib/api";
import { useCsrfToken, usePasswordResetMutations } from "../../../lib/queries";

export function getResetToken(search: string): string | null {
  return new URLSearchParams(search).get("token");
}

export function usePasswordResetPage() {
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
    if (validationError || confirm.error) {
      errorRef.current?.focus();
    }
  }, [confirm.error, validationError]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) {
      return;
    }
    if (password.length < 8) {
      setValidationError(t("auth.resetPassword.passwordTooShort"));
      return;
    }
    if (password !== passwordConfirmation) {
      setValidationError(t("auth.register.passwordsMustMatch"));
      return;
    }
    setValidationError(null);
    try {
      await confirm.mutateAsync({ token, password, passwordConfirmation });
      setSubmitted(true);
    } catch {
      // The mutation error is rendered in the active password-reset form.
    }
  }

  const invalidToken = confirm.error instanceof ApiRequestError && confirm.error.code === "PASSWORD_RESET_INVALID";
  const error = invalidToken ? null : (validationError ?? (confirm.error instanceof Error ? confirm.error : null));
  const showState = !token || submitted || invalidToken;

  const labels = {
    title: t("auth.resetPassword.title"),
    description: t("auth.resetPassword.description"),
  };

  const pending = csrf.isPending || confirm.isPending;
  return {
    labels,
    errorRef,
    error,
    showState,
    password,
    setPassword,
    passwordConfirmation,
    setPasswordConfirmation,
    submitted,
    handleSubmit,
    pending,
  };
}
