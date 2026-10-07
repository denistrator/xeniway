import { type FormEvent, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router-dom";
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
    await login.mutateAsync({ email, password });
    navigate(new URLSearchParams(location.search).get("redirect") ?? "/", { replace: true });
  }

  const labels = {
    title: t("auth.login.title"),
    description: t("auth.login.description"),
    newHere: t("auth.login.newHere"),
    createAccount: t("auth.login.createAccount"),
  };

  const pending = csrf.isPending || login.isPending;
  return { labels, errorRef, email, setEmail, password, setPassword, login, handleSubmit, pending };
}
