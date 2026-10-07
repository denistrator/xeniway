import type { ChangeEvent, FormEvent, RefObject } from "react";
import { useTranslation } from "react-i18next";
import { getApiErrorKey } from "../../../i18n/format";
import { ApiRequestError } from "../../../lib/api";
export type LoginFormProps = {
  email: string;
  password: string;
  error: unknown;
  pending: boolean;
  errorRef: RefObject<HTMLParagraphElement | null>;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

export function useLoginForm({
  error,
  pending,
  onEmailChange,
  onPasswordChange,
}: Pick<LoginFormProps, "error" | "pending" | "onEmailChange" | "onPasswordChange">) {
  const { t } = useTranslation();

  const hasError = Boolean(error);

  const labels = {
    email: t("auth.fields.email"),
    password: t("auth.fields.password"),
    error: t(getApiErrorKey(error instanceof ApiRequestError ? error.code : "REQUEST_FAILED")),
    pending: t("auth.login.pending"),
    submit: t("auth.login.submit"),
    forgotPassword: t("auth.login.forgotPassword"),
  };
  function handleEmailChange(event: ChangeEvent<HTMLInputElement>) {
    onEmailChange(event.target.value);
  }
  function handlePasswordChange(event: ChangeEvent<HTMLInputElement>) {
    onPasswordChange(event.target.value);
  }
  const submitLabel = pending ? labels.pending : labels.submit;
  return { labels, hasError, handleEmailChange, handlePasswordChange, submitLabel };
}
