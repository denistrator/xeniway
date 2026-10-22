import type { FormEvent, RefObject } from "react";
import { useTranslation } from "react-i18next";
import { getApiErrorKey } from "../../../i18n/format";
import { ApiRequestError } from "../../../lib/api";
export type RegisterFormState = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
};

export type RegisterFieldErrors = Partial<Record<keyof RegisterFormState, string>>;

export type RegisterFormProps = {
  form: RegisterFormState;
  fieldErrors: RegisterFieldErrors;
  error: string | null;
  pending: boolean;
  errorRef: RefObject<HTMLParagraphElement | null>;
  onChange: (field: keyof RegisterFormState, value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

export function registerError(error: unknown, t: (key: string) => string) {
  return t(getApiErrorKey(error instanceof ApiRequestError ? error.code : "REQUEST_FAILED"));
}

export function useRegisterForm(pending: boolean) {
  const { t } = useTranslation();

  const labels = {
    pending: t("auth.register.pending"),
    submit: t("auth.register.submit"),
  };

  const submitLabel = pending ? labels.pending : labels.submit;
  return { labels, submitLabel };
}
