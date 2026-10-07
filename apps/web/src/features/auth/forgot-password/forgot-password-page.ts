import type { ChangeEvent } from "react";
import { type FormEvent, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { getApiErrorKey } from "../../../i18n/format";
import { ApiRequestError } from "../../../lib/api";
import { useCsrfToken, usePasswordResetMutations } from "../../../lib/queries";

export function useForgotPasswordPage() {
  const { t } = useTranslation();
  const csrf = useCsrfToken();
  const { request } = usePasswordResetMutations();
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const errorRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    if (request.error) {
      errorRef.current?.focus();
    }
  }, [request.error]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await request.mutateAsync({ email });
    setSubmitted(true);
  }

  const labels = {
    title: t("auth.forgotPassword.title"),
    description: t("auth.forgotPassword.description"),
    submitted: t("auth.forgotPassword.submitted"),
    returnToSignIn: t("auth.forgotPassword.returnToSignIn"),
    email: t("auth.fields.email"),
    error: t(getApiErrorKey(request.error instanceof ApiRequestError ? request.error.code : "REQUEST_FAILED")),
    pending: t("auth.forgotPassword.pending"),
    submit: t("auth.forgotPassword.submit"),
    rememberedPassword: t("auth.forgotPassword.rememberedPassword"),
    signIn: t("auth.login.submit"),
  };
  function handleEmailChange(event: ChangeEvent<HTMLInputElement>) {
    setEmail(event.target.value);
  }
  const pending = csrf.isPending || request.isPending;
  const submitLabel = request.isPending ? labels.pending : labels.submit;
  return { labels, errorRef, email, submitted, request, handleSubmit, handleEmailChange, pending, submitLabel };
}
