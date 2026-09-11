import { LockKeyhole, Mail } from "lucide-react";
import { type FormEvent, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { AuthCard } from "../components/auth-card";
import { Button } from "../components/ui/button";
import { FloatingLabel } from "../components/ui/floating-label";
import { Input } from "../components/ui/input";
import { getApiErrorKey } from "../i18n/format";
import { ApiRequestError } from "../lib/api";
import { useAuthMutations, useCsrfToken } from "../lib/queries";

export function LoginPage() {
  const { t } = useTranslation();
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
    <AuthCard title={t("auth.login.title")} description={t("auth.login.description")}>
      <form className="space-y-4" onSubmit={handleSubmit}>
        <FloatingLabel htmlFor="login-email" label={t("auth.fields.email")} icon={Mail}>
          <Input
            id="login-email"
            className="peer"
            name="email"
            autoComplete="email"
            spellCheck={false}
            placeholder=" "
            required
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </FloatingLabel>
        <FloatingLabel htmlFor="login-password" label={t("auth.fields.password")} icon={LockKeyhole}>
          <Input
            id="login-password"
            className="peer"
            name="password"
            autoComplete="current-password"
            placeholder=" "
            required
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </FloatingLabel>
        {login.error && (
          <p
            ref={errorRef}
            role="alert"
            aria-live="assertive"
            tabIndex={-1}
            className="text-sm leading-6 text-rose-600 dark:text-rose-400"
          >
            {t(getApiErrorKey(login.error instanceof ApiRequestError ? login.error.code : "REQUEST_FAILED"))}
          </p>
        )}
        <Button className="w-full" type="submit" disabled={csrf.isPending || login.isPending}>
          {login.isPending ? t("auth.login.pending") : t("auth.login.submit")}
        </Button>
        <p className="text-center text-sm leading-6 text-muted">
          <Link className="font-semibold text-ink underline-offset-4 hover:underline" to="/forgot-password">
            {t("auth.login.forgotPassword")}
          </Link>
        </p>
      </form>
      <p className="mt-5 text-center text-sm leading-6 text-muted">
        {t("auth.login.newHere")}{" "}
        <Link className="font-semibold text-ink" to="/register">
          {t("auth.login.createAccount")}
        </Link>
      </p>
    </AuthCard>
  );
}
