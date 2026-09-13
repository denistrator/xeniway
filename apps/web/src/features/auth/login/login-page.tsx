import { type FormEvent, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { AuthCard } from "../../../components/auth-card";
import { useAuthMutations, useCsrfToken } from "../../../lib/queries";
import { LoginForm } from "./login-form";

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
    navigate(new URLSearchParams(location.search).get("redirect") ?? "/", { replace: true });
  }

  return (
    <AuthCard title={t("auth.login.title")} description={t("auth.login.description")}>
      <LoginForm
        email={email}
        password={password}
        error={login.error}
        pending={csrf.isPending || login.isPending}
        errorRef={errorRef}
        onEmailChange={setEmail}
        onPasswordChange={setPassword}
        onSubmit={handleSubmit}
      />
      <p className="mt-5 text-center text-sm leading-6 text-muted">
        {t("auth.login.newHere")}{" "}
        <Link className="font-semibold text-ink" to="/register">
          {t("auth.login.createAccount")}
        </Link>
      </p>
    </AuthCard>
  );
}
