import { LockKeyhole } from "lucide-react";
import { type FormEvent, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useLocation } from "react-router-dom";
import { AuthCard } from "../components/auth-card";
import { Button } from "../components/ui/button";
import { FloatingLabel } from "../components/ui/floating-label";
import { Input } from "../components/ui/input";
import { getApiErrorKey } from "../i18n/format";
import { ApiRequestError } from "../lib/api";
import { useCsrfToken, usePasswordResetMutations } from "../lib/queries";

export function getResetToken(search: string): string | null {
  return new URLSearchParams(search).get("token");
}

export function PasswordResetPage() {
  const { t } = useTranslation();
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

  if (!token) {
    return (
      <AuthCard
        title={t("auth.resetPassword.unavailableTitle")}
        description={t("auth.resetPassword.unavailableDescription")}
      >
        <Link className="font-semibold text-ink underline-offset-4 hover:underline" to="/forgot-password">
          {t("auth.resetPassword.requestNewLink")}
        </Link>
      </AuthCard>
    );
  }

  if (submitted) {
    return (
      <AuthCard title={t("auth.resetPassword.successTitle")} description={t("auth.resetPassword.successDescription")}>
        <Link className="font-semibold text-ink underline-offset-4 hover:underline" to="/login">
          {t("auth.forgotPassword.returnToSignIn")}
        </Link>
      </AuthCard>
    );
  }

  return (
    <AuthCard title={t("auth.resetPassword.title")} description={t("auth.resetPassword.description")}>
      <form className="space-y-4" onSubmit={handleSubmit}>
        <FloatingLabel htmlFor="reset-password" label={t("auth.fields.newPassword")} icon={LockKeyhole}>
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
        <FloatingLabel
          htmlFor="reset-password-confirmation"
          label={t("auth.fields.confirmPassword")}
          icon={LockKeyhole}
        >
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
            {validationError ??
              t(getApiErrorKey(confirm.error instanceof ApiRequestError ? confirm.error.code : "REQUEST_FAILED"))}
          </p>
        )}
        <Button className="w-full" type="submit" disabled={csrf.isPending || confirm.isPending}>
          {confirm.isPending ? t("auth.resetPassword.pending") : t("auth.resetPassword.submit")}
        </Button>
      </form>
    </AuthCard>
  );
}
