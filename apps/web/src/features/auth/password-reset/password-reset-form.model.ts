import type { ChangeEvent, FormEvent, RefObject } from "react";
import { useTranslation } from "react-i18next";
import { getApiErrorKey } from "../../../i18n/format";
import { ApiRequestError } from "../../../lib/api";
export type PasswordResetFormProps = {
  password: string;
  confirmation: string;
  error: unknown;
  pending: boolean;
  errorRef: RefObject<HTMLParagraphElement | null>;
  onPasswordChange: (value: string) => void;
  onConfirmationChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

export function usePasswordResetForm({
  error,
  pending,
  onPasswordChange,
  onConfirmationChange,
}: Pick<PasswordResetFormProps, "error" | "pending" | "onPasswordChange" | "onConfirmationChange">) {
  const { t } = useTranslation();

  const hasError = Boolean(error);
  let errorLabel: string | null = null;
  if (hasError) {
    errorLabel = error instanceof ApiRequestError ? t(getApiErrorKey(error.code)) : String(error);
  }

  const labels = {
    newPassword: t("auth.fields.newPassword"),
    confirmPassword: t("auth.fields.confirmPassword"),
    error: errorLabel,
    pending: t("auth.resetPassword.pending"),
    submit: t("auth.resetPassword.submit"),
  };
  function handlePasswordChange(event: ChangeEvent<HTMLInputElement>) {
    onPasswordChange(event.target.value);
  }
  function handleConfirmationChange(event: ChangeEvent<HTMLInputElement>) {
    onConfirmationChange(event.target.value);
  }
  const submitLabel = pending ? labels.pending : labels.submit;
  return { labels, hasError, handlePasswordChange, handleConfirmationChange, submitLabel };
}
