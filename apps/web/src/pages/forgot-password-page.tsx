import { Mail } from "lucide-react";
import { type FormEvent, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { AuthCard } from "../components/auth-card";
import { Button } from "../components/ui/button";
import { FloatingLabel } from "../components/ui/floating-label";
import { Input } from "../components/ui/input";
import { getApiErrorKey } from "../i18n/format";
import { ApiRequestError } from "../lib/api";
import { useCsrfToken, usePasswordResetMutations } from "../lib/queries";

export function ForgotPasswordPage() {
  const { t } = useTranslation();
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
    <AuthCard title={t("auth.forgotPassword.title")} description={t("auth.forgotPassword.description")}>
      {submitted ? (
        <div className="space-y-4" role="status" aria-live="polite">
          <p className="text-sm leading-6 text-muted">{t("auth.forgotPassword.submitted")}</p>
          <Link className="font-semibold text-ink underline-offset-4 hover:underline" to="/login">
            {t("auth.forgotPassword.returnToSignIn")}
          </Link>
        </div>
      ) : (
        <form className="space-y-4" onSubmit={handleSubmit}>
          <FloatingLabel htmlFor="forgot-password-email" label={t("auth.fields.email")} icon={Mail}>
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
              {t(getApiErrorKey(request.error instanceof ApiRequestError ? request.error.code : "REQUEST_FAILED"))}
            </p>
          )}
          <Button className="w-full" type="submit" disabled={csrf.isPending || request.isPending}>
            {request.isPending ? t("auth.forgotPassword.pending") : t("auth.forgotPassword.submit")}
          </Button>
          <p className="text-center text-sm leading-6 text-muted">
            {t("auth.forgotPassword.rememberedPassword")}{" "}
            <Link className="font-semibold text-ink underline-offset-4 hover:underline" to="/login">
              {t("auth.login.submit")}
            </Link>
          </p>
        </form>
      )}
    </AuthCard>
  );
}
