import { type FormEvent, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router-dom";
import { getAuthLink, resolveAuthReturnTo } from "../../../lib/auth-return-to";
import { useAuthMutations, useCsrfToken } from "../../../lib/queries";

export function useLoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const csrf = useCsrfToken();
  const { login } = useAuthMutations();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const errorRef = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    if (login.error) {
      errorRef.current?.focus();
    }
  }, [login.error]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      await login.mutateAsync({ email, password });
      const returnTo = new URLSearchParams(location.search).get("returnTo");
      navigate(resolveAuthReturnTo(returnTo), { replace: true });
    } catch {
      // The mutation error is rendered in the active sign-in form.
    }
  }

  const labels = {
    title: t("auth.login.title"),
    description: t("auth.login.description"),
    newHere: t("auth.login.newHere"),
    createAccount: t("auth.login.createAccount"),
    registerLink: getAuthLink("/register", location),
  };

  const pending = csrf.isPending || login.isPending;
  return { labels, errorRef, email, setEmail, password, setPassword, login, handleSubmit, pending };
}
